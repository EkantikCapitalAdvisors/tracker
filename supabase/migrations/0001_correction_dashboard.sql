-- ============================================================================
-- Ekantik Correction Dashboard v2 — schema, governance, and seed data
-- Spec: Correction Dashboard System Specification v1.0 (Jul 14, 2026)
-- Thresholds: The Anatomy of Correction Depth (54 events, 1974–2026)
--
-- Governance is enforced AT THE DATABASE LEVEL:
--   * cd_thresholds rows with frozen=true reject UPDATE/DELETE via trigger.
--   * The only mutation path is cd_threshold_changes: justification,
--     48-hour minimum cool-off, and a countersignature before effective_at.
--   * cd_tripwire_log and cd_state_log are append-only (UPDATE/DELETE
--     rejected) — the immutable audit trail for falsifiability tracking.
-- ============================================================================

create schema if not exists public;

-- ---------------------------------------------------------------------------
-- Raw attribute readings (fail-open ingestion: data gaps are rows, not errors)
-- ---------------------------------------------------------------------------
create table if not exists cd_readings (
  id          bigint generated always as identity primary key,
  series_id   text        not null,
  as_of_date  date        not null,
  value       double precision,        -- null allowed when data_gap
  source      text        not null,
  fetched_at  timestamptz not null default now(),
  provisional boolean     not null default false,
  data_gap    boolean     not null default false,
  unique (series_id, as_of_date, source)
);
create index if not exists cd_readings_series_date_idx on cd_readings (series_id, as_of_date desc);

-- ---------------------------------------------------------------------------
-- Tripwire evaluations — append-only; TRIGGERED rows feed the live FP ledger
-- ---------------------------------------------------------------------------
create table if not exists cd_tripwire_log (
  id         bigint generated always as identity primary key,
  tripwire   text        not null,
  status     text        not null check (status in ('QUIET','ARMED','TRIGGERED','CONSTRAINED','FIRED','ESCALATE')),
  as_of_date date        not null,
  inputs     jsonb       not null default '{}'::jsonb,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists cd_tripwire_log_tripwire_date_idx on cd_tripwire_log (tripwire, as_of_date desc);
create index if not exists cd_tripwire_log_status_idx on cd_tripwire_log (status, as_of_date desc);

-- ---------------------------------------------------------------------------
-- Tier state log — append-only; one row per state entry
-- ---------------------------------------------------------------------------
create table if not exists cd_state_log (
  id                  bigint generated always as identity primary key,
  tier                smallint    not null check (tier between 0 and 3),
  entered_at          date        not null,
  entry_reason        text        not null,
  drawdown_pct        double precision,
  cycle_high          double precision,
  cycle_high_date     date,
  cross_date          date,
  router_deadline_30  date,
  router_deadline_60  date,
  engine_state        jsonb       not null default '{}'::jsonb,  -- full EngineState snapshot for resume
  created_at          timestamptz not null default now()
);
create index if not exists cd_state_log_entered_idx on cd_state_log (entered_at desc, id desc);

-- ---------------------------------------------------------------------------
-- Event register — catalyst tagging (required within 48h of Tier-1 entry)
-- ---------------------------------------------------------------------------
create table if not exists cd_event_register (
  id            bigint generated always as identity primary key,
  peak_date     date        not null,
  catalyst_text text        not null,
  tag           text        not null check (tag in ('SPECULATIVE','REALITY_BASED')),
  entered_by    text        not null,
  entered_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Frozen thresholds + governance
-- ---------------------------------------------------------------------------
create table if not exists cd_thresholds (
  key        text primary key,
  value      double precision not null,
  unit       text not null,
  basis      text not null,
  frozen     boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists cd_threshold_changes (
  id               bigint generated always as identity primary key,
  key              text not null references cd_thresholds (key),
  old_value        double precision not null,
  new_value        double precision not null,
  justification    text not null check (length(justification) >= 50),
  proposed_by      text not null,
  proposed_at      timestamptz not null default now(),
  countersigned_by text,
  countersigned_at timestamptz,
  effective_at     timestamptz,
  applied          boolean not null default false
);

-- Reject any direct mutation of a frozen threshold row.
create or replace function cd_reject_frozen_threshold_mutation() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'DELETE' and old.frozen) then
    raise exception 'cd_thresholds: % is frozen — deletion prohibited. Use cd_threshold_changes.', old.key;
  end if;
  if (tg_op = 'UPDATE' and old.frozen) then
    -- The ONLY permitted update path: an applied, countersigned change row
    -- whose 48-hour cool-off has elapsed. The application sets
    -- cd.applying_change to the change id for the transaction.
    if not exists (
      select 1 from cd_threshold_changes c
      where c.id = nullif(current_setting('cd.applying_change', true), '')::bigint
        and c.key = old.key
        and c.new_value = new.value
        and c.countersigned_by is not null
        and c.countersigned_at is not null
        and c.effective_at is not null
        and c.effective_at <= now()
        and c.effective_at >= c.proposed_at + interval '48 hours'
    ) then
      raise exception 'cd_thresholds: % is frozen — no countersigned, cooled-off change in effect', old.key;
    end if;
  end if;
  if (tg_op = 'DELETE') then return old; end if;
  return new;
end $$;

drop trigger if exists cd_thresholds_freeze on cd_thresholds;
create trigger cd_thresholds_freeze
  before update or delete on cd_thresholds
  for each row execute function cd_reject_frozen_threshold_mutation();

-- Enforce the 48-hour cool-off and countersignature ordering on the change row itself.
create or replace function cd_validate_threshold_change() returns trigger
language plpgsql as $$
begin
  if new.effective_at is not null then
    if new.countersigned_by is null or new.countersigned_at is null then
      raise exception 'cd_threshold_changes: effective_at requires a countersignature first';
    end if;
    if new.effective_at < new.proposed_at + interval '48 hours' then
      raise exception 'cd_threshold_changes: 48-hour minimum cool-off (proposed %, effective %)', new.proposed_at, new.effective_at;
    end if;
  end if;
  if new.countersigned_by is not null and new.countersigned_by = new.proposed_by then
    raise exception 'cd_threshold_changes: proposer cannot countersign their own change';
  end if;
  return new;
end $$;

drop trigger if exists cd_threshold_changes_validate on cd_threshold_changes;
create trigger cd_threshold_changes_validate
  before insert or update on cd_threshold_changes
  for each row execute function cd_validate_threshold_change();

-- The single sanctioned application path: called by the portal once a change
-- is countersigned and past its cool-off. Runs the frozen-row update inside
-- the same transaction as the `cd.applying_change` marker the freeze trigger
-- verifies.
create or replace function cd_apply_threshold_change(change_id bigint) returns void
language plpgsql as $$
declare
  c cd_threshold_changes;
begin
  select * into c from cd_threshold_changes where id = change_id;
  if not found then raise exception 'threshold change % not found', change_id; end if;
  if c.applied then raise exception 'threshold change % already applied', change_id; end if;
  if c.countersigned_by is null or c.effective_at is null or c.effective_at > now() then
    raise exception 'threshold change % is not countersigned/effective yet', change_id;
  end if;
  perform set_config('cd.applying_change', change_id::text, true);
  update cd_thresholds set value = c.new_value, updated_at = now() where key = c.key;
  update cd_threshold_changes set applied = true where id = change_id;
end $$;

-- ---------------------------------------------------------------------------
-- Append-only enforcement for audit logs
-- ---------------------------------------------------------------------------
create or replace function cd_reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only — % prohibited', tg_table_name, tg_op;
end $$;

drop trigger if exists cd_tripwire_log_append_only on cd_tripwire_log;
create trigger cd_tripwire_log_append_only
  before update or delete on cd_tripwire_log
  for each row execute function cd_reject_mutation();

drop trigger if exists cd_state_log_append_only on cd_state_log;
create trigger cd_state_log_append_only
  before update or delete on cd_state_log
  for each row execute function cd_reject_mutation();

-- ---------------------------------------------------------------------------
-- Sentinels + manual entries + retirement ledger
-- ---------------------------------------------------------------------------
create table if not exists cd_sentinels (
  id              bigint generated always as identity primary key,
  sent_at         timestamptz not null default now(),
  kind            text not null default 'WEEKLY' check (kind in ('WEEKLY','DAILY_MINI')),
  tier            smallint not null check (tier between 0 and 3),
  message_payload jsonb not null,
  slack_ts        text
);

-- Manual-entry fields (Alight 401(k), dealer gamma, revision breadth) — v2
-- keeps these human-entered via the admin drawer; stale >14 days renders N/A.
create table if not exists cd_manual_entries (
  id         bigint generated always as identity primary key,
  field      text not null check (field in ('ALIGHT_401K_INDEX','DEALER_GAMMA','REVISION_BREADTH_NEGATIVE','CONFIRMED_HIGHER_LOW')),
  as_of_date date not null,
  value_num  double precision,
  value_bool boolean,
  note       text,
  entered_by text not null,
  entered_at timestamptz not null default now()
);
create index if not exists cd_manual_entries_field_idx on cd_manual_entries (field, as_of_date desc);

-- False-positive ledger annotations: each TRIGGERED tripwire event gets its
-- 9-month outcome recorded (did a ≥10% event follow?) → retirement criteria.
create table if not exists cd_fp_ledger (
  id               bigint generated always as identity primary key,
  tripwire_log_id  bigint not null references cd_tripwire_log (id),
  triggered_on     date not null,
  window_ends      date not null,
  outcome          text check (outcome in ('PENDING','EVENT_FOLLOWED','NO_EVENT')),
  outcome_note     text,
  evaluated_at     timestamptz,
  unique (tripwire_log_id)
);

-- ---------------------------------------------------------------------------
-- RLS: internal-only in this phase. Service role bypasses RLS by design;
-- anon/authenticated get nothing. Subscriber-facing views deferred.
-- ---------------------------------------------------------------------------
alter table cd_readings          enable row level security;
alter table cd_tripwire_log      enable row level security;
alter table cd_state_log         enable row level security;
alter table cd_event_register    enable row level security;
alter table cd_thresholds        enable row level security;
alter table cd_threshold_changes enable row level security;
alter table cd_sentinels         enable row level security;
alter table cd_manual_entries    enable row level security;
alter table cd_fp_ledger         enable row level security;
-- No policies created: with RLS enabled and zero policies, only the service
-- role (used by the worker and the portal's server-side admin routes) has
-- access. This is intentional for the internal phase.

-- ---------------------------------------------------------------------------
-- Seed: frozen thresholds (values fixed by the 50-year backtest)
-- ---------------------------------------------------------------------------
insert into cd_thresholds (key, value, unit, basis, frozen) values
  ('CREDIT_IMPULSE_DELTA3M_BP',        50,   'bp',            'Depth ρ=+0.65 p<0.001; 92% episode association (11/12 since 1974)', true),
  ('CREDIT_CRISIS_LEVEL_BP',           250,  'bp',            'T3 dose-response; >250bp confirms capitulation regime', true),
  ('POLICY_CPI_YOY_PCT',               4.0,  'pct_yoy',       'Median depth 13.9% vs 9.4% above/below 4%; ρ=+0.30 p=0.03', true),
  ('RATE_SHOCK_DELTA3M_BP',            80,   'bp',            '56% standalone hit rate (10/18) — conditioning only', true),
  ('SAHM_ARM_LEVEL',                   0.50, 'pp',            '56% of ≥15% events vs 24% of shallower; FP Aug-2024', true),
  ('SAHM_CLAIMS_YOY_CONFIRM_PCT',      15,   'pct_yoy',       'Confirmation requirement added after Aug-2024 false positive', true),
  ('TIER1_ENTRY_DRAWDOWN_PCT',         -5.0, 'pct',           'Event definition: ≥5% close-basis decline from 6-month closing high', true),
  ('TIER2_ENTRY_DRAWDOWN_PCT',         -10.0,'pct',           'Tier taxonomy: fundamental repricing 10–20%', true),
  ('TIER3_ENTRY_DRAWDOWN_PCT',         -20.0,'pct',           'Tier taxonomy: buy-and-hold capitulation ≥20%', true),
  ('ROUTER_REGAIN_WINDOW_TD',          30,   'trading_days',  'Failed-recovery test, n=33 (1990–2022): P(≥10%)=58% vs 7%', true),
  ('ROUTER_LOWER_LOW_WINDOW_TD',       60,   'trading_days',  'Failed-recovery test, n=33 (1990–2022): P(≥10%)=58% vs 7%', true),
  ('RV_ACCEL_RATIO',                   1.75, 'ratio',         'Mechanical-class engagement; directionally validated, small n', true),
  ('VIX_CONFIRM_LEVEL',                30,   'index',         'T1 19% · T2 77% · T3 100% — endogenous confirmer only', true),
  ('VIX_CONFIRM_CLOSES',               3,    'closes',        'Sustained-3-closes rule per Spec §2 L3', true),
  ('TIER2_EXIT_RETRACE_PCT',           50,   'pct',           'Spec §3 exit condition', true),
  ('TIER3_EXIT_CREDIT_NARROWING_WEEKS',4,    'weeks',         'Spec §3 exit condition', true)
on conflict (key) do nothing;

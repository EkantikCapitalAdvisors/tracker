-- Tracker v2.1 M3 — stance-change record + client notices.
-- Presentation/notification layer only; nothing here feeds computeState.

-- One row per deployment-ladder rung change (the client-meaningful event).
create table if not exists cd_stance_log (
  id         bigint generated always as identity primary key,
  rung_id    text        not null,   -- positioning ladder row id (T0 … T3_FLAT)
  equity_pct smallint    not null,
  stance     text        not null,   -- client stance name
  as_of_date date        not null,
  created_at timestamptz not null default now()
);
alter table cd_stance_log enable row level security;

-- Client notices generated on stance change (email if a provider is
-- configured; always recorded here regardless).
create table if not exists cd_client_notices (
  id          bigint generated always as identity primary key,
  stance_from text        not null,
  stance_to   text        not null,
  subject     text        not null,
  body        text        not null,
  recipients  int         not null default 0,
  sent_via    text        not null default 'logged', -- 'resend' | 'logged'
  created_at  timestamptz not null default now()
);
alter table cd_client_notices enable row level security;

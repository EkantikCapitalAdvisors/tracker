-- Tracker v2.1 — dual-audience presentation layer (Plain View).
-- PRESENTATION ONLY: nothing in this migration is readable by computeState
-- (the engine is a pure function with no database access — the same
-- structural enforcement that keeps VIX out of transitions keeps these
-- bands out of state). Presentation bands may be tuned without the 48-hour
-- governance protocol, but every change is a new logged row (append-style:
-- latest row per gauge/band wins; keep history).

create table if not exists cd_presentation_bands (
  id             bigint generated always as identity primary key,
  gauge          text        not null,
  band           text        not null,
  condition_expr text        not null,
  threshold_value double precision,
  created_at     timestamptz not null default now(),
  changed_by     text        not null default 'seed',
  note           text
);
create index if not exists cd_presentation_bands_gauge_idx
  on cd_presentation_bands (gauge, band, id desc);
alter table cd_presentation_bands enable row level security;

-- Seed — §3 of the v2.1 build prompt. Frozen-threshold boundaries (e.g. the
-- +50bp credit trigger, CPI 4.0, Sahm 0.50) are NOT restated here: they come
-- from cd_thresholds. Only the interpolated presentation cut-offs live here.
insert into cd_presentation_bands (gauge, band, condition_expr, threshold_value, changed_by, note) values
  ('credit',   'yellow', 'Baa−10y Δ3m ≥ +25bp (and impulse not TRIGGERED)', 25,   'seed', 'halfway to the frozen +50bp trigger'),
  ('fed',      'green',  'CPI YoY ≤ 3.5%',                                   3.5, 'seed', 'comfortably below the frozen 4.0% switch'),
  ('fed',      'yellow', 'CPI YoY 3.5–4.0%',                                 4.0, 'seed', 'approaching the frozen switch'),
  ('jobs',     'green',  'Sahm < 0.35',                                      0.35,'seed', 'well below the frozen 0.50 arm level'),
  ('jobs',     'yellow', 'Sahm 0.35–0.50',                                   0.5, 'seed', 'approaching the frozen arm level'),
  ('recovery', 'orange', 'router OPEN past the 30-td regain window',         30,  'seed', 'restates ROUTER_REGAIN_WINDOW_TD for display');

-- Access register: audience determines the default landing surface after
-- registration (client → /health). Sequencing, not a wall — nothing is
-- hidden from any audience.
alter table cd_visitors
  add column if not exists audience text not null default 'client'
  check (audience in ('client','operator','full'));

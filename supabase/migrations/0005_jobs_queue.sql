-- v2.2 — replace the Upstash/BullMQ queue with a Supabase-backed job table.
-- The queue only ever carries a handful of cron-enqueued jobs per day; a
-- metered Redis (500K req/mo free tier, exhausted by BullMQ polling) was the
-- wrong tool. Single worker; optimistic claim via status transition.
create table if not exists cd_jobs (
  id          bigint generated always as identity primary key,
  job         text        not null,
  status      text        not null default 'queued'
              check (status in ('queued','running','done','failed')),
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists cd_jobs_status_idx on cd_jobs (status, id);
alter table cd_jobs enable row level security;

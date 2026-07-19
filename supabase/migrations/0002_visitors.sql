-- Visitor register — the lightweight access gate. Not authentication:
-- visitors identify themselves (name + email) once and receive a signed
-- cookie. This table is the answer to "who has this been shared with?".
create table if not exists cd_visitors (
  id          bigint generated always as identity primary key,
  email       text        not null unique,
  name        text        not null,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  visits      int         not null default 1
);

-- Service-role access only (no anon policies).
alter table cd_visitors enable row level security;

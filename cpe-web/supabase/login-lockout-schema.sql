-- Failed-login tracking + account lockout. Keyed by email (not user_id) so it
-- also throttles login attempts against emails that don't exist, preventing
-- account enumeration via timing/response differences.
create table if not exists login_lockouts (
  email         text primary key,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

alter table login_lockouts enable row level security;
-- No policies: only the service-role client (used exclusively server-side in
-- the login route) can read/write this table. Not even the authenticated
-- user should be able to see or reset their own lockout state.

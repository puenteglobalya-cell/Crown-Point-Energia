-- Passkeys (WebAuthn) — alternative to password+TOTP for portal login.
create table if not exists webauthn_credentials (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  credential_id  text not null unique,          -- base64url, from the authenticator
  public_key     text not null,                  -- base64url-encoded COSE public key
  counter        bigint not null default 0,
  transports     text[] default '{}',
  device_name    text,
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz
);

create index if not exists webauthn_credentials_user_id_idx on webauthn_credentials(user_id);

alter table webauthn_credentials enable row level security;

-- Users can see and delete their own passkeys; all writes otherwise go through
-- the service-role client in the API routes (register/verify, login/verify).
create policy webauthn_credentials_self_select on webauthn_credentials
  for select using (auth.uid() = user_id);

create policy webauthn_credentials_self_delete on webauthn_credentials
  for delete using (auth.uid() = user_id);

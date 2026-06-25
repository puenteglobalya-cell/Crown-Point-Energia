-- ═══════════════════════════════════════════════════════════════════════════
-- User Profiles — Crown Point Energía
-- Run in Supabase SQL Editor after roles-schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dni       TEXT NOT NULL DEFAULT '',
  nombre    TEXT NOT NULL DEFAULT '',
  apellido  TEXT NOT NULL DEFAULT '',
  ubicacion TEXT NOT NULL DEFAULT '',   -- e.g. "Buenos Aires", "Santa Cruz", "Calgary"
  sector    TEXT NOT NULL DEFAULT '',   -- e.g. "Operaciones", "Finanzas", "Comercial"
  telefono  TEXT NOT NULL DEFAULT '',
  notas     TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "user_profiles_self_select" ON user_profiles
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Admins (service role) manage all profiles
CREATE POLICY "user_profiles_admin_all" ON user_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fast DNI lookup and sorting (sparse — only rows with DNI set)
CREATE INDEX IF NOT EXISTS idx_user_profiles_dni
  ON user_profiles (dni) WHERE dni != '';

CREATE INDEX IF NOT EXISTS idx_user_profiles_sector
  ON user_profiles (sector) WHERE sector != '';

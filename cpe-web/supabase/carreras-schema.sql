-- ═══════════════════════════════════════════════════════════════════════════
-- Job Applications + RRHH Role — Crown Point Energía
-- ═══════════════════════════════════════════════════════════════════════════

-- Add 'rrhh' to the user_roles check constraint (idempotent)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh'));

CREATE TABLE IF NOT EXISTS job_applications (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT    NOT NULL DEFAULT '',
  email       TEXT    NOT NULL DEFAULT '',
  telefono    TEXT    NOT NULL DEFAULT '',
  linkedin    TEXT    NOT NULL DEFAULT '',
  area        TEXT    NOT NULL DEFAULT '',
  mensaje     TEXT    NOT NULL DEFAULT '',
  cv_path     TEXT,             -- Storage path in "documents" bucket
  cv_name     TEXT,             -- Original file name
  cv_size     INTEGER,          -- File size in bytes
  estado      TEXT    NOT NULL DEFAULT 'nueva',  -- 'nueva' | 'revisada' | 'contactada' | 'descartada'
  notas       TEXT    NOT NULL DEFAULT '',        -- Internal HR notes
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can read applications
DROP POLICY IF EXISTS "auth select applications" ON job_applications;
CREATE POLICY "auth select applications" ON job_applications
  FOR SELECT TO authenticated USING (true);

-- Public can insert (submit applications)
DROP POLICY IF EXISTS "public insert applications" ON job_applications;
CREATE POLICY "public insert applications" ON job_applications
  FOR INSERT WITH CHECK (true);

-- Only authenticated can update (change estado, add notes)
DROP POLICY IF EXISTS "auth update applications" ON job_applications;
CREATE POLICY "auth update applications" ON job_applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

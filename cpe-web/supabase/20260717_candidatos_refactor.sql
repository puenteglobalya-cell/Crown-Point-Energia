-- ═══════════════════════════════════════════════════════════════════════════
-- CV/RRHH database refactor — Crown Point Energía
--
-- job_applications was a single flat table with no candidate identity: the
-- same person applying twice created two unrelated rows, and several columns
-- used throughout the app code (datos, score, ai_summary, ai_analyzed_at)
-- were never in a tracked migration. This splits it into:
--   candidatos     — one row per person, deduped by email
--   postulaciones  — one row per application, links to candidatos and
--                    (optionally) to open_positions
-- job_applications is renamed to job_applications_legacy (kept, not dropped)
-- and a job_applications_view exposes the same flat shape the app already
-- reads, so existing GET endpoints don't need to change their column list.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS candidatos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL DEFAULT '',
  email       CITEXT NOT NULL,
  telefono    TEXT NOT NULL DEFAULT '',
  linkedin    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS citext;
CREATE UNIQUE INDEX IF NOT EXISTS candidatos_email_unique ON candidatos (email);

CREATE TABLE IF NOT EXISTS postulaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id  UUID NOT NULL REFERENCES candidatos (id) ON DELETE CASCADE,
  position_id   UUID REFERENCES open_positions (id) ON DELETE SET NULL,
  area          TEXT NOT NULL DEFAULT '',   -- free-text area at time of application (positions can change/disappear)
  mensaje       TEXT NOT NULL DEFAULT '',
  datos         JSONB NOT NULL DEFAULT '{}',
  cv_path       TEXT,
  cv_name       TEXT,
  cv_size       INTEGER,
  estado        TEXT NOT NULL DEFAULT 'nueva', -- 'nueva' | 'revisada' | 'contactada' | 'descartada'
  notas         TEXT NOT NULL DEFAULT '',
  score         INTEGER,
  ai_summary    TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS postulaciones_candidato_idx ON postulaciones (candidato_id);
CREATE INDEX IF NOT EXISTS postulaciones_created_idx   ON postulaciones (created_at DESC);

CREATE TABLE IF NOT EXISTS candidato_documentos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES candidatos (id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL DEFAULT 'cv', -- 'cv' | 'carta' | 'portfolio' | 'otro'
  storage_path TEXT NOT NULL,
  file_name    TEXT,
  file_size    INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidato_documentos_candidato_idx ON candidato_documentos (candidato_id);

-- ── Backfill from job_applications (idempotent: skip if already migrated) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_applications')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_applications_legacy')
  THEN
    INSERT INTO candidatos (nombre, email, telefono, linkedin, created_at)
    SELECT DISTINCT ON (lower(email))
      nombre, email, telefono, linkedin, created_at
    FROM job_applications
    WHERE email <> ''
    ORDER BY lower(email), created_at ASC
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO postulaciones (id, candidato_id, area, mensaje, datos, cv_path, cv_name, cv_size, estado, notas, score, ai_summary, ai_analyzed_at, created_at, updated_at)
    SELECT
      ja.id,
      c.id,
      ja.area, ja.mensaje,
      COALESCE(ja.datos, '{}'::jsonb),
      ja.cv_path, ja.cv_name, ja.cv_size,
      ja.estado, ja.notas, ja.score, ja.ai_summary, ja.ai_analyzed_at,
      ja.created_at, ja.updated_at
    FROM job_applications ja
    JOIN candidatos c ON lower(c.email) = lower(ja.email)
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE job_applications RENAME TO job_applications_legacy;
  END IF;
END $$;

-- ── Compatibility view — same flat shape the RRHH admin UI already reads ──
CREATE OR REPLACE VIEW job_applications_view AS
SELECT
  p.id, c.nombre, c.email, c.telefono, c.linkedin,
  p.area, p.mensaje, p.datos, p.cv_path, p.cv_name, p.cv_size,
  p.estado, p.notas, p.score, p.ai_summary, p.ai_analyzed_at,
  p.created_at, p.updated_at, p.candidato_id, p.position_id
FROM postulaciones p
JOIN candidatos c ON c.id = p.candidato_id;

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE candidatos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE postulaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidato_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth select candidatos" ON candidatos;
CREATE POLICY "auth select candidatos" ON candidatos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "public insert candidatos" ON candidatos;
CREATE POLICY "public insert candidatos" ON candidatos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "auth update candidatos" ON candidatos;
CREATE POLICY "auth update candidatos" ON candidatos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth select postulaciones" ON postulaciones;
CREATE POLICY "auth select postulaciones" ON postulaciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "public insert postulaciones" ON postulaciones;
CREATE POLICY "public insert postulaciones" ON postulaciones FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "auth all postulaciones" ON postulaciones;
CREATE POLICY "auth all postulaciones" ON postulaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth select candidato_documentos" ON candidato_documentos;
CREATE POLICY "auth select candidato_documentos" ON candidato_documentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth all candidato_documentos" ON candidato_documentos;
CREATE POLICY "auth all candidato_documentos" ON candidato_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

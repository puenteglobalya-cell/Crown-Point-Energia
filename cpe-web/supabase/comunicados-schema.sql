-- Schema for press releases (comunicados de prensa)
-- Run AFTER docs-schema.sql

CREATE TABLE IF NOT EXISTS comunicados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL,
  titulo_es   TEXT NOT NULL DEFAULT '',
  titulo_en   TEXT NOT NULL DEFAULT '',
  resumen_es  TEXT NOT NULL DEFAULT '',
  resumen_en  TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  file_name   TEXT NOT NULL DEFAULT '',
  tipo        TEXT NOT NULL DEFAULT 'general',
  publicado   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public select comunicados" ON comunicados;
DROP POLICY IF EXISTS "auth all comunicados"      ON comunicados;

CREATE POLICY "public select comunicados" ON comunicados
  FOR SELECT USING (publicado = true);

CREATE POLICY "auth all comunicados" ON comunicados
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Index for year-based queries
CREATE INDEX IF NOT EXISTS comunicados_fecha_idx ON comunicados (fecha DESC);

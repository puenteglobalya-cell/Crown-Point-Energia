-- Version history for reportes — every overwrite (estado-only PATCH or full
-- merge PATCH) snapshots the row's prior state here first, so admins can
-- restore an earlier version with one click instead of losing it forever.
CREATE TABLE IF NOT EXISTS reporte_versiones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id  UUID NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  periodo     TEXT NOT NULL,
  datos       JSONB NOT NULL,
  html        TEXT NOT NULL,
  estado      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  TEXT
);

ALTER TABLE reporte_versiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reporte_versiones_admin_all" ON reporte_versiones
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS reporte_versiones_reporte_id ON reporte_versiones (reporte_id, created_at DESC);

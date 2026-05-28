-- Reportes de ingresos estimados
CREATE TABLE IF NOT EXISTS reportes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT NOT NULL,
  periodo      TEXT NOT NULL,
  datos        JSONB NOT NULL,
  html         TEXT NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado')),
  storage_path TEXT,
  file_name    TEXT,
  file_size    BIGINT,
  subido_por   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;

-- Public can read published reports
CREATE POLICY "reportes_public_select" ON reportes
  FOR SELECT USING (estado = 'publicado');

-- Authenticated (service role bypasses RLS)
CREATE POLICY "reportes_admin_all" ON reportes
  FOR ALL USING (auth.role() = 'service_role');

-- Index for listing
CREATE INDEX IF NOT EXISTS reportes_estado_created_at ON reportes (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS reportes_periodo ON reportes (periodo DESC);

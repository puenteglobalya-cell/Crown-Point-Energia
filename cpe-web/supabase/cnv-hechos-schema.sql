-- CNV disclosures sync (hechos relevantes + estados contables)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cnv_hechos (
  doc_id      BIGINT      PRIMARY KEY,            -- document number from CNV
  fecha       DATE        NOT NULL,
  hora        TEXT,
  tipo        TEXT        NOT NULL
    CHECK (tipo IN ('hecho_relevante', 'estado_contable')),
  descripcion TEXT        NOT NULL,
  pdf_url     TEXT,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cnv_hechos_fecha_idx ON cnv_hechos (fecha DESC);
CREATE INDEX IF NOT EXISTS cnv_hechos_tipo_idx  ON cnv_hechos (tipo);

ALTER TABLE cnv_hechos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON cnv_hechos
  FOR SELECT USING (true);

CREATE POLICY "service write" ON cnv_hechos
  FOR ALL USING (auth.role() = 'service_role');

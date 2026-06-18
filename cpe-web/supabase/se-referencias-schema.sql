-- Secretaría de Energía — oferta de comercio exterior de líquidos
CREATE TABLE IF NOT EXISTS se_referencias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_desde DATE        NOT NULL,
  fecha_hasta DATE        NOT NULL,
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  headers     TEXT[]      NOT NULL DEFAULT '{}',
  filas       JSONB       NOT NULL DEFAULT '[]',
  brent_ref   NUMERIC,    -- precio Brent usado para la fórmula al momento del scraping
  scraped_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE se_referencias ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados activos pueden leer
CREATE POLICY "portal users read se_referencias"
  ON se_referencias FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo service role puede insertar/actualizar (API usa service role key)

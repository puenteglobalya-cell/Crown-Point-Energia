-- shareholder-meetings-schema.sql
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS shareholder_meetings (
  id          BIGSERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL DEFAULT 'agm' CHECK (tipo IN ('agm', 'egm')),
  fecha       DATE NOT NULL,
  hora_local  TEXT,                        -- e.g. "10:00 AM MST"
  zona_es     TEXT,                        -- e.g. "Hora de Calgary, Alberta"
  zona_en     TEXT,                        -- e.g. "Calgary, Alberta time"
  formato     TEXT NOT NULL DEFAULT 'hibrida' CHECK (formato IN ('presencial', 'virtual', 'hibrida')),
  lugar_es    TEXT,
  lugar_en    TEXT,
  titulo_es   TEXT NOT NULL,
  titulo_en   TEXT NOT NULL,
  nota_es     TEXT,
  nota_en     TEXT,
  record_date DATE,
  sedar_url   TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  orden       SMALLINT NOT NULL DEFAULT 0
);

ALTER TABLE shareholder_meetings ENABLE ROW LEVEL SECURITY;

-- Public can read active meetings
CREATE POLICY "public_select_meetings" ON shareholder_meetings
  FOR SELECT USING (activo = true);

-- Service role has full access
CREATE POLICY "service_all_meetings" ON shareholder_meetings
  FOR ALL USING (auth.role() = 'service_role');

-- ── Sample data — replace with real dates ────────────────────────────────────
INSERT INTO shareholder_meetings
  (tipo, fecha, hora_local, zona_es, zona_en, formato, lugar_es, lugar_en,
   titulo_es, titulo_en, nota_es, nota_en, record_date, sedar_url, activo, orden)
VALUES
  (
    'agm',
    '2026-09-15',
    '10:00 AM MST',
    'Hora de Calgary, Alberta (Canada)',
    'Calgary, Alberta (Canada) time',
    'hibrida',
    'Calgary, Alberta, Canada (con participación virtual disponible)',
    'Calgary, Alberta, Canada (virtual participation available)',
    'Asamblea General Anual 2026 — Crown Point Energy Inc.',
    '2026 Annual General Meeting — Crown Point Energy Inc.',
    'Elección de directores, designación de auditores y demás asuntos propios de la Asamblea. La documentación de la reunión se publicará en SEDAR+ con al menos 21 días de anticipación.',
    'Election of directors, appointment of auditors and any other business properly before the meeting. Meeting materials will be filed on SEDAR+ at least 21 days in advance.',
    '2026-08-14',
    'https://www.sedarplus.ca',
    true,
    1
  );

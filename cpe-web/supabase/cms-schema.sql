-- CMS tables for Crown Point Energy corporate website
-- Run once against your Supabase project (SQL Editor or migration runner)

-- ── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_settings (
  id         SMALLINT PRIMARY KEY DEFAULT 1,
  direction  TEXT NOT NULL DEFAULT 'corporativo',
  theme      TEXT NOT NULL DEFAULT 'light',
  lang       TEXT NOT NULL DEFAULT 'es',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cms_settings_single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS cms_sections (
  key        TEXT PRIMARY KEY,
  visible    BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_fields (
  key        TEXT PRIMARY KEY,
  value_es   TEXT NOT NULL DEFAULT '',
  value_en   TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE cms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_fields   ENABLE ROW LEVEL SECURITY;

-- Public can read
DROP POLICY IF EXISTS "public select settings" ON cms_settings;
DROP POLICY IF EXISTS "public select sections" ON cms_sections;
DROP POLICY IF EXISTS "public select fields"   ON cms_fields;
CREATE POLICY "public select settings" ON cms_settings FOR SELECT USING (true);
CREATE POLICY "public select sections" ON cms_sections FOR SELECT USING (true);
CREATE POLICY "public select fields"   ON cms_fields   FOR SELECT USING (true);

-- Authenticated users can write (admin email check is done in the API route)
DROP POLICY IF EXISTS "auth insert/update settings" ON cms_settings;
DROP POLICY IF EXISTS "auth insert/update sections" ON cms_sections;
DROP POLICY IF EXISTS "auth insert/update fields"   ON cms_fields;
CREATE POLICY "auth insert/update settings" ON cms_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth insert/update sections" ON cms_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth insert/update fields"   ON cms_fields   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Seed default data ──────────────────────────────────────────────────────

INSERT INTO cms_settings (id, direction, theme, lang) VALUES (1, 'corporativo', 'light', 'es')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO cms_sections (key, visible) VALUES
  ('ticker',              true),
  ('hero',                true),
  ('basinsStrip',         true),
  ('kpis',                true),
  ('ops',                 true),
  ('investor',            true),
  ('investor.quotePanel', true),
  ('investor.sparkline',  true),
  ('investor.beta',       true),
  ('investor.vol30',      true),
  ('investor.high52',     true),
  ('investor.low52',      true),
  ('investor.cap',        true),
  ('investor.shares',     true),
  ('press',               true),
  ('contact',             true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('kpi.production.value', '8,672',   '8,672'),
  ('kpi.production.unit',  'boe/d',   'boe/d'),
  ('kpi.production.delta', '1Q 2026', '1Q 2026'),
  ('kpi.reserves.value',   '36.996',       '36.996'),
  ('kpi.reserves.unit',    'MMboe',        'MMboe'),
  ('kpi.reserves.delta',   'P1 Sproule',   'P1 Sproule'),
  ('kpi.ebitda.value',     'US$18M',  'US$18M'),
  ('kpi.ebitda.unit',      'LTM',     'LTM'),
  ('kpi.ebitda.delta',     '+23% YoY','+23% YoY'),
  ('kpi.blocks.value',     '6',       '6'),
  ('kpi.blocks.unit',      'bloques', 'blocks'),
  ('kpi.blocks.delta',     '4 cuencas','4 basins'),
  ('stock.price',          'CA $0.205','CA $0.205'),
  ('stock.delta',          '+0.00%',  '+0.00%'),
  ('stock.beta',           '0.93',    '0.93'),
  ('stock.vol30',          '14,210',  '14,210'),
  ('stock.high52',         'CA $0.310','CA $0.310'),
  ('stock.low52',          'CA $0.150','CA $0.150'),
  ('stock.cap',            'CA $18.4M','CA $18.4M'),
  ('stock.shares',         '89.7M',   '89.7M')
ON CONFLICT (key) DO NOTHING;

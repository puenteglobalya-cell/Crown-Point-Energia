-- ═══════════════════════════════════════════════════════════════════════════
-- Editable Content Schema — Crown Point Energía
-- Run this file in Supabase SQL Editor to create all CMS-editable tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. IR Calendar Events ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ir_events (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha      DATE    NOT NULL,
  tipo       TEXT    NOT NULL DEFAULT 'results',  -- 'results' | 'agm' | 'other'
  titulo_es  TEXT    NOT NULL DEFAULT '',
  titulo_en  TEXT    NOT NULL DEFAULT '',
  nota_es    TEXT    NOT NULL DEFAULT '',
  nota_en    TEXT    NOT NULL DEFAULT '',
  activo     BOOLEAN NOT NULL DEFAULT true,
  orden      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ir_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select ir_events" ON ir_events;
DROP POLICY IF EXISTS "auth all ir_events"      ON ir_events;
CREATE POLICY "public select ir_events" ON ir_events FOR SELECT USING (activo = true);
CREATE POLICY "auth all ir_events"      ON ir_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO ir_events (fecha, tipo, titulo_es, titulo_en, nota_es, nota_en, activo, orden) VALUES
  ('2026-06-25', 'results', 'Resultados Q1 2026',       'Q1 2026 Results',       'MD&A + estados trimestrales', 'MD&A + quarterly financials', true, 1),
  ('2026-08-14', 'results', 'Resultados Q2 2026',       'Q2 2026 Results',       'MD&A + estados trimestrales', 'MD&A + quarterly financials', true, 2),
  ('2026-09-03', 'agm',     'Asamblea General Anual',   'Annual General Meeting','TSX Venture · Calgary',       'TSX Venture · Calgary',       true, 3),
  ('2026-11-13', 'results', 'Resultados Q3 2026',       'Q3 2026 Results',       'MD&A + estados trimestrales', 'MD&A + quarterly financials', true, 4)
ON CONFLICT DO NOTHING;


-- ── 2. Analyst Coverage ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ir_analysts (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst    TEXT    NOT NULL DEFAULT '',
  firm       TEXT    NOT NULL DEFAULT '',
  rating_es  TEXT    NOT NULL DEFAULT '',
  rating_en  TEXT    NOT NULL DEFAULT '',
  target     TEXT    NOT NULL DEFAULT '',
  activo     BOOLEAN NOT NULL DEFAULT true,
  orden      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ir_analysts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select ir_analysts" ON ir_analysts;
DROP POLICY IF EXISTS "auth all ir_analysts"      ON ir_analysts;
CREATE POLICY "public select ir_analysts" ON ir_analysts FOR SELECT USING (activo = true);
CREATE POLICY "auth all ir_analysts"      ON ir_analysts FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO ir_analysts (analyst, firm, rating_es, rating_en, target, activo, orden) VALUES
  ('James Harrington', 'Canaccord Genuity', 'Comprar especulativo', 'Speculative Buy', 'CA $0.45', true, 1),
  ('María López',      'Echevarría Tuesta', 'Mantener',             'Hold',            'CA $0.22', true, 2)
ON CONFLICT DO NOTHING;


-- ── 3. Obligaciones Negociables ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS obligaciones_negociables (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  serie       TEXT    NOT NULL DEFAULT '',
  monto       TEXT    NOT NULL DEFAULT '',   -- e.g. 'USD 12.5M'
  vencimiento TEXT    NOT NULL DEFAULT '',   -- e.g. '15/03/2028'
  tasa        TEXT    NOT NULL DEFAULT '',   -- e.g. '9.5% fija'
  isin        TEXT    NOT NULL DEFAULT '',
  bolsa       TEXT    NOT NULL DEFAULT '',
  activo      BOOLEAN NOT NULL DEFAULT true,
  orden       INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE obligaciones_negociables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select ons" ON obligaciones_negociables;
DROP POLICY IF EXISTS "auth all ons"      ON obligaciones_negociables;
CREATE POLICY "public select ons" ON obligaciones_negociables FOR SELECT USING (activo = true);
CREATE POLICY "auth all ons"      ON obligaciones_negociables FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO obligaciones_negociables (serie, monto, vencimiento, tasa, isin, bolsa, activo, orden) VALUES
  ('Serie I',  'USD 10.0M', '15/09/2026', '9.0% fija anual', 'ARG420810GVA5', 'MAE · BYMA', true, 1),
  ('Serie II', 'USD 12.5M', '15/03/2028', '9.5% fija anual', 'ARG420810GVB3', 'MAE · BYMA', true, 2)
ON CONFLICT DO NOTHING;


-- ── 4. Operations Blocks ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operations_blocks (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT    UNIQUE NOT NULL,
  orden         INTEGER NOT NULL DEFAULT 0,
  commodity     TEXT    NOT NULL DEFAULT 'oil',  -- 'oil' | 'gas' | 'mixed'
  eyebrow       TEXT    NOT NULL DEFAULT '',
  titulo        TEXT    NOT NULL DEFAULT '',
  lede_es       TEXT    NOT NULL DEFAULT '',
  lede_en       TEXT    NOT NULL DEFAULT '',
  card_title_es TEXT    NOT NULL DEFAULT '',
  card_title_en TEXT    NOT NULL DEFAULT '',
  chips         JSONB   NOT NULL DEFAULT '[]',   -- string[]
  body_es       TEXT[]  NOT NULL DEFAULT '{}',
  body_en       TEXT[]  NOT NULL DEFAULT '{}',
  stats         JSONB   NOT NULL DEFAULT '[]',   -- [{label_es,label_en,val_es,val_en}]
  map_stats     JSONB   NOT NULL DEFAULT '[]',   -- [{label_es,label_en,val}] for popup
  activo        BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE operations_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select ops_blocks" ON operations_blocks;
DROP POLICY IF EXISTS "auth all ops_blocks"      ON operations_blocks;
CREATE POLICY "public select ops_blocks" ON operations_blocks FOR SELECT USING (activo = true);
CREATE POLICY "auth all ops_blocks"      ON operations_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO operations_blocks (slug, orden, commodity, eyebrow, titulo, lede_es, lede_en, card_title_es, card_title_en, chips, body_es, body_en, stats, map_stats) VALUES
(
  'ppc', 1, 'oil',
  '01 · Cuenca Neuquina Norte',
  'Puesto Pozo Cercado Oriental',
  'Bloque exploratorio en el norte de la provincia de Mendoza, sobre el flanco norte de la Cuenca Neuquina. Joint venture con foco en prospectos convencionales y oportunidades sobre Vaca Muerta.',
  'Exploration block in northern Mendoza, on the northern flank of the Neuquén Basin. JV targeting conventional prospects and Vaca Muerta opportunities.',
  'Bloque exploratorio', 'Exploration block',
  '["50% WI", "Exploratorio / Exploration"]',
  ARRAY[
    'El bloque cubre aproximadamente 95 km² en el norte de la Cuenca Neuquina. La estructura geológica presenta dos targets principales: prospectos convencionales en formaciones Quintuco y Mulichinco, y oportunidades no convencionales sobre Vaca Muerta.',
    'La adquisición sísmica 3D realizada en 2024 confirmó la presencia de hidrocarburos en tres estructuras. El plan exploratorio 2026–2027 contempla la perforación del primer pozo de evaluación.'
  ],
  ARRAY[
    'The block covers approximately 95 km² in the northern Neuquén Basin. Two main targets: conventional prospects in the Quintuco and Mulichinco formations, and Vaca Muerta unconventional opportunities.',
    '3D seismic acquired in 2024 confirmed hydrocarbon presence in three structures. The 2026–2027 exploration plan covers the first evaluation well.'
  ],
  '[{"label_es":"Participación","label_en":"Working interest","val":"50% WI"},{"label_es":"Superficie","label_en":"Acreage","val":"9,500 ha"},{"label_es":"Formaciones objetivo","label_en":"Target formations","val":"Vaca Muerta · Quintuco · Mulichinco"},{"label_es":"Producción actual","label_en":"Current production","val":"—"},{"label_es":"Próximo hito","label_en":"Next milestone","val":"Pozo evaluación · Q4 2026"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza"}]',
  '[{"label_es":"WI","label_en":"WI","val":"50%"},{"label_es":"Superficie","label_en":"Acreage","val":"9,500 ha"},{"label_es":"Target","label_en":"Target","val":"Vaca Muerta"},{"label_es":"Estado","label_en":"Status","val":"Exploratorio / Exploration"}]'
),
(
  'chanares', 2, 'oil',
  '02 · Cuenca Cuyana',
  'Chañares Herrados',
  'Concesión productiva en el centro de Mendoza, con crudo liviano (38° API) e infraestructura propia conectada al oleoducto Allanito–Luján de Cuyo.',
  'Producing concession in central Mendoza, light crude (38° API) with proprietary infrastructure connected to the Allanito–Luján de Cuyo oil pipeline.',
  'Crudo liviano premium', 'Premium light crude',
  '["75.8% WI", "Operador / Operator", "38° API"]',
  ARRAY[
    'Crown Point opera el bloque desde 2014 con una participación del 75,8%. El bloque ha mantenido una producción promedio de 380 boe/d con un declino natural anual menor al 8%.',
    'El programa de workover 2026 contempla la intervención de 6 pozos productores y la perforación de 2 pozos infill, con un objetivo de incremento de 180 boe/d.'
  ],
  ARRAY[
    'Crown Point has operated the block since 2014 with a 75.8% interest. Average production of 380 boe/d with an annual natural decline below 8%.',
    'The 2026 workover program plans 6 well interventions and 2 infill wells, with a 180 boe/d uplift target.'
  ],
  '[{"label_es":"Pozos productores","label_en":"Producing wells","val":"14"},{"label_es":"Producción neta","label_en":"Net production","val":"288 boe/d"},{"label_es":"Calidad de crudo","label_en":"Crude quality","val":"38° API"},{"label_es":"Punto de equilibrio","label_en":"Breakeven","val":"US$32/bbl"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2037"}]',
  '[{"label_es":"WI","label_en":"WI","val":"75.8%"},{"label_es":"Producción neta","label_en":"Net production","val":"288 boe/d"},{"label_es":"Calidad","label_en":"Quality","val":"38° API"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2037"}]'
),
(
  'cerro', 3, 'oil',
  '03 · Cuenca Neuquina',
  'Cerro de Los Leones',
  'Bloque exploratorio de 101.208 hectáreas en el norte de la Cuenca Neuquina, provincia de Mendoza, con potencial convencional y no convencional.',
  '101,208-hectare exploration block in the northern Neuquén Basin, Mendoza province, with conventional and unconventional potential.',
  'Estructura del bloque', 'Block structure',
  '["100% Operador / Operator", "Exploratorio / Exploration"]',
  ARRAY[
    'El área se encuentra en la parte norte del play Vaca Muerta, con prospectos convencionales en formaciones Tordillo, Quintuco y Mulichinco. Los estudios sísmicos 3D adquiridos en 2023 confirmaron presencia de hidrocarburos en cuatro estructuras independientes.',
    'El plan de desarrollo 2026–2027 contempla la perforación de 4 pozos exploratorios y 2 pozos de delineación, con un capex estimado de USD 18M.'
  ],
  ARRAY[
    'The area sits in the northern Vaca Muerta play, with conventional prospects in the Tordillo, Quintuco and Mulichinco formations. 3D seismic acquired in 2023 confirmed hydrocarbon presence across four independent structures.',
    'The 2026–2027 development plan covers 4 exploration wells and 2 delineation wells, with estimated capex of USD 18M.'
  ],
  '[{"label_es":"Superficie","label_en":"Acreage","val":"101,208 ha"},{"label_es":"Profundidad objetivo","label_en":"Target depth","val":"2,800–3,600 m"},{"label_es":"Producción actual","label_en":"Current production","val":"—"},{"label_es":"Próximo hito","label_en":"Next milestone","val":"Pozo CdLL.x-1 · Q3 2026"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza"}]',
  '[{"label_es":"WI","label_en":"WI","val":"100%"},{"label_es":"Superficie","label_en":"Acreage","val":"101,208 ha"},{"label_es":"Estado","label_en":"Status","val":"Exploratorio / Exploration"},{"label_es":"Próximo hito","label_en":"Next milestone","val":"CdLL.x-1 · Q3 2026"}]'
),
(
  'tordillo', 4, 'mixed',
  '04 · Golfo San Jorge · Chubut',
  'El Tordillo · La Tapera · Puesto Quiroga',
  'Tres concesiones contiguas en el flanco norte de la Cuenca del Golfo San Jorge, provincia de Chubut. El bloque productivo más grande de Crown Point por volumen.',
  'Three contiguous concessions on the northern flank of the San Jorge Gulf Basin, Chubut province. Crown Point''s largest producing block by volume.',
  'Producción consolidada con waterflood', 'Consolidated production with waterflood',
  '["22.5% WI", "Operador / Operator", "Crudo & Gas / Oil & Gas"]',
  ARRAY[
    'Tres áreas operadas conjuntamente — El Tordillo, La Tapera y Puesto Quiroga — que totalizan 453 km² en la provincia de Chubut. Crown Point mantiene una participación del 22,5% del net working interest.',
    'El bloque produce 4.557 bbl/d de petróleo y 6.843 Mcf/d de gas natural (5.698 boe/d brutos). Cuenta con un programa de recuperación secundaria con 83 pozos inyectores activos.'
  ],
  ARRAY[
    'Three jointly-operated areas — El Tordillo, La Tapera and Puesto Quiroga — totaling 453 km² in Chubut province. Crown Point holds a 22.5% net working interest.',
    'The block produces 4,557 bbl/d of oil and 6,843 Mcf/d of natural gas (5,698 boe/d gross) with a secondary recovery program running 83 active injectors.'
  ],
  '[{"label_es":"Producción petróleo","label_en":"Oil production","val":"4,557 Bbl/d"},{"label_es":"Producción gas","label_en":"Gas production","val":"6,843 Mcf/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"269"},{"label_es":"Pozos inyectores","label_en":"Injector wells","val":"83"},{"label_es":"Superficie","label_en":"Acreage","val":"113,325 acres · 453 km²"},{"label_es":"Vencimiento","label_en":"Expiry","val":"14/11/2027 (+ext.)"}]',
  '[{"label_es":"WI","label_en":"WI","val":"22.5%"},{"label_es":"Prod. petróleo","label_en":"Oil prod.","val":"4,557 Bbl/d"},{"label_es":"Prod. gas","label_en":"Gas prod.","val":"6,843 Mcf/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"269"}]'
),
(
  'piedra', 5, 'oil',
  '05 · Golfo San Jorge · Santa Cruz',
  'Piedra Clavada – Koluel Kaike',
  'Bloque adquirido en 2024 en la provincia de Santa Cruz, parte del prolífico play Golfo San Jorge, con foco en crudo pesado y oportunidades de EOR.',
  'Block acquired in 2024 in Santa Cruz province, part of the prolific San Jorge Gulf play, focused on heavy crude and EOR opportunities.',
  'Activo de crecimiento', 'Growth asset',
  '["100% WI", "Operador / Operator", "Crudo pesado / Heavy crude"]',
  ARRAY[
    'La concesión cubre 8.840 hectáreas con 22 pozos productores existentes. El plan de desarrollo 2026 incluye la conversión de 8 pozos a inyección con waterflood y la perforación de 4 pozos nuevos.',
    'El crudo se entrega por camión a la refinería de Caleta Olivia con descuento típico de US$8/bbl sobre Medanito.'
  ],
  ARRAY[
    'The 8,840-hectare concession includes 22 existing producing wells. The 2026 development plan adds 8 waterflood injectors plus 4 new producers.',
    'Crude is trucked to the Caleta Olivia refinery with a typical US$8/bbl discount to Medanito.'
  ],
  '[{"label_es":"Superficie","label_en":"Acreage","val":"8,840 ha"},{"label_es":"Pozos productores","label_en":"Producing wells","val":"22"},{"label_es":"Producción neta","label_en":"Net production","val":"342 boe/d"},{"label_es":"Calidad de crudo","label_en":"Crude quality","val":"21° API"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2049"}]',
  '[{"label_es":"WI","label_en":"WI","val":"100%"},{"label_es":"Producción neta","label_en":"Net production","val":"342 boe/d"},{"label_es":"Calidad","label_en":"Quality","val":"21° API"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2049"}]'
),
(
  'tdf', 6, 'gas',
  '06 · Cuenca Austral · Tierra del Fuego',
  'Río Cullen · Las Violetas · La Angostura',
  'Tres concesiones contiguas — Las Violetas, Río Cullen y La Angostura — con producción estable de gas natural y líquidos asociados desde 1986.',
  'Three contiguous concessions — Las Violetas, Río Cullen and La Angostura — producing stable natural gas and associated liquids since 1986.',
  'Operación productiva', 'Producing operation',
  '["48.3% WI", "Participación / Working interest"]',
  ARRAY[
    'Las concesiones operan en conjunto con Apco Oil & Gas Argentina. La producción promedio histórica ha sido de 8.500 boe/d brutos, con un 78% gas natural.',
    'Las plantas de tratamiento Cañadón Alfa y Río Chico están conectadas al sistema TGS para entrega de gas, y al oleoducto regional para crudo y condensado.'
  ],
  ARRAY[
    'The concessions are operated jointly with Apco Oil & Gas Argentina. Historical average production has been 8,500 boe/d gross, 78% natural gas.',
    'The Cañadón Alfa and Río Chico processing plants are connected to the TGS gas pipeline system and to the regional crude and condensate pipeline.'
  ],
  '[{"label_es":"Concesiones","label_en":"Concessions","val":"3"},{"label_es":"Pozos activos","label_en":"Active wells","val":"52"},{"label_es":"Producción neta","label_en":"Net production","val":"1,210 boe/d"},{"label_es":"Mix","label_en":"Mix","val":"78% gas · 22% líquidos"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2041"}]',
  '[{"label_es":"WI","label_en":"WI","val":"48.3%"},{"label_es":"Producción neta","label_en":"Net production","val":"1,210 boe/d"},{"label_es":"Mix","label_en":"Mix","val":"78% gas · 22% líquidos"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2041"}]'
)
ON CONFLICT (slug) DO NOTHING;


-- ── 5. Team Members (Management + Board) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL DEFAULT '',
  role_es      TEXT    NOT NULL DEFAULT '',
  role_en      TEXT    NOT NULL DEFAULT '',
  bio_es       TEXT    NOT NULL DEFAULT '',
  bio_en       TEXT    NOT NULL DEFAULT '',
  initials     TEXT    NOT NULL DEFAULT '',
  bg           TEXT    NOT NULL DEFAULT 'linear-gradient(135deg,#1F2566,#4F5478)',
  tipo         TEXT    NOT NULL DEFAULT 'management', -- 'management' | 'board'
  cargo_board  TEXT    NOT NULL DEFAULT '',  -- Board-only: 'Chairman', 'Director', etc.
  independiente BOOLEAN,
  orden        INTEGER NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select team" ON team_members;
DROP POLICY IF EXISTS "auth all team"      ON team_members;
CREATE POLICY "public select team" ON team_members FOR SELECT USING (activo = true);
CREATE POLICY "auth all team"      ON team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO team_members (name, role_es, role_en, bio_es, bio_en, initials, bg, tipo, cargo_board, independiente, orden) VALUES
  ('Andrés Suárez', 'CEO & Presidente', 'CEO & President', '25 años en upstream argentino. Ingeniero en Petróleo (UBA), MBA IAE.', '25 years in Argentine upstream. Petroleum Engineer (UBA), IAE MBA.', 'AS', 'linear-gradient(135deg,#1F2566,#4F5478)', 'management', '', NULL, 1),
  ('Mariano Vega',  'CFO',              'CFO',             '18 años en mercados de capital. Ex Macro Securities, ex YPF Treasury.',  '18 years in capital markets. Ex Macro Securities, ex YPF Treasury.',  'MV', 'linear-gradient(135deg,#6CAE52,#4E8A38)', 'management', '', NULL, 2),
  ('Laura Ramos',   'COO',              'COO',             '22 años de experiencia operativa en Cuenca Neuquina y Cuyana.',          '22 years of operational experience in the Neuquén and Cuyana basins.', 'LR', 'linear-gradient(135deg,#B05E2A,#8A3F1A)', 'management', '', NULL, 3),
  ('Diego García',  'VP Operaciones',   'VP Operations',   'Ex Pluspetrol. Geólogo (UNLP). Especialista en Golfo San Jorge.',       'Ex Pluspetrol. Geologist (UNLP). San Jorge specialist.',              'DG', 'linear-gradient(135deg,#C9A24A,#A37F2C)', 'management', '', NULL, 4),
  ('Brian Moss',     '', '', '', '', 'BM', 'linear-gradient(135deg,#1F2566,#4F5478)', 'board', 'Chairman', true,  1),
  ('Andrés Suárez',  '', '', '', '', 'AS', 'linear-gradient(135deg,#1F2566,#4F5478)', 'board', 'CEO & Director', false, 2),
  ('Camila Pereyra', '', '', '', '', 'CP', 'linear-gradient(135deg,#6CAE52,#4E8A38)', 'board', 'Director', true,  3),
  ('Edward Brown',   '', '', '', '', 'EB', 'linear-gradient(135deg,#2FA08A,#1A7D68)', 'board', 'Director', true,  4),
  ('Roberto Cuevas', '', '', '', '', 'RC', 'linear-gradient(135deg,#C9A24A,#A37F2C)', 'board', 'Director', true,  5)
ON CONFLICT DO NOTHING;


-- ── 6. Strategy Cards ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strategy_cards (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  num      TEXT    NOT NULL DEFAULT '01',
  title_es TEXT    NOT NULL DEFAULT '',
  title_en TEXT    NOT NULL DEFAULT '',
  body_es  TEXT    NOT NULL DEFAULT '',
  body_en  TEXT    NOT NULL DEFAULT '',
  orden    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE strategy_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select strategy" ON strategy_cards;
DROP POLICY IF EXISTS "auth all strategy"      ON strategy_cards;
CREATE POLICY "public select strategy" ON strategy_cards FOR SELECT USING (true);
CREATE POLICY "auth all strategy"      ON strategy_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO strategy_cards (num, title_es, title_en, body_es, body_en, orden) VALUES
  ('01', 'Producción base',      'Base production',       'Sostener y optimizar la producción existente con workovers y recuperación secundaria. La base genera el cash flow que financia el crecimiento.', 'Sustain and optimize existing production with workovers and secondary recovery. The base generates the cash flow that funds growth.', 1),
  ('02', 'Disciplina de capital','Capital discipline',    'Solo aprobamos proyectos con TIR esperada > 30% a precios conservadores. Mantenemos Net Debt/EBITDA por debajo de 1,5x en todo momento.', 'We only approve projects with expected IRR > 30% at conservative prices. We keep Net Debt/EBITDA below 1.5x at all times.', 2),
  ('03', 'Adquisición selectiva','Selective acquisition', 'Crecemos por adquisición de bloques productivos con upside operativo identificable, priorizando cuencas donde ya operamos.', 'We grow by acquiring producing blocks with identifiable operational upside, prioritizing basins where we already operate.', 3),
  ('04', 'Vinculación honesta',  'Honest engagement',     'Reportamos con transparencia. Cumplimos con NI 51-101 y NI 52-110. Trabajamos cerca de comunidades locales en cada bloque.', 'We report transparently. We comply with NI 51-101 and NI 52-110. We work closely with local communities at every block.', 4)
ON CONFLICT DO NOTHING;


-- ── 7. Open Positions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS open_positions (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  area     TEXT    NOT NULL DEFAULT '',
  location TEXT    NOT NULL DEFAULT '',
  tipo     TEXT    NOT NULL DEFAULT 'Full-time',
  activo   BOOLEAN NOT NULL DEFAULT true,
  orden    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE open_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select positions" ON open_positions;
DROP POLICY IF EXISTS "auth all positions"      ON open_positions;
CREATE POLICY "public select positions" ON open_positions FOR SELECT USING (activo = true);
CREATE POLICY "auth all positions"      ON open_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO open_positions (area, location, tipo, activo, orden) VALUES
  ('Ingeniería de yacimientos', 'Buenos Aires / Chubut',  'Full-time', true, 1),
  ('Geología & geofísica',      'Buenos Aires / Mendoza', 'Full-time', true, 2),
  ('HSE & ESG Coordinator',     'Buenos Aires',           'Full-time', true, 3),
  ('Finance & IR Analyst',      'Buenos Aires',           'Full-time', true, 4)
ON CONFLICT DO NOTHING;


-- ── 8. Culture Cards (Carreras) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS culture_cards (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es TEXT    NOT NULL DEFAULT '',
  title_en TEXT    NOT NULL DEFAULT '',
  desc_es  TEXT    NOT NULL DEFAULT '',
  desc_en  TEXT    NOT NULL DEFAULT '',
  color    TEXT    NOT NULL DEFAULT '#C9A24A',
  icon_key TEXT    NOT NULL DEFAULT 'shield',  -- 'shield' | 'sun' | 'people' | 'chart'
  orden    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE culture_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select culture" ON culture_cards;
DROP POLICY IF EXISTS "auth all culture"      ON culture_cards;
CREATE POLICY "public select culture" ON culture_cards FOR SELECT USING (true);
CREATE POLICY "auth all culture"      ON culture_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO culture_cards (title_es, title_en, desc_es, desc_en, color, icon_key, orden) VALUES
  ('Seguridad primero', 'Safety first',        'Ningún trabajo justifica poner en riesgo la integridad de las personas. Trabajamos con permisos de trabajo, análisis de riesgo y cultura de stop-work authority.', 'No job justifies putting people at risk. We operate with work permits, risk analysis and a stop-work authority culture.', '#C9A24A', 'shield',  1),
  ('Innovación aplicada', 'Applied innovation','Resolvemos desafíos técnicos reales: desde sísmica 3D en zonas remotas hasta optimización de inyección de agua con machine learning.', 'We solve real technical challenges: from 3D seismic in remote areas to waterflood optimisation with machine learning.', '#6CAE52', 'sun',     2),
  ('Equipo diverso',    'Diverse team',         'Nuestro equipo combina trayectorias locales e internacionales en geología, ingeniería, finanzas y ESG. Valoramos perspectivas distintas.', 'Our team combines local and international backgrounds in geology, engineering, finance and ESG. We value different perspectives.', '#2FA08A', 'people',  3),
  ('Impacto medible',   'Measurable impact',    'Trabajamos con métricas claras: producción, costos, reservas, emisiones. Cada área tiene objetivos cuantificables y visibility en los resultados de la compañía.', 'We work with clear metrics: production, costs, reserves, emissions. Every area has quantifiable goals and visibility into company results.', '#1F2566', 'chart',   4)
ON CONFLICT DO NOTHING;


-- ── 9. ESG Pillar Data ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS esg_pillar_data (
  pilar          TEXT    PRIMARY KEY,  -- 'ambiental' | 'social' | 'gobernanza'
  color          TEXT    NOT NULL DEFAULT '#2FA08A',
  lede_es        TEXT    NOT NULL DEFAULT '',
  lede_en        TEXT    NOT NULL DEFAULT '',
  metrics        JSONB   NOT NULL DEFAULT '[]',   -- [{labelEs, labelEn, val}]
  initiatives_es TEXT[]  NOT NULL DEFAULT '{}',
  initiatives_en TEXT[]  NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE esg_pillar_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select esg" ON esg_pillar_data;
DROP POLICY IF EXISTS "auth all esg"      ON esg_pillar_data;
CREATE POLICY "public select esg" ON esg_pillar_data FOR SELECT USING (true);
CREATE POLICY "auth all esg"      ON esg_pillar_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO esg_pillar_data (pilar, color, lede_es, lede_en, metrics, initiatives_es, initiatives_en) VALUES
(
  'ambiental', '#2FA08A',
  'Operamos con un enfoque de minimización de impactos y reducción progresiva de emisiones en todos nuestros bloques.',
  'We operate with a focus on minimising impacts and progressively reducing emissions across all our blocks.',
  '[{"labelEs":"Reducción de emisiones (2024 vs. 2022)","labelEn":"Emissions reduction (2024 vs. 2022)","val":"−18%"},{"labelEs":"Gas antorcha quemado (% de producción)","labelEn":"Gas flared (% of production)","val":"<2.1%"},{"labelEs":"Agua reinyectada / producida","labelEn":"Water reinjected / produced","val":"94%"},{"labelEs":"Pozos remediados 2024","labelEn":"Remediated wells 2024","val":"11"}]',
  ARRAY[
    'Programa de monitoreo continuo de emisiones fugitivas en todas las instalaciones de superficie.',
    'Electrificación progresiva de compresores en Tordillo con generación fotovoltaica solar.',
    'Sistema de gestión ambiental certificado bajo ISO 14001 en las operaciones de Tierra del Fuego.'
  ],
  ARRAY[
    'Continuous fugitive emission monitoring programme at all surface facilities.',
    'Progressive electrification of Tordillo compressors with solar photovoltaic generation.',
    'Environmental management system certified under ISO 14001 for Tierra del Fuego operations.'
  ]
),
(
  'social', '#6CAE52',
  'Las comunidades donde operamos son parte de nuestra estrategia. Generamos empleo local, apoyamos educación técnica y mantenemos estándares de salud y seguridad de primer nivel.',
  'The communities where we operate are part of our strategy. We generate local employment, support technical education and maintain world-class health and safety standards.',
  '[{"labelEs":"Empleados directos","labelEn":"Direct employees","val":"328"},{"labelEs":"Empleados locales (en provincia)","labelEn":"Local employees (in province)","val":"71%"},{"labelEs":"Horas de capacitación / empleado","labelEn":"Training hours / employee","val":"42h"},{"labelEs":"Tasa de accidentes (TRIR)","labelEn":"Accident rate (TRIR)","val":"0.87"}]',
  ARRAY[
    'Programa de becas universitarias para hijos de colaboradores y estudiantes de comunidades aledañas a los bloques operativos.',
    'Acuerdos con institutos técnicos en Mendoza, Chubut y Tierra del Fuego para formación de técnicos en petróleo y gas.',
    'Clínicas móviles de salud y audiciones periódicas en localidades cercanas a los bloques en zonas remotas.'
  ],
  ARRAY[
    'University scholarship programme for employees'' children and students from communities near operating blocks.',
    'Agreements with technical institutes in Mendoza, Chubut and Tierra del Fuego for oil and gas technician training.',
    'Mobile health clinics and periodic health screenings in communities near remote operating blocks.'
  ]
),
(
  'gobernanza', '#C9A24A',
  'Reportamos bajo estándares canadienses con directorio mayoritariamente independiente, política anti-corrupción, línea ética y divulgación completa en SEDAR+.',
  'We report under Canadian standards with a majority-independent board, anti-corruption policy, ethics hotline and full disclosure on SEDAR+.',
  '[{"labelEs":"Directores independientes","labelEn":"Independent directors","val":"4/5"},{"labelEs":"Directoras mujeres","labelEn":"Female directors","val":"2"},{"labelEs":"Auditores externos","labelEn":"External auditors","val":"KPMG"},{"labelEs":"Cotización regulatoria","labelEn":"Regulatory listing","val":"TSXV · CNV"}]',
  ARRAY[
    'Código de Ética aplicable a todos los directores, ejecutivos, empleados y contratistas, con línea de reporte confidencial.',
    'Política de anti-corrupción y anti-soborno conforme a la Ley Canadiense de Corrupción de Funcionarios Extranjeros (CFPOA).',
    'Política de diversidad en el directorio con objetivo del 30% de representación de géneros no predominantes para 2027.'
  ],
  ARRAY[
    'Code of Ethics applicable to all directors, officers, employees and contractors, with a confidential reporting hotline.',
    'Anti-corruption and anti-bribery policy in compliance with the Canadian Corruption of Foreign Public Officials Act (CFPOA).',
    'Board diversity policy with a target of 30% non-predominant gender representation by 2027.'
  ]
)
ON CONFLICT (pilar) DO NOTHING;


-- ── 10. Seed hero text into cms_fields ─────────────────────────────────────
-- These are all page hero texts — h1 and lede paragraph (bilingual)

INSERT INTO cms_fields (key, value_es, value_en) VALUES
  -- Inversores
  ('page.inversores.h1',   'Una historia sólida<br/>de creación de valor.',              'A solid story<br/>of value creation.'),
  ('page.inversores.lede', 'Crown Point Energía S.A. es una empresa dedicada al petróleo y gas con cobertura internacional que opera en el mercado argentino. Su empresa holding Crown Point Energy Inc. cotiza en el Toronto Stock Exchange Venture (TSXV) bajo el símbolo "CWV". La Compañía está constituida en Canadá y tiene su sede central en Buenos Aires, Argentina.',
                            'Crown Point Energía S.A. is an internationally covered oil & gas company operating in the Argentine market. Its holding company Crown Point Energy Inc. is listed on the Toronto Stock Exchange Venture (TSXV) under the symbol "CWV". The Company is incorporated in Canada and has its headquarters in Buenos Aires, Argentina.'),
  -- Operaciones
  ('page.operaciones.h1',   'Seis bloques.<br/>Cuatro cuencas.<br/>Un país.',            'Six blocks.<br/>Four basins.<br/>One country.'),
  ('page.operaciones.lede', 'Una cartera diversificada de áreas productivas y exploratorias, distribuidas estratégicamente entre el norte y el sur de Argentina.',
                             'A diversified portfolio of producing and exploration areas, strategically distributed across northern and southern Argentina.'),
  -- Acerca de
  ('page.acerca.h1',   'Producción real,<br/>base sólida,<br/>visión de largo plazo.',  'Real production,<br/>solid foundation,<br/>long-term vision.'),
  ('page.acerca.lede', 'Crown Point Energía S.A. opera en el mercado argentino con casa matriz internacional. Dedicada al petróleo y gas con sede en Buenos Aires, genera flujo de caja de su propia producción y mantiene una cartera de oportunidades en las cuencas Austral, Neuquina y Cuyana. La empresa holding Crown Point Energy Inc. cotiza en TSXV: CWV.',
                        'Crown Point Energía S.A. operates in the Argentine market with international headquarters. Dedicated to oil & gas and based in Buenos Aires, it generates cash flow from its own production and maintains a portfolio of opportunities in the Austral, Neuquén and Cuyana basins. Holding company Crown Point Energy Inc. is listed on TSXV: CWV.'),
  -- ESG
  ('page.esg.h1',   'Operar bien.<br/>Reportar con claridad.',  'Operate responsibly.<br/>Report with clarity.'),
  ('page.esg.lede', 'Nuestra estrategia ESG integra la responsabilidad ambiental, el compromiso social y la gobernanza robusta como pilares de creación de valor a largo plazo.',
                     'Our ESG strategy integrates environmental responsibility, social commitment and robust governance as pillars of long-term value creation.'),
  -- Carreras
  ('page.carreras.h1',   'Construimos el futuro<br/>del energético argentino.',          'Building Argentina''s<br/>energy future.'),
  ('page.carreras.lede', 'Crown Point opera en cuatro cuencas. Buscamos profesionales que quieran dejar huella en la industria energética con un equipo técnico de alto nivel.',
                          'Crown Point operates across four basins. We look for professionals who want to make a mark in the energy industry alongside a top-tier technical team.'),
  -- Contacto
  ('page.contacto.h1',   'Hablemos.',        'Let''s talk.'),
  ('page.contacto.lede', 'Inversores, medios de comunicación, empleo, proveedores y comunidades. Encontrá el contacto correcto para tu consulta.',
                          'Investors, media, employment, suppliers and communities. Find the right contact for your enquiry.')
ON CONFLICT (key) DO NOTHING;

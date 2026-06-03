-- official-data-update-2026.sql
-- Run in Supabase SQL Editor to apply official data updates.
-- Safe to re-run (all statements use ON CONFLICT DO UPDATE or DELETE+INSERT).

-- ── Producción 1Q 2026 ────────────────────────────────────────────────────────
-- Total 8,672 BOE/d (Petróleo 7,456 / Gas 1,214 — 86% / 14%)

INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('kpi.production.value',  '8,672',                         '8,672'),
  ('kpi.production.unit',   'boe/d',                         'boe/d'),
  ('kpi.production.delta',  '1Q 2026',                       '1Q 2026'),
  ('inv.thesis.1.val',      '8,672',                         '8,672'),
  ('inv.thesis.1.unit',     'boe/d',                         'boe/d'),
  ('inv.thesis.1.meta',     '86% petróleo · 14% gas · 1Q 2026', '86% oil · 14% gas · 1Q 2026')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- ── Reservas P1 Sproule (certificadas) ───────────────────────────────────────
-- Total Gross 36.996 MMboe / Net 31.385 MMboe
-- Desarrolladas en producción (D&P):   Gross 19.719 / Net 16.703
-- Desarrolladas no en producción (DNP): Gross  9.343 / Net  7.928
-- No desarrolladas:                     Gross  7.934 / Net  6.754

INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('kpi.reserves.value', '36.996',     '36.996'),
  ('kpi.reserves.unit',  'MMboe',      'MMboe'),
  ('kpi.reserves.delta', 'P1 Sproule', 'P1 Sproule')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- ── Contacto IR — María Teresa Zappino ───────────────────────────────────────
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('contact.ir.name', 'María Teresa Zappino',                    'María Teresa Zappino'),
  ('contact.ir.role', 'Responsable de Relaciones con el Mercado','Investor Relations Officer')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- ── Management — reemplaza por nómina vigente ─────────────────────────────────
-- Mauricio Orue (Gerente General) + Marcos Esteves (CFO)
-- Brian Moss ya no forma parte del management

DELETE FROM team_members WHERE tipo = 'management';

INSERT INTO team_members
  (name, role_es, role_en, bio_es, bio_en, initials, bg, tipo, cargo_board, independiente, orden)
VALUES
  (
    'Mauricio Orue',
    'Gerente General', 'General Manager',
    'Ingeniero Industrial con sólida trayectoria en la industria petrolera y gasífera, especializado en gestión de operaciones, proyectos y liderazgo de equipos. Cuenta con más de 20 años de experiencia en compañías líderes del sector (YPF y PAE), ocupando posiciones gerenciales en áreas de Upstream, Ingeniería, Construcciones y Operaciones. Reside en Comodoro Rivadavia, Provincia de Chubut.',
    'Industrial Engineer with a strong track record in the oil and gas industry, specializing in operations management, projects and team leadership. He has over 20 years of experience at leading sector companies (YPF and PAE), holding management positions in Upstream, Engineering, Construction and Operations. Based in Comodoro Rivadavia, Chubut Province.',
    'MO', 'linear-gradient(135deg,#1A2B4C,#2E4878)', 'management', '', NULL, 1
  ),
  (
    'Marcos Esteves',
    'Vicepresidente de Finanzas – CFO', 'VP Finance – CFO',
    'Desde 2016, Marcos ha invertido en, y ha sido propietario y operador de pequeñas empresas de servicios petroleros en Argentina. Marcos trabajó previamente en diversos roles de banca de inversión, incluyendo: Director Financiero de Deutsche Bank AG (2006–2016), donde lideró la estrategia financiera general y el desempeño operativo de la oficina en Argentina; y Vicepresidente de Ventas y Operaciones de JPMorgan Chase & Co. (1997–2006). Marcos posee un BS en la Universidad de Tulane y un MBA en la Universidad Carnegie Mellon.',
    'Since 2016, Marcos has invested in, owned and operated small oilfield services companies in Argentina. Previously he held various investment banking roles including CFO and General Manager of Deutsche Bank AG Buenos Aires (2006–2016) and VP Sales & Operations of JPMorgan Chase & Co. Buenos Aires (1997–2006). Marcos holds a BS from Tulane University and an MBA from Carnegie Mellon University.',
    'ME', 'linear-gradient(135deg,#5C8700,#82BC00)', 'management', '', NULL, 2
  );

-- ── Directorio — Asamblea 29/04/2026 ────────────────────────────────────────

DELETE FROM team_members WHERE tipo = 'board';

INSERT INTO team_members
  (name, role_es, role_en, bio_es, bio_en, initials, bg, tipo, cargo_board, independiente, orden)
VALUES
  -- Directorio Titular
  ('Andrés Pedro Peralta',      'Director Titular', 'Director',                   '', '', 'AP', 'linear-gradient(135deg,#1A2B4C,#2E4878)', 'board', 'Director Titular',              NULL,  3),
  ('Eduardo Ruben Oliver',      'Director Titular', 'Director',                   '', '', 'EO', 'linear-gradient(135deg,#5C8700,#82BC00)', 'board', 'Director Titular',              NULL,  4),
  ('Isela Angélica Constantini','Director Titular', 'Director',                   '', '', 'IC', 'linear-gradient(135deg,#1A5C5C,#2E8A7A)', 'board', 'Director Titular',              NULL,  5),
  ('Matías Agustín Peralta',    'Director Titular', 'Director',                   '', '', 'MP', 'linear-gradient(135deg,#2A3A6C,#4A5A9C)', 'board', 'Director Titular',              NULL,  6),
  ('Juan Manuel Llado',         'Director Titular', 'Director',                   '', '', 'JL', 'linear-gradient(135deg,#5C8700,#82BC00)', 'board', 'Director Titular',              NULL,  7),
  -- Directorio Suplente
  ('Julián Andrés Racauchi',    'Director Suplente','Alternate Director',          '', '', 'JR', 'linear-gradient(135deg,#4A4A6A,#6A6A8A)', 'board', 'Director Suplente',             NULL,  8),
  -- Síndicos Titulares
  ('Rodolfo Eduardo Moresi',    'Síndico Titular',  'Statutory Auditor',           '', '', 'RM', 'linear-gradient(135deg,#2A2A3A,#4A4A5A)', 'board', 'Síndico Titular',               NULL,  9),
  ('Fabiana Lucía García',      'Síndico Titular',  'Statutory Auditor',           '', '', 'FG', 'linear-gradient(135deg,#6B1A2E,#9E2A45)', 'board', 'Síndico Titular',               NULL, 10),
  ('Raúl Alberto Muñoz',        'Síndico Titular',  'Statutory Auditor',           '', '', 'RA', 'linear-gradient(135deg,#5C4A3A,#7A6A5A)', 'board', 'Síndico Titular',               NULL, 11),
  -- Síndicos Suplentes
  ('Pablo Gastón Muñoz',        'Síndico Suplente', 'Alternate Statutory Auditor', '', '', 'PG', 'linear-gradient(135deg,#2A2A3A,#4A4A5A)', 'board', 'Síndico Suplente',              NULL, 12),
  ('Carlos Eduardo González',   'Síndico Suplente', 'Alternate Statutory Auditor', '', '', 'CG', 'linear-gradient(135deg,#4A4A6A,#6A6A8A)', 'board', 'Síndico Suplente',              NULL, 13),
  ('Analía Silvia Padín',       'Síndico Suplente', 'Alternate Statutory Auditor', '', '', 'AS', 'linear-gradient(135deg,#5C8700,#82BC00)', 'board', 'Síndico Suplente',              NULL, 14);

-- ── Bloques operativos — WI y datos 1Q 2026 ──────────────────────────────────

-- El Tordillo · La Tapera · Puesto Quiroga (slug = 'tordillo')
-- WI corregido: 22.5% → 95% (adquisición completada)
UPDATE operations_blocks SET
  lede_es      = 'Tres concesiones contiguas en el flanco norte de la Cuenca del Golfo San Jorge, provincia de Chubut. Crown Point opera con el 95% del working interest. El bloque productivo más grande de la compañía.',
  lede_en      = 'Three contiguous concessions on the northern flank of the San Jorge Gulf Basin, Chubut province. Crown Point operates with a 95% working interest. The company''s largest producing block.',
  chips        = '["95% WI", "Operador / Operator", "Crudo & Gas / Oil & Gas"]'::jsonb,
  body_es      = ARRAY[
    'Tres concesiones operadas por Crown Point Energía S.A. con el 95% del working interest: El Tordillo, La Tapera y Puesto Quiroga, en la provincia de Chubut, flanco norte de la Cuenca del Golfo San Jorge. Área total de 430 km² netos.',
    'Producción 1Q 2026: 4.382 Bbl/d de petróleo y 6.880 Mcf/d de gas natural (5.529 boe/d totales). Cuenta con 283 pozos activos y 88 pozos inyectores. La concesión vence el 14/11/2027 con extensión acordada por 20 años (hasta noviembre de 2047).'
  ],
  body_en      = ARRAY[
    'Three concessions operated by Crown Point Energía S.A. with a 95% working interest: El Tordillo, La Tapera and Puesto Quiroga, in Chubut province, northern flank of the San Jorge Gulf Basin. Total net area of 430 km².',
    'Q1 2026 production: 4,382 Bbl/d of oil and 6,880 Mcf/d of natural gas (5,529 boe/d total). The block has 283 active producers and 88 injector wells. Concession expires 14/11/2027 with an agreed 20-year extension (to November 2047).'
  ],
  stats        = '[{"label_es":"Producción petróleo","label_en":"Oil production","val":"4,382 Bbl/d"},{"label_es":"Producción gas","label_en":"Gas production","val":"6,880 Mcf/d"},{"label_es":"Producción total boe","label_en":"Total boe","val":"5,529 Boe/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"283"},{"label_es":"Pozos inyectores","label_en":"Injector wells","val":"88"},{"label_es":"Superficie","label_en":"Acreage","val":"113,325 acres · 430 km²"},{"label_es":"Vencimiento","label_en":"Expiry","val":"Nov 2047 (ext.)"}]'::jsonb,
  map_stats    = '[{"label_es":"WI","label_en":"WI","val":"95%"},{"label_es":"Prod. petróleo","label_en":"Oil prod.","val":"4,382 Bbl/d"},{"label_es":"Prod. gas","label_en":"Gas prod.","val":"6,880 Mcf/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"283"}]'::jsonb
WHERE slug = 'tordillo';

-- Chañares Herrados (slug = 'chanares')
-- WI corregido: 75.8% → 50% | Operador: Tango Energy Argentina S.A. | card_title → Crudo pesado
UPDATE operations_blocks SET
  lede_es      = 'Concesión productiva en el centro de Mendoza, con crudo liviano (38° API). Crown Point participa con el 50% del working interest; el operador es Tango Energy Argentina S.A.',
  lede_en      = 'Producing concession in central Mendoza, light crude (38° API). Crown Point holds a 50% working interest; operator is Tango Energy Argentina S.A.',
  card_title_es = 'Crudo pesado',
  card_title_en = 'Heavy crude',
  chips        = '["Crudo pesado", "50% WI", "JV · Tango Energy Argentina", "Mendoza / Cuyana"]'::jsonb,
  body_es      = ARRAY[
    'Crown Point participa con el 50% del working interest en este bloque ubicado en la Cuenca Cuyana, provincia de Mendoza. El operador es Tango Energy Argentina S.A. El bloque produce crudo liviano de 38° API con infraestructura conectada al oleoducto Allanito–Luján de Cuyo.',
    'El programa de workover 2026 contempla la intervención de pozos productores con un objetivo de incremento de producción.'
  ],
  body_en      = ARRAY[
    'Crown Point holds a 50% working interest in this block located in the Cuyana Basin, Mendoza province. Operator is Tango Energy Argentina S.A. The block produces 38° API light crude with infrastructure connected to the Allanito–Luján de Cuyo pipeline.',
    'The 2026 workover program targets well interventions for production uplift.'
  ],
  stats        = '[{"label_es":"Participación WI","label_en":"Working interest","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy Argentina S.A."},{"label_es":"Calidad de crudo","label_en":"Crude quality","val":"38° API"},{"label_es":"Superficie","label_en":"Acreage","val":"5,040 acres · 21 km²"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza / Cuyana"}]'::jsonb,
  map_stats    = '[{"label_es":"WI","label_en":"WI","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy"},{"label_es":"Calidad","label_en":"Quality","val":"38° API"},{"label_es":"Cuenca","label_en":"Basin","val":"Cuyana"}]'::jsonb
WHERE slug = 'chanares';

-- ── Bloques adicionales — correcciones oficiales ─────────────────────────────

-- Puesto Pozo Cercado Oriental (slug = 'ppc')
-- Cambia de exploratorio a productivo | 50% WI | JV Tango Energy | Cuyana | Crudo pesado
UPDATE operations_blocks SET
  eyebrow      = '01 · Cuenca Cuyana',
  orden        = 1,
  lede_es      = 'Concesión productiva contigua a Chañares Herrados, en el centro de Mendoza. Crown Point participa con el 50% del working interest; el operador es Tango Energy Argentina S.A.',
  lede_en      = 'Producing concession adjacent to Chañares Herrados, in central Mendoza. Crown Point holds a 50% working interest; operator is Tango Energy Argentina S.A.',
  card_title_es = 'Crudo pesado',
  card_title_en = 'Heavy crude',
  chips        = '["Crudo pesado", "50% WI", "JV · Tango Energy Argentina", "Mendoza / Cuyana"]'::jsonb,
  body_es      = ARRAY[
    'Crown Point participa con el 50% del working interest en este bloque ubicado en la Cuenca Cuyana, provincia de Mendoza, colindante con la concesión Chañares Herrados. El operador es Tango Energy Argentina S.A. El bloque produce crudo pesado con infraestructura integrada en la zona.',
    'El programa de workover 2026 contempla la intervención de pozos productores para incrementar la producción del área.'
  ],
  body_en      = ARRAY[
    'Crown Point holds a 50% working interest in this block in the Cuyana Basin, Mendoza province, adjacent to the Chañares Herrados concession. Operator is Tango Energy Argentina S.A. The block produces heavy crude with integrated area infrastructure.',
    'The 2026 workover program targets well interventions to increase production across the area.'
  ],
  stats        = '[{"label_es":"Participación WI","label_en":"Working interest","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy Argentina S.A."},{"label_es":"Calidad de crudo","label_en":"Crude quality","val":"Crudo pesado / Heavy crude"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza / Cuyana"}]'::jsonb,
  map_stats    = '[{"label_es":"WI","label_en":"WI","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy"},{"label_es":"Tipo","label_en":"Type","val":"Crudo pesado"},{"label_es":"Cuenca","label_en":"Basin","val":"Cuyana"}]'::jsonb
WHERE slug = 'ppc';

-- El Tordillo (slug = 'tordillo')
-- card_title: quitar 'con waterflood' | reorden: 3
UPDATE operations_blocks SET
  card_title_es = 'Producción consolidada',
  card_title_en = 'Consolidated production',
  orden         = 3,
  eyebrow       = '03 · Golfo San Jorge · Chubut'
WHERE slug = 'tordillo';

-- Piedra Clavada (slug = 'piedra')
-- body_es oficial | reorden: 4
UPDATE operations_blocks SET
  orden        = 4,
  eyebrow      = '04 · Golfo San Jorge · Santa Cruz',
  lede_es      = 'Concesión de explotación operada al 100% en la Cuenca San Jorge, provincia de Santa Cruz. Crown Point busca aumentar la producción mediante perforaciones, workovers y optimización de instalaciones.',
  lede_en      = '100%-operated exploitation concession in the San Jorge Basin, Santa Cruz province. Crown Point targets production growth through drilling, workovers and facilities optimisation.',
  body_es      = ARRAY[
    'Crown Point tiene una participación operada del 100% en la Concesión de Explotación Piedra Clavada Koluel Kaike, que representa un total de 71.660 acres netos en la Cuenca San Jorge. La estrategia de Crown Point es aumentar la producción a través de perforaciones y workovers de pozos, y optimización de instalaciones.',
    'El crudo se entrega a compradores locales conectados a la infraestructura de la Cuenca San Jorge en la provincia de Santa Cruz.'
  ],
  body_en      = ARRAY[
    'Crown Point holds a 100% operated working interest in the Piedra Clavada Koluel Kaike Exploitation Concession, representing a total of 71,660 net acres in the San Jorge Basin. Crown Point''s strategy is to increase production through well drilling and workovers, and facilities optimisation.',
    'Crude is delivered to local buyers connected to the San Jorge Basin infrastructure in Santa Cruz province.'
  ]
WHERE slug = 'piedra';

-- Río Cullen · Las Violetas · La Angostura (slug = 'tdf')
-- commodity: gas → mixed | body_es oficial | reorden: 5
UPDATE operations_blocks SET
  commodity    = 'mixed',
  orden        = 5,
  eyebrow      = '05 · Cuenca Austral · Tierra del Fuego',
  lede_es      = 'Tres concesiones de explotación en la Cuenca Austral de Tierra del Fuego. Crown Point tiene una participación no operada del 48.3%, con producción de petróleo y gas.',
  lede_en      = 'Three exploitation concessions in the Austral Basin of Tierra del Fuego. Crown Point holds a 48.3% non-operated working interest, producing oil and gas.',
  chips        = '["48.3% WI", "Participación / Working interest", "Petróleo & Gas / Oil & Gas"]'::jsonb,
  body_es      = ARRAY[
    'Crown Point tiene una participación no operada del 48.3% en las 3 concesiones de explotación de Río Cullen, La Angostura y Las Violetas en la Cuenca Austral de Tierra del Fuego, lo que representa un total de 489,000 acres brutos (169,880 acres netos). La estrategia de Crown Point es aumentar la producción de sus activos en Tierra del Fuego mediante perforación de exploración y desarrollo, respaldada por una amplia cobertura sísmica 3D.',
    'Las plantas de tratamiento están conectadas al sistema TGS para entrega de gas, y al oleoducto regional para crudo y condensado.'
  ],
  body_en      = ARRAY[
    'Crown Point holds a 48.3% non-operated working interest in the 3 exploitation concessions of Río Cullen, La Angostura and Las Violetas in the Austral Basin of Tierra del Fuego, representing a total of 489,000 gross acres (169,880 net acres). Crown Point''s strategy is to grow production from its Tierra del Fuego assets through exploration and development drilling, supported by extensive 3D seismic coverage.',
    'The processing plants are connected to the TGS gas pipeline system and to the regional crude and condensate pipeline.'
  ]
WHERE slug = 'tdf';

-- Cerro de Los Leones (slug = 'cerro')
-- Mover al final: orden 3 → 6
UPDATE operations_blocks SET
  orden   = 6,
  eyebrow = '06 · Cuenca Neuquina · Exploratorio'
WHERE slug = 'cerro';

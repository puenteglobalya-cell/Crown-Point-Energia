-- official-data-update-2026.sql
-- Run in Supabase SQL Editor to apply official data updates.
-- Safe to re-run (all statements use ON CONFLICT DO UPDATE or DELETE+INSERT).

-- ── Producción 1Q 2026 ────────────────────────────────────────────────────────
-- Total 8,672 BOE/d (Petróleo 7,456 / Gas 1,214 — 86% / 14%)

INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('kpi.production.value', '8,672',   '8,672'),
  ('kpi.production.unit',  'boe/d',   'boe/d'),
  ('kpi.production.delta', '1Q 2026', '1Q 2026')
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

-- ── Bloques operativos (yacimientos) — 1Q 2026 ───────────────────────────────
-- Fuente: presentación corporativa CPE
-- Ejecutar solo si la tabla operations_blocks está vacía o requiere actualización
-- (verificar primero: SELECT count(*) FROM operations_blocks;)

/*
UPDATE operations_blocks SET
  stats = '[{"label_es":"Producción petróleo","label_en":"Oil production","val":"4,382 Bbl/d"},
            {"label_es":"Producción gas","label_en":"Gas production","val":"6,880 Mcf/d"},
            {"label_es":"Producción total boe","label_en":"Total boe production","val":"5,529 Boe/d"},
            {"label_es":"Pozos activos","label_en":"Active wells","val":"283"},
            {"label_es":"Pozos inyectores","label_en":"Injector wells","val":"88"},
            {"label_es":"Superficie","label_en":"Area","val":"113,325 Acres"}]'::jsonb
WHERE slug = 'el-tordillo';

UPDATE operations_blocks SET
  stats = '[{"label_es":"Producción petróleo","label_en":"Oil production","val":"2,569 Bbl/d"},
            {"label_es":"Pozos activos","label_en":"Active wells","val":"350"},
            {"label_es":"Superficie","label_en":"Area","val":"290 km² netos"},
            {"label_es":"Reservas certificadas 1P","label_en":"Certified 1P reserves","val":"21 MMbbl"}]'::jsonb
WHERE slug = 'piedra-clavada';
*/

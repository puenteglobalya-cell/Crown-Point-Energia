-- official-data-update-2026.sql
-- Run in Supabase SQL Editor to apply official data updates.
-- Safe to re-run (all statements use ON CONFLICT DO UPDATE).

-- ── Reservas P1 Sproule (certificadas) ───────────────────────────────────────
-- Total Gross 36.996 MMboe / Net 31.385 MMboe
-- Desarrolladas en producción: Gross 19.719 / Net 16.703
-- Desarrolladas no productivas: Gross 9.343 / Net 7.928
-- No desarrolladas: Gross 7.934 / Net 6.754

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

-- ── Directorio — Asamblea 29/04/2026 ────────────────────────────────────────
-- Reemplaza composición anterior completa.

DELETE FROM team_members WHERE tipo = 'board';

INSERT INTO team_members
  (name, role_es, role_en, bio_es, bio_en, initials, bg, tipo, cargo_board, independiente, orden)
VALUES
  -- Directorio Titular
  ('Andrés Pedro Peralta',     'Director Titular',   'Director',                   '', '', 'AP', 'linear-gradient(135deg,#1A2B4C,#2E4878)', 'board', 'Director Titular',              NULL,  3),
  ('Eduardo Ruben Oliver',     'Director Titular',   'Director',                   '', '', 'EO', 'linear-gradient(135deg,#5C8700,#82BC00)', 'board', 'Director Titular',              NULL,  4),
  ('Isela Angélica Constantini','Director Titular',  'Director',                   '', '', 'IC', 'linear-gradient(135deg,#1A5C5C,#2E8A7A)', 'board', 'Director Titular',              NULL,  5),
  ('Matías Agustín Peralta',   'Director Titular',   'Director',                   '', '', 'MP', 'linear-gradient(135deg,#2A3A6C,#4A5A9C)', 'board', 'Director Titular',              NULL,  6),
  ('Juan Manuel Llado',        'Director Titular',   'Director',                   '', '', 'JL', 'linear-gradient(135deg,#5C8700,#82BC00)', 'board', 'Director Titular',              NULL,  7),
  -- Directorio Suplente
  ('Julián Andrés Racauchi',   'Director Suplente',  'Alternate Director',          '', '', 'JR', 'linear-gradient(135deg,#4A4A6A,#6A6A8A)', 'board', 'Director Suplente',             NULL,  8),
  -- Síndicos Titulares
  ('Rodolfo Eduardo Moresi',   'Síndico Titular',    'Statutory Auditor',           '', '', 'RM', 'linear-gradient(135deg,#2A2A3A,#4A4A5A)', 'board', 'Síndico Titular',               NULL,  9),
  ('Fabiana Lucía García',     'Síndico Titular',    'Statutory Auditor',           '', '', 'FG', 'linear-gradient(135deg,#6B1A2E,#9E2A45)', 'board', 'Síndico Titular',               NULL, 10),
  ('Raúl Alberto Muñoz',       'Síndico Titular',    'Statutory Auditor',           '', '', 'RA', 'linear-gradient(135deg,#5C4A3A,#7A6A5A)', 'board', 'Síndico Titular',               NULL, 11),
  -- Síndicos Suplentes
  ('Pablo Gastón Muñoz',       'Síndico Suplente',   'Alternate Statutory Auditor', '', '', 'PG', 'linear-gradient(135deg,#2A2A3A,#4A4A5A)', 'board', 'Síndico Suplente',              NULL, 12),
  ('Carlos Eduardo González',  'Síndico Suplente',   'Alternate Statutory Auditor', '', '', 'CG', 'linear-gradient(135deg,#4A4A6A,#6A6A8A)', 'board', 'Síndico Suplente',              NULL, 13),
  ('Analía Silvia Padín',      'Síndico Suplente',   'Alternate Statutory Auditor', '', '', 'AS', 'linear-gradient(135deg,#5C8700,#82BC00)', 'board', 'Síndico Suplente',              NULL, 14);

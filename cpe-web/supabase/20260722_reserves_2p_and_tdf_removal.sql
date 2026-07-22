-- Board content-review follow-up (Jeff Oke / Brian Moss comments, 13-jul-2026):
--
-- 1. Reserves: switch from a stale 2024 P1-only figure (36.996 MMboe, which
--    didn't reconcile to any press release) to the official Dec 31, 2025
--    Sproule ERCE reserve report, showing 2P (Proved + Probable) per the
--    client's decision: 71.580 MMboe gross / 60.758 MMboe net.
-- 2. EBITDA: left untouched — pending a decision from CPE leadership.
-- 3. GORC: no active reference to remove (board bios are currently empty in
--    team_members) — noted for whenever real bios are loaded, so the old
--    "GORC + Liminar" controlling-shareholder wording (confirmed outdated by
--    the client) doesn't get copied in.
-- 4. Cerro de Los Leones: fixed a real unit-label bug — the figure 101,208 is
--    ACRES per CPE Inc.'s own investor site, not hectares as shown before.
-- 6. Río Cullen · Las Violetas · La Angostura (TDF/Austral) concessions are
--    being handed back within a month — deactivated (not deleted) so the
--    block simply stops appearing on /operaciones. This drops the site from
--    11 concessions/4 basins to 8 concessions/3 basins, so every KPI/copy
--    field referencing those counts is updated to match.

-- ── Reserves KPI ─────────────────────────────────────────────────────────────
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('kpi.reserves.value', '71.580',          '71.580'),
  ('kpi.reserves.delta', '2P Sproule ERCE', '2P Sproule ERCE')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- ── Blocks/concessions/basins KPI (11→8 concessions, 4→3 basins) ────────────
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('kpi.blocks.value', '8',                    '8'),
  ('kpi.blocks.unit',  'concesiones en 3 cuencas', 'concessions across 3 basins')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- ── Operaciones hero H1 ──────────────────────────────────────────────────────
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('page.operaciones.h1',
   'Ocho concesiones.<br/>Tres cuencas.<br/>Un país.',
   'Eight concessions.<br/>Three basins.<br/>One country.')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- ── Carreras lede ────────────────────────────────────────────────────────────
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('page.carreras.lede',
   'Crown Point opera en tres cuencas. Buscamos profesionales que quieran dejar huella en la industria energética con un equipo técnico de alto nivel.',
   'Crown Point operates across three basins. We look for professionals who want to make a mark in the energy industry alongside a top-tier technical team.')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- ── Cerro de Los Leones: fix acres mislabeled as hectares ───────────────────
UPDATE operations_blocks SET
  lede_es = 'Bloque exploratorio de 101.208 acres en el norte de la Cuenca Neuquina, provincia de Mendoza, con potencial convencional y no convencional.',
  lede_en = '101,208-acre exploration block in the northern Neuquén Basin, Mendoza province, with both conventional and unconventional potential.',
  stats = '[{"label_es":"Superficie","label_en":"Acreage","val":"101,208 acres"},{"label_es":"Profundidad objetivo","label_en":"Target depth","val":"2,800–3,600 m"},{"label_es":"Producción actual","label_en":"Current production","val":"—"},{"label_es":"Prórroga permiso","label_en":"Permit extension","val":"May 2027"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza"}]',
  map_stats = '[{"label_es":"WI","label_en":"WI","val":"100%"},{"label_es":"Superficie","label_en":"Acreage","val":"101,208 acres"},{"label_es":"Estado","label_en":"Status","val":"Exploratorio / Exploration"},{"label_es":"Prórroga permiso","label_en":"Permit extension","val":"May 2027"}]'
WHERE slug = 'cerro';

-- ── Río Cullen · Las Violetas · La Angostura: deactivate (concession being
--    handed back within a month) — soft-deleted via activo=false so the row
--    (and its history) isn't lost, it just stops rendering on /operaciones.
UPDATE operations_blocks SET activo = false WHERE slug = 'tdf';

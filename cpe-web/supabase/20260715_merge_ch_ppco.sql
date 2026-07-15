-- Consolidate Chañares Herrados (CH) and Puesto Pozo Cercado Oriental (PPCO)
-- into a single card on /operaciones — same operator (Tango Energy Argentina
-- S.A.), same 50% WI, adjacent concessions in the same basin — while the
-- copy still calls out that they are 2 distinct concessions.
-- PPCO's row is soft-hidden (activo = false), not deleted, so its data and
-- history are preserved if it ever needs to be split out again.

UPDATE operations_blocks SET
  titulo        = 'Chañares Herrados / PPCO',
  card_title_es = 'Producción consolidada',
  card_title_en = 'Consolidated production',
  lede_es       = 'Dos concesiones productivas contiguas en el centro de Mendoza — Chañares Herrados (crudo mediano, 31.94° API) y Puesto Pozo Cercado Oriental (crudo liviano, 33.7° API). Crown Point participa con el 50% del working interest en ambas; el operador es Tango Energy Argentina S.A.',
  lede_en       = 'Two adjacent producing concessions in central Mendoza — Chañares Herrados (medium crude, 31.94° API) and Puesto Pozo Cercado Oriental (light crude, 33.7° API). Crown Point holds a 50% working interest in both; operator is Tango Energy Argentina S.A.',
  chips         = '["2 concesiones · 2 concessions", "50% WI", "JV · Tango Energy Argentina", "Mendoza / Cuyana"]'::jsonb,
  body_es       = ARRAY[
    'Crown Point participa con el 50% del working interest en dos concesiones contiguas en la Cuenca Cuyana, provincia de Mendoza: Chañares Herrados y Puesto Pozo Cercado Oriental. Son concesiones distintas operadas por el mismo operador, Tango Energy Argentina S.A. Chañares produce crudo mediano (31.94° API) con infraestructura conectada al oleoducto Allanito–Luján de Cuyo; PPCO produce crudo liviano (33.7° API) con infraestructura integrada en la zona.',
    'Producción consolidada 1Q 2026: 482 Bbl/d de petróleo (415 Bbl/d Chañares + 67 Bbl/d PPCO). El programa de workover 2026 contempla la intervención de pozos productores en ambas concesiones con el objetivo de incrementar la producción.'
  ],
  body_en       = ARRAY[
    'Crown Point holds a 50% working interest in two adjacent concessions in the Cuyana Basin, Mendoza province: Chañares Herrados and Puesto Pozo Cercado Oriental. These are distinct concessions operated by the same operator, Tango Energy Argentina S.A. Chañares produces medium crude (31.94° API) with infrastructure connected to the Allanito–Luján de Cuyo pipeline; PPCO produces light crude (33.7° API) with integrated area infrastructure.',
    'Consolidated Q1 2026 production: 482 Bbl/d of oil (415 Bbl/d Chañares + 67 Bbl/d PPCO). The 2026 workover program targets well interventions across both concessions to increase production.'
  ],
  stats         = '[{"label_es":"Producción petróleo (consolidada)","label_en":"Oil production (consolidated)","val":"482 Bbl/d"},{"label_es":"Participación WI","label_en":"Working interest","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy Argentina S.A."},{"label_es":"Calidad de crudo — Chañares","label_en":"Crude quality — Chañares","val":"31.94° API · Medium"},{"label_es":"Calidad de crudo — PPCO","label_en":"Crude quality — PPCO","val":"33.7° API · Light"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza / Cuyana"}]'::jsonb,
  map_stats     = '[{"label_es":"Concesiones","label_en":"Concessions","val":"2"},{"label_es":"WI","label_en":"WI","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy"},{"label_es":"Producción","label_en":"Production","val":"482 Bbl/d"}]'::jsonb
WHERE slug = 'chanares';

UPDATE operations_blocks SET activo = false WHERE slug = 'ppc';

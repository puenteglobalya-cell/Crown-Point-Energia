-- Fix crude oil classification for Chañares Herrados and PPCO
-- Chañares: 31.94° API → Crudo mediano (25–33° = medium)
-- PPCO: 33.7° API → Crudo liviano (>33° = light)

-- ── Chañares Herrados ──────────────────────────────────────────────────────────
UPDATE operations_blocks SET
  lede_es      = 'Concesión productiva en el centro de Mendoza, con crudo mediano (31.94° API). Crown Point participa con el 50% del working interest; el operador es Tango Energy Argentina S.A.',
  lede_en      = 'Producing concession in central Mendoza, medium crude (31.94° API). Crown Point holds a 50% working interest; operator is Tango Energy Argentina S.A.',
  card_title_es = 'Crudo mediano',
  card_title_en = 'Medium crude',
  chips        = '["Crudo mediano", "50% WI", "JV · Tango Energy Argentina", "Mendoza / Cuyana"]'::jsonb,
  body_es      = ARRAY[
    'Crown Point participa con el 50% del working interest en este bloque ubicado en la Cuenca Cuyana, provincia de Mendoza. El operador es Tango Energy Argentina S.A. El bloque produce crudo mediano de 31.94° API con infraestructura conectada al oleoducto Allanito–Luján de Cuyo.',
    'El programa de workover 2026 contempla la intervención de pozos productores con un objetivo de incremento de producción.'
  ],
  body_en      = ARRAY[
    'Crown Point holds a 50% working interest in this block located in the Cuyana Basin, Mendoza province. Operator is Tango Energy Argentina S.A. The block produces 31.94° API medium crude with infrastructure connected to the Allanito–Luján de Cuyo pipeline.',
    'The 2026 workover program targets well interventions for production uplift.'
  ],
  stats        = '[{"label_es":"Participación WI","label_en":"Working interest","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy Argentina S.A."},{"label_es":"Calidad de crudo","label_en":"Crude quality","val":"31.94° API"},{"label_es":"Superficie","label_en":"Acreage","val":"5,040 acres · 21 km²"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza / Cuyana"}]'::jsonb,
  map_stats    = '[{"label_es":"WI","label_en":"WI","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy"},{"label_es":"Calidad","label_en":"Quality","val":"31.94° API"},{"label_es":"Cuenca","label_en":"Basin","val":"Cuyana"}]'::jsonb
WHERE slug = 'chanares';

-- ── Puesto Pozo Cercado Oriental ────────────────────────────────────────────────
UPDATE operations_blocks SET
  lede_es      = 'Concesión productiva contigua a Chañares Herrados, en el centro de Mendoza. Crown Point participa con el 50% del working interest; el operador es Tango Energy Argentina S.A. Crudo liviano de 33.7° API.',
  lede_en      = 'Producing concession adjacent to Chañares Herrados, in central Mendoza. Crown Point holds a 50% working interest; operator is Tango Energy Argentina S.A. Light crude at 33.7° API.',
  card_title_es = 'Crudo liviano',
  card_title_en = 'Light crude',
  chips        = '["Crudo liviano", "50% WI", "JV · Tango Energy Argentina", "Mendoza / Cuyana"]'::jsonb,
  body_es      = ARRAY[
    'Crown Point participa con el 50% del working interest en este bloque ubicado en la Cuenca Cuyana, provincia de Mendoza, colindante con la concesión Chañares Herrados. El operador es Tango Energy Argentina S.A. El bloque produce crudo liviano de 33.7° API con infraestructura integrada en la zona.',
    'El programa de workover 2026 contempla la intervención de pozos productores para incrementar la producción del área.'
  ],
  body_en      = ARRAY[
    'Crown Point holds a 50% working interest in this block in the Cuyana Basin, Mendoza province, adjacent to the Chañares Herrados concession. Operator is Tango Energy Argentina S.A. The block produces 33.7° API light crude with integrated area infrastructure.',
    'The 2026 workover program targets well interventions to increase production across the area.'
  ],
  stats        = '[{"label_es":"Participación WI","label_en":"Working interest","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy Argentina S.A."},{"label_es":"Calidad de crudo","label_en":"Crude quality","val":"33.7° API · Liviano"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza / Cuyana"}]'::jsonb,
  map_stats    = '[{"label_es":"WI","label_en":"WI","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy"},{"label_es":"Tipo","label_en":"Type","val":"Crudo liviano"},{"label_es":"Cuenca","label_en":"Basin","val":"Cuyana"}]'::jsonb
WHERE slug = 'ppc';

-- Fill Q1 2026 production stats from Consolidation Excel (Inventory MDA table)
-- PC-KK, Chañares, PPCO: add production to EN paragraphs (replace "•" placeholders)
-- ETLTPQ, RCLV: update to match Q1 2026 actuals
-- Wells: PC-KK 403 producers + 143 injectors, ETLTPQ 264 producers + 88 injectors

-- ── Piedra Clavada – Koluel Kaike (slug = 'piedra') ─────────────────────────────
-- Q1 2026: Oil 2,568 Bbl/d | 403 active producers + 143 injectors
UPDATE operations_blocks SET
  body_es = ARRAY[
    'Crown Point tiene una participación operada del 100% en la Concesión de Explotación Piedra Clavada Koluel Kaike, que representa un total de 71.660 acres netos en la Cuenca San Jorge. La estrategia de Crown Point es aumentar la producción a través de perforaciones y workovers de pozos, y optimización de instalaciones.',
    'Producción 1Q 2026: 2.568 Bbl/d de petróleo. El bloque cuenta con 403 pozos productores activos y 143 pozos inyectores.'
  ],
  body_en = ARRAY[
    'Crown Point holds a 100% operated working interest in the Piedra Clavada Koluel Kaike Exploitation Concession, representing a total of 71,660 net acres in the San Jorge Basin. Crown Point''s strategy is to increase production through well drilling and workovers, and facilities optimisation.',
    'Q1 2026 production: 2,568 Bbl/d of oil. The block has 403 active producers and 143 injector wells.'
  ],
  stats = '[{"label_es":"Producción petróleo","label_en":"Oil production","val":"2,568 Bbl/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"403"},{"label_es":"Pozos inyectores","label_en":"Injector wells","val":"143"},{"label_es":"Superficie","label_en":"Acreage","val":"8,840 ha"},{"label_es":"Calidad de crudo","label_en":"Crude quality","val":"21° API"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2049"}]'::jsonb,
  map_stats = '[{"label_es":"WI","label_en":"WI","val":"100%"},{"label_es":"Prod. petróleo","label_en":"Oil prod.","val":"2,568 Bbl/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"403"},{"label_es":"Vencimiento","label_en":"Expiry","val":"2049"}]'::jsonb
WHERE slug = 'piedra';

-- ── Chañares Herrados (slug = 'chanares') ───────────────────────────────────────
-- Q1 2026: Oil 415 Bbl/d
UPDATE operations_blocks SET
  body_es = ARRAY[
    'Crown Point participa con el 50% del working interest en este bloque ubicado en la Cuenca Cuyana, provincia de Mendoza. El operador es Tango Energy Argentina S.A. El bloque produce crudo mediano de 31.94° API con infraestructura conectada al oleoducto Allanito–Luján de Cuyo.',
    'Producción 1Q 2026: 415 Bbl/d de petróleo. El programa de workover 2026 contempla la intervención de pozos productores con un objetivo de incremento de producción.'
  ],
  body_en = ARRAY[
    'Crown Point holds a 50% working interest in this block located in the Cuyana Basin, Mendoza province. Operator is Tango Energy Argentina S.A. The block produces 31.94° API medium crude with infrastructure connected to the Allanito–Luján de Cuyo pipeline.',
    'Q1 2026 production: 415 Bbl/d of oil. The 2026 workover program targets well interventions for production uplift.'
  ]
WHERE slug = 'chanares';

-- ── Puesto Pozo Cercado Oriental (slug = 'ppc') ────────────────────────────────
-- Q1 2026: Oil 67 Bbl/d
UPDATE operations_blocks SET
  body_es = ARRAY[
    'Crown Point participa con el 50% del working interest en este bloque ubicado en la Cuenca Cuyana, provincia de Mendoza, colindante con la concesión Chañares Herrados. El operador es Tango Energy Argentina S.A. El bloque produce crudo liviano de 33.7° API con infraestructura integrada en la zona.',
    'Producción 1Q 2026: 67 Bbl/d de petróleo. El programa de workover 2026 contempla la intervención de pozos productores para incrementar la producción del área.'
  ],
  body_en = ARRAY[
    'Crown Point holds a 50% working interest in this block in the Cuyana Basin, Mendoza province, adjacent to the Chañares Herrados concession. Operator is Tango Energy Argentina S.A. The block produces 33.7° API light crude with integrated area infrastructure.',
    'Q1 2026 production: 67 Bbl/d of oil. The 2026 workover program targets well interventions to increase production across the area.'
  ]
WHERE slug = 'ppc';

-- ── El Tordillo · La Tapera · Puesto Quiroga (slug = 'tordillo') ────────────────
-- Q1 2026 actuals: Oil 4,164 Bbl/d, Gas 3,451 Mcf/d, Total 4,739 Boe/d
-- Wells: 264 producers + 88 injectors
UPDATE operations_blocks SET
  body_es = ARRAY[
    'Tres concesiones operadas por Crown Point Energía S.A. con el 95% del working interest: El Tordillo, La Tapera y Puesto Quiroga, en la provincia de Chubut, flanco norte de la Cuenca del Golfo San Jorge. Área total de 430 km² netos.',
    'Producción 1Q 2026: 4.164 Bbl/d de petróleo y 3.451 Mcf/d de gas natural (4.739 boe/d totales). Cuenta con 264 pozos activos y 88 pozos inyectores. La concesión vence el 14/11/2027 con extensión acordada por 20 años (hasta noviembre de 2047).'
  ],
  body_en = ARRAY[
    'Three concessions operated by Crown Point Energía S.A. with a 95% working interest: El Tordillo, La Tapera and Puesto Quiroga, in Chubut province, northern flank of the San Jorge Gulf Basin. Total net area of 430 km².',
    'Q1 2026 production: 4,164 Bbl/d of oil and 3,451 Mcf/d of natural gas (4,739 boe/d total). The block has 264 active producers and 88 injector wells. Concession expires 14/11/2027 with an agreed 20-year extension (to November 2047).'
  ],
  stats = '[{"label_es":"Producción petróleo","label_en":"Oil production","val":"4,164 Bbl/d"},{"label_es":"Producción gas","label_en":"Gas production","val":"3,451 Mcf/d"},{"label_es":"Producción total boe","label_en":"Total boe","val":"4,739 Boe/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"264"},{"label_es":"Pozos inyectores","label_en":"Injector wells","val":"88"},{"label_es":"Superficie","label_en":"Acreage","val":"113,325 acres · 430 km²"},{"label_es":"Vencimiento","label_en":"Expiry","val":"Nov 2047 (ext.)"}]'::jsonb,
  map_stats = '[{"label_es":"WI","label_en":"WI","val":"95%"},{"label_es":"Prod. petróleo","label_en":"Oil prod.","val":"4,164 Bbl/d"},{"label_es":"Prod. gas","label_en":"Gas prod.","val":"3,451 Mcf/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"264"}]'::jsonb
WHERE slug = 'tordillo';

-- ── Río Cullen · Las Violetas · La Angostura (slug = 'tdf') ─────────────────────
-- Q1 2026: Oil 242 Bbl/d, LPG 4 Bbl/d, Gas 3,821 Mcf/d, Total 883 Boe/d
UPDATE operations_blocks SET
  body_es = ARRAY[
    'Crown Point tiene una participación no operada del 48.3% en las 3 concesiones de explotación de Río Cullen, La Angostura y Las Violetas en la Cuenca Austral de Tierra del Fuego, lo que representa un total de 489,000 acres brutos (169,880 acres netos). La estrategia de Crown Point es aumentar la producción de sus activos en Tierra del Fuego mediante perforación de exploración y desarrollo, respaldada por una amplia cobertura sísmica 3D.',
    'Producción 1Q 2026: 242 Bbl/d de petróleo, 4 Bbl/d de LPG y 3.821 Mcf/d de gas natural (883 boe/d totales). Las plantas de tratamiento están conectadas al sistema TGS para entrega de gas, y al oleoducto regional para crudo y condensado.'
  ],
  body_en = ARRAY[
    'Crown Point holds a 48.3% non-operated working interest in the 3 exploitation concessions of Río Cullen, La Angostura and Las Violetas in the Austral Basin of Tierra del Fuego, representing a total of 489,000 gross acres (169,880 net acres). Crown Point''s strategy is to grow production from its Tierra del Fuego assets through exploration and development drilling, supported by extensive 3D seismic coverage.',
    'Q1 2026 production: 242 Bbl/d of oil, 4 Bbl/d of LPG and 3,821 Mcf/d of natural gas (883 boe/d total). The processing plants are connected to the TGS gas pipeline system and to the regional crude and condensate pipeline.'
  ],
  stats = '[{"label_es":"Producción petróleo","label_en":"Oil production","val":"242 Bbl/d"},{"label_es":"Producción LPG","label_en":"LPG production","val":"4 Bbl/d"},{"label_es":"Producción gas","label_en":"Gas production","val":"3,821 Mcf/d"},{"label_es":"Producción total boe","label_en":"Total boe","val":"883 Boe/d"},{"label_es":"Superficie bruta","label_en":"Gross acreage","val":"489,000 acres"},{"label_es":"Superficie neta","label_en":"Net acreage","val":"169,880 acres"},{"label_es":"Vencimiento","label_en":"Expiry","val":"Ago 2026"}]'::jsonb,
  map_stats = '[{"label_es":"WI","label_en":"WI","val":"48.3%"},{"label_es":"Prod. petróleo","label_en":"Oil prod.","val":"242 Bbl/d"},{"label_es":"Prod. gas","label_en":"Gas prod.","val":"3,821 Mcf/d"},{"label_es":"Total boe","label_en":"Total boe","val":"883 Boe/d"},{"label_es":"Vencimiento","label_en":"Expiry","val":"Ago 2026"}]'::jsonb
WHERE slug = 'tdf';

-- ── Consolidado — actualizar KPIs ───────────────────────────────────────────────
-- Total: Oil 7,456 Bbl/d, LPG 4 Bbl/d, Gas 7,273 Mcf/d, Total 8,672 Boe/d
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('kpi.production.value', '8,672', '8,672'),
  ('kpi.production.unit',  'boe/d', 'boe/d'),
  ('kpi.production.delta', '1Q 2026', '1Q 2026')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

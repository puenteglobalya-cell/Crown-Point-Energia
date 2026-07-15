-- Consolidate the two "Calidad de crudo — Chañares / PPCO" stat entries in
-- the merged CH/PPCO card into a single averaged value:
-- (31.94 + 33.7) / 2 = 32.82° API
UPDATE operations_blocks SET
  stats = '[{"label_es":"Producción petróleo (consolidada)","label_en":"Oil production (consolidated)","val":"482 Bbl/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"39"},{"label_es":"Pozos inyectores","label_en":"Injector wells","val":"4"},{"label_es":"Participación WI","label_en":"Working interest","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy Argentina S.A."},{"label_es":"Calidad de crudo (consolidada)","label_en":"Crude quality (consolidated)","val":"32.82° API"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza / Cuyana"}]'::jsonb,
  updated_at = NOW()
WHERE slug = 'chanares';

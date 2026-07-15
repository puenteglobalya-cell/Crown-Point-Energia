-- Well counts for the consolidated CH/PPCO card:
-- Chañares Herrados: 32 active producers + 4 injectors
-- PPCO: 7 active producers + 0 injectors
-- Combined: 39 active producers + 4 injectors
UPDATE operations_blocks SET
  stats = '[{"label_es":"Producción petróleo (consolidada)","label_en":"Oil production (consolidated)","val":"482 Bbl/d"},{"label_es":"Pozos activos","label_en":"Active wells","val":"39"},{"label_es":"Pozos inyectores","label_en":"Injector wells","val":"4"},{"label_es":"Participación WI","label_en":"Working interest","val":"50%"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy Argentina S.A."},{"label_es":"Calidad de crudo — Chañares","label_en":"Crude quality — Chañares","val":"31.94° API · Medium"},{"label_es":"Calidad de crudo — PPCO","label_en":"Crude quality — PPCO","val":"33.7° API · Light"},{"label_es":"Provincia","label_en":"Province","val":"Mendoza / Cuyana"}]'::jsonb,
  map_stats = '[{"label_es":"Concesiones","label_en":"Concessions","val":"2"},{"label_es":"WI","label_en":"WI","val":"50%"},{"label_es":"Pozos activos","label_en":"Active wells","val":"39"},{"label_es":"Operador","label_en":"Operator","val":"Tango Energy"},{"label_es":"Producción","label_en":"Production","val":"482 Bbl/d"}]'::jsonb
WHERE slug = 'chanares';

-- Update Cuenca Austral (TDF) working interest from 48.3% to 48.3275%
-- Source: Certificación Sproule / Asamblea de Accionistas 29/04/2026

UPDATE operations_blocks SET
  chips = replace(chips::text, '"48.3% WI"', '"48.3275% WI"')::jsonb,
  lede_es = replace(lede_es, '48.3%', '48.3275%'),
  lede_en = replace(lede_en, '48.3%', '48.3275%'),
  body_es = array(SELECT replace(unnest(body_es), '48.3%', '48.3275%')),
  body_en = array(SELECT replace(unnest(body_en), '48.3%', '48.3275%')),
  stats    = replace(stats::text,     '"48.3%"', '"48.3275%"')::jsonb,
  map_stats = replace(map_stats::text, '"48.3%"', '"48.3275%"')::jsonb
WHERE slug = 'tdf';

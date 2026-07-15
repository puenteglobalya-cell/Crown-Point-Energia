-- Actualización de cotización CWV (TSXV) — datos de Google Finance al 13/07/2026
-- Fuente: https://www.google.com/finance/beta/quote/CWV:CVE?window=MAX
INSERT INTO cms_fields (key, value_es, value_en, updated_at) VALUES
  ('stock.price',  'CA $0.17',      'CA $0.17',      NOW()),
  ('stock.delta',  '0.00 (0.00%)',  '0.00 (0.00%)',  NOW()),
  ('stock.beta',   '0.26',          '0.26',          NOW()),
  ('stock.vol30',  '4.51K',         '4.51K',         NOW()),
  ('stock.high52', 'CA $0.30',      'CA $0.30',      NOW()),
  ('stock.low52',  'CA $0.09',      'CA $0.09',      NOW()),
  ('stock.cap',    'CA $12.03M',    'CA $12.03M',    NOW()),
  ('stock.shares', '72.90M',        '72.90M',        NOW())
ON CONFLICT (key) DO UPDATE SET
  value_es = EXCLUDED.value_es,
  value_en = EXCLUDED.value_en,
  updated_at = NOW();

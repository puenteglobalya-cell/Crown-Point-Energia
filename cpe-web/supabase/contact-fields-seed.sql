-- Actualiza / inserta los campos de contacto en cms_fields.
-- Correr en Supabase SQL Editor (safe to re-run).

-- Elimina claves viejas si quedaron
DELETE FROM cms_fields WHERE key IN (
  'contact.ba.address', 'contact.ba.phone',
  'contact.ir.person', 'contact.prensa.email', 'contact.compras.email'
);

-- Argentina
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('contact.ar.address', 'Suipacha 1111, Piso 18' || chr(10) || 'C1008AAW, Buenos Aires',
                         'Suipacha 1111, Floor 18' || chr(10) || 'C1008AAW, Buenos Aires'),
  ('contact.ar.phone',   '+54 11 5252-4801', '+54 11 5252-4801'),
  ('contact.ar.email',   'ir@crownpointenergy.com', 'ir@crownpointenergy.com')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- Canadá
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('contact.ca.address', 'PO Box 1562 Station M.' || chr(10) || 'Calgary, Alberta T2P 3B9',
                         'PO Box 1562 Station M.' || chr(10) || 'Calgary, Alberta T2P 3B9'),
  ('contact.ca.phone',   '+1 403-232-1150', '+1 403-232-1150'),
  ('contact.ca.email',   'info@crownpointenergy.com', 'info@crownpointenergy.com')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- Agente de Transferencia
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('contact.ta.name',    'Olympia Trust Company', 'Olympia Trust Company'),
  ('contact.ta.address', '4000, 520-3rd Avenue SW' || chr(10) || 'Calgary, AB T2P 0R3',
                         '4000, 520-3rd Avenue SW' || chr(10) || 'Calgary, AB T2P 0R3'),
  ('contact.ta.phone',   '+1 587-774-2340', '+1 587-774-2340'),
  ('contact.ta.url',     'https://www.olympiatrust.com', 'https://www.olympiatrust.com')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

-- IR y Ética
INSERT INTO cms_fields (key, value_es, value_en) VALUES
  ('contact.ir.email',     'ir@crownpointenergy.com',   'ir@crownpointenergy.com'),
  ('contact.ethics.phone', '+54 9 11 5263-0361',        '+54 9 11 5263-0361'),
  ('contact.ethics.email', 'etica@crownpointenergy.com','etica@crownpointenergy.com')
ON CONFLICT (key) DO UPDATE SET
  value_es   = EXCLUDED.value_es,
  value_en   = EXCLUDED.value_en,
  updated_at = now();

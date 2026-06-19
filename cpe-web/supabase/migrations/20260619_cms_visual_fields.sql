-- CMS fields for visual improvements
-- Run in Supabase SQL Editor

INSERT INTO cms_fields (key, value_es, value_en) VALUES
  -- "En números" strip
  ('stats.pozos',       '357',   '357'),
  ('stats.inyectores',  '83',    '83'),
  ('stats.cuencas',     '4',     '4'),
  ('stats.ha',          '372k',  '372k'),
  ('stats.anios',       '25+',   '25+'),

  -- Statement section (editable quote between KPIs and map)
  ('statement.home.es', 'Crecimiento disciplinado con activos reales.',   'Disciplined growth backed by real assets.'),
  ('statement.home.en', 'Disciplined growth backed by real assets.',       'Disciplined growth backed by real assets.'),

  -- Hero alt texts
  ('hero.home.img.alt',        'Operaciones Crown Point Energía — Argentina', 'Crown Point Energía operations — Argentina'),
  ('hero.operaciones.img.alt', 'Operaciones en campo — Crown Point Energía',  'Field operations — Crown Point Energía'),

  -- Block photos (URLs empty = placeholder shown; set via /admin/imagenes)
  ('img.ops.ppc',      '', ''),
  ('img.ops.chanares', '', ''),
  ('img.ops.tordillo', '', ''),
  ('img.ops.piedra',   '', ''),
  ('img.ops.tdf',      '', ''),
  ('img.ops.cerro',    '', ''),

  -- Block photo alt texts
  ('img.ops.ppc.alt',      'Puesto Pozo Cercado Oriental — Mendoza',          'Puesto Pozo Cercado Oriental — Mendoza'),
  ('img.ops.chanares.alt', 'Chañares Herrados — Mendoza',                     'Chañares Herrados — Mendoza'),
  ('img.ops.tordillo.alt', 'El Tordillo, La Tapera, Puesto Quiroga — Chubut', 'El Tordillo, La Tapera, Puesto Quiroga — Chubut'),
  ('img.ops.piedra.alt',   'Piedra Clavada & Koluel Kaike — Santa Cruz',      'Piedra Clavada & Koluel Kaike — Santa Cruz'),
  ('img.ops.tdf.alt',      'Río Cullen, Las Violetas, La Angostura — TDF',    'Río Cullen, Las Violetas, La Angostura — TDF'),
  ('img.ops.cerro.alt',    'Cerro de Los Leones — Mendoza',                   'Cerro de Los Leones — Mendoza')

ON CONFLICT (key) DO NOTHING;

-- team-members-seed.sql
-- Replace placeholder team data with real Crown Point bios.
-- Run once in Supabase SQL Editor (service role or dashboard).

TRUNCATE TABLE team_members RESTART IDENTITY CASCADE;

INSERT INTO team_members
  (name, role_es, role_en, bio_es, bio_en, initials, bg, tipo, cargo_board, independiente, orden)
VALUES
  -- ── Management ─────────────────────────────────────────────────────────────
  (
    'Brian Moss',
    'Presidente – CEO Interino',
    'President – Interim CEO',
    'Dr. Moss tiene más de 20 años de experiencia en la industria argentina del petróleo y gas, ocupando puestos de alto nivel centrados en América Latina en Alberta Energy Company, Rio Alto y Antrim Energy antes de unirse a Crown Point. En total, Brian cuenta con más de 35 años de experiencia en la industria del petróleo y el gas en empresas públicas y privadas. El Dr. Moss cuenta con un conjunto de habilidades comerciales, en exploración y desarrollo y ha construido y administrado exitosamente operaciones en las cuencas San Jorge, Austral, Neuquén y Noroeste. El Dr. Moss tiene un Doctorado en Geología del Petróleo de la Royal School of Mines, Universidad de Londres, Reino Unido y es miembro de la Asociación Profesional de Ingenieros, Geólogos y Geofísicos de Alberta.',
    'Dr. Moss has over 20 years of experience in the Argentine oil and gas industry, holding senior Latin America-focused positions at Alberta Energy Company, Rio Alto and Antrim Energy before joining Crown Point. In total, Brian has over 35 years of experience in the oil and gas industry across public and private companies. Dr. Moss brings a commercial, exploration and development skill set and has successfully built and managed operations in the San Jorge, Austral, Neuquén and Northwest basins. Dr. Moss holds a PhD in Petroleum Geology from the Royal School of Mines, University of London, UK, and is a member of the Professional Association of Engineers, Geologists and Geophysicists of Alberta.',
    'BM',
    'linear-gradient(135deg,#1A2B4C,#2E4878)',
    'management',
    '',
    NULL,
    1
  ),
  (
    'Marcos Esteves',
    'Vicepresidente de Finanzas – CFO',
    'VP Finance – CFO',
    'Desde 2016, Marcos ha invertido en, y ha sido propietario y operador de pequeñas empresas de servicios petroleros que brindan apoyo a actividades de perforación en la formación de shale de Vaca Muerta, en Argentina. Marcos trabajó previamente en diversos roles de banca de inversión, incluyendo: Director Financiero y Director General de la oficina de Buenos Aires de Deutsche Bank AG (2006–2016), donde lideró la estrategia financiera general y el desempeño operativo de la oficina en Argentina; y Vicepresidente de Ventas y Operaciones de la oficina de Buenos Aires de JPMorgan Chase & Co. (1997–2006), donde gestionó actividades institucionales de ventas y operaciones de renta fija para importantes clientes corporativos y soberanos. Marcos posee una Licenciatura en Ciencias en Ingeniería por la Universidad de Tulane y un MBA por la Universidad Carnegie Mellon.',
    'Since 2016, Marcos has invested in, owned and operated small oilfield services companies supporting drilling activities in the Vaca Muerta shale formation in Argentina. Marcos previously worked in various investment banking roles including: CFO and General Manager of the Buenos Aires office of Deutsche Bank AG (2006–2016), where he led the overall financial strategy and operational performance of the Argentine office; and VP of Sales and Operations of the Buenos Aires office of JPMorgan Chase & Co. (1997–2006), where he managed institutional fixed-income sales and operations activities for major corporate and sovereign clients. Marcos holds a BS in Engineering from Tulane University and an MBA from Carnegie Mellon University.',
    'ME',
    'linear-gradient(135deg,#5C8700,#82BC00)',
    'management',
    '',
    NULL,
    2
  ),
  -- ── Directorio Titular (Asamblea 29/04/2026) ────────────────────────────
  (
    'Andrés Pedro Peralta',
    'Director Titular',
    'Director',
    '', '',
    'AP',
    'linear-gradient(135deg,#1A2B4C,#2E4878)',
    'board',
    'Director Titular',
    NULL,
    3
  ),
  (
    'Eduardo Ruben Oliver',
    'Director Titular',
    'Director',
    '', '',
    'EO',
    'linear-gradient(135deg,#5C8700,#82BC00)',
    'board',
    'Director Titular',
    NULL,
    4
  ),
  (
    'Isela Angélica Constantini',
    'Director Titular',
    'Director',
    '', '',
    'IC',
    'linear-gradient(135deg,#1A5C5C,#2E8A7A)',
    'board',
    'Director Titular',
    NULL,
    5
  ),
  (
    'Matías Agustín Peralta',
    'Director Titular',
    'Director',
    '', '',
    'MP',
    'linear-gradient(135deg,#2A3A6C,#4A5A9C)',
    'board',
    'Director Titular',
    NULL,
    6
  ),
  (
    'Juan Manuel Llado',
    'Director Titular',
    'Director',
    '', '',
    'JL',
    'linear-gradient(135deg,#5C8700,#82BC00)',
    'board',
    'Director Titular',
    NULL,
    7
  ),
  -- ── Directorio Suplente ──────────────────────────────────────────────────
  (
    'Julián Andrés Racauchi',
    'Director Suplente',
    'Alternate Director',
    '', '',
    'JR',
    'linear-gradient(135deg,#4A4A6A,#6A6A8A)',
    'board',
    'Director Suplente',
    NULL,
    8
  ),
  -- ── Síndicos Titulares (Comisión Fiscalizadora) ──────────────────────────
  (
    'Rodolfo Eduardo Moresi',
    'Síndico Titular',
    'Statutory Auditor',
    '', '',
    'RM',
    'linear-gradient(135deg,#2A2A3A,#4A4A5A)',
    'board',
    'Síndico Titular',
    NULL,
    9
  ),
  (
    'Fabiana Lucía García',
    'Síndico Titular',
    'Statutory Auditor',
    '', '',
    'FG',
    'linear-gradient(135deg,#6B1A2E,#9E2A45)',
    'board',
    'Síndico Titular',
    NULL,
    10
  ),
  (
    'Raúl Alberto Muñoz',
    'Síndico Titular',
    'Statutory Auditor',
    '', '',
    'RA',
    'linear-gradient(135deg,#5C4A3A,#7A6A5A)',
    'board',
    'Síndico Titular',
    NULL,
    11
  ),
  -- ── Síndicos Suplentes ───────────────────────────────────────────────────
  (
    'Pablo Gastón Muñoz',
    'Síndico Suplente',
    'Alternate Statutory Auditor',
    '', '',
    'PG',
    'linear-gradient(135deg,#2A2A3A,#4A4A5A)',
    'board',
    'Síndico Suplente',
    NULL,
    12
  ),
  (
    'Carlos Eduardo González',
    'Síndico Suplente',
    'Alternate Statutory Auditor',
    '', '',
    'CG',
    'linear-gradient(135deg,#4A4A6A,#6A6A8A)',
    'board',
    'Síndico Suplente',
    NULL,
    13
  ),
  (
    'Analía Silvia Padín',
    'Síndico Suplente',
    'Alternate Statutory Auditor',
    '', '',
    'AS',
    'linear-gradient(135deg,#5C8700,#82BC00)',
    'board',
    'Síndico Suplente',
    NULL,
    14
  );

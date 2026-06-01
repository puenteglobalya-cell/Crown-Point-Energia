-- team-members-seed.sql
-- Replace placeholder team data with real Crown Point bios.
-- Run once in Supabase SQL Editor (service role or dashboard).

TRUNCATE TABLE team_members RESTART IDENTITY CASCADE;

INSERT INTO team_members
  (name, role_es, role_en, bio_es, bio_en, initials, bg, tipo, cargo_board, independiente, orden)
VALUES
  -- ── Management ─────────────────────────────────────────────────────────
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
  -- ── Board ───────────────────────────────────────────────────────────────
  (
    'Pablo Bernardo Peralta',
    'Director No Independiente',
    'Non-Independent Director',
    'Pablo Peralta es el presidente y tiene el control y la dirección de Liminar Energía SA, accionista controlante de Crown Point Energía. El Sr. Peralta tiene más de 30 años de experiencia en servicios y actividades financieras, y es uno de los dos principales accionistas de un grupo de inversión diversificado argentino con intereses en los sectores bancario, financiero, asegurador, agrícola, inmobiliario y energético. Es Director y Vicepresidente del Banco de Servicios y Transacciones, SA, que está registrado en la Comisión Nacional de Valores. Residente en Buenos Aires, el Sr. Peralta obtuvo el título de Contador Público de la Universidad de Buenos Aires.',
    'Pablo Peralta is the president and holds control and direction of Liminar Energía SA, the controlling shareholder of Crown Point Energía. Mr. Peralta has over 30 years of experience in financial services and activities, and is one of the two principal shareholders of a diversified Argentine investment group with interests in the banking, financial, insurance, agricultural, real estate and energy sectors. He is a Director and Vice-President of Banco de Servicios y Transacciones SA, which is registered with the Comisión Nacional de Valores. A Buenos Aires resident, Mr. Peralta holds a CPA degree from the University of Buenos Aires.',
    'PP',
    'linear-gradient(135deg,#1A2B4C,#2E4878)',
    'board',
    'Director',
    false,
    1
  ),
  (
    'Brian Moss',
    'Director No Independiente',
    'Non-Independent Director',
    'Brian J. Moss es Director y Consultor de Crown Point Energy Inc., anteriormente Presidente y CEO de la compañía. El Dr. Moss tiene más de 20 años de experiencia en la industria argentina del petróleo y gas, ocupando puestos de alto nivel centrados en América Latina en Alberta Energy Company, Rio Alto y Antrim Energy antes de unirse a Crown Point. En total, Brian cuenta con más de 35 años de experiencia en la industria del petróleo y el gas en empresas públicas y privadas. El Dr. Moss cuenta con un conjunto de habilidades comerciales, en exploración y desarrollo y ha construido y administrado exitosamente operaciones en las cuencas San Jorge, Austral, Neuquén y Noroeste. El Dr. Moss tiene un Doctorado en Geología del Petróleo de la Royal School of Mines, Universidad de Londres, Reino Unido y es miembro de la Asociación Profesional de Ingenieros, Geólogos y Geofísicos de Alberta.',
    'Brian J. Moss is a Director and Consultant of Crown Point Energy Inc., previously President and CEO of the company. Dr. Moss has over 20 years of experience in the Argentine oil and gas industry, holding senior Latin America-focused positions at Alberta Energy Company, Rio Alto and Antrim Energy before joining Crown Point. In total, Brian has over 35 years of experience in the oil and gas industry across public and private companies. Dr. Moss brings a commercial, exploration and development skill set and has successfully built and managed operations in the San Jorge, Austral, Neuquén and Northwest basins. Dr. Moss holds a PhD in Petroleum Geology from the Royal School of Mines, University of London, UK, and is a member of the Professional Association of Engineers, Geologists and Geophysicists of Alberta.',
    'BM',
    'linear-gradient(135deg,#1A2B4C,#2E4878)',
    'board',
    'Director',
    false,
    2
  ),
  (
    'Juan Llado',
    'Director No Independiente',
    'Non-Independent Director',
    'Juan es abogado y ha tenido varios cargos durante su carrera en los sectores de servicios financieros, seguros y energía, incluyendo: CEO de Life Seguros de Personas y Patrimoniales S.A. (antes MetLife Argentina); CEO de Life Group Seguros S.A. (antes Prudential Argentina); Director Legales & Compliance en Grupo ST S.A.; Gerente Asuntos Legales y Gerente Banco Fiduciaria en Banco de Servicios y Transacciones S.A.; Gerente Asuntos Legales en Orígenes Seguros; y Gerente Asuntos Legales en Credilogros Compañía Financiera S.A. Se desempeña actualmente como miembro del Comité Ejecutivo en Grupo ST S.A. y en el Directorio de las siguientes compañías: Grupo ST S.A.; Banco de Servicios y Transacciones S.A.; ST Securities S.A.; Best Leasing S.A.; Life Seguros S.A.; Liminar Energía S.A. (accionista controlante); y Crown Point Energía S.A. Juan es abogado graduado en la Universidad de Buenos Aires y tiene un Master en Finanzas de la Universidad del CEMA.',
    'Juan is a lawyer and has held various positions throughout his career in the financial services, insurance and energy sectors, including: CEO of Life Seguros de Personas y Patrimoniales S.A. (formerly MetLife Argentina); CEO of Life Group Seguros S.A. (formerly Prudential Argentina); Legal & Compliance Director at Grupo ST S.A.; Legal Affairs Manager and Trust Bank Manager at Banco de Servicios y Transacciones S.A.; Legal Affairs Manager at Orígenes Seguros; and Legal Affairs Manager at Credilogros Compañía Financiera S.A. He currently serves as a member of the Executive Committee at Grupo ST S.A. and on the Board of Directors of the following companies: Grupo ST S.A.; Banco de Servicios y Transacciones S.A.; ST Securities S.A.; Best Leasing S.A.; Life Seguros S.A.; Liminar Energía S.A. (controlling shareholder); and Crown Point Energía S.A. Juan holds a law degree from the University of Buenos Aires and a Master in Finance from CEMA University.',
    'JL',
    'linear-gradient(135deg,#5C8700,#82BC00)',
    'board',
    'Director',
    false,
    3
  );

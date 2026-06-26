import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { getCmsState } from '@/lib/cms'
import { fetchOperationsBlocks } from '@/lib/content-fetch'
import type { OperationsBlock } from '@/lib/content-fetch'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, TableLayoutType,
} from 'docx'

export const dynamic = 'force-dynamic'

// ── Helpers ─────────────────────────────────────────────────────────────────

const NAVY  = '1F2566'
const GREEN = '6CAE52'
const GRAY  = 'F4F5F7'
const RULE  = 'DDDDDD'

function heading1(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 160 },
    run: { color: NAVY, bold: true },
  })
}

function heading2(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    run: { color: NAVY },
  })
}

function eyebrow(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 60 },
    children: [new TextRun({ text: text.toUpperCase(), color: GREEN, size: 16, bold: true, characterSpacing: 40 })],
  })
}

function bilingualTable(rows: Array<{ label?: string; es: string; en: string }>) {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:          { style: BorderStyle.SINGLE, size: 1, color: RULE },
      bottom:       { style: BorderStyle.SINGLE, size: 1, color: RULE },
      left:         { style: BorderStyle.NONE },
      right:        { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: RULE },
      insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: RULE },
    },
    rows: [
      // Header
      new TableRow({
        tableHeader: true,
        children: [
          cell('Campo', 15, GRAY, true),
          cell('Español', 42, GRAY, true),
          cell('English', 43, GRAY, true),
        ],
      }),
      // Data rows
      ...rows.map(r => new TableRow({
        children: [
          cell(r.label ?? '', 15),
          cell(r.es, 42),
          cell(r.en, 43),
        ],
      })),
    ],
  })
}

function cell(text: string, widthPct: number, shading?: string, bold?: boolean) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: shading ? { type: ShadingType.CLEAR, fill: shading } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold, size: 18 })],
    })],
  })
}

function commentBlock() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: RULE },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: RULE },
      left:   { style: BorderStyle.NONE },
      right:  { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical:   { style: BorderStyle.NONE },
    },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: 'FFFDE7' },
        margins: { top: 80, bottom: 200, left: 100, right: 100 },
        children: [new Paragraph({
          children: [new TextRun({ text: '💬 Comentarios / Comments:', bold: true, size: 18, color: '7A6000' })],
        })],
      })],
    })],
  })
}

function spacer() {
  return new Paragraph({ text: '', spacing: { after: 120 } })
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [s, opsBlocks] = await Promise.all([getCmsState(), fetchOperationsBlocks()])
  const f  = s.fields
  const fe = s.fieldsEn ?? {}

  const sections = buildSections(f, fe, opsBlocks)

  const doc = new Document({
    creator: 'Crown Point Energy — Admin',
    title:   'Crown Point Energy — Validación de contenidos',
    description: 'Documento para revisión y comentarios de contenidos del sitio web',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20 } },
      },
    },
    sections: [{
      children: [
        // Cover
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000, after: 400 },
          children: [new TextRun({ text: 'Crown Point Energy', bold: true, size: 56, color: NAVY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'Validación de contenidos del sitio web', size: 28, color: '555555' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
          children: [new TextRun({ text: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 20, color: '888888' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'Instrucciones: Complete los campos amarillos con sus comentarios o correcciones.', size: 20, italics: true, color: '666666' })],
        }),
        new Paragraph({ pageBreakBefore: true, text: '' }),

        // Sections
        ...sections,
      ],
    }],
  })

  const buffer = Buffer.from(await Packer.toBuffer(doc))

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="cpe-contenidos-${new Date().toISOString().slice(0, 10)}.docx"`,
    },
  })
}

// ── Content map ──────────────────────────────────────────────────────────────

function buildSections(
  f: Record<string, string>,
  fe: Record<string, string>,
  opsBlocks: OperationsBlock[],
) {
  const elems: (Paragraph | Table)[] = []

  function section(label: string, eyebrowText: string, rows: Array<{ label: string; es: string; en: string }>) {
    elems.push(eyebrow(eyebrowText))
    elems.push(heading2(label))
    elems.push(bilingualTable(rows))
    elems.push(commentBlock())
    elems.push(spacer())
  }

  // ── INICIO ────────────────────────────────────────────────────────────────
  elems.push(heading1('1. Inicio (Home)'))

  section('Hero', 'Página principal · Hero', [
    { label: 'Eyebrow',  es: 'TSXV: CWV · Petróleo y gas · Argentina', en: 'TSXV: CWV · Oil & gas · Canada' },
    { label: 'Título',   es: f['hero.title.es'] || 'Energía que sostiene la matriz productiva argentina.', en: f['hero.title.en'] || 'Energy that sustains Argentina\'s productive matrix.' },
    { label: 'Subtítulo', es: f['hero.lede.es']  || 'Operamos en cuatro de las cuencas más relevantes del país.', en: f['hero.lede.en']  || 'We operate in four of the country\'s most relevant basins.' },
  ])

  section('KPIs', 'Página principal · KPIs', [
    { label: 'Período',     es: f['kpis.periodo.es'] || 'Q1 2026 · Cifras clave',  en: f['kpis.periodo.en'] || 'Q1 2026 · Key figures' },
    { label: 'Producción',  es: `${f['kpi.production.value'] || '3,090'} ${f['kpi.production.unit'] || 'boe/d'}`, en: `${f['kpi.production.value'] || '3,090'} ${f['kpi.production.unit'] || 'boe/d'}` },
    { label: 'Reservas',    es: `${f['kpi.reserves.value'] || '18.6'} ${f['kpi.reserves.unit'] || 'MMboe'}`,     en: `${f['kpi.reserves.value'] || '18.6'} ${f['kpi.reserves.unit'] || 'MMboe'}` },
    { label: 'EBITDA',      es: `${f['kpi.ebitda.value'] || '18.4'} ${f['kpi.ebitda.unit'] || 'USD M'}`,        en: `${f['kpi.ebitda.value'] || '18.4'} ${f['kpi.ebitda.unit'] || 'USD M'}` },
    { label: 'Bloques',     es: `${f['kpi.blocks.value'] || '6'} ${f['kpi.blocks.unit'] || 'en 4 cuencas'}`,    en: `${f['kpi.blocks.value'] || '6'} in 4 basins` },
  ])

  section('Sección operaciones (home)', 'Página principal · Operaciones', [
    { label: 'Título',  es: 'N bloques en cuatro cuencas.',       en: 'N blocks across four basins.' },
    { label: 'Bajada',  es: 'Cartera diversificada de áreas convencionales y no convencionales, con foco en gas natural y crudo liviano.', en: 'A diversified portfolio of conventional and unconventional blocks, focused on natural gas and light oil.' },
  ])

  section('Statement / Quote', 'Página principal · Cita', [
    { label: 'Frase',  es: f['statement.home.es'] || 'Crecimiento disciplinado con activos reales.',  en: f['statement.home.en'] || 'Disciplined growth backed by real assets.' },
  ])

  // ── ACERCA DE ──────────────────────────────────────────────────────────────
  elems.push(heading1('2. Acerca de (About)'))

  section('Hero', 'Acerca de · Hero', [
    { label: 'Título', es: (fe['page.acerca.h1'] ? f['page.acerca.h1'] : 'Producción real,\nbase sólida,\nvisión de largo plazo.'), en: (fe['page.acerca.h1'] || 'Real production,\nsolid foundation,\nlong-term vision.') },
    { label: 'Bajada', es: f['page.acerca.lede'] || 'Crown Point Energía S.A. opera en el mercado argentino con casa matriz internacional.', en: fe['page.acerca.lede'] || 'Crown Point Energía S.A. operates in the Argentine market with international headquarters.' },
  ])

  section('Misión, Visión y Principios', 'Acerca de · Misión', [
    { label: 'Misión', es: 'Generar valor para los accionistas haciendo un uso racional de los recursos, estableciendo relaciones a largo plazo y contribuyendo a mejorar la calidad de vida de las comunidades donde operamos.', en: 'Generate value for shareholders through the rational use of resources, building long-term relationships and contributing to improve the quality of life of the communities where we operate.' },
    { label: 'Visión', es: 'Ser una compañía del sector energético, reconocida por su calidad de gestión y el respeto y cuidado del medio ambiente.', en: 'Be an energy sector company recognized for its management quality and its respect and care for the environment.' },
    { label: 'Principios', es: '• Ética y responsabilidad\n• Transparencia y acceso a la información\n• Trabajo en equipo', en: '• Ethics and responsibility\n• Transparency and access to information\n• Teamwork' },
  ])

  section('Estrategia', 'Acerca de · Estrategia', [
    { label: 'Título',  es: 'Crecimiento disciplinado con activos reales.', en: 'Disciplined growth with real assets.' },
    { label: 'Bajada',  es: 'Establecer una cartera de activos de bajo riesgo generadores de un flujo de caja positivo con el fin de garantizar un crecimiento orgánico que facilite y se complemente con un crecimiento inorgánico.', en: 'Build a portfolio of low-risk assets that generate positive cash flow in order to guarantee organic growth that facilitates and complements inorganic growth.' },
  ])

  section('Ventajas competitivas', 'Acerca de · Ventajas', [
    { label: 'Item 1', es: 'Fuerte compromiso del accionista controlante',                                        en: 'Strong commitment from the controlling shareholder' },
    { label: 'Item 2', es: 'Alto conocimiento y experiencia en Argentina del accionista y management',            en: 'Deep knowledge and experience in Argentina from both shareholders and management' },
    { label: 'Item 3', es: 'Rápida capacidad de respuesta',                                                       en: 'Fast response capacity' },
    { label: 'Item 4', es: 'Menor burocracia y estructura más eficiente',                                         en: 'Less bureaucracy and more efficient structure' },
    { label: 'Item 5', es: 'Foco en el negocio principal',                                                        en: 'Focus on core business' },
  ])

  // ── OPERACIONES ────────────────────────────────────────────────────────────
  elems.push(heading1('3. Operaciones'))

  section('Hero', 'Operaciones · Hero', [
    { label: 'Eyebrow', es: 'Upstream · Argentina',                        en: 'Upstream · Argentina' },
    { label: 'Título',  es: f['page.operaciones.h1'] || 'Seis bloques.\nCuatro cuencas.\nUn país.',    en: fe['page.operaciones.h1'] || 'Six blocks.\nFour basins.\nOne country.' },
    { label: 'Bajada',  es: f['page.operaciones.lede'] || 'Una cartera diversificada de áreas productivas y exploratorias, distribuidas estratégicamente entre el norte y el sur de Argentina.', en: fe['page.operaciones.lede'] || 'A diversified portfolio of producing and exploration areas, strategically distributed across northern and southern Argentina.' },
  ])

  // Per-block detail
  const EXPLOTACION = ['tordillo', 'piedra', 'chanares', 'ppc', 'tdf']
  const orderedBlocks = [
    ...EXPLOTACION.map(slug => opsBlocks.find(b => b.slug === slug)).filter(Boolean),
    ...opsBlocks.filter(b => !EXPLOTACION.includes(b.slug) && b.slug !== 'cerro'),
    ...opsBlocks.filter(b => b.slug === 'cerro'),
  ] as OperationsBlock[]

  const COMMODITY_ES: Record<string, string> = { oil: 'Petróleo', gas: 'Gas natural', mixed: 'Petróleo + Gas' }
  const COMMODITY_EN: Record<string, string> = { oil: 'Oil',       gas: 'Natural gas', mixed: 'Oil + Gas' }

  for (const b of orderedBlocks) {
    elems.push(eyebrow(`Operaciones · ${b.eyebrow || b.titulo}`))
    elems.push(heading2(b.titulo))

    // Basic info + lede
    elems.push(bilingualTable([
      { label: 'Eyebrow / Cuenca', es: b.eyebrow,    en: b.eyebrow },
      { label: 'Título',           es: b.titulo,      en: b.titulo },
      { label: 'Commodity',        es: COMMODITY_ES[b.commodity] ?? b.commodity, en: COMMODITY_EN[b.commodity] ?? b.commodity },
      { label: 'Descripción',      es: b.lede_es || '—', en: b.lede_en || '—' },
    ]))
    elems.push(spacer())

    // Body paragraphs
    if (b.body_es?.length || b.body_en?.length) {
      const maxLen = Math.max(b.body_es?.length ?? 0, b.body_en?.length ?? 0)
      const bodyRows = Array.from({ length: maxLen }, (_, i) => ({
        label: `Párrafo ${i + 1}`,
        es:    b.body_es?.[i] ?? '—',
        en:    b.body_en?.[i] ?? '—',
      }))
      elems.push(new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [new TextRun({ text: 'Texto del bloque', bold: true, size: 18, color: NAVY })],
      }))
      elems.push(bilingualTable(bodyRows))
      elems.push(spacer())
    }

    // Stats
    if (b.stats?.length) {
      elems.push(new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [new TextRun({ text: 'Estadísticas', bold: true, size: 18, color: NAVY })],
      }))
      elems.push(bilingualTable(b.stats.map(s => ({
        label: s.val,
        es:    s.label_es,
        en:    s.label_en,
      }))))
      elems.push(spacer())
    }

    // Chips
    if (b.chips?.length) {
      elems.push(new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [new TextRun({ text: 'Tags / Chips: ', bold: true, size: 18, color: NAVY }), new TextRun({ text: b.chips.join(' · '), size: 18 })],
      }))
    }

    elems.push(commentBlock())
    elems.push(spacer())
  }

  // ── INVERSORES ────────────────────────────────────────────────────────────
  elems.push(heading1('4. Inversores (Investor Relations)'))

  section('Hero', 'Inversores · Hero', [
    { label: 'Eyebrow', es: 'TSXV: CWV',                                                                       en: 'TSXV: CWV' },
    { label: 'Título',  es: f['page.inversores.h1'] || 'Información para el inversor.',                         en: fe['page.inversores.h1'] || 'Investor information.' },
    { label: 'Bajada',  es: f['page.inversores.lede'] || 'Resultados, estrategia y gobierno corporativo.',      en: fe['page.inversores.lede'] || 'Results, strategy and corporate governance.' },
  ])

  section('¿Por qué Crown Point?', 'Inversores · Value proposition', [
    { label: 'Punto 1', es: 'Activos reales generadores de caja en producción',         en: 'Cash-generating real assets in production' },
    { label: 'Punto 2', es: 'Equipo experimentado en el upstream argentino',            en: 'Experienced team in Argentine upstream' },
    { label: 'Punto 3', es: 'Diversificación por cuencas y commodities',                en: 'Diversification by basins and commodities' },
    { label: 'Punto 4', es: 'Exposición a precios internacionales del petróleo',        en: 'Exposure to international oil prices' },
    { label: 'Punto 5', es: 'Gobierno corporativo con doble cotización TSX-CNV',        en: 'Corporate governance with dual TSX-CNV listing' },
  ])

  // ── ESG ───────────────────────────────────────────────────────────────────
  elems.push(heading1('5. ESG & Responsabilidad corporativa'))

  section('Hero', 'ESG · Hero', [
    { label: 'Título', es: f['page.esg.h1'] || 'Compromiso con las personas y el planeta.', en: fe['page.esg.h1'] || 'Commitment to people and the planet.' },
    { label: 'Bajada', es: f['page.esg.lede'] || 'Operamos con estándares ambientales, sociales y de gobierno que superan la regulación local.', en: fe['page.esg.lede'] || 'We operate to environmental, social and governance standards that exceed local regulation.' },
  ])

  section('Pilares ESG', 'ESG · Pilares', [
    { label: 'Ambiental', es: 'Gestión de emisiones, agua y residuos. Planes de cierre de pozos y remediación.',                              en: 'Emissions, water and waste management. Well abandonment and remediation plans.' },
    { label: 'Social',    es: 'Inversión comunitaria, empleo local y condiciones laborales seguras.',                                          en: 'Community investment, local employment and safe working conditions.' },
    { label: 'Gobierno',  es: 'Directorio independiente, auditorías externas, política anticorrupción y línea ética.',                         en: 'Independent board, external audits, anti-corruption policy and ethics hotline.' },
  ])

  // ── COMERCIAL ─────────────────────────────────────────────────────────────
  elems.push(heading1('6. Comercial'))

  section('Hero', 'Comercial · Hero', [
    { label: 'Título', es: f['page.comercial.h1'] || 'Comercialización de hidrocarburos.', en: fe['page.comercial.h1'] || 'Hydrocarbon trading.' },
    { label: 'Bajada', es: f['page.comercial.lede'] || 'Gestión integral de la venta de crudo y gas natural de nuestra producción.', en: fe['page.comercial.lede'] || 'Full management of crude oil and natural gas sales from our production.' },
  ])

  // ── CONTACTO ──────────────────────────────────────────────────────────────
  elems.push(heading1('7. Contacto'))

  section('Datos de contacto', 'Contacto · Información', [
    { label: 'Buenos Aires',    es: 'Godoy Cruz 2769, Piso 4 — C1425FQK\n+54 11-5032-5600\nnotificaciones@crownpointenergy.com', en: 'Godoy Cruz 2769, Floor 4 — C1425FQK\n+54 11-5032-5600\nnotificaciones@crownpointenergy.com' },
    { label: 'Calgary',         es: 'PO Box 1562 Station M.\nCalgary, Alberta T2P 3B9\n+1 403-232-1150\ninfo@crownpointenergy.com', en: 'PO Box 1562 Station M.\nCalgary, Alberta T2P 3B9\n+1 403-232-1150\ninfo@crownpointenergy.com' },
    { label: 'IR',              es: 'ir@crownpointenergy.com', en: 'ir@crownpointenergy.com' },
    { label: 'Comercialización', es: 'comercial@crownpointenergy.com', en: 'comercial@crownpointenergy.com' },
    { label: 'Proveedores',     es: 'compras@crownpointenergy.com',   en: 'compras@crownpointenergy.com' },
    { label: 'Línea ética',     es: f['contact.ethics.email'] || 'etica@crownpointenergy.com', en: f['contact.ethics.email'] || 'etica@crownpointenergy.com' },
  ])

  section('Agente de transferencia', 'Contacto · Transfer Agent', [
    { label: 'Agente', es: 'Olympia Trust Company\n4000, 520-3rd Avenue SW\nCalgary, AB T2P 0R3\n+1 587-774-2340\nolympiatrust.com', en: 'Olympia Trust Company\n4000, 520-3rd Avenue SW\nCalgary, AB T2P 0R3\n+1 587-774-2340\nolympiatrust.com' },
  ])

  // ── LEGAL ─────────────────────────────────────────────────────────────────
  elems.push(heading1('8. Legal'))

  section('Términos y condiciones', 'Legal · Términos', [
    { label: 'Titular',           es: 'Crown Point Energía S.A.',                                               en: 'Crown Point Energy Inc. (through Crown Point Energía S.A.)' },
    { label: 'Forward-looking',   es: 'Este sitio puede contener declaraciones y estimaciones sobre resultados futuros. Dichas declaraciones implican riesgos e incertidumbres.', en: 'This site may contain forward-looking statements and estimates about future results. Such statements involve known and unknown risks and uncertainties.' },
    { label: 'TSXV disclaimer',   es: 'Ni la TSX Venture Exchange ni su Proveedor de Servicios de Regulación aceptan responsabilidad por la idoneidad o exactitud del contenido.', en: 'Neither TSX Venture Exchange nor its Regulation Services Provider accepts responsibility for the adequacy or accuracy of this site.' },
    { label: 'Jurisdicción',      es: 'República Argentina — tribunales de la Ciudad Autónoma de Buenos Aires.',  en: 'Argentine Republic — courts of the City of Buenos Aires.' },
  ])

  section('Política de privacidad y cookies', 'Legal · Privacidad', [
    { label: 'Datos personales',  es: 'Se recopilan únicamente nombre, email y mensaje del formulario de contacto, exclusivamente para responder la consulta.',  en: 'Only name, email and message from the contact form are collected, exclusively to respond to the inquiry.' },
    { label: 'Cookies',           es: 'Cookies propias (idioma) y de análisis (Google Analytics, anónimas). Sin cookies publicitarias.',                           en: 'First-party cookies (language) and analytics cookies (Google Analytics, anonymous). No advertising cookies.' },
    { label: 'Retención',         es: 'Máximo 24 meses. Rectificación o eliminación: info@crownpointenergy.com.',                                                  en: 'Maximum 24 months. Rectification or deletion: info@crownpointenergy.com.' },
    { label: 'Ley aplicable',     es: 'Ley 25.326 de Protección de Datos Personales de la República Argentina.',                                                   en: 'Argentine Personal Data Protection Law 25,326.' },
  ])

  return elems
}

export interface AreaCashFlow {
  nombre: string
  prod_mes: number     // M3/día mes actual
  prod_prom: number    // M3/día promedio período
  opex_mes: number     // U$S/bbl mes actual
  opex_prom: number
  precio_mes: number   // U$S/bbl precio neto mes actual
  precio_prom: number
}

export interface FacturacionMensual {
  mes: string
  monto_MM: number     // MM USD OIL+GAS
  estimado?: boolean
}

export interface PrecioMensual {
  mes: string
  precio: number       // US$/bbl percibido promedio
  brent: number        // US$/bbl Brent referencia
  estimado?: boolean
}

export interface DatosAccionista {
  periodo: string      // "Ene-26 | Abr-26"
  mes_inicio: string
  mes_fin: string
  areas: {
    et: AreaCashFlow
    pckk: AreaCashFlow
    consolidado: AreaCashFlow
  }
  facturacion: FacturacionMensual[]
  precios_oil: PrecioMensual[]
  descuentos?: {
    et:   { q1: number; q2: number; q3: number }
    pckk: { q1: number; q2: number; q3: number }
  }
  gas_campaña?: {
    anterior_prom: number
    nueva_prom:    number
    ahorro_total:  number
  }
  deuda_total_MMUS: number
}

// ── helpers ────────────────────────────────────────────────────

function htmlDecode(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"')
}

// Argentine number format: "1.364" = 1364, "32,9" = 32.9, "59.96" = 59.96
function parseArgNum(s: string): number {
  const t = s.trim()
  if (/^\d{1,3}\.\d{3}$/.test(t)) return parseFloat(t.replace('.', ''))
  if (/^\d+,\d+$/.test(t))        return parseFloat(t.replace(',', '.'))
  return parseFloat(t)
}

// Extract one flat array of shape texts from a slide XML
function getSlideShapes(xml: string): string[] {
  const shapes: string[] = []
  const spRegex = /<p:sp[\s>][\s\S]*?<\/p:sp>/g
  let m: RegExpExecArray | null
  while ((m = spRegex.exec(xml)) !== null) {
    const runs = m[0].match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? []
    const text = runs
      .map(r => r.replace(/<a:t[^>]*>([\s\S]*?)<\/a:t>/, '$1'))
      .map(htmlDecode).map(s => s.trim()).filter(Boolean).join(' ').trim()
    if (text) shapes.push(text)
  }
  return shapes
}

// ── cash-flow slide parser ─────────────────────────────────────

const MES_RE = /^(?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+\d{4}\s+([\d.,]+)\s+(M3\/DÍA|U\$S\/BBL)/i
const PROM_RE = /^PROM\s+\S+\s+\d+\s+([\d.,]+)\s+(M3\/DÍA|U\$S\/BBL)/i

function parseCashFlowShapes(shapes: string[]): Omit<AreaCashFlow, 'nombre'> {
  type Ctx = 'prod' | 'opex' | 'precio'
  let ctx: Ctx = 'prod'
  const r = { prod_mes: 0, prod_prom: 0, opex_mes: 0, opex_prom: 0, precio_mes: 0, precio_prom: 0 }

  for (const s of shapes) {
    if (/PRODUCCIÓN EQUIVALENTE/i.test(s))  { ctx = 'prod';   continue }
    if (/OPEX\/BOE/i.test(s))               { ctx = 'opex';   continue }
    if (/PRECIO NETO OIL/i.test(s))         { ctx = 'precio'; continue }

    const mesM = s.match(MES_RE)
    if (mesM) {
      const v = parseArgNum(mesM[1])
      if (ctx === 'prod')   r.prod_mes   = v
      else if (ctx === 'opex')  r.opex_mes   = v
      else                  r.precio_mes = v
      continue
    }
    const promM = s.match(PROM_RE)
    if (promM) {
      const v = parseArgNum(promM[1])
      if (ctx === 'prod')   r.prod_prom   = v
      else if (ctx === 'opex')  r.opex_prom   = v
      else                  r.precio_prom = v
    }
  }
  return r
}

// ── comercial slide parser ─────────────────────────────────────

const MES_ABREV_RE = /^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\s+\d{4}/i
const BILLING_RE   = /^\$([\d,]+)\s*M$/i
const PRICE_RE     = /^(?:ESTIMADO\s+)?(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+([\d.]+)\s+US\$\/bbl\s+Brent\s+~\$([\d.]+)/i
const DISC_Q_RE    = /^Q(\d)\s+\S+\s+([-+]?[\d.]+)\s+US\$\//i
const GAS_CAMP_RE  = /CAMPAÑA\s+(\d{4})[–\-]\d+\s+\$([\d.]+)\s+USD\/MCF/i

const MES_MAP: Record<string, string> = {
  ENERO: 'Ene', FEBRERO: 'Feb', MARZO: 'Mar', ABRIL: 'Abr', MAYO: 'May',
  JUNIO: 'Jun', JULIO: 'Jul', AGOSTO: 'Ago', SEPTIEMBRE: 'Sep',
  OCTUBRE: 'Oct', NOVIEMBRE: 'Nov', DICIEMBRE: 'Dic',
}

function parseComericalShapes(shapes: string[]): {
  facturacion:  FacturacionMensual[]
  precios_oil:  PrecioMensual[]
  descuentos?:  DatosAccionista['descuentos']
  gas_campaña?: DatosAccionista['gas_campaña']
} {
  const monthLabels: { mes: string; estimado: boolean }[] = []
  const billingAmts: number[] = []
  const precios_oil: PrecioMensual[] = []
  const descuentos = {
    et:   { q1: 0, q2: 0, q3: 0 },
    pckk: { q1: 0, q2: 0, q3: 0 },
  }
  let discCtx: 'et' | 'pckk' | null = null
  let gasAnt = 0, gasNueva = 0, gasAhorro = 0

  for (const s of shapes) {
    if (MES_ABREV_RE.test(s)) {
      monthLabels.push({ mes: s.match(MES_ABREV_RE)![1], estimado: /ESTIMADO/i.test(s) })
      continue
    }
    const bm = s.match(BILLING_RE)
    if (bm) { billingAmts.push(parseFloat(bm[1].replace(',', '.'))); continue }

    const pm = s.match(PRICE_RE)
    if (pm) {
      precios_oil.push({
        mes:      MES_MAP[pm[1].toUpperCase()] ?? pm[1].slice(0, 3),
        precio:   parseFloat(pm[2]),
        brent:    parseFloat(pm[3]),
        estimado: /^ESTIMADO/i.test(s),
      })
      continue
    }

    if (/^ET$/.test(s.trim()))    { discCtx = 'et';   continue }
    if (/^PC-KK$/.test(s.trim())) { discCtx = 'pckk'; continue }
    const dm = s.match(DISC_Q_RE)
    if (dm && discCtx) {
      const q = parseInt(dm[1]) as 1 | 2 | 3
      const v = parseFloat(dm[2])
      if (q === 1) descuentos[discCtx].q1 = v
      else if (q === 2) descuentos[discCtx].q2 = v
      else if (q === 3) descuentos[discCtx].q3 = v
      continue
    }

    const gm = s.match(GAS_CAMP_RE)
    if (gm) {
      const precio = parseFloat(gm[2])
      if (parseInt(gm[1]) === 2025) gasAnt = precio; else gasNueva = precio
      continue
    }
    const sm = s.match(/^US\$\s+([\d,]+)$/)
    if (sm) gasAhorro = parseFloat(sm[1].replace(/,/g, ''))
  }

  const facturacion: FacturacionMensual[] = monthLabels
    .slice(0, billingAmts.length)
    .map((ml, i) => ({ mes: ml.mes, monto_MM: billingAmts[i], estimado: ml.estimado }))

  return {
    facturacion,
    precios_oil,
    descuentos: descuentos.et.q1 !== 0 || descuentos.pckk.q1 !== 0 ? descuentos : undefined,
    gas_campaña: gasAnt > 0
      ? { anterior_prom: gasAnt, nueva_prom: gasNueva, ahorro_total: gasAhorro }
      : undefined,
  }
}

// ── main export ────────────────────────────────────────────────

export async function parsearAccionistaPPTX(file: File): Promise<DatosAccionista> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())

  const slideKeys = Object.keys(zip.files)
    .filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => {
      const n = (s: string) => parseInt(s.match(/slide(\d+)\.xml/)![1])
      return n(a) - n(b)
    })

  const allSlides: string[][] = await Promise.all(
    slideKeys.map(async k => getSlideShapes(await zip.files[k].async('text')))
  )

  // Cover: "Seguimiento Ene-26 | Abr-26"
  let periodo = '', mes_inicio = '', mes_fin = ''
  for (const s of allSlides[0] ?? []) {
    const m = s.match(/Seguimiento\s+([\w-]+)\s*\|\s*([\w-]+)/i)
    if (m) { mes_inicio = m[1]; mes_fin = m[2]; periodo = `${m[1]} | ${m[2]}`; break }
  }

  const dflt = (nombre: string): AreaCashFlow => ({
    nombre, prod_mes: 0, prod_prom: 0, opex_mes: 0, opex_prom: 0, precio_mes: 0, precio_prom: 0,
  })
  let et          = dflt('El Tordillo + LTPQ')
  let pckk        = dflt('Piedra Clavada + Koluel Kaike')
  let consolidado = dflt('Consolidado WI CPESA')

  for (let i = 1; i < allSlides.length; i++) {
    const title = allSlides[i][0] ?? ''
    if (/Tordillo/i.test(title))              et          = { ...et,          ...parseCashFlowShapes(allSlides[i]) }
    else if (/Piedra|Koluel/i.test(title))    pckk        = { ...pckk,        ...parseCashFlowShapes(allSlides[i]) }
    else if (/Consolidado/i.test(title))      consolidado = { ...consolidado, ...parseCashFlowShapes(allSlides[i]) }
  }

  let facturacion: FacturacionMensual[] = []
  let precios_oil: PrecioMensual[]      = []
  let descuentos:  DatosAccionista['descuentos']
  let gas_campaña: DatosAccionista['gas_campaña']

  for (const shapes of allSlides) {
    if (shapes.some(s => /^Comercial/i.test(s))) {
      const c = parseComericalShapes(shapes)
      facturacion = c.facturacion; precios_oil = c.precios_oil
      descuentos  = c.descuentos;  gas_campaña = c.gas_campaña
      break
    }
  }

  let deuda_total_MMUS = 0
  for (const shapes of [...allSlides].reverse()) {
    for (const s of shapes) {
      const m = s.match(/DEUDA TOTAL\s+\w+\s+([\d,]+)\s+MMU\$S/i)
      if (m) { deuda_total_MMUS = parseArgNum(m[1]); break }
    }
    if (deuda_total_MMUS > 0) break
  }

  if (!periodo) throw new Error('No se encontró la carátula "Seguimiento … | …" en el PPTX')

  return {
    periodo, mes_inicio, mes_fin,
    areas: { et, pckk, consolidado },
    facturacion, precios_oil, descuentos, gas_campaña,
    deuda_total_MMUS,
  }
}

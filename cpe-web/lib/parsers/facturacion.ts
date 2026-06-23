import ExcelJS from 'exceljs'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LineaFacturacion {
  fecha: string           // "YYYY-MM-DD"
  mes: string             // "YYYY-MM"
  mes_label: string       // "Ene-26"
  tipo_comp: string       // "FA" | "CA" | "DA" | "FE" etc.
  comprobante: string     // "FA 0009-00001204"
  cliente_cod: string
  cliente: string
  art_codigo: string
  art_desc: string        // sa_descmed truncado
  categoria: string       // Petróleo | Gas | Impuestos | Ajuste de precio área | Diferencia de Cambio | Intereses | Venta de materiales | Recupero de gastos | Otros
  bloque: string          // ET | PCKK | CH | PPC | ENA | Gas | Financiero | Admin | Varios
  cantidad: number
  precio_neto_usd_u: number   // PcioNetoEU
  importe_usd: number         // PcioNetoET  (main amount — pivot uses this)
  importe_ars: number         // PcioNetoLT
  tc: number                  // tipo de cambio derivado (ARS/USD)
  es_petroleo: boolean
  es_gas: boolean
}

export interface PivotRow {
  categoria: string
  bloque: string
  por_mes: Record<string, number>
  total: number
}

export interface ResumenFacturacion {
  total_facturas: number
  total_nc: number
  neto: number
  por_mes: Record<string, number>
  por_bloque: Record<string, number>
  por_categoria: Record<string, number>
}

export interface DatosFacturacion {
  periodo: string
  periodo_desde: string
  periodo_hasta: string
  meses: string[]
  mes_labels: Record<string, string>
  lineas: LineaFacturacion[]
  pivot: PivotRow[]
  resumen: ResumenFacturacion
}

// ─── Article → bloque mapping ─────────────────────────────────────────────────

const BLOQUE_MAP: Array<[RegExp, string]> = [
  [/^VTA.PET.ET|^GAS.M3.ET|^PLAN.GAS.ET|^ALM\..ET|^CTROLCARGA.ET|^MATERIAL.ET|^TERMAP|^VTA.ET.AJUSTE|^REC.DESPA.NG|^REC.DESPACHANT/i, 'ET'],
  [/^VTA.PET.KK|^IN.KIND.KK|^EYS.GAS.PCKK|^KK.RECUP/i, 'PCKK'],
  [/^VTA.PET.PC|^IN.KIND$|^PC.RECUP/i, 'PCKK'],
  [/^PETROLEO.CHA/i, 'CH'],
  [/^PETROLEO.PPC/i, 'PPC'],
  [/^PETROLEO.ENA/i, 'ENA'],
  [/^GAS.M3$|^000000000003|^INTERESESGAS|^PLAN.GAS/i, 'Gas'],
  [/^DIF_CAMBIO|^OTROS.INGRESOS/i, 'Financiero'],
  [/^GTOS.ADMINISTR|^REC.SUELDOS|^RECUP\..GASTO|^RECUPERO.SUSE|^GO-/i, 'Admin'],
]

function derivarBloque(artCod: string): string {
  const s = artCod.trim()
  for (const [re, bloque] of BLOQUE_MAP) {
    if (re.test(s)) return bloque
  }
  return 'Varios'
}

// ─── Article → categoria mapping ─────────────────────────────────────────────

const CAT_MAP: Array<[RegExp, string]> = [
  [/^VTA.PET|^PETROLEO|^VTA.ET.AJUSTE/i, 'Petróleo'],
  [/^GAS|^PLAN.GAS|^EYS.GAS/i, 'Gas'],
  [/^000000000003/i, 'Impuestos'],
  [/^IN.KIND/i, 'Ajuste de precio área'],
  [/^DIF_CAMBIO/i, 'Diferencia de Cambio'],
  [/^INTERESESGAS|^OTROS.INGRESOS/i, 'Intereses'],
  [/^MATERIAL/i, 'Venta de materiales'],
  [/^ALM\.|^CTROLCARGA|^TERMAP|^REC.DESPA|^REC.DESPACHANT|^KK.RECUP|^PC.RECUP|^GTOS.ADMINISTR|^REC.SUELDOS|^RECUP\..GASTO|^RECUPERO.SUSE|^GO-/i, 'Recupero de gastos'],
]

function derivarCategoria(artCod: string): string {
  const s = artCod.trim()
  for (const [re, cat] of CAT_MAP) {
    if (re.test(s)) return cat
  }
  return 'Otros'
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

const MES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function parsearFecha(v: any): { iso: string; mes: string; label: string } | null {
  let d: Date | null = null
  if (v instanceof Date) {
    d = v
  } else if (typeof v === 'string') {
    const s = v.trim()
    const parsed = Date.parse(s)
    if (!isNaN(parsed)) {
      d = new Date(parsed)
    } else {
      // Handle dd/mm/yyyy or dd-mm-yyyy (Argentine accounting export format)
      const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
      if (parts) {
        const yr = parts[3].length === 2 ? 2000 + parseInt(parts[3], 10) : parseInt(parts[3], 10)
        d = new Date(Date.UTC(yr, parseInt(parts[2], 10) - 1, parseInt(parts[1], 10)))
      }
    }
  } else if (typeof v === 'number' && v > 40000 && v < 60000) {
    d = new Date(Math.round((v - 25569) * 86400 * 1000))
  }
  if (!d || isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const dd = d.getUTCDate()
  return {
    iso:   `${y}-${String(m + 1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`,
    mes:   `${y}-${String(m + 1).padStart(2,'0')}`,
    label: `${MES_LABELS[m]}-${String(y).slice(2)}`,
  }
}

// ─── Comprobante formatter ────────────────────────────────────────────────────

function formatComp(tipo: string, suc: number | string, nro: number | string): string {
  const s = String(suc ?? '').padStart(4, '0')
  const n = String(nro ?? '').padStart(8, '0')
  return `${tipo.trim()} ${s}-${n}`
}

// ─── Pivot builder ────────────────────────────────────────────────────────────

const CAT_ORDER = ['Petróleo','Gas','Impuestos','Ajuste de precio área','Diferencia de Cambio','Intereses','Venta de materiales','Recupero de gastos','Otros']
const BLOQUE_ORDER = ['ET','PCKK','CH','PPC','ENA','Gas','Financiero','Admin','Varios']

function buildPivot(lineas: LineaFacturacion[], meses: string[]): PivotRow[] {
  const map = new Map<string, PivotRow>()
  for (const l of lineas) {
    const key = `${l.categoria}||${l.bloque}`
    if (!map.has(key)) {
      const por_mes: Record<string, number> = {}
      for (const m of meses) por_mes[m] = 0
      map.set(key, { categoria: l.categoria, bloque: l.bloque, por_mes, total: 0 })
    }
    const row = map.get(key)!
    row.por_mes[l.mes] = (row.por_mes[l.mes] ?? 0) + l.importe_usd
    row.total += l.importe_usd
  }
  return Array.from(map.values()).sort((a, b) => {
    const ca = CAT_ORDER.indexOf(a.categoria), cb = CAT_ORDER.indexOf(b.categoria)
    if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb)
    const ba = BLOQUE_ORDER.indexOf(a.bloque), bb = BLOQUE_ORDER.indexOf(b.bloque)
    return (ba < 0 ? 99 : ba) - (bb < 0 ? 99 : bb)
  })
}

// ─── Main parser ──────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// ExcelJS cell value → plain JS value
// ---------------------------------------------------------------------------
function cellVal(raw: ExcelJS.CellValue): unknown {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return raw
  if (raw instanceof Date) return raw
  if (typeof raw === 'object' && 'result' in (raw as object)) {
    return cellVal((raw as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue)
  }
  if (typeof raw === 'object' && 'richText' in (raw as object)) {
    return (raw as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('')
  }
  if (typeof raw === 'object' && 'text' in (raw as object)) {
    return (raw as ExcelJS.CellHyperlinkValue).text
  }
  return String(raw)
}

function worksheetToGrid(ws: ExcelJS.Worksheet): any[][] {
  const grid: any[][] = []
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    // ExcelJS row.values is 1-based (index 0 is undefined).
    // We produce a 0-based array where index 0 = col A, matching
    // what XLSX.utils.sheet_to_json(ws, {header:1}) used to return.
    const vals = row.values as ExcelJS.CellValue[]
    const lastCol = vals.length - 1   // vals[lastCol] is the last column
    const r: any[] = []
    for (let c = 1; c <= lastCol; c++) {
      r.push(cellVal(vals[c] ?? null))
    }
    while (grid.length < rowNumber - 1) grid.push([])
    grid[rowNumber - 1] = r
  })
  return grid
}

export async function parsearFacturacionExcel(file: File): Promise<DatosFacturacion> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)

  // Book2 has one sheet (Sheet1); accept any single sheet
  let sheetName: string | undefined
  wb.eachSheet((ws) => {
    if (!sheetName) {
      if (/detalle.ventas|ventas|facturaci/i.test(ws.name)) sheetName = ws.name
    }
  })
  if (!sheetName && wb.worksheets.length > 0) sheetName = wb.worksheets[0].name

  if (!sheetName) throw new Error('No se encontró ninguna hoja en el archivo.')

  const ws = wb.getWorksheet(sheetName)!
  const raw = worksheetToGrid(ws)

  // Find header row: look for "Articulo" in col 0
  let headerIdx = -1
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if (String(raw[i]?.[0] ?? '').toLowerCase().includes('articulo')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) throw new Error(
    'No se encontró la cabecera. Verificá que el archivo sea una bajada del sistema "Detalle Ventas por Artículos".'
  )

  // Column positions — derived from the known Book2 format
  // If the system ever adds columns, fall back to name-based detection
  const headers = raw[headerIdx] as string[]
  const col = (name: string, fallback: number): number => {
    const idx = headers.findIndex(h => String(h ?? '').toLowerCase().replace(/\s+/g,'') === name.toLowerCase().replace(/\s+/g,''))
    return idx >= 0 ? idx : fallback
  }
  const C = {
    art:      col('Articulo',    0),
    desc:     col('Descripcion', 1),
    cant:     col('Cantidad',    3),
    nbLU:     col('PcioNetoLU',  6),
    nbLT:     col('PcioNetoLT',  7),
    nbEU:     col('PcioNetoEU',  10),
    nbET:     col('PcioNetoET',  11),
    tipo:     col('Tipo',        12),
    suc:      col('Suc',         13),
    nro:      col('Nro',         14),
    cliCod:   col('Cliente',     15),
    cliNom:   col('Nombre',      16),
    fecha:    col('Fecha',       17),
    descMed:  col('sa_descmed',  52),
  }

  const lineas: LineaFacturacion[] = []

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i]
    if (!r || r.every(c => c == null || c === '')) continue

    const fechaParsed = parsearFecha(r[C.fecha])
    if (!fechaParsed) continue

    const artCod  = String(r[C.art]     ?? '').trim()
    const artDesc = String(r[C.descMed] ?? r[C.desc] ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
    const tipo    = String(r[C.tipo]    ?? '').trim()
    const suc     = r[C.suc]
    const nro     = r[C.nro]
    const cantRaw = Number(r[C.cant]  ?? 0)
    // PLAN.GAS invoices are sometimes exported in thousands of m³ (Mm³).
    // Expected monthly volume is ~1,500,000 m³; values under 10 000 are treated as Mm³.
    const cant = /^PLAN\.GAS/i.test(artCod) && cantRaw !== 0 && Math.abs(cantRaw) < 10_000
      ? cantRaw * 1_000
      : cantRaw
    const nbEU    = Number(r[C.nbEU]  ?? 0)   // precio neto USD / unidad
    const nbET    = Number(r[C.nbET]  ?? 0)   // total neto USD
    const nbLT    = Number(r[C.nbLT]  ?? 0)   // total neto ARS

    // Skip rows with no monetary value
    if (nbET === 0 && nbLT === 0) continue

    const tc = nbET !== 0 ? Math.round(nbLT / nbET) : 0

    const categoria  = derivarCategoria(artCod)
    const bloque     = derivarBloque(artCod)
    const esPetroleo = categoria === 'Petróleo'
    const esGas      = categoria === 'Gas'

    // System already stores NCs as negative — use raw values directly
    const importeUSD = nbET
    const importeARS = nbLT

    const cliNom = String(r[C.cliNom] ?? '').trim()

    lineas.push({
      fecha:            fechaParsed.iso,
      mes:              fechaParsed.mes,
      mes_label:        fechaParsed.label,
      tipo_comp:        tipo,
      comprobante:      formatComp(tipo, suc, nro),
      cliente_cod:      String(r[C.cliCod] ?? '').trim(),
      cliente:          cliNom,
      art_codigo:       artCod,
      art_desc:         artDesc,
      categoria,
      bloque,
      cantidad:         cant,
      precio_neto_usd_u: nbEU,
      importe_usd:      importeUSD,
      importe_ars:      importeARS,
      tc,
      es_petroleo:      esPetroleo,
      es_gas:           esGas,
    })
  }

  if (lineas.length === 0) throw new Error(
    'No se encontraron líneas de detalle. Verificá que sea una bajada "Detalle Ventas por Artículos".'
  )


  // Build month index
  const mesSet = new Set<string>()
  const mesLabels: Record<string, string> = {}
  for (const l of lineas) {
    mesSet.add(l.mes)
    mesLabels[l.mes] = l.mes_label
  }
  const meses = Array.from(mesSet).sort()

  // Resumen
  let totalFact = 0, totalNC = 0
  const porMes: Record<string, number> = {}
  const porBloque: Record<string, number> = {}
  const porCategoria: Record<string, number> = {}
  for (const l of lineas) {
    if (l.importe_usd < 0) totalNC += l.importe_usd
    else totalFact += l.importe_usd
    porMes[l.mes]              = (porMes[l.mes]              ?? 0) + l.importe_usd
    porBloque[l.bloque]        = (porBloque[l.bloque]        ?? 0) + l.importe_usd
    porCategoria[l.categoria]  = (porCategoria[l.categoria]  ?? 0) + l.importe_usd
  }

  const desde = meses[0], hasta = meses[meses.length - 1]
  const [yd, md] = desde.split('-')
  const [yh, mh] = hasta.split('-')
  const lDesde = `${MES_LABELS[parseInt(md) - 1]}-${yd.slice(2)}`
  const lHasta = `${MES_LABELS[parseInt(mh) - 1]}-${yh.slice(2)}`

  return {
    periodo:       desde === hasta ? lDesde : `${lDesde} — ${lHasta}`,
    periodo_desde: desde,
    periodo_hasta: hasta,
    meses,
    mes_labels: mesLabels,
    lineas,
    pivot: buildPivot(lineas, meses),
    resumen: {
      total_facturas: totalFact,
      total_nc:       totalNC,
      neto:           totalFact + totalNC,
      por_mes:        porMes,
      por_bloque:     porBloque,
      por_categoria:  porCategoria,
    },
  }
}

// ─── Helpers for cumulative merge ─────────────────────────────────────────────

export function dedupKey(l: LineaFacturacion): string {
  return `${l.art_codigo}|${l.cliente_cod || l.cliente}|${l.fecha}|${l.comprobante}|${Math.round(l.importe_usd * 100)}`
}

export function reconstruirDatosFacturacion(allLineas: LineaFacturacion[]): DatosFacturacion {
  if (allLineas.length === 0) throw new Error('Sin líneas para reconstruir')

  const mesSet = new Set<string>()
  const mesLabels: Record<string, string> = {}
  for (const l of allLineas) {
    mesSet.add(l.mes)
    mesLabels[l.mes] = l.mes_label
  }
  const meses = Array.from(mesSet).sort()

  let totalFact = 0, totalNC = 0
  const porMes: Record<string, number> = {}
  const porBloque: Record<string, number> = {}
  const porCategoria: Record<string, number> = {}
  for (const l of allLineas) {
    if (l.importe_usd < 0) totalNC += l.importe_usd
    else totalFact += l.importe_usd
    porMes[l.mes]             = (porMes[l.mes]             ?? 0) + l.importe_usd
    porBloque[l.bloque]       = (porBloque[l.bloque]       ?? 0) + l.importe_usd
    porCategoria[l.categoria] = (porCategoria[l.categoria] ?? 0) + l.importe_usd
  }

  const desde = meses[0], hasta = meses[meses.length - 1]
  const [yd, md] = desde.split('-')
  const [yh, mh] = hasta.split('-')
  const MES_LABELS_LOCAL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const lDesde = `${MES_LABELS_LOCAL[parseInt(md) - 1]}-${yd.slice(2)}`
  const lHasta = `${MES_LABELS_LOCAL[parseInt(mh) - 1]}-${yh.slice(2)}`

  return {
    periodo:       desde === hasta ? lDesde : `${lDesde} — ${lHasta}`,
    periodo_desde: desde,
    periodo_hasta: hasta,
    meses,
    mes_labels:  mesLabels,
    lineas:      allLineas,
    pivot:       buildPivot(allLineas, meses),
    resumen: {
      total_facturas: totalFact,
      total_nc:       totalNC,
      neto:           totalFact + totalNC,
      por_mes:        porMes,
      por_bloque:     porBloque,
      por_categoria:  porCategoria,
    },
  }
}

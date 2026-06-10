import * as XLSX from 'xlsx'

export interface LineaFacturacion {
  fecha: string           // "YYYY-MM-DD"
  mes: string             // "YYYY-MM"
  mes_label: string       // "Ene-26"
  tipo_comp: string       // "FC" | "NC" | "ND" etc.
  nro_comp: string
  cliente: string
  art_codigo: string
  art_desc: string
  categoria: string       // Petróleo | Gas | Transporte | Ajuste/NC | Ajuste/ND | Otros
  bloque: string          // ET | PCKK | CH | RCLV | TDF | CER | Varios
  cantidad: number
  unidad: string
  precio_unitario: number
  importe: number         // negative for NCs
}

export interface PivotRow {
  categoria: string
  bloque: string
  por_mes: Record<string, number>
  total: number
}

export interface ResumenFacturacion {
  total_facturas: number   // sum of positive lines only
  total_nc: number         // sum of NC/ND lines (negative)
  neto: number             // total_facturas + total_nc
  por_mes: Record<string, number>
  por_bloque: Record<string, number>
  por_categoria: Record<string, number>
}

export interface DatosFacturacion {
  periodo: string                       // "Ene-26 — May-26"
  periodo_desde: string                 // "2026-01"
  periodo_hasta: string                 // "2026-05"
  meses: string[]                       // sorted ["2026-01", ...]
  mes_labels: Record<string, string>    // "2026-01" → "Ene-26"
  lineas: LineaFacturacion[]
  pivot: PivotRow[]
  resumen: ResumenFacturacion
}

// ─── Column detection ────────────────────────────────────────────────────────

const COL_PATTERNS: Array<[string, RegExp]> = [
  ['fecha',          /^fecha|^date|^f\.\s*comp|^fecha.*comp/i],
  ['tipo_comp',      /^tipo|^t\.\s*comp|^tipo.*comp|^comprobante$/i],
  ['nro_comp',       /^n[uú]m|^nro|^número|^n°|^comp.*n[uú]m|^nro.*comp/i],
  ['cliente',        /^cliente|^raz[oó]n|^customer|^comprador/i],
  ['art_codigo',     /^c[oó]d.*art|^art.*c[oó]d|^código$|^sku$|^cod\./i],
  ['art_desc',       /^descripci[oó]n|^nombre.*art|^artículo|^articulo|^producto|^art\./i],
  ['cantidad',       /^cantidad|^qty|^quantity|^volumen|^cant\./i],
  ['unidad',         /^unidad|^unit$|^u\.m\.|^um$/i],
  ['precio_unitario',/^precio.*u|^unit.*price|^p\.u\.|^precio$/i],
  ['importe',        /^importe|^total$|^monto|^amount|^imp\./i],
  ['moneda',         /^moneda|^currency|^mon\./i],
  ['bloque',         /^bloque|^[aá]rea|^concesi[oó]n|^campo/i],
]

function detectarColumnas(headers: (string | null)[]): Record<string, number> {
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    if (!h) return
    const hn = String(h).trim()
    for (const [key, pat] of COL_PATTERNS) {
      if (!(key in map) && pat.test(hn)) {
        map[key] = i
        break
      }
    }
  })
  return map
}

// ─── Block derivation ────────────────────────────────────────────────────────

function derivarBloque(artDesc: string, artCodigo: string, bloqueCol?: string): string {
  if (bloqueCol?.trim()) {
    const b = bloqueCol.trim().toUpperCase()
    if (/TORDILLO|^ET$|ETLPP/.test(b)) return 'ET'
    if (/KOLUEL|PC.?KK|PCKK|PIEDRA/.test(b)) return 'PCKK'
    if (/CHA[NÑ]ARES|^CH$/.test(b)) return 'CH'
    if (/CULLEN|VALINA|RCLV|TDF|TIERRA.*FUEGO/.test(b)) return 'RCLV'
    if (/CERRO|^CER$/.test(b)) return 'CER'
    return bloqueCol.trim()
  }
  const s = (artDesc + ' ' + artCodigo).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/TORDILLO|[^A-Z]ET[^A-Z]|ETLPP/.test(' ' + s + ' ')) return 'ET'
  if (/KOLUEL|PC.?KK|PCKK|PIEDRA.*CLAV/.test(s)) return 'PCKK'
  if (/CHA[NÑ]ARES|CHANA/.test(s)) return 'CH'
  if (/CULLEN|VALINA|RCLV|TIERRA.*FUEGO|TDF|AUSTRAL/.test(s)) return 'RCLV'
  if (/CERRO|NEUQUIN/.test(s)) return 'CER'
  return 'Varios'
}

// ─── Category derivation ─────────────────────────────────────────────────────

function derivarCategoria(artDesc: string, tipoComp: string): string {
  const t = tipoComp.toUpperCase().trim()
  if (/^NC|N\.C\.|NOTA.*CR[EÉ]D/.test(t)) return 'Ajuste/NC'
  if (/^ND|N\.D\.|NOTA.*D[EÉ]B/.test(t)) return 'Ajuste/ND'
  const s = artDesc.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/PETROLEO|CRUDO|OIL/.test(s)) return 'Petróleo'
  if (/GAS/.test(s)) return 'Gas'
  if (/TRANSP/.test(s)) return 'Transporte'
  if (/SERV/.test(s)) return 'Servicios'
  return 'Otros'
}

// ─── Date parsing ────────────────────────────────────────────────────────────

const MES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function parsearFecha(v: any): { iso: string; mes: string; label: string } | null {
  let d: Date | null = null

  if (v instanceof Date) {
    d = v
  } else if (typeof v === 'number' && v > 40000 && v < 60000) {
    d = new Date(Math.round((v - 25569) * 86400 * 1000))
  } else if (typeof v === 'string') {
    // Try DD/MM/YYYY or YYYY-MM-DD
    const m1 = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (m1) {
      const [, a, b, c] = m1
      const yr = c.length === 2 ? '20' + c : c
      // Detect DD/MM vs MM/DD by value: if first number > 12, it's DD
      const day = parseInt(a) > 12 ? a : b
      const mon = parseInt(a) > 12 ? b : a
      d = new Date(`${yr}-${mon.padStart(2,'0')}-${day.padStart(2,'0')}`)
    } else {
      const parsed = Date.parse(v)
      if (!isNaN(parsed)) d = new Date(parsed)
    }
  }

  if (!d || isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const dd = d.getUTCDate()
  const mes = `${y}-${String(m + 1).padStart(2, '0')}`
  return {
    iso: `${y}-${String(m + 1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`,
    mes,
    label: `${MES_LABELS[m]}-${String(y).slice(2)}`,
  }
}

// ─── Sheet name detection ─────────────────────────────────────────────────────

function encontrarHoja(wb: XLSX.WorkBook): string | null {
  const candidates = [
    'Detalle Ventas por Artículos',
    'Detalle Ventas por Articulos',
    'Detalle de Ventas',
    'Ventas',
    'Detalle',
    'Facturación',
    'Facturacion',
  ]
  for (const name of candidates) {
    const match = wb.SheetNames.find(n => n.toLowerCase() === name.toLowerCase())
    if (match) return match
  }
  // Fallback: first sheet with the most rows
  return wb.SheetNames[0] ?? null
}

// ─── Header row detection ─────────────────────────────────────────────────────

function encontrarHeaderRow(data: any[][]): { row: number; cols: Record<string, number> } | null {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i]
    if (!row) continue
    const cols = detectarColumnas(row.map(c => c?.toString() ?? null))
    // Need at least fecha + (importe or art_desc) to be a valid header
    if ('fecha' in cols && ('importe' in cols || 'art_desc' in cols)) {
      return { row: i, cols }
    }
  }
  return null
}

// ─── Pivot builder ────────────────────────────────────────────────────────────

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
    row.por_mes[l.mes] = (row.por_mes[l.mes] ?? 0) + l.importe
    row.total += l.importe
  }

  const CAT_ORDER = ['Petróleo', 'Gas', 'Transporte', 'Servicios', 'Otros', 'Ajuste/NC', 'Ajuste/ND']
  const BLOQUE_ORDER = ['ET', 'PCKK', 'CH', 'RCLV', 'TDF', 'CER', 'Varios']

  return Array.from(map.values()).sort((a, b) => {
    const ca = CAT_ORDER.indexOf(a.categoria)
    const cb = CAT_ORDER.indexOf(b.categoria)
    if (ca !== cb) return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb)
    const ba = BLOQUE_ORDER.indexOf(a.bloque)
    const bb = BLOQUE_ORDER.indexOf(b.bloque)
    return (ba === -1 ? 99 : ba) - (bb === -1 ? 99 : bb)
  })
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parsearFacturacionExcel(file: File): Promise<DatosFacturacion> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheetName = encontrarHoja(wb)
  if (!sheetName) throw new Error('No se encontró la hoja de datos.')

  const ws = wb.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]

  const header = encontrarHeaderRow(raw)
  if (!header) {
    throw new Error(
      `No se encontró la cabecera en la hoja "${sheetName}". ` +
      'Verificá que el archivo tenga columnas de Fecha e Importe.'
    )
  }

  const { row: headerRow, cols } = header

  const lineas: LineaFacturacion[] = []

  for (let i = headerRow + 1; i < raw.length; i++) {
    const row = raw[i]
    if (!row || row.every(c => c == null || c === '')) continue

    const fechaRaw = cols.fecha != null ? row[cols.fecha] : null
    const parsed = parsearFecha(fechaRaw)
    if (!parsed) continue  // skip rows without a valid date (totals, blanks, etc.)

    const tipoComp = String(row[cols.tipo_comp ?? -1] ?? '').trim()
    const nroComp  = String(row[cols.nro_comp ?? -1]  ?? '').trim()
    const cliente  = String(row[cols.cliente ?? -1]   ?? '').trim()
    const artCod   = String(row[cols.art_codigo ?? -1]?? '').trim()
    const artDesc  = String(row[cols.art_desc ?? -1]  ?? '').trim()
    const cantidad = Number(row[cols.cantidad ?? -1]  ?? 0)
    const unidad   = String(row[cols.unidad ?? -1]    ?? '').trim()
    const precioU  = Number(row[cols.precio_unitario ?? -1] ?? 0)
    const importeV = Number(row[cols.importe ?? -1]   ?? 0)
    const bloqueV  = cols.bloque != null ? String(row[cols.bloque] ?? '').trim() : undefined

    if (importeV === 0 && cantidad === 0 && !artDesc && !cliente) continue

    const categoria = derivarCategoria(artDesc || artCod, tipoComp)
    const bloque    = derivarBloque(artDesc, artCod, bloqueV)

    // NCs are negative by convention
    const importe = (categoria === 'Ajuste/NC' || categoria === 'Ajuste/ND')
      ? -Math.abs(importeV)
      : importeV

    lineas.push({
      fecha:           parsed.iso,
      mes:             parsed.mes,
      mes_label:       parsed.label,
      tipo_comp:       tipoComp,
      nro_comp:        nroComp,
      cliente,
      art_codigo:      artCod,
      art_desc:        artDesc,
      categoria,
      bloque,
      cantidad,
      unidad,
      precio_unitario: precioU,
      importe,
    })
  }

  if (lineas.length === 0) {
    throw new Error(
      'No se encontraron líneas de detalle. ' +
      'Verificá que el archivo sea una bajada del sistema de Detalle de Ventas.'
    )
  }

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
  const porMes:      Record<string, number> = {}
  const porBloque:   Record<string, number> = {}
  const porCategoria: Record<string, number> = {}

  for (const l of lineas) {
    if (l.importe < 0) totalNC += l.importe
    else totalFact += l.importe

    porMes[l.mes]           = (porMes[l.mes]           ?? 0) + l.importe
    porBloque[l.bloque]     = (porBloque[l.bloque]     ?? 0) + l.importe
    porCategoria[l.categoria] = (porCategoria[l.categoria] ?? 0) + l.importe
  }

  const desde = meses[0]
  const hasta  = meses[meses.length - 1]
  const [yd, md] = desde.split('-')
  const [yh, mh] = hasta.split('-')
  const labelDesde = `${MES_LABELS[parseInt(md) - 1]}-${yd.slice(2)}`
  const labelHasta = `${MES_LABELS[parseInt(mh) - 1]}-${yh.slice(2)}`
  const periodo = desde === hasta ? labelDesde : `${labelDesde} — ${labelHasta}`

  return {
    periodo,
    periodo_desde: desde,
    periodo_hasta: hasta,
    meses,
    mes_labels: mesLabels,
    lineas,
    pivot: buildPivot(lineas, meses),
    resumen: {
      total_facturas: totalFact,
      total_nc: totalNC,
      neto: totalFact + totalNC,
      por_mes: porMes,
      por_bloque: porBloque,
      por_categoria: porCategoria,
    },
  }
}

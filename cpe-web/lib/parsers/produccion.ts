import ExcelJS from 'exceljs'

export interface AreaProduccion {
  unidadGestion: string   // 'Operado' | 'No Operado'
  provincia: string
  area: string
  semana1: number
  semana2: number
  delta: number
  deltaPct: number
  paMes: number
  promMes: number
  deltaVsPa: number
  perdidasSemana1: number
  perdidasSemana2: number
  perdidasDelta: number
  perdidasPct: number
}

export interface BloqueProduccion {
  unidad: string           // 'm3/d' o 'Mm3/d'
  areas: AreaProduccion[]
  total: {
    semana1: number
    semana2: number
    delta: number
    paMes: number
    promMes: number
    deltaVsPa: number
    perdidasSemana1: number
    perdidasSemana2: number
  }
}

export interface PuntoDiario {
  fecha: string        // YYYY-MM-DD
  oilM3d: number
  gasMm3d: number
}

export interface DatosProduccion {
  periodo: string            // ej. "Semanas 28y29"
  rangoFechas: string         // texto tal cual del archivo
  mes: number
  anio: number
  semana1: number
  semana2: number
  petroleo: BloqueProduccion
  gas: BloqueProduccion
  serieDiaria: PuntoDiario[]
}

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
  return raw
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? 0 : n
  }
  return 0
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim()
}

function get(ws: ExcelJS.Worksheet, row: number, col: number): unknown {
  return cellVal(ws.getCell(row, col).value)
}

// Reads the fixed-layout area rows of one block (Petróleo or Gas) starting
// at `startRow`, up to (and including) the "Total" row. Unidad de Gestión
// and Provincia are only written on the first row of each group in the
// source file — carry the last non-empty value forward to fill the blanks.
function parseBloque(ws: ExcelJS.Worksheet, startRow: number, endRow: number): BloqueProduccion {
  const areas: AreaProduccion[] = []
  let lastUnidad = ''
  let lastProvincia = ''
  let totalRow: number[] = []

  for (let r = startRow; r <= endRow; r++) {
    const areaName = str(get(ws, r, 4))
    const label = str(get(ws, r, 2))

    if (label.toLowerCase().startsWith('total')) {
      totalRow = [5, 6, 7, 9, 10, 11, 12, 13].map(c => num(get(ws, r, c)))
      break
    }

    const unidad = str(get(ws, r, 2)) || lastUnidad
    const provincia = str(get(ws, r, 3)) || lastProvincia
    if (str(get(ws, r, 2))) lastUnidad = unidad
    if (str(get(ws, r, 3))) lastProvincia = provincia

    if (!areaName) continue

    // Some concessions (e.g. Angostura, Las Violetas) share a merged data
    // range with the row above (Río Cullen) instead of reporting their own
    // figures — they're the same UTE pool, not a separate producer. Skip any
    // row whose numeric cells are just inheriting another row's merge.
    const dataCell = ws.getCell(r, 5)
    if (dataCell.isMerged && (dataCell as any).master?.row !== r) continue

    const semana1 = num(get(ws, r, 5))
    const semana2 = num(get(ws, r, 6))
    if (semana1 === 0 && semana2 === 0 && !get(ws, r, 5) && !get(ws, r, 6)) continue

    areas.push({
      unidadGestion: unidad,
      provincia,
      area: areaName,
      semana1,
      semana2,
      delta: num(get(ws, r, 7)),
      deltaPct: num(get(ws, r, 8)),
      paMes: num(get(ws, r, 9)),
      promMes: num(get(ws, r, 10)),
      deltaVsPa: num(get(ws, r, 11)),
      perdidasSemana1: num(get(ws, r, 12)),
      perdidasSemana2: num(get(ws, r, 13)),
      perdidasDelta: num(get(ws, r, 14)),
      perdidasPct: num(get(ws, r, 15)),
    })
  }

  const [tS1, tS2, tDelta, tPa, tProm, tDeltaPa, tPerd1, tPerd2] = totalRow.length
    ? totalRow
    : [0, 0, 0, 0, 0, 0, 0, 0]

  return {
    unidad: '',
    areas,
    total: {
      semana1: tS1, semana2: tS2, delta: tDelta,
      paMes: tPa, promMes: tProm, deltaVsPa: tDeltaPa,
      perdidasSemana1: tPerd1, perdidasSemana2: tPerd2,
    },
  }
}

function toISODate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return null
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtFechaLarga(d: Date): string {
  return `${DIAS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')} ${MESES[d.getUTCMonth()]}`
}

// The source file's own "rango de fechas" title cell is a CONCATENATE formula
// over MINIFS/MAXIFS against the `Semanas` lookup sheet — its cached result
// came out as "Invalid Date" in this file (a stale/broken recalculation), so
// rebuild the same text directly from `Semanas` instead of trusting that cell.
function rangoFechasDeSemanas(wb: ExcelJS.Workbook, semana1: number, semana2: number): string {
  const ws = wb.getWorksheet('Semanas')
  if (!ws) return ''

  let inicio: Date | null = null
  let fin: Date | null = null
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return
    const fecha = cellVal(row.getCell(1).value)
    const semana = num(cellVal(row.getCell(2).value))
    if (!(fecha instanceof Date)) return
    if (semana === semana1 && (!inicio || fecha < inicio)) inicio = fecha
    if (semana === semana2 && (!fin || fecha > fin)) fin = fecha
  })

  if (!inicio || !fin) return ''
  return `${fmtFechaLarga(inicio)} - ${fmtFechaLarga(fin)}`
}

// Daily series combining the operated areas (`Operadas`, current-month only
// in this file) and non-operated areas (`NOP`, full-year — filtered to the
// same dates `Operadas` covers so both sides of the total line up).
function parseSerieDiaria(wb: ExcelJS.Workbook): PuntoDiario[] {
  const porFecha = new Map<string, { oil: number; gas: number }>()

  const wsOp = wb.getWorksheet('Operadas')
  if (wsOp) {
    wsOp.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum === 1) return
      const fecha = toISODate(cellVal(row.getCell(1).value))
      if (!fecha) return
      const oil = num(cellVal(row.getCell(3).value))
      const gasMm3d = num(cellVal(row.getCell(6).value))
      const acc = porFecha.get(fecha) ?? { oil: 0, gas: 0 }
      acc.oil += oil
      acc.gas += gasMm3d
      porFecha.set(fecha, acc)
    })
  }

  const fechasOperado = new Set(porFecha.keys())

  const wsNop = wb.getWorksheet('NOP')
  if (wsNop) {
    wsNop.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum === 1) return
      const fecha = toISODate(cellVal(row.getCell(1).value))
      if (!fecha || !fechasOperado.has(fecha)) return
      const oil = num(cellVal(row.getCell(2).value))
      const gasM3d = num(cellVal(row.getCell(3).value))
      const acc = porFecha.get(fecha) ?? { oil: 0, gas: 0 }
      acc.oil += oil
      acc.gas += gasM3d / 1000 // NOP gas is m3/d — convert to Mm3/d like Operadas
      porFecha.set(fecha, acc)
    })
  }

  return Array.from(porFecha.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([fecha, v]) => ({ fecha, oilM3d: v.oil, gasMm3d: v.gas }))
}

export async function parsearProduccionExcel(file: File): Promise<DatosProduccion> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)

  const ws = wb.getWorksheet('CP Resumen Semanal (SI)')
  if (!ws) throw new Error('No se encontró la hoja "CP Resumen Semanal (SI)" en el archivo')

  const mes = num(get(ws, 2, 5))
  const anio = num(get(ws, 2, 6))
  const semana1 = num(get(ws, 9, 5))
  const semana2 = num(get(ws, 9, 6))

  if (!semana1 || !semana2) throw new Error('No se pudieron leer los números de semana de la hoja de resumen')

  const rangoFechas = rangoFechasDeSemanas(wb, semana1, semana2)

  // Blocks start right after their header rows (title row + column-header
  // rows) and run until the "Total" row — read generously and let
  // parseBloque stop at the first "Total" label it hits.
  const petroleo = parseBloque(ws, 11, 26)
  const gas = parseBloque(ws, 32, 47)
  petroleo.unidad = 'm3/d'
  gas.unidad = 'Mm3/d'

  const serieDiaria = parseSerieDiaria(wb)

  return {
    periodo: `Semanas ${semana1}y${semana2}`,
    rangoFechas,
    mes,
    anio,
    semana1,
    semana2,
    petroleo,
    gas,
    serieDiaria,
  }
}

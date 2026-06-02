import * as XLSX from 'xlsx'

export interface DatosMacro {
  source: 'hh' | 'brent'
  points: Array<{ label: string; price: number }>
  periodo: string
}

const MES_EN: Record<string, string> = {
  JAN:'Ene', FEB:'Feb', MAR:'Mar', APR:'Abr', MAY:'May', JUN:'Jun',
  JUL:'Jul', AUG:'Ago', SEP:'Sep', OCT:'Oct', NOV:'Nov', DEC:'Dic',
  JANUARY:'Ene', FEBRUARY:'Feb', MARCH:'Mar', APRIL:'Abr',
  JUNE:'Jun', JULY:'Jul', AUGUST:'Ago',
  SEPTEMBER:'Sep', OCTOBER:'Oct', NOVEMBER:'Nov', DECEMBER:'Dic',
}
const MES_ES: Record<string, string> = {
  ENE:'Ene', FEB:'Feb', MAR:'Mar', ABR:'Abr', MAY:'May', JUN:'Jun',
  JUL:'Jul', AGO:'Ago', SEP:'Sep', OCT:'Oct', NOV:'Nov', DIC:'Dic',
}

export function toLabel(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toUpperCase()
    .replace(/\s+NG\s*$/, '').replace(/\s*\([^)]*\)/, '').trim()
  if (!s) return null
  const c = s.match(/^([A-Z]{3})(\d{2})$/)         // "Aug26"
  if (c) { const a = MES_EN[c[1]] ?? MES_ES[c[1]]; return a ? `${a}-${c[2]}` : null }
  const l = s.match(/^([A-Z]+)\s+(\d{4})$/)         // "AUGUST 2026"
  if (l) { const a = MES_EN[l[1]] ?? MES_ES[l[1]]; return a ? `${a}-${l[2].slice(-2)}` : null }
  const f = s.match(/^([A-Z]{3})-(\d{2})$/)         // "Ago-26"
  if (f) { const a = MES_EN[f[1]] ?? MES_ES[f[1]]; return a ? `${a}-${f[2]}` : null }
  return null
}

function splitLine(line: string): string[] {
  return line.includes('\t')
    ? line.split('\t').map(c => c.trim())
    : line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
}

function detectPriceCol(cols: string[], source: 'hh' | 'brent'): number {
  const u = cols.map(c => c.toUpperCase())
  if (source === 'hh') {
    const i = u.findIndex(c => c.includes('PRIOR') || (c.includes('SETTLE') && !c.includes('OPEN')))
    if (i >= 0) return i
  } else {
    const i = u.findIndex(c => c === 'LAST' || c.startsWith('LAST '))
    if (i >= 0) return i
  }
  return -1
}

// ── Parse pasted text (primary interface) ────────────────────────────────────
export function parsearTextoMacro(text: string, source: 'hh' | 'brent'): DatosMacro {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) throw new Error('No hay texto para procesar')

  let priceColIdx = -1
  let dataStart = 0

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cols = splitLine(lines[i])
    // If this row has a named price column, it's the header
    const found = detectPriceCol(cols, source)
    if (found >= 0) { priceColIdx = found; dataStart = i + 1; break }
    // If first cell is a month label, data starts here with default column
    if (toLabel(cols[0])) {
      dataStart = i
      // ICE Brent: month | Last | … — Last is always col 1
      // CME HH full table (10+ cols): month | Globex | Open | High | Low | Last | Change | Prior Settle | …
      priceColIdx = source === 'brent' ? 1 : (cols.length >= 8 ? 7 : 1)
      break
    }
  }

  if (priceColIdx < 0) priceColIdx = 1

  const points: Array<{ label: string; price: number }> = []
  for (let i = dataStart; i < lines.length; i++) {
    const cols = splitLine(lines[i])
    const label = toLabel(cols[0])
    if (!label) continue
    const raw = String(cols[priceColIdx] ?? '').replace(/,/g, '.')
    const price = parseFloat(raw)
    if (isNaN(price) || price <= 0) continue
    points.push({ label, price })
  }

  if (!points.length) {
    const hint = source === 'hh'
      ? 'Para CME: copiá desde el encabezado (fila con "Prior Settle") hasta el último mes.'
      : 'Para ICE: copiá desde la primera fila con mes (ej. "Aug26 66.29 …").'
    throw new Error(`No se encontraron precios. ${hint}`)
  }

  return { source, points, periodo: points[0].label }
}

// ── Parse Excel file (fallback / alternative) ────────────────────────────────
export function parsearExcelMacro(buffer: ArrayBuffer, source: 'hh' | 'brent'): DatosMacro {
  const wb = XLSX.read(buffer)
  if (!wb.SheetNames.length) throw new Error('Archivo Excel vacío')
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

  let dataStart = 0
  let priceColIdx = 1

  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (!row?.length) continue
    const found = detectPriceCol(row.map(c => String(c ?? '')), source)
    if (found >= 0) { priceColIdx = found; dataStart = i + 1; break }
    if (toLabel(row[0])) { dataStart = i; break }
  }

  const points: Array<{ label: string; price: number }> = []
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    if (!row?.length) continue
    const label = toLabel(row[0])
    if (!label) continue
    const raw = String(row[priceColIdx] ?? '').replace(/,/g, '.')
    const price = parseFloat(raw)
    if (isNaN(price) || price <= 0) continue
    points.push({ label, price })
  }

  if (!points.length) throw new Error('No se encontraron precios en el archivo.')
  return { source, points, periodo: points[0].label }
}

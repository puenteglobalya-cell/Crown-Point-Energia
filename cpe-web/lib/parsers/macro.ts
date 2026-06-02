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
  const c = s.match(/^([A-Z]{3})(\d{2})$/)
  if (c) { const a = MES_EN[c[1]] ?? MES_ES[c[1]]; return a ? `${a}-${c[2]}` : null }
  const l = s.match(/^([A-Z]+)\s+(\d{4})$/)
  if (l) { const a = MES_EN[l[1]] ?? MES_ES[l[1]]; return a ? `${a}-${l[2].slice(-2)}` : null }
  const f = s.match(/^([A-Z]{3})-(\d{2})$/)
  if (f) { const a = MES_EN[f[1]] ?? MES_ES[f[1]]; return a ? `${a}-${f[2]}` : null }
  return null
}

function splitLine(line: string): string[] {
  return line.includes('\t')
    ? line.split('\t').map(c => c.trim())
    : line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
}

// Contract codes like NGN26, NGQ26, BRN26, CON26, etc.
function isContractCode(s: string): boolean {
  return /^[A-Z]{2,5}[A-Z]\d{2}$/.test(s.trim().toUpperCase())
}

// ── CME / ICE multi-line format ───────────────────────────────────────────────
// When copying from either website each cell lands on its own line.
//
// CME Henry Hub structure:
//   JUL 2026        [+0] month label
//   NGN26           [+1] contract code  ← detection trigger
//   Opt             [+2] options link
//   3.166           [+3] Last
//   -0.013 (-0.41%) [+4] Change
//   3.179           [+5] Prior Settle   ← HH target
//
// ICE Brent structure:
//   AUG 26          [+0] month label  (also matches "Aug26" or "AUG 2026")
//   BRNQ26          [+1] contract code ← detection trigger
//   66.29           [+2] Last          ← Brent target (no Opt link)
//   -0.76           [+3] Change
//   …
//
// Detection: month label on its own line + next line is a contract code.
function parseCMEMultiLine(
  lines: string[],
  source: 'hh' | 'brent',
): Array<{ label: string; price: number }> {
  const points: Array<{ label: string; price: number }> = []

  for (let i = 0; i < lines.length - 3; i++) {
    const label = toLabel(lines[i])
    if (!label) continue
    if (!isContractCode(lines[i + 1] ?? '')) continue

    // Try the most likely offset for this source, then fall back
    const candidates = source === 'hh' ? [5, 3] : [2, 3]
    let price = 0
    for (const offset of candidates) {
      const raw = String(lines[i + offset] ?? '').replace(/,/g, '.')
      const v = parseFloat(raw)
      if (!isNaN(v) && v > 0) { price = v; break }
    }
    if (price > 0) points.push({ label, price })
  }
  return points
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

// ── Tab/space-separated format (one row per line) ─────────────────────────────
function parseTSV(
  lines: string[],
  source: 'hh' | 'brent',
): Array<{ label: string; price: number }> {
  const points: Array<{ label: string; price: number }> = []
  let priceColIdx = -1
  let dataStart = 0

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cols = splitLine(lines[i])
    const found = detectPriceCol(cols, source)
    if (found >= 0) { priceColIdx = found; dataStart = i + 1; break }
    if (toLabel(cols[0]) && cols.length > 1) {
      dataStart = i
      priceColIdx = source === 'brent' ? 1 : (cols.length >= 8 ? 7 : 1)
      break
    }
  }
  if (priceColIdx < 0) priceColIdx = 1

  for (let i = dataStart; i < lines.length; i++) {
    const cols = splitLine(lines[i])
    if (cols.length < 2) continue
    const label = toLabel(cols[0])
    if (!label) continue
    const raw = String(cols[priceColIdx] ?? '').replace(/,/g, '.')
    const price = parseFloat(raw)
    if (isNaN(price) || price <= 0) continue
    points.push({ label, price })
  }
  return points
}

// ── Public: parse pasted text ─────────────────────────────────────────────────
export function parsearTextoMacro(text: string, source: 'hh' | 'brent'): DatosMacro {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) throw new Error('No hay texto para procesar')

  // 1. Try CME/ICE multi-line (one cell per line) format
  const ml = parseCMEMultiLine(lines, source)
  if (ml.length > 0) return { source, points: ml, periodo: ml[0].label }

  // 2. Try TSV / space-separated (standard table copy)
  const tsv = parseTSV(lines, source)
  if (tsv.length > 0) return { source, points: tsv, periodo: tsv[0].label }

  const hint = source === 'hh'
    ? 'Copiá desde la tabla de quotes de CME, incluyendo las filas con los meses (JUL 2026, etc.).'
    : 'Copiá desde la tabla de ICE. Asegurate de incluir las filas con el mes (Aug26, etc.).'
  throw new Error(`No se encontraron precios. ${hint}`)
}

// ── Public: parse Excel file (alternative) ───────────────────────────────────
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

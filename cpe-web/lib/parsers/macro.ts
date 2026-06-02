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
// Spanish abbreviations already in our format
const MES_ES: Record<string, string> = {
  ENE:'Ene', FEB:'Feb', MAR:'Mar', ABR:'Abr', MAY:'May', JUN:'Jun',
  JUL:'Jul', AGO:'Ago', SEP:'Sep', OCT:'Oct', NOV:'Nov', DIC:'Dic',
}

function toLabel(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toUpperCase()
    .replace(/\s+NG\s*$/, '').replace(/\s*\([^)]*\)/, '').trim()
  if (!s) return null

  // "Aug26" compact (ICE)
  const c = s.match(/^([A-Z]{3})(\d{2})$/)
  if (c) {
    const a = MES_EN[c[1]] ?? MES_ES[c[1]]
    return a ? `${a}-${c[2]}` : null
  }
  // "AUGUST 2026" or "AUG 2026" (CME)
  const l = s.match(/^([A-Z]+)\s+(\d{4})$/)
  if (l) {
    const a = MES_EN[l[1]] ?? MES_ES[l[1]]
    return a ? `${a}-${l[2].slice(-2)}` : null
  }
  // "Ago-26" or "AGO-26" already formatted
  const f = s.match(/^([A-Z]{3})-(\d{2})$/)
  if (f) {
    const a = MES_EN[f[1]] ?? MES_ES[f[1]]
    return a ? `${a}-${f[2]}` : null
  }
  return null
}

export function parsearExcelMacro(buffer: ArrayBuffer, source: 'hh' | 'brent'): DatosMacro {
  const wb = XLSX.read(buffer)
  if (!wb.SheetNames.length) throw new Error('Archivo Excel vacío')

  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

  let dataStart = 0
  let priceColIdx = 1  // default: second column

  // Scan first 5 rows for a header row with a known price column name
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (!row?.length) continue
    const headers = row.map(c => String(c ?? '').trim().toUpperCase())

    if (source === 'hh') {
      const idx = headers.findIndex(h => h.includes('PRIOR') || h.includes('SETTLE'))
      if (idx >= 0) { priceColIdx = idx; dataStart = i + 1; break }
    } else {
      const idx = headers.findIndex(h => h === 'LAST' || h.startsWith('LAST ') || h === 'PRICE')
      if (idx >= 0) { priceColIdx = idx; dataStart = i + 1; break }
    }
    // If first cell already looks like a month label, data starts here
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

  if (!points.length) {
    throw new Error(
      'No se encontraron precios en el archivo. ' +
      'Formato esperado: columna A = mes (ej. "Jul-26", "JUL 2026", "Aug26"), ' +
      'columna B = precio (o columna "Prior Settle" / "Last" para exports de CME/ICE).'
    )
  }

  return { source, points, periodo: points[0].label }
}

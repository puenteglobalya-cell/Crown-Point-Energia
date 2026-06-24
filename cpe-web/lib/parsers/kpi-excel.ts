import ExcelJS from 'exceljs'

export interface KpiExtracted {
  period: string           // e.g. "Q1 2026"
  productionBoed: number
  productionPrevBoed: number
  revenueUSD: number
  revenuePrevUSD: number
  fundsFlowUSD: number
  fundsFlowPrevUSD: number
  netbackUSD: number
  netbackPrevUSD: number
  // CMS field payloads ready to upsert
  fields: Record<string, string>    // value_es
  fieldsEn: Record<string, string>  // value_en
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
  if (typeof raw === 'object' && 'text' in (raw as object)) {
    return (raw as ExcelJS.CellHyperlinkValue).text
  }
  return String(raw)
}

function worksheetToGrid(ws: ExcelJS.Worksheet): unknown[][] {
  const grid: unknown[][] = []
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const vals = row.values as ExcelJS.CellValue[]
    const lastCol = vals.length - 1
    const r: unknown[] = []
    for (let c = 1; c <= lastCol; c++) r.push(cellVal(vals[c] ?? null))
    while (grid.length < rowNumber - 1) grid.push([])
    grid[rowNumber - 1] = r
  })
  return grid
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0
}

function findRowByLabel(grid: unknown[][], col: number, label: string): number {
  const lc = label.toLowerCase().trim()
  for (let i = 0; i < grid.length; i++) {
    const v = (grid[i] as unknown[])?.[col]
    if (typeof v === 'string' && v.toLowerCase().trim().includes(lc)) return i
  }
  return -1
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function fmtMillions(n: number): string {
  return (Math.abs(n) / 1_000_000).toFixed(1)
}

function fmtDelta(curr: number, prev: number): string {
  if (!isFinite(prev) || prev === 0) return ''
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${Math.round(pct)}% YoY`
}

function quarterLabel(monthStr: string, year: number): string {
  const monthLower = monthStr.toLowerCase()
  let q = 1
  if (monthLower.includes('jun')) q = 2
  else if (monthLower.includes('sep') || monthLower.includes('sept')) q = 3
  else if (monthLower.includes('dec') || monthLower.includes('dic') || monthLower.includes('nov') || monthLower.includes('oct')) q = 4
  return `Q${q} ${year}`
}

// ---------------------------------------------------------------------------

export async function parseKpiExcel(buffer: Buffer | ArrayBuffer): Promise<KpiExtracted> {
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any)

  const ws = wb.getWorksheet('MD&A input')
  if (!ws) throw new Error('Hoja "MD&A input" no encontrada. Verificá que sea el archivo de consolidación correcto.')

  const grid = worksheetToGrid(ws)

  // --- Period (col C = index 2) ---
  // Row 18 (index 17): "March 31" / "June 30" etc.
  // Row 19 (index 18): year number
  const monthStr = String(grid[17]?.[2] ?? 'March 31')
  const rawYear  = grid[18]?.[2]
  const year     = typeof rawYear === 'number' ? rawYear : new Date().getFullYear()
  const period   = quarterLabel(monthStr, year)

  // --- Revenue (row 20 = index 19) ---
  const revRow = findRowByLabel(grid, 1, 'oil and natural gas sales')
  const revenueUSD     = num(grid[revRow >= 0 ? revRow : 19]?.[2])
  const revenuePrevUSD = num(grid[revRow >= 0 ? revRow : 19]?.[3])

  // --- Funds flow (row 28 = index 27) ---
  const ffRow = findRowByLabel(grid, 1, 'funds flow from operating')
  const fundsFlowUSD     = num(grid[ffRow >= 0 ? ffRow : 27]?.[2])
  const fundsFlowPrevUSD = num(grid[ffRow >= 0 ? ffRow : 27]?.[3])

  // --- Operating netback total $ (row 43 = index 42) ---
  const nbRow = findRowByLabel(grid, 1, 'total operating netback')
  const netbackUSD     = num(grid[nbRow >= 0 ? nbRow : 42]?.[2])
  const netbackPrevUSD = num(grid[nbRow >= 0 ? nbRow : 42]?.[3])

  // --- Production BOE/day (row 69 = index 68) ---
  const prodRow = findRowByLabel(grid, 1, 'total boe per day')
  const productionBoed     = num(grid[prodRow >= 0 ? prodRow : 68]?.[2])
  const productionPrevBoed = num(grid[prodRow >= 0 ? prodRow : 68]?.[3])

  // --- Build CMS field updates ---
  const prodStr   = fmtInt(productionBoed)
  const prodDelta = fmtDelta(productionBoed, productionPrevBoed)
  const ffMStr    = fmtMillions(fundsFlowUSD)
  const ffDelta   = fmtDelta(revenueUSD, revenuePrevUSD) // revenue ratio — clean positive comp
  const periodEs  = `${period} · Cifras clave`
  const periodEn  = `${period} · Key figures`
  const metaEs    = `${period} · ventas netas`
  const metaEn    = `${period} · net sales`

  const fields: Record<string, string> = {
    'kpis.periodo.es':          periodEs,
    'kpi.production.value':     prodStr,
    'kpi.production.delta':     prodDelta,
    'kpi.ebitda.value':         ffMStr,
    'kpi.ebitda.delta':         ffDelta,
    'ops.kpi.production':       prodStr,
    'ops.kpi.production.meta':  metaEs,
    'inv.thesis.1.val':         prodStr,
    'inv.thesis.1.unit':        'boe/d',
  }

  const fieldsEn: Record<string, string> = {
    'kpis.periodo.en':          periodEn,
    'ops.kpi.production.meta':  metaEn,
    'inv.thesis.1.meta':        `${period} · net`,
  }

  return {
    period,
    productionBoed,
    productionPrevBoed,
    revenueUSD,
    revenuePrevUSD,
    fundsFlowUSD,
    fundsFlowPrevUSD,
    netbackUSD,
    netbackPrevUSD,
    fields,
    fieldsEn,
  }
}

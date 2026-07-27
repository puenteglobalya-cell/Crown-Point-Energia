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
  opexPerBoe: number       // production + processing + transportation per BOE ($)
  opexPerBoePrev: number
  // Balance sheet
  netDebtUSD: number       // total loans + notes payable − cash
  loansUSD: number
  notesPayableUSD: number
  cashUSD: number
  // Income statement
  ebitdaUSD: number        // operating income + D&A for the period
  ebitdaPrevUSD: number
  // CMS field payloads ready to upsert
  fields: Record<string, string>    // value_es
  fieldsEn: Record<string, string>  // value_en
  // Sanity checks — non-empty means something looks off; surface before publishing
  warnings: string[]
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

  // --- Balance sheet: net debt ---
  // BS sheet: Loans (current r33) + Non-current loans (r42) + Notes payable current (r34)
  // + Notes payable non-current (r44) − Cash (r14). Col F = index 5 (1-based col 6).
  const ws_bs = wb.getWorksheet('BS')
  let loansUSD = 0
  let notesPayableUSD = 0
  let cashUSD = 0
  if (ws_bs) {
    const bs = worksheetToGrid(ws_bs)
    // Row indices (0-based): cash=13, loans=32, noteCurrent=33, loansNonCurr=41, noteNonCurr=43
    // Use findRowByLabel on col 0 (A) for robustness
    const cashRow   = findRowByLabel(bs, 0, 'cash and cash equivalents')
    const loanCRow  = findRowByLabel(bs, 0, 'loans')                    // first hit = current loans
    const noteCRow  = findRowByLabel(bs, 0, 'current portion of notes')
    const loanNRow  = findRowByLabel(bs, 0, 'non-current loans')
    const noteNRow  = findRowByLabel(bs, 0, 'notes payable')            // second hit = non-current
    cashUSD         = num(bs[cashRow   >= 0 ? cashRow   : 13]?.[5])
    const loanC     = num(bs[loanCRow  >= 0 ? loanCRow  : 32]?.[5])
    const noteC     = num(bs[noteCRow  >= 0 ? noteCRow  : 33]?.[5])
    const loanN     = num(bs[loanNRow  >= 0 ? loanNRow  : 41]?.[5])
    const noteN     = num(bs[noteNRow  >= 0 ? noteNRow  : 43]?.[5])
    loansUSD        = loanC + loanN
    notesPayableUSD = noteC + noteN
  }
  const netDebtUSD = loansUSD + notesPayableUSD - cashUSD

  // --- Income statement: EBITDA = operating income + D&A ---
  // FS Stmt Loss sheet: operating income r29, D&A r20 (depl) + r21 (lease depl).
  // Col C = index 2 = current quarter; col D = index 3 = prior-year quarter
  // (same convention as every other sheet in this file — verified against a
  // real consolidation file where D/E/F are blank and C holds the actual figures).
  const ws_is = wb.getWorksheet('FS Stmt Loss')
  let ebitdaUSD = 0
  let ebitdaPrevUSD = 0
  if (ws_is) {
    const is = worksheetToGrid(ws_is)
    const opIncRow = findRowByLabel(is, 0, 'results from operating activities')
    const deplRow  = findRowByLabel(is, 0, 'depl & depn')
    const leaseDeplRow = findRowByLabel(is, 0, 'lease depletion')
    const opInc      = num(is[opIncRow    >= 0 ? opIncRow    : 28]?.[2])
    const depl       = num(is[deplRow     >= 0 ? deplRow     : 19]?.[2])
    const lDepl      = num(is[leaseDeplRow >= 0 ? leaseDeplRow : 20]?.[2])
    const opIncPrev  = num(is[opIncRow    >= 0 ? opIncRow    : 28]?.[3])
    const deplPrev   = num(is[deplRow     >= 0 ? deplRow     : 19]?.[3])
    const lDeplPrev  = num(is[leaseDeplRow >= 0 ? leaseDeplRow : 20]?.[3])
    ebitdaUSD     = opInc + depl + lDepl
    ebitdaPrevUSD = opIncPrev + deplPrev + lDeplPrev
  }

  // --- Opex per BOE (row 142 = index 141): production+processing + transportation ---
  // Col C = current quarter, col D = prior-year quarter (per BOE, positive values)
  const opexRow = findRowByLabel(grid, 1, 'operating costs per boe')
  const opexPerBoeRaw     = num(grid[opexRow >= 0 ? opexRow : 141]?.[2])
  const opexPerBoePrevRaw = num(grid[opexRow >= 0 ? opexRow : 141]?.[3])
  // The sheet stores this as a negative (cost sign); take absolute value
  const opexPerBoe     = Math.abs(opexPerBoeRaw)
  const opexPerBoePrev = Math.abs(opexPerBoePrevRaw)

  // --- Build CMS field updates ---
  const prodStr    = fmtInt(productionBoed)
  const prodDelta  = fmtDelta(productionBoed, productionPrevBoed)
  const ebMStr     = fmtMillions(ebitdaUSD)
  const ebDelta    = fmtDelta(ebitdaUSD, ebitdaPrevUSD)
  const opexStr    = opexPerBoe > 0 ? `$${opexPerBoe.toFixed(1)}/boe` : ''
  const opexDelta  = fmtDelta(-opexPerBoe, -opexPerBoePrev) // negative = cost reduction = good
  const periodEs   = `${period} · Cifras clave`
  const periodEn   = `${period} · Key figures`
  const metaEs     = `${period} · ventas netas`
  const metaEn     = `${period} · net sales`

  const fields: Record<string, string> = {
    'kpis.periodo.es':          periodEs,
    'kpi.production.value':     prodStr,
    'kpi.production.delta':     prodDelta,
    'kpi.ebitda.value':         ebMStr,
    'kpi.ebitda.delta':         ebDelta,
    'kpi.opex.value':           opexStr,
    'kpi.opex.delta':           opexDelta,
    'ops.kpi.production':       prodStr,
    'ops.kpi.production.meta':  metaEs,
    'inv.thesis.1.val':         prodStr,
    'inv.thesis.1.unit':        'boe/d',
    'inv.thesis.2.val':         opexPerBoe > 0 ? opexPerBoe.toFixed(1) : '',
    'inv.thesis.2.unit':        '$/boe',
    'inv.thesis.2.meta':        `${period} · opex total`,
    'inv.thesis.3.val':         ebitdaUSD > 0 ? (netDebtUSD / (ebitdaUSD * 4)).toFixed(1) + 'x' : '',
    'inv.thesis.3.unit':        'Net debt / EBITDA',
    'inv.thesis.3.meta':        `${period} · anualizado`,
  }

  const fieldsEn: Record<string, string> = {
    'kpis.periodo.en':          periodEn,
    'ops.kpi.production.meta':  metaEn,
    'inv.thesis.1.meta':        `${period} · net`,
    'inv.thesis.2.meta':        `${period} · total opex`,
    'inv.thesis.3.meta':        `${period} · annualized`,
  }

  // --- Sanity checks — a sensitive-data upload should never silently ship a
  // zero or missing figure just because a label/column moved in the template ---
  const warnings: string[] = []
  if (revenueUSD <= 0) warnings.push('Revenue salió en 0 o negativo — revisá la fila "oil and natural gas sales" en MD&A input.')
  if (productionBoed <= 0) warnings.push('Producción (boe/d) salió en 0 — revisá la fila "total boe per day" en MD&A input.')
  if (fundsFlowUSD === 0) warnings.push('Funds flow from operations salió en 0 — revisá esa fila en MD&A input.')
  if (ebitdaUSD === 0) warnings.push('EBITDA (resultado operativo + D&A) salió en 0 — revisá la hoja "FS Stmt Loss" (filas 20, 21, 29).')
  if (cashUSD === 0 && loansUSD === 0 && notesPayableUSD === 0) warnings.push('No se pudo leer nada del balance (caja/deuda) — revisá la hoja "BS".')
  if (ebitdaUSD > 0 && netDebtUSD / (ebitdaUSD * 4) < 0) warnings.push('Net debt/EBITDA salió negativo — revisá caja y deuda en la hoja "BS".')

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
    opexPerBoe,
    opexPerBoePrev,
    netDebtUSD,
    loansUSD,
    notesPayableUSD,
    cashUSD,
    ebitdaUSD,
    ebitdaPrevUSD,
    fields,
    fieldsEn,
    warnings,
  }
}

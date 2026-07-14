import ExcelJS from 'exceljs'

export interface DatosIngresos {
  mes: string
  periodo: string
  dias: number
  ventas_MM: number
  stock_MM: number
  vol_producido_boed: number
  vol_vendido_boed: number
  precio_neto_oil: number
  precio_neto_gas: number
  brent_prom: number
  medanito_prom: number
  oil_pct_prod: number
  gas_pct_prod: number
  oil_pct_vend: number
  gas_pct_vend: number
  areas: {
    ET: AreaOil
    PCKK: AreaOil
    CH: AreaOil
    RCLV: AreaOil
  }
  gas: {
    ET: AreaGas
    RCLV: AreaGas
  }
  mensual_historico?: MesHistorico[]
}

export interface AreaOil {
  prod_100_m3d: number
  prod_neta_m3d: number
  entregados_m3: number
  vol_bbl: number
  precio_neto: number
  ingreso: number
  stock_m3?: number
  stock_dias?: number
  stock_us?: number
  in_kind_bbl?: number
  in_kind_pct?: number
  in_kind_us?: number
  brent_ref?: number
  brent_1q?: number
  brent_2q?: number
  descuento?: number
}

export interface AreaGas {
  prod_mcfd: number
  vol_mes_mcf: number
  precio_mcf: number
  ingreso: number
}

export interface MesHistorico {
  mes: string
  total_MM: number
  ET_MM: number
  PCKK_MM: number
  CH_MM: number
  RCLV_MM: number
  gas_MM: number
  precio_ET: number
  precio_PCKK: number
  precio_CH: number
  precio_RCLV: number
}

// ---------------------------------------------------------------------------
// ExcelJS cell value → plain JS value
// ExcelJS cell values can be: number, string, boolean, Date, null,
// { text, hyperlink }, { formula, result }, { richText }, SharedString, etc.
// ---------------------------------------------------------------------------
function cellVal(raw: ExcelJS.CellValue): unknown {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return raw
  if (raw instanceof Date) return raw
  // Formula cell — use cached result
  if (typeof raw === 'object' && 'result' in (raw as object)) {
    return cellVal((raw as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue)
  }
  // Rich text / hyperlink — extract plain text
  if (typeof raw === 'object' && 'richText' in (raw as object)) {
    return (raw as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('')
  }
  if (typeof raw === 'object' && 'text' in (raw as object)) {
    return (raw as ExcelJS.CellHyperlinkValue).text
  }
  // Shared string (number in disguise from some xlsx writers) — stringify
  return String(raw)
}

// Convert an ExcelJS worksheet to a 0-indexed any[][] (matching what
// XLSX.utils.sheet_to_json(ws, { header:1, defval: null }) returned).
// ExcelJS row.values is 1-based (vals[1]=colA, vals[2]=colB, …).
// We shift so that r[0]=colA, r[1]=colB, … to match the original xlsx output.
function worksheetToGrid(ws: ExcelJS.Worksheet): any[][] {
  const grid: any[][] = []
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const vals = row.values as ExcelJS.CellValue[]
    // vals.length is lastUsedColIndex + 1 (1-based), so lastCol = vals.length - 1
    const lastCol = vals.length - 1
    const r: any[] = []
    // c runs 1..lastCol (ExcelJS 1-based); push at index c-1 (0-based)
    for (let c = 1; c <= lastCol; c++) {
      r.push(cellVal(vals[c] ?? null))
    }
    // Fill any row gaps in the grid
    while (grid.length < rowNumber - 1) grid.push([])
    grid[rowNumber - 1] = r
  })
  return grid
}

// ---------------------------------------------------------------------------

function excelSerialToMesLabel(serial: number): string {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return `${meses[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
}

function parsearSalesVolume(
  wb: ExcelJS.Workbook,
  currentPrices: { ET: number; PCKK: number; CH: number; RCLV: number }
): MesHistorico[] {
  const ws = wb.getWorksheet('sales & Volume')
  if (!ws) return []
  const data = worksheetToGrid(ws)

  // Months in col B may be text strings, JS Date objects (cellDates:true), or numeric serials.
  // Parse all three forms to a canonical "Ene-26" format used as map keys.
  function parseMesLabel(v: any): string | null {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    if (v instanceof Date) {
      return `${meses[v.getUTCMonth()]}-${String(v.getUTCFullYear()).slice(2)}`
    }
    if (typeof v === 'number' && v > 40000 && v < 55000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000))
      return `${meses[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
    }
    if (typeof v !== 'string') return null
    const mMap: Record<string, string> = {
      ene:'Ene', jan:'Ene', enero:'Ene', january:'Ene',
      feb:'Feb', febrero:'Feb', february:'Feb',
      mar:'Mar', marzo:'Mar', march:'Mar',
      abr:'Abr', apr:'Abr', abril:'Abr', april:'Abr',
      may:'May', mayo:'May',
      jun:'Jun', junio:'Jun', june:'Jun',
      jul:'Jul', julio:'Jul', july:'Jul',
      ago:'Ago', aug:'Ago', agosto:'Ago', august:'Ago',
      sep:'Sep', sept:'Sep', septiembre:'Sep', september:'Sep',
      oct:'Oct', octubre:'Oct', october:'Oct',
      nov:'Nov', noviembre:'Nov', november:'Nov',
      dic:'Dic', dec:'Dic', diciembre:'Dic', december:'Dic',
    }
    const m = v.toLowerCase().trim().match(/^([a-záéíóú]+)[-.\s]?(\d{2,4})/)
    if (!m) return null
    const abbr = mMap[m[1]]
    if (!abbr) return null
    const yr = m[2].length === 4 ? m[2].slice(2) : m[2]
    return `${abbr}-${yr}`
  }

  // Price section: D40:H54 in Excel (data[39]–data[53])
  // Col B (1) = Spanish month label (current year), col A (0) = English prior-year label
  // Col D(3)=PCKK, E(4)=ETLPPQ, F(5)=RCLV, G(6)=CH, H(7)=PPCO
  const priceByLabel: Record<string, any[]> = {}
  for (let i = 39; i <= 53; i++) {
    const row = data[i]
    if (!row) continue
    const label = parseMesLabel(row[1]) ?? parseMesLabel(row[0])
    if (label) priceByLabel[label] = row
  }

  const result: MesHistorico[] = []
  const seen = new Set<string>()

  // Revenue section: Excel rows 8–22 (data[7]–data[21])
  // Col B (1) = Spanish month label
  // Col D(3)=PCKK, E(4)=ETLPPQ, F(5)=RCLV, G(6)=CH, H(7)=PPCO, J(9)=GasET, K(10)=GasRCLV
  for (let i = 7; i <= 21; i++) {
    const row = data[i]
    if (!row) continue
    const label = parseMesLabel(row[1])
    if (!label || seen.has(label)) continue

    const PCKK_MM = Number(row[3] ?? 0) / 1_000_000
    const ET_MM   = Number(row[4] ?? 0) / 1_000_000
    const RCLV_MM = Number(row[5] ?? 0) / 1_000_000
    const CH_MM   = (Number(row[6] ?? 0) + Number(row[7] ?? 0)) / 1_000_000
    const gas_MM  = (Number(row[9] ?? 0) + Number(row[10] ?? 0)) / 1_000_000
    const total_MM = PCKK_MM + ET_MM + RCLV_MM + CH_MM + gas_MM
    if (total_MM <= 0) continue

    // Match price row by same month label
    const priceRow = priceByLabel[label]
    let precio_PCKK = Number(priceRow?.[3] ?? 0)  // D = PCKK
    let precio_ET   = Number(priceRow?.[4] ?? 0)  // E = ETLPPQ
    let precio_RCLV = Number(priceRow?.[5] ?? 0)  // F = RCLV
    let precio_CH   = Number(priceRow?.[6] ?? 0)  // G = CH

    // Current month has no price row yet — use prices from the detail sheet
    if (precio_ET === 0) {
      precio_ET   = currentPrices.ET
      precio_PCKK = currentPrices.PCKK
      precio_CH   = currentPrices.CH
      precio_RCLV = currentPrices.RCLV
    }

    seen.add(label)
    result.push({
      mes: label,
      total_MM,
      ET_MM,
      PCKK_MM,
      CH_MM,
      RCLV_MM,
      gas_MM,
      precio_ET,
      precio_PCKK,
      precio_CH,
      precio_RCLV,
    })
  }

  return result
}

export async function parsearIngresosExcel(file: File): Promise<DatosIngresos> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)

  const resumen  = leerHoja(wb, 'Resumen')
  const detalle  = leerHojaConFecha(wb)

  if (!resumen || !detalle) {
    throw new Error('El archivo no tiene el formato esperado. Verificá que sea un Revenue estimado.')
  }

  const periodoRaw = encontrarPeriodo(wb, resumen)
  if (!periodoRaw) throw new Error('No se pudo determinar el período del archivo. Verificá que contenga una hoja con formato YYYY-MM o una celda de fecha en Resumen.')
  const periodo = periodoRaw
  const mes = formatearMes(periodo)

  const ventas_MM  = buscarValor(resumen, 'VENTAS ESTIMADAS', 1) ?? 0
  const vol_prod   = buscarValor(resumen, 'Volumen Producido', 1) ?? 0
  const vol_venta  = buscarValor(resumen, 'Volumen Ventas', 1)    ?? 0
  const precio_oil = buscarValor(resumen, 'Oil', 3)               ?? 0
  const precio_gas = buscarValor(resumen, 'Gas', 3)               ?? 0
  const diasRaw    = Number(buscarCelda(detalle, 0, 3))
  const dias       = diasRaw > 0 && diasRaw <= 31 ? diasRaw : (() => { throw new Error(`Días del período inválido (${diasRaw}). Verificá la celda de días en la hoja de detalle.`) })()

  const brent_ref = buscarValor(detalle, 'mes', 1)      ?? 0
  const medanito  = buscarValor(detalle, 'MEDANITO', 1) ?? 0
  const brent_1q  = buscarValor(detalle, '1Quincena', 1) ?? 0
  const brent_2q  = buscarValor(detalle, '2Quincena', 1) ?? 0

  const prod100    = buscarFila(detalle, '100% m3/d')
  const prodNeta   = buscarFila(detalle, 'Neto')
  const entregados = buscarFila(detalle, 'm3 entregados')
  const bbls       = buscarFila(detalle, 'Volumen en bbl')
  const totalUs    = buscarFila(detalle, 'Total us$')
  const precioN    = buscarFila(detalle, 'Precio Neto')
  const stockM3    = buscarFila(detalle, 'STOCK Estimado en m3')
  const stockUs    = buscarFila(detalle, /^us\$/)
  const stockDias  = buscarFila(detalle, 'Stock en días')

  const inkindBbl = buscarFila(detalle, 'In kind en bbl mes')
  const inkindPct = buscarFila(detalle, 'In kind / producción')
  const inkindUs  = buscarFila(detalle, 'In kind valorizado')

  const gasProd = buscarFila(detalle, /Neto.*Gas|Gas.*Neto/, true)
  const gasPrec = buscarFila(detalle, /us.*mcf|mcf.*us/, true)

  const stock_total = (stockUs?.[2] ?? 0) + (stockUs?.[3] ?? 0)

  const currentPrices = {
    ET:   precioN?.[2] ?? 0,
    PCKK: precioN?.[3] ?? 0,
    CH:   precioN?.[4] ?? 0,
    RCLV: precioN?.[5] ?? 0,
  }

  // ── Derive KPIs from area data when Resumen labels don't match ───────────
  const M3_TO_BBL = 6.2898

  // Oil production m³/d → BOE/d
  const oilProdM3d = (
    (prodNeta?.[2] ?? 0) + (prodNeta?.[3] ?? 0) +
    (prodNeta?.[4] ?? 0) + (prodNeta?.[5] ?? 0)
  )
  const oilProdBOEd = oilProdM3d * M3_TO_BBL

  // Total production BOE/d: oil ÷ oil% (gas included via composition)
  const oilPct = (buscarValor(resumen, 'Oil', -1) ?? 0)
  const gasPct = (buscarValor(resumen, 'Gas', -1) ?? 0)
  const volProdDerived = oilPct > 0
    ? Math.round(oilProdBOEd / oilPct)
    : Math.round(oilProdBOEd)

  // Oil bbls entregados → BOE/d sold
  const oilBblsVendidos = (
    (bbls?.[2] ?? 0) + (bbls?.[3] ?? 0) +
    (bbls?.[4] ?? 0) + (bbls?.[5] ?? 0)
  )
  const oilVendBOEd = dias > 0 ? oilBblsVendidos / dias : 0
  const oilPctVend = (buscarValor(resumen, 'Oil', 1) ?? 0)
  const volVentaDerived = oilPctVend > 0
    ? Math.round(oilVendBOEd / oilPctVend)
    : Math.round(oilVendBOEd)

  // ventas_MM from sum of area ingresos
  const ventasDerived = (
    (totalUs?.[2] ?? 0) + (totalUs?.[3] ?? 0) +
    (totalUs?.[4] ?? 0) + (totalUs?.[5] ?? 0) +
    (totalUs?.[6] ?? 0) + (totalUs?.[7] ?? 0)
  ) / 1_000_000

  const ventas_MM_final     = ventas_MM  > 0 ? ventas_MM  : ventasDerived
  const vol_producido_final = vol_prod   > 0 ? vol_prod   : volProdDerived
  const vol_vendido_final   = vol_venta  > 0 ? vol_venta  : volVentaDerived

  // Gas prices from Resumen H13 (ET/ETLPPQ) and I13 (RCLV) — direct cell address
  const resumenWs = wb.getWorksheet('Resumen')
  const precioGasResumenET   = resumenWs ? (Number(cellVal(resumenWs.getCell('H13').value)) || 0) : 0
  const precioGasResumenRCLV = resumenWs ? (Number(cellVal(resumenWs.getCell('I13').value)) || 0) : 0

  // Gas area prices — derive from ingreso ÷ volume when direct read is 0
  const gasETProdRaw   = gasProd?.[6] ?? prodNeta?.[6] ?? 0
  const gasRCLVProdRaw = gasProd?.[7] ?? prodNeta?.[7] ?? 0
  const gasETIngreso   = totalUs?.[6] ?? 0
  const gasRCLVIngreso = totalUs?.[7] ?? 0

  const rawETPrec   = precioGasResumenET   || gasPrec?.[6] || precioN?.[6] || 0
  const rawRCLVPrec = precioGasResumenRCLV || gasPrec?.[7] || precioN?.[7] || 0

  const gasETPrec_final = rawETPrec > 0
    ? rawETPrec
    : (gasETProdRaw > 0 && dias > 0 ? gasETIngreso / (gasETProdRaw * dias) : 0)
  const gasRCLVPrec_final = rawRCLVPrec > 0
    ? rawRCLVPrec
    : (gasRCLVProdRaw > 0 && dias > 0 ? gasRCLVIngreso / (gasRCLVProdRaw * dias) : 0)

  // Ingreso-weighted average for the header KPI
  const gasIngTotal = gasETIngreso + gasRCLVIngreso
  const precioGasDerived = gasIngTotal > 0
    ? (gasETIngreso * gasETPrec_final + gasRCLVIngreso * gasRCLVPrec_final) / gasIngTotal
    : (gasETPrec_final + gasRCLVPrec_final) / 2
  const precio_gas_final = precio_gas > 0 ? precio_gas : precioGasDerived

  const oil_pct_prod = oilPct  * 100
  const gas_pct_prod = gasPct  * 100
  const oil_pct_vend = oilPctVend * 100
  const gas_pct_vend = (buscarValor(resumen, 'Gas', 1) ?? 0) * 100

  return {
    mes,
    periodo,
    dias,
    ventas_MM:          ventas_MM_final,
    stock_MM:           stock_total / 1_000_000,
    vol_producido_boed: vol_producido_final,
    vol_vendido_boed:   vol_vendido_final,
    precio_neto_oil:    precio_oil,
    precio_neto_gas:    precio_gas_final,
    brent_prom:         brent_ref,
    medanito_prom:      medanito,
    oil_pct_prod,
    gas_pct_prod,
    oil_pct_vend,
    gas_pct_vend,

    areas: {
      ET: {
        prod_100_m3d:  prod100?.[2]    ?? 0,
        prod_neta_m3d: prodNeta?.[2]   ?? 0,
        entregados_m3: entregados?.[2] ?? 0,
        vol_bbl:       bbls?.[2]       ?? 0,
        precio_neto:   precioN?.[2]    ?? 0,
        ingreso:       totalUs?.[2]    ?? 0,
        brent_ref,
        stock_m3:      stockM3?.[2]    ?? 0,
        stock_dias:    stockDias?.[2]  ?? 0,
        stock_us:      stockUs?.[2]    ?? 0,
        descuento:     buscarValor(detalle, 'Descuento', 2) ?? 0,
      },
      PCKK: {
        prod_100_m3d:  prod100?.[3]    ?? 0,
        prod_neta_m3d: prodNeta?.[3]   ?? 0,
        entregados_m3: entregados?.[3] ?? 0,
        vol_bbl:       bbls?.[3]       ?? 0,
        precio_neto:   precioN?.[3]    ?? 0,
        ingreso:       totalUs?.[3]    ?? 0,
        brent_ref,
        brent_1q,
        brent_2q,
        stock_m3:      stockM3?.[3]    ?? 0,
        stock_dias:    stockDias?.[3]  ?? 0,
        stock_us:      stockUs?.[3]    ?? 0,
        in_kind_bbl:   inkindBbl?.[3]  ?? undefined,
        in_kind_pct:   inkindPct?.[3]  ?? undefined,
        in_kind_us:    inkindUs?.[3]   ?? undefined,
      },
      CH: {
        prod_100_m3d:  prod100?.[4]    ?? 0,
        prod_neta_m3d: prodNeta?.[4]   ?? 0,
        entregados_m3: entregados?.[4] ?? 0,
        vol_bbl:       bbls?.[4]       ?? 0,
        precio_neto:   precioN?.[4]    ?? 0,
        ingreso:       totalUs?.[4]    ?? 0,
        brent_ref:     medanito,
      },
      RCLV: {
        prod_100_m3d:  prod100?.[5]    ?? 0,
        prod_neta_m3d: prodNeta?.[5]   ?? 0,
        entregados_m3: entregados?.[5] ?? 0,
        vol_bbl:       bbls?.[5]       ?? 0,
        precio_neto:   precioN?.[5]    ?? 0,
        ingreso:       totalUs?.[5]    ?? 0,
        brent_ref,
      },
    },

    gas: {
      ET: {
        prod_mcfd:   gasETProdRaw,
        vol_mes_mcf: gasETProdRaw * dias,
        precio_mcf:  gasETPrec_final,
        ingreso:     gasETIngreso,
      },
      RCLV: {
        prod_mcfd:   gasRCLVProdRaw,
        vol_mes_mcf: gasRCLVProdRaw * dias,
        precio_mcf:  gasRCLVPrec_final,
        ingreso:     totalUs?.[7]  ?? 0,
      },
    },

    mensual_historico: (() => {
      const historico = parsearSalesVolume(wb, currentPrices)
      // Append the current month if not already present in historico
      // (Excel historical section often omits the current period)
      const MES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      const [py, pm] = periodo.split('-')
      const mesAbrev = `${MES_ABR[parseInt(pm) - 1]}-${py.slice(2)}`
      if (historico.length > 0 && !historico.some(h => h.mes === mesAbrev)) {
        const ET_MM_c   = (totalUs?.[2] ?? 0) / 1_000_000
        const PCKK_MM_c = (totalUs?.[3] ?? 0) / 1_000_000
        const CH_MM_c   = (totalUs?.[4] ?? 0) / 1_000_000
        const RCLV_MM_c = (totalUs?.[5] ?? 0) / 1_000_000
        const gas_MM_c  = (gasETIngreso + (totalUs?.[7] ?? 0)) / 1_000_000
        const total_c   = ET_MM_c + PCKK_MM_c + CH_MM_c + RCLV_MM_c + gas_MM_c
        if (total_c > 0) {
          historico.push({
            mes:         mesAbrev,
            total_MM:    total_c,
            ET_MM:       ET_MM_c,
            PCKK_MM:     PCKK_MM_c,
            CH_MM:       CH_MM_c,
            RCLV_MM:     RCLV_MM_c,
            gas_MM:      gas_MM_c,
            precio_ET:   precioN?.[2] ?? 0,
            precio_PCKK: precioN?.[3] ?? 0,
            precio_CH:   precioN?.[4] ?? 0,
            precio_RCLV: precioN?.[5] ?? 0,
          })
        }
      }
      return historico
    })(),
  }
}

function leerHoja(wb: ExcelJS.Workbook, nombre: string): any[][] | null {
  const ws = wb.getWorksheet(nombre)
  if (!ws) return null
  return worksheetToGrid(ws)
}

function leerHojaConFecha(wb: ExcelJS.Workbook): any[][] | null {
  let found: string | undefined
  wb.eachSheet((ws, _id) => {
    if (!found && /^\d{4}-\d{2}$/.test(ws.name)) found = ws.name
  })
  return found ? leerHoja(wb, found) : null
}

function encontrarPeriodo(wb: ExcelJS.Workbook, resumen: any[][]): string {
  let found: string | undefined
  wb.eachSheet((ws, _id) => {
    if (!found && /^\d{4}-\d{2}$/.test(ws.name)) found = ws.name
  })
  if (found) return found

  for (const row of resumen) {
    for (const cell of row) {
      if (cell instanceof Date) {
        const y = cell.getFullYear()
        const m = String(cell.getMonth() + 1).padStart(2, '0')
        return `${y}-${m}`
      }
    }
  }
  return ''
}

function formatearMes(periodo: string): string {
  if (!periodo) return ''
  const [y, m] = periodo.split('-')
  const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${meses[parseInt(m)]} ${y}`
}

function buscarFila(data: any[][], patron: string | RegExp, exacto = false): any[] | null {
  for (const row of data) {
    const celda = String(row[0] ?? row[1] ?? '')
    const match = patron instanceof RegExp
      ? patron.test(celda)
      : exacto ? celda === patron : celda.toLowerCase().includes(patron.toLowerCase())
    if (match) return row
  }
  return null
}

function buscarValor(data: any[][], patron: string, offset: number): number | null {
  for (const row of data) {
    for (let i = 0; i < row.length; i++) {
      const celda = String(row[i] ?? '')
      if (celda.toLowerCase().includes(patron.toLowerCase())) {
        const val = row[i + offset]
        if (typeof val === 'number') return val
      }
    }
  }
  return null
}

function buscarCelda(data: any[][], row: number, col: number): any {
  return data[row]?.[col] ?? null
}

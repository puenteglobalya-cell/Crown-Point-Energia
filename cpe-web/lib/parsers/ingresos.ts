import * as XLSX from 'xlsx'

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

function excelSerialToMesLabel(serial: number): string {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return `${meses[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
}

function parsearSalesVolume(
  wb: XLSX.WorkBook,
  currentPrices: { ET: number; PCKK: number; CH: number; RCLV: number }
): MesHistorico[] {
  const ws = wb.Sheets['sales & Volume']
  if (!ws) return []
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]

  const priceMap: Record<number, any[]> = {}
  for (let i = 35; i < Math.min(data.length, 55); i++) {
    const row = data[i]
    if (!row) continue
    const serial = row[1]
    if (typeof serial === 'number' && serial > 45000 && serial < 47500) {
      priceMap[serial] = row
    }
  }

  const result: MesHistorico[] = []

  for (let i = 6; i < Math.min(data.length, 22); i++) {
    const row = data[i]
    if (!row) continue
    const serial = row[1]
    if (typeof serial !== 'number' || serial < 45000 || serial > 47500) continue

    const total_MM = Number(row[15] ?? 0) / 1_000_000
    if (total_MM <= 0) continue

    const ET_MM   = Number(row[4]  ?? 0) / 1_000_000
    const PCKK_MM = Number(row[3]  ?? 0) / 1_000_000
    const RCLV_MM = Number(row[5]  ?? 0) / 1_000_000
    const CH_MM   = (Number(row[6] ?? 0) + Number(row[7] ?? 0)) / 1_000_000
    const gas_MM  = (Number(row[9] ?? 0) + Number(row[10] ?? 0)) / 1_000_000

    const priceRow = priceMap[serial]
    let precio_PCKK = Number(priceRow?.[3] ?? 0)
    let precio_ET   = Number(priceRow?.[4] ?? 0)
    let precio_RCLV = Number(priceRow?.[5] ?? 0)
    let precio_CH   = Number(priceRow?.[6] ?? 0)

    if (precio_ET === 0) {
      precio_ET   = currentPrices.ET
      precio_PCKK = currentPrices.PCKK
      precio_CH   = currentPrices.CH
      precio_RCLV = currentPrices.RCLV
    }

    result.push({
      mes: excelSerialToMesLabel(serial),
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
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  const resumen  = leerHoja(wb, 'Resumen')
  const detalle  = leerHoja(wb, '2026-05') || leerHojaConFecha(wb)

  if (!resumen || !detalle) {
    throw new Error('El archivo no tiene el formato esperado. Verificá que sea un Revenue estimado.')
  }

  // DEV: log Resumen sheet so we can see actual labels/layout
  if (typeof window !== 'undefined') {
    console.group('📊 Resumen sheet — primeras 30 filas')
    resumen.slice(0, 30).forEach((row, i) => {
      const cells = row.map((c: unknown, j: number) => `[${j}]=${JSON.stringify(c)}`).join('  ')
      if (cells) console.log(`row[${i}]: ${cells}`)
    })
    console.groupEnd()
  }

  const periodoRaw = encontrarPeriodo(wb, resumen)
  const periodo = periodoRaw || '2026-00'
  const mes = formatearMes(periodo)

  const ventas_MM  = buscarValor(resumen, 'VENTAS ESTIMADAS', 1) ?? 0
  const vol_prod   = buscarValor(resumen, 'Volumen Producido', 1) ?? 0
  const vol_venta  = buscarValor(resumen, 'Volumen Ventas', 1)    ?? 0
  const precio_oil = buscarValor(resumen, 'Oil', 3)               ?? 0
  const precio_gas = buscarValor(resumen, 'Gas', 3)               ?? 0
  const dias       = Number(buscarCelda(detalle, 0, 3))           || 30

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
    precio_neto_gas:    precio_gas,
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
        prod_mcfd:   gasProd?.[6]  ?? 0,
        vol_mes_mcf: (gasProd?.[6]  ?? 0) * dias,
        precio_mcf:  gasPrec?.[6]  ?? 0,
        ingreso:     totalUs?.[6]  ?? 0,
      },
      RCLV: {
        prod_mcfd:   gasProd?.[7]  ?? 0,
        vol_mes_mcf: (gasProd?.[7] ?? 0) * dias,
        precio_mcf:  gasPrec?.[7]  ?? 0,
        ingreso:     totalUs?.[7]  ?? 0,
      },
    },

    mensual_historico: parsearSalesVolume(wb, currentPrices),
  }
}

function leerHoja(wb: XLSX.WorkBook, nombre: string): any[][] | null {
  const ws = wb.Sheets[nombre]
  if (!ws) return null
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
}

function leerHojaConFecha(wb: XLSX.WorkBook): any[][] | null {
  const hoja = wb.SheetNames.find(n => /^\d{4}-\d{2}$/.test(n))
  return hoja ? leerHoja(wb, hoja) : null
}

function encontrarPeriodo(wb: XLSX.WorkBook, resumen: any[][]): string {
  const hoja = wb.SheetNames.find(n => /^\d{4}-\d{2}$/.test(n))
  if (hoja) return hoja

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

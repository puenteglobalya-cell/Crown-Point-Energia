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

interface AreaOil {
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

interface AreaGas {
  prod_mcfd: number
  vol_mes_mcf: number
  precio_mcf: number
  ingreso: number
}

interface MesHistorico {
  mes: string
  total_MM: number
}

// ── PARSER PRINCIPAL ────────────────────────────────────────
export async function parsearIngresosExcel(file: File): Promise<DatosIngresos> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  // Leer hojas clave
  const resumen  = leerHoja(wb, 'Resumen')
  const detalle  = leerHoja(wb, '2026-05') || leerHojaConFecha(wb)
  const precios  = leerHoja(wb, 'Precio estimado')

  if (!resumen || !detalle) {
    throw new Error('El archivo no tiene el formato esperado. Verificá que sea un Revenue estimado.')
  }

  // Extraer período del nombre de hoja o celda
  const periodoRaw = encontrarPeriodo(wb, resumen)
  const periodo = periodoRaw || '2026-00'
  const mes = formatearMes(periodo)

  // ── Resumen ─────────────────────────────────────────────
  const ventas_MM        = buscarValor(resumen, 'VENTAS ESTIMADAS', 1)  ?? 0
  const vol_prod         = buscarValor(resumen, 'Volumen Producido', 1) ?? 0
  const vol_venta        = buscarValor(resumen, 'Volumen Ventas', 1)    ?? 0
  const precio_oil       = buscarValor(resumen, 'Oil', 3)               ?? 0
  const precio_gas       = buscarValor(resumen, 'Gas', 3)               ?? 0
  const dias             = Number(buscarCelda(detalle, 0, 2))           || 30

  // ── Detalle por área ─────────────────────────────────────
  const brent_ref  = buscarValor(detalle, 'mes', 1)          ?? 0
  const medanito   = buscarValor(detalle, 'MEDANITO', 1)     ?? 0
  const brent_1q   = buscarValor(detalle, '1Quincena', 1)    ?? 0
  const brent_2q   = buscarValor(detalle, '2Quincena', 1)    ?? 0

  const prod100   = buscarFila(detalle, '100% m3/d')
  const prodNeta  = buscarFila(detalle, 'Neto')
  const entregados = buscarFila(detalle, 'm3 entregados')
  const bbls      = buscarFila(detalle, 'Volumen en bbl')
  const totalUs   = buscarFila(detalle, 'Total us$')
  const precioN   = buscarFila(detalle, 'Precio Neto')
  const stockM3   = buscarFila(detalle, 'STOCK Estimado en m3')
  const stockUs   = buscarFila(detalle, /^us\$/)
  const stockDias = buscarFila(detalle, 'Stock en días')

  // Gas
  const gasProd   = buscarFila(detalle, /Neto.*Gas|Gas.*Neto/, true)
  const gasPrec   = buscarFila(detalle, /us.*mcf|mcf.*us/, true)

  const stock_total = (stockUs?.[2] ?? 0) + (stockUs?.[3] ?? 0)

  return {
    mes,
    periodo,
    dias,
    ventas_MM,
    stock_MM: stock_total / 1_000_000,
    vol_producido_boed: vol_prod,
    vol_vendido_boed: vol_venta,
    precio_neto_oil: precio_oil,
    precio_neto_gas: precio_gas,
    brent_prom: brent_ref,
    medanito_prom: medanito,

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
        prod_mcfd:    gasProd?.[6]  ?? 0,
        vol_mes_mcf:  0,
        precio_mcf:   gasPrec?.[6] ?? 0,
        ingreso:      totalUs?.[6] ?? 0,
      },
      RCLV: {
        prod_mcfd:    gasProd?.[7]  ?? 0,
        vol_mes_mcf:  0,
        precio_mcf:   gasPrec?.[7] ?? 0,
        ingreso:      totalUs?.[7] ?? 0,
      },
    },
  }
}

// ── HELPERS ─────────────────────────────────────────────────

function leerHoja(wb: XLSX.WorkBook, nombre: string): any[][] | null {
  const ws = wb.Sheets[nombre]
  if (!ws) return null
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
}

function leerHojaConFecha(wb: XLSX.WorkBook): any[][] | null {
  // Buscar hoja con formato YYYY-MM
  const hoja = wb.SheetNames.find(n => /^\d{4}-\d{2}$/.test(n))
  return hoja ? leerHoja(wb, hoja) : null
}

function encontrarPeriodo(wb: XLSX.WorkBook, resumen: any[][]): string {
  // Intentar desde nombre de hoja
  const hoja = wb.SheetNames.find(n => /^\d{4}-\d{2}$/.test(n))
  if (hoja) return hoja

  // Intentar desde celda de fecha en Resumen
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

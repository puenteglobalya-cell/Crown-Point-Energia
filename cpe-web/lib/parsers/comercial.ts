import ExcelJS from 'exceljs'

// ---------------------------------------------------------------------------
// Modelo de Comercialización — parser del Excel consolidado (9 hojas):
// Resumen, Precios, Gas, Acuerdo PAE PCKK, Alianza_Petrolera  ET-LT-PQ,
// CGC-Tratamiento de agua, CAPEX  ET-LT-PQ, Petrominera - ET-LT-PQ,
// Transporte Oil TDF vta PCKK.
//
// Todas las lecturas son por celda fija (fila/columna), igual que el resto
// de los parsers de este proyecto -- si cambia la estructura del Excel, hay
// que ajustar los números de fila/columna acá.
// ---------------------------------------------------------------------------

export interface Gestion {
  nombre: string
  yacimiento: string
  producto: string
  efecto2026: number | null
  efecto2027: number | null
  total: number
  tabKey: string
}

export interface SerieMensual {
  meses: string[]
  iceBrent: (number | null)[]
  etLtPq: (number | null)[]
  pcKk: (number | null)[]
  chPpc: (number | null)[]
  rclv: (number | null)[]
}

export interface AreaProducto {
  nombre: string
  precios: (number | null)[]
  formula: string
}

export interface AreaPrecio {
  area: string
  productos: AreaProducto[]
}

export interface DiferencialItem {
  periodo: string
  valor: number | string
  esReferencia: boolean
}

export interface PlanGasRow { periodo: string; precio: number; volM3d: number; ingresoK: number }

export interface AhorroGasRow { concepto: string; promPond: number; volumenAnual: string; totalAnualMM: number }

export interface CampaniaGasRow { mes: string; venta: number; compra: number; diferencia: number; estimado: number }

export interface AcuerdoPAE {
  texto: string
  vigenciaDesde: Date | null
  vigenciaHasta: Date | null
  punteoEntrega: string
  m3d: number
  dias: number
  bbl: number
  ajuste: number
  usdTotal: number
  efecto2026: number
  efecto2027: number
}

export interface YpfNov {
  referencia: string
  volET: number
  volPAE: number
  tabla: { concepto: string; valorET: number; valorPAE: number; esPct: boolean }[]
  gananciaET: number
  gananciaPAE: number
  gananciaConsolidada: number
}

export interface AlianzaMes { etiqueta: string; actas: number; m3: number; ganancia: number }

export interface Transporte {
  brent: number[]
  descuentoMix: number[]
  exportParity: number[]
  neto: number[]
  transporteCosto: number[]
  otrosComerciales: number[]
  tasa: number[]
  iibb: number[]
  netoFinal: number[]
  volumenM3: number
  usdTotal: number[]
  usdPropuestaRoch: number[]
  netoIncremental: number[]
}

export interface CgcMes { etiqueta: string; m3d: number; usd: number }

export interface Capex {
  mantenimiento: number
  transporteM3: number
  usdM3: number
  transporteUsd: number
  totalMensual: number
  totalAnual: number
}

export interface PetromineraMes { etiqueta: string; fee: number; m3: number; usdM3: number; transporteUsd: number; total: number }

export interface DatosComercial {
  periodo: string
  gestiones: Gestion[]
  impacto2026: number
  impacto2027: number
  impactoTotal: number
  notaRevision1: string
  notaRevision2: string
  serieBrent: SerieMensual
  areas: AreaPrecio[]
  diferencialET: DiferencialItem[]
  planGas: PlanGasRow[]
  planGasPromedioAnual: number
  ahorroGas: AhorroGasRow[]
  rclvGasenerPrecio: number
  rclvGasenerVol: string
  campaniaGas: CampaniaGasRow[]
  acuerdoPae: AcuerdoPAE
  ypf: YpfNov
  alianza: { actasTotal: number; m3Total: number; gananciaTotal: number; porMes: AlianzaMes[] }
  cgc: { ingreso2026: number; ingreso2027: number; porMes: CgcMes[] }
  capex: Capex
  petrominera: { totalAnual: number; porMes: PetromineraMes[] }
  transporte: Transporte
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function mesLabel(d: unknown): string {
  if (d instanceof Date) return `${MESES[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
  return String(d ?? '')
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v)
}

function cellOf(ws: ExcelJS.Worksheet, row: number, col: number): unknown {
  const raw = ws.getCell(row, col).value
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'object' && 'result' in (raw as object)) return (raw as ExcelJS.CellFormulaValue).result
  if (typeof raw === 'object' && 'richText' in (raw as object)) {
    return (raw as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('')
  }
  if (typeof raw === 'object' && 'text' in (raw as object)) return (raw as ExcelJS.CellHyperlinkValue).text
  return raw
}

function classifyProducto(nombre: string): { producto: string; tabKey: string } {
  const nl = nombre.toLowerCase()
  if (nl.includes('agua') || nl.includes('cgc')) return { producto: 'Agua', tabKey: 'otros-ingresos' }
  if (nl.includes('capex')) return { producto: 'Servicios', tabKey: 'otros-ingresos' }
  if (nl.includes('petrominera')) return { producto: 'Servicios', tabKey: 'otros-ingresos' }
  if (nl.includes('alianza')) return { producto: 'Petróleo', tabKey: 'otros-ingresos' }
  if (nl.includes('pae')) return { producto: 'Petróleo', tabKey: 'acuerdo-pae' }
  if (nl.includes('ypf')) return { producto: 'Petróleo', tabKey: 'ypf-nov' }
  if (nl.includes('transporte') && nl.includes('tdf')) return { producto: 'Petróleo', tabKey: 'transporte-tdf' }
  return { producto: 'Petróleo', tabKey: 'resumen' }
}

export async function parsearComercialExcel(file: File): Promise<DatosComercial> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)

  const wsResumen = wb.getWorksheet('Resumen')
  const wsPrecios = wb.getWorksheet('Precios')
  const wsGas = wb.getWorksheet('Gas')
  const wsPae = wb.getWorksheet('Acuerdo PAE PCKK')
  const wsAlianza = wb.getWorksheet('Alianza_Petrolera  ET-LT-PQ')
  const wsCgc = wb.getWorksheet('CGC-Tratamiento de agua')
  const wsCapex = wb.getWorksheet('CAPEX  ET-LT-PQ')
  const wsPetrominera = wb.getWorksheet('Petrominera - ET-LT-PQ')
  const wsTdf = wb.getWorksheet('Transporte Oil TDF vta PCKK')

  if (!wsResumen || !wsPrecios || !wsGas || !wsPae || !wsAlianza || !wsCgc || !wsCapex || !wsPetrominera || !wsTdf) {
    throw new Error('El archivo no tiene el formato esperado. Verificá que sea el Modelo de Comercialización (9 hojas: Resumen, Precios, Gas, Acuerdo PAE PCKK, Alianza_Petrolera ET-LT-PQ, CGC-Tratamiento de agua, CAPEX ET-LT-PQ, Petrominera - ET-LT-PQ, Transporte Oil TDF vta PCKK).')
  }

  // ---------------- RESUMEN ----------------
  const gestiones: Gestion[] = []
  for (let r = 4; r <= 10; r++) {
    const nombre = str(cellOf(wsResumen, r, 1))
    if (!nombre) continue
    const yac = str(cellOf(wsResumen, r, 3)) || '—'
    const e26 = numOrNull(cellOf(wsResumen, r, 4))
    const e27 = numOrNull(cellOf(wsResumen, r, 5))
    const tot = num(cellOf(wsResumen, r, 6))
    const { producto, tabKey } = classifyProducto(nombre)
    gestiones.push({ nombre, yacimiento: yac, producto, efecto2026: e26, efecto2027: e27, total: tot, tabKey })
  }
  const impacto2026 = num(cellOf(wsResumen, 17, 4))
  const impacto2027 = num(cellOf(wsResumen, 17, 5))
  const impactoTotal = num(cellOf(wsResumen, 17, 6))
  const notaRevision1 = str(cellOf(wsResumen, 20, 1))
  const notaRevision2 = str(cellOf(wsResumen, 21, 1))

  // YPF Nov-26
  const ypfReferencia = str(cellOf(wsResumen, 24, 1))
  const volET = num(cellOf(wsResumen, 24, 4))
  const volPAE = num(cellOf(wsResumen, 24, 7))
  const conceptosYpf = ['BRENT Promedio Noviembre', 'Dif Escalante promedio', 'Ajuste', 'Precio Neto', 'DDEE', 'IIBB', 'Precio Final']
  const filasYpf = [26, 27, 28, 29, 30, 31, 32]
  const tablaYpf = conceptosYpf.map((concepto, i) => ({
    concepto,
    valorET: num(cellOf(wsResumen, filasYpf[i], 4)),
    valorPAE: num(cellOf(wsResumen, filasYpf[i], 7)),
    esPct: concepto === 'DDEE' || concepto === 'IIBB',
  })).map(({ concepto, valorET, valorPAE, esPct }) => ({ concepto, valorET, valorPAE, esPct }))
  const gananciaET = num(cellOf(wsResumen, 35, 5))
  const gananciaPAE = num(cellOf(wsResumen, 35, 7))
  const gananciaConsolidada = num(cellOf(wsResumen, 35, 9))

  // ---------------- PRECIOS: Brent mensual (filas 3-12) ----------------
  const meses: string[] = []
  const iceBrent: (number | null)[] = []
  const etLtPq: (number | null)[] = []
  const pcKk: (number | null)[] = []
  const chPpc: (number | null)[] = []
  const rclv: (number | null)[] = []
  for (let r = 3; r <= 12; r++) {
    const mesCell = cellOf(wsPrecios, r, 1)
    if (!(mesCell instanceof Date)) continue
    meses.push(mesLabel(mesCell))
    iceBrent.push(numOrNull(cellOf(wsPrecios, r, 2)))
    etLtPq.push(numOrNull(cellOf(wsPrecios, r, 3)))
    pcKk.push(numOrNull(cellOf(wsPrecios, r, 4)))
    chPpc.push(numOrNull(cellOf(wsPrecios, r, 5)))
    rclv.push(numOrNull(cellOf(wsPrecios, r, 6)))
  }
  // RCLV finalizó operaciones en agosto 2026 -- cortar ahí aunque la planilla
  // arrastre un valor residual en los meses siguientes.
  for (let i = 8; i < rclv.length; i++) rclv[i] = null

  // ---------------- PRECIOS: por área y producto (filas 21-28) ----------------
  type AreaRowRaw = { area: string; producto: string; precios: (number | null)[]; formula: string }
  const areaRowsRaw: AreaRowRaw[] = []
  for (let r = 21; r <= 28; r++) {
    const area = str(cellOf(wsPrecios, r, 1))
    if (!area) continue
    const producto = str(cellOf(wsPrecios, r, 2))
    const precios: (number | null)[] = []
    for (let c = 3; c <= 12; c++) precios.push(numOrNull(cellOf(wsPrecios, r, c)))
    const formula = str(cellOf(wsPrecios, r, 14))
    areaRowsRaw.push({ area, producto, precios, formula })
  }

  // Completar Ago/Sep/Oct de gas ET/LT-PQ con la hoja "Gas" (columnas M/N)
  const campConPlan = [7, 8, 9].map(r => numOrNull(cellOf(wsGas, r, 13)))
  const campSinPlan = [7, 8, 9].map(r => numOrNull(cellOf(wsGas, r, 14)))
  for (const row of areaRowsRaw) {
    if (row.area === 'ET/LT-PQ' && row.producto === 'Gas — Plan Gas') {
      row.precios[7] = campConPlan[0]; row.precios[8] = campConPlan[1]; row.precios[9] = campConPlan[2]
    }
    if (row.area === 'ET/LT-PQ' && row.producto === 'Gas — Sin Cammesa') {
      row.precios[7] = campSinPlan[0]; row.precios[8] = campSinPlan[1]; row.precios[9] = campSinPlan[2]
    }
  }

  const areasMap = new Map<string, AreaProducto[]>()
  for (const row of areaRowsRaw) {
    let precios = row.precios
    if (row.area === 'RCLV') precios = [...precios.slice(0, 8), ...Array(precios.length - 8).fill(null)]
    const list = areasMap.get(row.area) ?? []
    list.push({ nombre: row.producto, precios, formula: row.formula })
    areasMap.set(row.area, list)
  }
  const areas: AreaPrecio[] = Array.from(areasMap.entries()).map(([area, productos]) => ({ area, productos }))

  // ---------------- PRECIOS: Diferencial ET timeline (filas 47-55) ----------------
  const diferencialET: DiferencialItem[] = []
  for (let r = 47; r <= 55; r++) {
    const periodoCell = cellOf(wsPrecios, r, 1)
    if (periodoCell === null) continue
    const periodo = periodoCell instanceof Date ? mesLabel(periodoCell) : str(periodoCell)
    const valorCell = cellOf(wsPrecios, r, 2)
    const esReferencia = typeof valorCell === 'string'
    diferencialET.push({ periodo, valor: esReferencia ? String(valorCell) : num(valorCell), esReferencia })
  }

  // ---------------- GAS: Plan Gas (filas 26-30) ----------------
  const planGas: PlanGasRow[] = [26, 27, 28].map(r => ({
    periodo: str(cellOf(wsGas, r, 1)),
    precio: num(cellOf(wsGas, r, 2)),
    volM3d: num(cellOf(wsGas, r, 3)),
    ingresoK: num(cellOf(wsGas, r, 4)),
  }))
  const planGasPromedioAnual = num(cellOf(wsGas, 30, 2))

  // ---------------- GAS: Ahorro Gas (filas 38-40, RCLV fila 42) ----------------
  const ahorroGas: AhorroGasRow[] = [38, 39, 40].map(r => ({
    concepto: str(cellOf(wsGas, r, 1)),
    promPond: num(cellOf(wsGas, r, 2)),
    volumenAnual: str(cellOf(wsGas, r, 3)),
    totalAnualMM: num(cellOf(wsGas, r, 4)),
  }))
  const rclvGasenerPrecio = num(cellOf(wsGas, 42, 2))
  const rclvGasenerVol = str(cellOf(wsGas, 42, 3))

  // ---------------- GAS: Campaña Gas Mensual (filas 4-15) ----------------
  const campaniaGas: CampaniaGasRow[] = []
  for (let r = 4; r <= 15; r++) {
    const mes = cellOf(wsGas, r, 2)
    if (mes === null) continue
    campaniaGas.push({
      mes: str(mes),
      venta: num(cellOf(wsGas, r, 5)),
      compra: num(cellOf(wsGas, r, 6)),
      diferencia: num(cellOf(wsGas, r, 7)),
      estimado: num(cellOf(wsGas, r, 8)),
    })
  }

  // ---------------- ACUERDO PAE PCKK ----------------
  const paeTexto = str(cellOf(wsPae, 2, 1))
  const paeVigIni = cellOf(wsPae, 4, 3)
  const paeVigFin = cellOf(wsPae, 4, 4)
  const acuerdoPae: AcuerdoPAE = {
    texto: paeTexto,
    vigenciaDesde: paeVigIni instanceof Date ? paeVigIni : null,
    vigenciaHasta: paeVigFin instanceof Date ? paeVigFin : null,
    punteoEntrega: str(cellOf(wsPae, 5, 3)),
    m3d: num(cellOf(wsPae, 8, 2)),
    dias: num(cellOf(wsPae, 8, 3)),
    bbl: num(cellOf(wsPae, 8, 4)),
    ajuste: num(cellOf(wsPae, 9, 4)),
    usdTotal: num(cellOf(wsPae, 10, 4)),
    efecto2026: num(cellOf(wsPae, 11, 4)),
    efecto2027: num(cellOf(wsPae, 12, 4)),
  }

  // ---------------- ALIANZA PETROLERA (agrupado por mes) ----------------
  const actasTotal = num(cellOf(wsAlianza, 2, 2))
  const gananciaAlianzaTotal = num(cellOf(wsAlianza, 4, 2))
  const monthly = new Map<string, { actas: number; m3: number; ganancia: number; orden: number }>()
  for (let r = 8; r <= 32; r++) {
    const fecha = cellOf(wsAlianza, r, 1)
    if (!(fecha instanceof Date)) continue
    const key = `${fecha.getUTCFullYear()}-${fecha.getUTCMonth()}`
    const m3 = num(cellOf(wsAlianza, r, 4))
    const gan = num(cellOf(wsAlianza, r, 5))
    const prev = monthly.get(key) ?? { actas: 0, m3: 0, ganancia: 0, orden: fecha.getUTCFullYear() * 12 + fecha.getUTCMonth() }
    prev.actas += 1
    prev.m3 += m3
    prev.ganancia += gan
    monthly.set(key, prev)
  }
  const alianzaPorMes: AlianzaMes[] = Array.from(monthly.entries())
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([key, v]) => {
      const [y, m] = key.split('-').map(Number)
      return { etiqueta: `${MESES[m]}-${String(y).slice(2)}`, actas: v.actas, m3: v.m3, ganancia: v.ganancia }
    })
  const m3TotalAlianza = alianzaPorMes.reduce((s, v) => s + v.m3, 0)

  // ---------------- CGC (arranca octubre 2026) ----------------
  const cgcPorMes: CgcMes[] = []
  for (const r of [15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]) {
    const fecha = cellOf(wsCgc, r, 2)
    if (!(fecha instanceof Date)) continue
    const m3d = numOrNull(cellOf(wsCgc, r, 3))
    const usd = numOrNull(cellOf(wsCgc, r, 5))
    cgcPorMes.push({ etiqueta: mesLabel(fecha), m3d: m3d ?? 0, usd: usd ?? 0 })
  }
  const ingreso2026Cgc = num(cellOf(wsCgc, 19, 5))
  const ingreso2027Cgc = num(cellOf(wsCgc, 34, 5))

  // ---------------- CAPEX (constante todo el año) ----------------
  const capex: Capex = {
    mantenimiento: num(cellOf(wsCapex, 6, 2)),
    transporteM3: num(cellOf(wsCapex, 6, 3)),
    usdM3: num(cellOf(wsCapex, 6, 4)),
    transporteUsd: num(cellOf(wsCapex, 6, 5)),
    totalMensual: num(cellOf(wsCapex, 6, 7)),
    totalAnual: num(cellOf(wsCapex, 19, 7)),
  }

  // ---------------- PETROMINERA (varía mes a mes) ----------------
  const petromineraPorMes: PetromineraMes[] = []
  for (let r = 5; r <= 16; r++) {
    const fecha = cellOf(wsPetrominera, r, 1)
    if (!(fecha instanceof Date)) continue
    petromineraPorMes.push({
      etiqueta: mesLabel(fecha),
      fee: num(cellOf(wsPetrominera, r, 2)),
      m3: num(cellOf(wsPetrominera, r, 3)),
      usdM3: num(cellOf(wsPetrominera, r, 4)),
      transporteUsd: num(cellOf(wsPetrominera, r, 5)),
      total: num(cellOf(wsPetrominera, r, 7)),
    })
  }
  const petromineraTotalAnual = num(cellOf(wsPetrominera, 18, 7))

  // ---------------- TRANSPORTE TDF -> PCKK ----------------
  const colsTdf = [3, 4, 5]
  const transporte: Transporte = {
    brent: colsTdf.map(c => num(cellOf(wsTdf, 9, c))),
    descuentoMix: colsTdf.map(c => num(cellOf(wsTdf, 10, c))),
    exportParity: colsTdf.map(c => num(cellOf(wsTdf, 11, c))),
    neto: colsTdf.map(c => num(cellOf(wsTdf, 13, c))),
    transporteCosto: colsTdf.map(c => num(cellOf(wsTdf, 15, c))),
    otrosComerciales: colsTdf.map(c => num(cellOf(wsTdf, 16, c))),
    tasa: colsTdf.map(c => num(cellOf(wsTdf, 17, c))),
    iibb: colsTdf.map(c => num(cellOf(wsTdf, 18, c))),
    netoFinal: colsTdf.map(c => num(cellOf(wsTdf, 20, c))),
    volumenM3: num(cellOf(wsTdf, 22, 3)),
    usdTotal: colsTdf.map(c => num(cellOf(wsTdf, 24, c))),
    usdPropuestaRoch: colsTdf.map(c => num(cellOf(wsTdf, 26, c))),
    netoIncremental: colsTdf.map(c => num(cellOf(wsTdf, 28, c))),
  }

  if (meses.length === 0) {
    throw new Error('No se pudo leer la hoja "Precios" -- verificá que las fechas mensuales estén en la columna A desde la fila 3.')
  }

  return {
    periodo: new Date().toISOString().slice(0, 7),
    gestiones,
    impacto2026,
    impacto2027,
    impactoTotal,
    notaRevision1,
    notaRevision2,
    serieBrent: { meses, iceBrent, etLtPq, pcKk, chPpc, rclv },
    areas,
    diferencialET,
    planGas,
    planGasPromedioAnual,
    ahorroGas,
    rclvGasenerPrecio,
    rclvGasenerVol,
    campaniaGas,
    acuerdoPae,
    ypf: {
      referencia: ypfReferencia,
      volET,
      volPAE,
      tabla: tablaYpf,
      gananciaET,
      gananciaPAE,
      gananciaConsolidada,
    },
    alianza: { actasTotal, m3Total: m3TotalAlianza, gananciaTotal: gananciaAlianzaTotal, porMes: alianzaPorMes },
    cgc: { ingreso2026: ingreso2026Cgc, ingreso2027: ingreso2027Cgc, porMes: cgcPorMes },
    capex,
    petrominera: { totalAnual: petromineraTotalAnual, porMes: petromineraPorMes },
    transporte,
  }
}

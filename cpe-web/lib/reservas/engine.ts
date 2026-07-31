import { createSupabaseServerAdminClient } from '@/lib/supabase'

// ─── Motor de cashflow mensual ───────────────────────────────────────────
// Recorre cada pozo de un escenario mes a mes desde su fecha_alta, resuelve
// la curva de producción vigente (propia o de un pozo_tipo activado por una
// intervención), el precio, la participación, regalías, OPEX, CAPEX/amortización
// e impuestos, y puebla cashflow_mensual.
//
// Regla de ganancias (definida por el cliente):
//   base_imponible = ventas - opex_fijo - opex_variable - regalías - IIBB
//                     - Imp. Débitos y Créditos - amortización
//   impuesto_ganancias = base_imponible * alicuota  (0 si es negativa)
//   resultado_neto = base_imponible - impuesto_ganancias
//
// Horizonte: 20 años (240 meses) desde la fecha de alta de cada pozo, o hasta
// que el pozo se corte por límite económico / venza la concesión.

const HORIZONTE_MESES = 240

type Rango<T> = { fecha_desde: string; fecha_hasta: string | null } & T

function vigente<T>(rangos: Rango<T>[], fecha: string): T | null {
  const row = rangos.find(r => r.fecha_desde <= fecha && (r.fecha_hasta === null || fecha < r.fecha_hasta))
  return row ?? null
}

function addMonths(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

export async function calcularEscenario(escenarioId: number) {
  const db = createSupabaseServerAdminClient()

  const [
    pozosRes, curvasRes, intervencionesRes, participacionRes, regaliasRes,
    opexFijoRes, opexVarRes, opexFijoPozoRes, formulasRes, preciosRefRes, preciosMensRes,
    provinciasRes, yacimientosRes, concesionesRes, ganRes, dycRes,
  ] = await Promise.all([
    db.from('pozos').select('*'),
    db.from('curvas_produccion').select('*'),
    db.from('intervenciones').select('*').or(`escenario_id.eq.${escenarioId},escenario_id.is.null`),
    db.from('concesion_participacion').select('*'),
    db.from('regalias').select('*'),
    db.from('opex_fijo').select('*'),
    db.from('opex_variable').select('*'),
    db.from('opex_fijo_pozo').select('*'),
    db.from('formulas_precio').select('*'),
    db.from('precios_referencia').select('*'),
    db.from('precios_mensuales').select('*'),
    db.from('provincias').select('*'),
    db.from('yacimientos').select('*'),
    db.from('concesiones').select('*'),
    db.from('parametros_impuesto_ganancias').select('*').eq('nivel', 'consolidado').order('fecha_desde', { ascending: false }),
    db.from('parametros_debitos_creditos').select('*').order('fecha_desde', { ascending: false }),
  ])

  const err = [pozosRes, curvasRes, intervencionesRes, participacionRes, regaliasRes,
    opexFijoRes, opexVarRes, opexFijoPozoRes, formulasRes, preciosRefRes, preciosMensRes,
    provinciasRes, yacimientosRes, concesionesRes, ganRes, dycRes].find(r => r.error)
  if (err?.error) throw new Error(err.error.message)

  const pozos = pozosRes.data ?? []
  const curvas = curvasRes.data ?? []
  const intervenciones = (intervencionesRes.data ?? []).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const participaciones = participacionRes.data ?? []
  const regalias = regaliasRes.data ?? []
  const opexFijo = opexFijoRes.data ?? []
  const opexVar = opexVarRes.data ?? []
  const opexFijoPozo = opexFijoPozoRes.data ?? []
  const formulas = formulasRes.data ?? []
  const preciosRef = preciosRefRes.data ?? []
  const preciosMens = preciosMensRes.data ?? []
  const concesiones = concesionesRes.data ?? []
  const yacimientos = yacimientosRes.data ?? []
  const provincias = provinciasRes.data ?? []

  const alicuotaGanancias = ganRes.data?.[0]?.alicuota ?? 0.35
  const alicuotaDyC = dycRes.data?.[0]?.alicuota ?? 0.006

  const yacimientoDe = (concesionId: number) => {
    const c = concesiones.find(c => c.id === concesionId)
    return c ? yacimientos.find(y => y.id === c.yacimiento_id) ?? null : null
  }
  const provinciaDe = (yacimientoId: number) => {
    const y = yacimientos.find(y => y.id === yacimientoId)
    return y ? provincias.find(p => p.id === y.provincia_id) ?? null : null
  }

  function precioEn(yacimientoId: number, producto: 'petroleo' | 'gas', fecha: string): number {
    const directo = preciosMens.find(p => p.yacimiento_id === yacimientoId && p.producto === producto && p.fecha === fecha)
    if (directo) return directo.precio_usd

    const formula = vigente(
      formulas.filter(f => f.yacimiento_id === yacimientoId && f.producto === producto),
      fecha,
    )
    if (!formula) return 0
    const ref = preciosRef.find(r => r.referencia === formula.referencia && r.fecha === fecha)
    if (!ref) return 0
    const precioNetoCuenca = (ref.precio_usd * (1 - formula.dde_pct / 100)) / (formula.divisor || 1) - formula.descuento_adicional_usd
    // Tarifa de almacenamiento: USD/m3/día × días, convertido a USD/bbl con
    // el factor de conversión configurado (primera aproximación — validar
    // contra el Excel de referencia y ajustar factor_m3_a_bbl si no calza).
    const tarifaUsdM3 = formula.tarifa_almacenamiento_usd_m3_dia ?? 0
    const dias = formula.dias_almacenamiento ?? 0
    const factorM3aBbl = formula.factor_m3_a_bbl || 6.2898
    const deduccionAlmacenamiento = (tarifaUsdM3 * dias) / factorM3aBbl
    return precioNetoCuenca - deduccionAlmacenamiento
  }

  const filas: Record<string, unknown>[] = []

  for (const pozo of pozos) {
    const concesion = concesiones.find(c => c.id === pozo.concesion_id)
    if (!concesion) continue
    const yacimiento = yacimientoDe(pozo.concesion_id)
    if (!yacimiento) continue
    const provincia = provinciaDe(yacimiento.id)

    // Curva activa en cada mes: la propia del pozo hasta que una intervención
    // (drilling/WO/pulling con pozo_tipo_id) la reemplace desde su fecha.
    const intervPozo = intervenciones.filter(i => i.pozo_id === pozo.id && i.pozo_tipo_id !== null)

    let fechaCorte: string | null = pozo.fecha_baja ?? null
    if (concesion.fecha_vencimiento && (!fechaCorte || concesion.fecha_vencimiento < fechaCorte)) {
      fechaCorte = concesion.fecha_vencimiento
    }

    let cortadoPorLimiteEconomico = false

    for (let m = 0; m < HORIZONTE_MESES; m++) {
      const fecha = addMonths(pozo.fecha_alta, m)
      if (fechaCorte && fecha >= fechaCorte) break
      if (cortadoPorLimiteEconomico) break

      // Curva vigente: la intervención más reciente con fecha <= fecha actual, si hay
      const interv = [...intervPozo].reverse().find(i => i.fecha <= fecha)
      let bbl = 0, mcf = 0
      if (interv?.pozo_tipo_id) {
        const offset = monthsBetween(interv.fecha, fecha)
        const c = curvas.find(c => c.pozo_tipo_id === interv.pozo_tipo_id && c.mes_offset === offset)
        bbl = c?.bbl_petroleo ?? 0
        mcf = c?.mcf_gas ?? 0
      } else {
        const offset = m
        const c = curvas.find(c => c.pozo_id === pozo.id && c.mes_offset === offset)
        bbl = c?.bbl_petroleo ?? 0
        mcf = c?.mcf_gas ?? 0
      }
      if (bbl === 0 && mcf === 0 && m > 0) continue // sin dato de curva ese mes — no generar fila vacía

      const precioOil = precioEn(yacimiento.id, 'petroleo', fecha)
      const precioGas = precioEn(yacimiento.id, 'gas', fecha)
      const ingresoBruto = bbl * precioOil + (mcf / 1000) * precioGas * 1000 // mcf ya en unidad de referencia

      const regalia = vigente(regalias.filter(r => r.concesion_id === concesion.id), fecha)
      const regaliaUsd = ingresoBruto * (regalia?.porcentaje ?? 0)

      const iibbUsd = ingresoBruto * (provincia?.alicuota_iibb ?? 0)
      const dycUsd = ingresoBruto * alicuotaDyC

      const fijo = vigente(opexFijo.filter(o => o.concesion_id === concesion.id), fecha)
      const opexFijoUsd = fijo?.monto_usd_mes ?? 0
      const variable = vigente(opexVar.filter(o => o.yacimiento_id === yacimiento.id), fecha)
      const boe = bbl + mcf / 6000
      const opexVarUsd = boe * (variable?.usd_por_boe ?? 0)
      // Fijo por pozo: se carga por pozo activo (cada pozo del loop suma el
      // suyo, no se prorratea entre pozos como el opex_fijo por concesión)
      const fijoPozo = vigente(opexFijoPozo.filter(o => o.concesion_id === concesion.id), fecha)
      const opexFijoPozoUsd = fijoPozo?.usd_mes_pozo ?? 0

      // CAPEX/amortización: intervenciones de este pozo con vida útil vigente ese mes
      let depreciacionUsd = 0
      let capexUsd = 0
      for (const i of intervenciones.filter(i => i.pozo_id === pozo.id)) {
        if (i.fecha === fecha) capexUsd += i.capex_usd
        if (i.vida_util_meses && i.vida_util_meses > 0) {
          const mesesDesde = monthsBetween(i.fecha, fecha)
          if (mesesDesde >= 0 && mesesDesde < i.vida_util_meses) {
            depreciacionUsd += i.capex_usd / i.vida_util_meses
          }
        }
      }

      const baseImponible = ingresoBruto - regaliaUsd - iibbUsd - dycUsd - opexFijoUsd - opexVarUsd - opexFijoPozoUsd - depreciacionUsd
      const impuestoGanancias = baseImponible > 0 ? baseImponible * alicuotaGanancias : 0
      const resultadoNeto = baseImponible - impuestoGanancias

      const part = vigente(participaciones.filter(p => p.concesion_id === concesion.id), fecha)
      const participacionPct = part?.porcentaje ?? 1
      // Cash flow real: la amortización es no-cash (se vuelve a sumar) y el
      // CAPEX sí es una salida de caja real en el mes en que ocurre.
      const cashFlowNeto = (resultadoNeto + depreciacionUsd - capexUsd) * participacionPct

      // Límite económico: dos meses consecutivos de cash flow negativo cortan el pozo
      if (cashFlowNeto < 0) {
        const anterior = filas[filas.length - 1]
        if (anterior?.pozo_id === pozo.id && (anterior.cash_flow_neto_usd as number) < 0) {
          cortadoPorLimiteEconomico = true
        }
      }

      filas.push({
        escenario_id: escenarioId,
        pozo_id: pozo.id,
        fecha,
        bbl_petroleo: bbl,
        mcf_gas: mcf,
        precio_petroleo: precioOil,
        precio_gas: precioGas,
        ingreso_bruto_usd: ingresoBruto,
        regalias_usd: regaliaUsd,
        iibb_usd: iibbUsd,
        debitos_creditos_usd: dycUsd,
        opex_fijo_usd: opexFijoUsd,
        opex_variable_usd: opexVarUsd,
        opex_fijo_pozo_usd: opexFijoPozoUsd,
        capex_usd: capexUsd,
        depreciacion_usd: depreciacionUsd,
        resultado_antes_ganancias_usd: baseImponible,
        impuesto_ganancias_usd: impuestoGanancias,
        resultado_neto_usd: resultadoNeto,
        participacion_pct: participacionPct,
        cash_flow_neto_usd: cashFlowNeto,
        economicamente_activo: !cortadoPorLimiteEconomico,
      })
    }
  }

  await db.from('cashflow_mensual').delete().eq('escenario_id', escenarioId)
  if (filas.length > 0) {
    const CHUNK = 500
    for (let i = 0; i < filas.length; i += CHUNK) {
      const { error } = await db.from('cashflow_mensual').insert(filas.slice(i, i + CHUNK))
      if (error) throw new Error(error.message)
    }
  }

  return { filas: filas.length, pozos: pozos.length }
}

function monthsBetween(desdeIso: string, fechaIso: string): number {
  const a = new Date(desdeIso + 'T00:00:00Z')
  const b = new Date(fechaIso + 'T00:00:00Z')
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
}

export function calcularNPV(cashflows: { fecha: string; cash_flow_neto_usd: number }[], tasaAnual: number, fechaBase: string): number {
  const tasaMensual = Math.pow(1 + tasaAnual, 1 / 12) - 1
  return cashflows.reduce((npv, cf) => {
    const meses = monthsBetween(fechaBase, cf.fecha)
    if (meses < 0) return npv
    return npv + cf.cash_flow_neto_usd / Math.pow(1 + tasaMensual, meses)
  }, 0)
}

// ─── Agregado anual por yacimiento + consolidado ─────────────────────────
// Complementa cashflow_mensual (por pozo) con un resumen ejecutivo anual
// (EBITDA, D&A, EBIT, neto, netback) por yacimiento y a nivel consolidado
// (yacimiento_id = null).
export async function calcularAgregadosAnuales(escenarioId: number) {
  const db = createSupabaseServerAdminClient()

  const [cfRes, pozosRes, concesionesRes] = await Promise.all([
    db.from('cashflow_mensual').select('*').eq('escenario_id', escenarioId),
    db.from('pozos').select('id, concesion_id'),
    db.from('concesiones').select('id, yacimiento_id'),
  ])
  const err = [cfRes, pozosRes, concesionesRes].find(r => r.error)
  if (err?.error) throw new Error(err.error.message)

  const pozos = pozosRes.data ?? []
  const concesiones = concesionesRes.data ?? []
  const yacimientoDePozo = (pozoId: number) => {
    const p = pozos.find(p => p.id === pozoId)
    if (!p) return null
    return concesiones.find(c => c.id === p.concesion_id)?.yacimiento_id ?? null
  }

  type Acc = {
    produccion_petroleo_bbl: number; produccion_gas_mcf: number; ingresos_usd: number
    regalias_usd: number; opex_usd: number; depreciacion_usd: number
    resultado_antes_ganancias_usd: number; impuesto_ganancias_usd: number; resultado_neto_usd: number
  }
  const empty = (): Acc => ({
    produccion_petroleo_bbl: 0, produccion_gas_mcf: 0, ingresos_usd: 0,
    regalias_usd: 0, opex_usd: 0, depreciacion_usd: 0,
    resultado_antes_ganancias_usd: 0, impuesto_ganancias_usd: 0, resultado_neto_usd: 0,
  })

  const porYacimiento = new Map<string, Acc>() // key = `${yacimientoId ?? 'consolidado'}_${anio}`
  const porConsolidado = new Map<number, Acc>() // key = anio

  for (const cf of cfRes.data ?? []) {
    const anio = Number(String(cf.fecha).slice(0, 4))
    const yacId = yacimientoDePozo(cf.pozo_id)
    const keyYac = `${yacId ?? 'null'}_${anio}`

    for (const [map, key] of [[porYacimiento, keyYac] as const]) {
      const acc = map.get(key) ?? empty()
      acc.produccion_petroleo_bbl += cf.bbl_petroleo
      acc.produccion_gas_mcf += cf.mcf_gas
      acc.ingresos_usd += cf.ingreso_bruto_usd
      acc.regalias_usd += cf.regalias_usd
      acc.opex_usd += cf.opex_fijo_usd + cf.opex_variable_usd + cf.opex_fijo_pozo_usd
      acc.depreciacion_usd += cf.depreciacion_usd
      acc.resultado_antes_ganancias_usd += cf.resultado_antes_ganancias_usd
      acc.impuesto_ganancias_usd += cf.impuesto_ganancias_usd
      acc.resultado_neto_usd += cf.cash_flow_neto_usd
      map.set(key, acc)
    }

    const accCons = porConsolidado.get(anio) ?? empty()
    accCons.produccion_petroleo_bbl += cf.bbl_petroleo
    accCons.produccion_gas_mcf += cf.mcf_gas
    accCons.ingresos_usd += cf.ingreso_bruto_usd
    accCons.regalias_usd += cf.regalias_usd
    accCons.opex_usd += cf.opex_fijo_usd + cf.opex_variable_usd + cf.opex_fijo_pozo_usd
    accCons.depreciacion_usd += cf.depreciacion_usd
    accCons.resultado_antes_ganancias_usd += cf.resultado_antes_ganancias_usd
    accCons.impuesto_ganancias_usd += cf.impuesto_ganancias_usd
    accCons.resultado_neto_usd += cf.cash_flow_neto_usd
    porConsolidado.set(anio, accCons)
  }

  function fila(yacimientoId: number | null, anio: number, acc: Acc) {
    const boe = acc.produccion_petroleo_bbl + acc.produccion_gas_mcf / 6000
    const ebitda = acc.ingresos_usd - acc.regalias_usd - acc.opex_usd
    return {
      escenario_id: escenarioId,
      yacimiento_id: yacimientoId,
      anio,
      produccion_petroleo_bbl: acc.produccion_petroleo_bbl,
      produccion_gas_mcf: acc.produccion_gas_mcf,
      ingresos_usd: acc.ingresos_usd,
      regalias_usd: acc.regalias_usd,
      opex_usd: acc.opex_usd,
      ebitda_usd: ebitda,
      depreciacion_usd: acc.depreciacion_usd,
      ebit_usd: ebitda - acc.depreciacion_usd,
      intereses_usd: 0, // deuda corporativa es a nivel consolidado empresa, no por yacimiento — ver deuda_notas
      impuesto_ganancias_usd: acc.impuesto_ganancias_usd,
      resultado_neto_usd: acc.resultado_neto_usd,
      netback_usd_boe: boe > 0 ? ebitda / boe : null,
    }
  }

  // Filas por yacimiento real (se ignoran pozos con yacimiento no resuelto —
  // datos incompletos, no deberían contaminar el consolidado con un yacimiento_id null)
  const filas: Record<string, unknown>[] = []
  for (const [key, acc] of porYacimiento) {
    const [yacRaw, anioRaw] = key.split('_')
    if (yacRaw === 'null') continue
    filas.push(fila(Number(yacRaw), Number(anioRaw), acc))
  }
  // Filas consolidado (yacimiento_id = null) — siempre suma TODOS los pozos del escenario
  for (const [anio, acc] of porConsolidado) {
    filas.push(fila(null, anio, acc))
  }
  const filasFinal = filas

  await db.from('resultados_escenario_anual').delete().eq('escenario_id', escenarioId)
  if (filasFinal.length > 0) {
    const { error } = await db.from('resultados_escenario_anual').insert(filasFinal)
    if (error) throw new Error(error.message)
  }

  return { anios: filasFinal.length }
}

// ─── Métricas del escenario: NPV, IRR, payback ───────────────────────────
function irrAnual(cashflowsAnuales: number[]): number | null {
  // Bisección entre -99% y 1000% — robusto para series con un único cambio
  // de signo (CAPEX inicial negativo, luego flujo positivo), que es el caso
  // típico de un pozo/yacimiento.
  const npvAt = (r: number) => cashflowsAnuales.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0)
  let lo = -0.99, hi = 10
  if (npvAt(lo) * npvAt(hi) > 0) return null // no hay cambio de signo detectable en el rango
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const v = npvAt(mid)
    if (Math.abs(v) < 1) return mid
    if (npvAt(lo) * v < 0) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

export async function calcularMetricasEscenario(escenarioId: number, tasaAnual: number, horizonteAnios: number) {
  const db = createSupabaseServerAdminClient()
  const { data: cashflows, error } = await db
    .from('cashflow_mensual')
    .select('fecha, cash_flow_neto_usd')
    .eq('escenario_id', escenarioId)
    .order('fecha')
  if (error) throw new Error(error.message)

  const fechaBase = cashflows?.[0]?.fecha ?? new Date().toISOString().slice(0, 10)
  const npv = calcularNPV(cashflows ?? [], tasaAnual, fechaBase)
  const totalCashflow = (cashflows ?? []).reduce((s, c) => s + c.cash_flow_neto_usd, 0)

  // Serie anual para IRR y payback
  const porAnio = new Map<number, number>()
  for (const cf of cashflows ?? []) {
    const anioIdx = Math.floor(monthsBetween(fechaBase, cf.fecha) / 12)
    porAnio.set(anioIdx, (porAnio.get(anioIdx) ?? 0) + cf.cash_flow_neto_usd)
  }
  const maxAnio = Math.max(0, ...porAnio.keys())
  const serieAnual = Array.from({ length: maxAnio + 1 }, (_, i) => porAnio.get(i) ?? 0)

  const irr = irrAnual(serieAnual)

  let acumulado = 0
  let paybackAnios: number | null = null
  for (let i = 0; i < serieAnual.length; i++) {
    acumulado += serieAnual[i]
    if (acumulado >= 0 && paybackAnios === null) {
      paybackAnios = i + (serieAnual[i] !== 0 ? 1 - acumulado / serieAnual[i] : 0)
      break
    }
  }

  const row = {
    escenario_id: escenarioId,
    tasa_descuento: tasaAnual,
    horizonte_anios: horizonteAnios,
    npv_usd: npv,
    irr_pct: irr !== null ? irr * 100 : null,
    payback_anios: paybackAnios,
  }

  const { error: upsertErr } = await db
    .from('escenario_metricas')
    .upsert(row, { onConflict: 'escenario_id,tasa_descuento,horizonte_anios' })
  if (upsertErr) throw new Error(upsertErr.message)

  return { ...row, total_cashflow: totalCashflow }
}

// ─── Roll-forward de depleción de reservas ───────────────────────────────
// Opening (reserve report) → Depletion (producción del año, del motor) →
// Closing, por yacimiento/categoría/año. Requiere haber corrido
// calcularAgregadosAnuales() antes para tener resultados_escenario_anual.
export async function calcularDepletionReservas(escenarioId: number) {
  const db = createSupabaseServerAdminClient()

  const [reservasRes, resultadosRes] = await Promise.all([
    db.from('reservas_anuales').select('*').or(`escenario_id.eq.${escenarioId},escenario_id.is.null`),
    db.from('resultados_escenario_anual').select('*').eq('escenario_id', escenarioId).not('yacimiento_id', 'is', null),
  ])
  const err = [reservasRes, resultadosRes].find(r => r.error)
  if (err?.error) throw new Error(err.error.message)

  const reservas = reservasRes.data ?? []
  const resultados = (resultadosRes.data ?? []).sort((a, b) => a.anio - b.anio)

  const yacimientoIds = Array.from(new Set(reservas.map(r => r.yacimiento_id)))
  const categorias = ['P1', 'P2', 'P3'] as const

  const filas: Record<string, unknown>[] = []

  for (const yacId of yacimientoIds) {
    const produccionPorAnio = resultados
      .filter(r => r.yacimiento_id === yacId)
      .map(r => ({ anio: r.anio, boe: r.produccion_petroleo_bbl + r.produccion_gas_mcf / 6000 }))

    for (const categoria of categorias) {
      // Apertura base: el reserve report más reciente para este yacimiento/categoría
      const reporte = reservas
        .filter(r => r.yacimiento_id === yacId && r.categoria === categoria)
        .sort((a, b) => String(b.fecha_corte).localeCompare(String(a.fecha_corte)))[0]
      if (!reporte) continue

      let cierrePrevio = reporte.reservas_boe
      const anioBase = reporte.anio

      for (const { anio, boe: produccionBoe } of produccionPorAnio) {
        if (anio < anioBase) continue
        const apertura = cierrePrevio
        const depletion = Math.min(produccionBoe, Math.max(apertura, 0))
        const cierre = Math.max(apertura - depletion, 0)
        filas.push({
          escenario_id: escenarioId,
          yacimiento_id: yacId,
          categoria,
          anio,
          apertura_boe: apertura,
          depletion_boe: depletion,
          cierre_boe: cierre,
        })
        cierrePrevio = cierre
      }
    }
  }

  await db.from('reservas_depletion_anual').delete().eq('escenario_id', escenarioId)
  if (filas.length > 0) {
    const { error: insErr } = await db.from('reservas_depletion_anual').insert(filas)
    if (insErr) throw new Error(insErr.message)
  }

  return { depletion_filas: filas.length }
}

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
    opexFijoRes, opexVarRes, formulasRes, preciosRefRes, preciosMensRes,
    provinciasRes, yacimientosRes, concesionesRes, ganRes, dycRes,
  ] = await Promise.all([
    db.from('pozos').select('*'),
    db.from('curvas_produccion').select('*'),
    db.from('intervenciones').select('*').or(`escenario_id.eq.${escenarioId},escenario_id.is.null`),
    db.from('concesion_participacion').select('*'),
    db.from('regalias').select('*'),
    db.from('opex_fijo').select('*'),
    db.from('opex_variable').select('*'),
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
    opexFijoRes, opexVarRes, formulasRes, preciosRefRes, preciosMensRes,
    provinciasRes, yacimientosRes, concesionesRes, ganRes, dycRes].find(r => r.error)
  if (err?.error) throw new Error(err.error.message)

  const pozos = pozosRes.data ?? []
  const curvas = curvasRes.data ?? []
  const intervenciones = (intervencionesRes.data ?? []).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const participaciones = participacionRes.data ?? []
  const regalias = regaliasRes.data ?? []
  const opexFijo = opexFijoRes.data ?? []
  const opexVar = opexVarRes.data ?? []
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
    return (ref.precio_usd * (1 - formula.dde_pct / 100)) / (formula.divisor || 1) - formula.descuento_adicional_usd
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

      const baseImponible = ingresoBruto - regaliaUsd - iibbUsd - dycUsd - opexFijoUsd - opexVarUsd - depreciacionUsd
      const impuestoGanancias = baseImponible > 0 ? baseImponible * alicuotaGanancias : 0
      const resultadoNeto = baseImponible - impuestoGanancias

      const part = vigente(participaciones.filter(p => p.concesion_id === concesion.id), fecha)
      const participacionPct = part?.porcentaje ?? 1
      const cashFlowNeto = resultadoNeto * participacionPct

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

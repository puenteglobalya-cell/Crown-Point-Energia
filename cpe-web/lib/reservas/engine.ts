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
// Horizonte: por defecto 20 años (240 meses) desde la fecha de alta de cada
// pozo, o hasta que el pozo se corte por límite económico / venza la concesión.
//
// El cálculo se hace en dos pasadas: la primera resuelve producción, CAPEX y
// amortización de cada pozo-mes; la segunda calcula la economía, y necesita
// saber cuántos pozos están activos por concesión y mes para poder prorratear
// el OPEX fijo de concesión (que es un costo por concesión, no por pozo).

const HORIZONTE_MESES_MAX = 240

// Factor de conversión gas → BOE: 6 Mcf = 1 BOE. Coincide con las cifras
// publicadas por la empresa (4.164 bbl/d + 3.451 Mcf/d = 4.739 boe/d).
const MCF_POR_BOE = 6

type Rango<T> = { fecha_desde: string; fecha_hasta: string | null } & T

// Devuelve el rango vigente a `fecha`. Ante rangos solapados o una tabla que
// llegó sin ordenar, gana el de `fecha_desde` más reciente (no el primero que
// aparezca en el array, que dependía del orden en que respondiera Postgres).
function vigente<T>(rangos: Rango<T>[], fecha: string): T | null {
  let mejor: Rango<T> | null = null
  for (const r of rangos) {
    if (r.fecha_desde > fecha) continue
    if (r.fecha_hasta !== null && fecha >= r.fecha_hasta) continue
    if (!mejor || r.fecha_desde > mejor.fecha_desde) mejor = r
  }
  return mejor
}

// El cashflow vive en una grilla mensual, así que cada período se representa
// con el primer día de su mes. Dos motivos: sumar meses desde un día 29-31
// se desbordaba al mes siguiente (31-ene + 1 mes daba 3-mar), y las fechas
// quedaban pegadas al día de alta del pozo, lo que hacía que un pozo dado de
// alta un día 15 nunca matcheara una fila de precio guardada el día 1.
function mesDesde(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 7) + '-01T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

// Clave de mes (YYYY-MM) para buscar precios sin depender de qué día del mes
// se haya usado al cargarlos.
const mesDe = (iso: string) => String(iso).slice(0, 7)

// ─── Lectura paginada ────────────────────────────────────────────────────
// PostgREST corta las respuestas en un máximo de filas (1000 por defecto en
// Supabase). Un `select('*')` pelado sobre curvas_produccion o
// cashflow_mensual devolvía datos truncados en silencio y el motor calculaba
// sobre una fracción del escenario. Todas las lecturas del motor pasan por
// acá y traen absolutamente todo, en páginas, con orden estable.
export type Paginable<T> = { range: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }

export async function traerTodo<T>(query: () => Paginable<T>): Promise<T[]> {
  const PAGINA = 1000
  const out: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await query().range(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    const chunk = data ?? []
    out.push(...chunk)
    if (chunk.length < PAGINA) break
  }
  return out
}

// Avisos que el motor junta mientras calcula, para que la UI pueda mostrar
// "faltan precios de gas en X" en lugar de devolver ingresos cero en silencio.
export type Diagnostico = { tipo: string; detalle: string; pozos_mes: number }

class Diagnosticos {
  private cuentas = new Map<string, { tipo: string; detalle: string; n: number }>()
  add(tipo: string, detalle: string) {
    const key = `${tipo}|${detalle}`
    const prev = this.cuentas.get(key)
    if (prev) prev.n++
    else this.cuentas.set(key, { tipo, detalle, n: 1 })
  }
  lista(): Diagnostico[] {
    return [...this.cuentas.values()]
      .sort((a, b) => b.n - a.n)
      .map(c => ({ tipo: c.tipo, detalle: c.detalle, pozos_mes: c.n }))
  }
}

// Datos crudos del escenario. Se separa de la simulación para poder correr el
// motor muchas veces sobre la misma carga — es lo que hace viable el barrido de
// fechas de inicio de campaña (probar 36 arranques sin volver a leer 16 tablas
// por cada uno).
export type ContextoEscenario = Awaited<ReturnType<typeof cargarContexto>>

export async function cargarContexto(escenarioId: number) {
  const db = createSupabaseServerAdminClient()
  const [
    pozos, curvas, intervencionesRaw, participaciones, regalias,
    opexFijo, opexVar, opexFijoPozo, formulas, preciosRef, preciosMens,
    provincias, yacimientos, concesiones, ganancias, debitosCreditos,
  ] = await Promise.all([
    traerTodo<any>(() => db.from('pozos').select('*').order('id')),
    traerTodo<any>(() => db.from('curvas_produccion').select('*').order('id')),
    traerTodo<any>(() => db.from('intervenciones').select('*').or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id')),
    traerTodo<any>(() => db.from('concesion_participacion').select('*').order('id')),
    traerTodo<any>(() => db.from('regalias').select('*').order('id')),
    traerTodo<any>(() => db.from('opex_fijo').select('*').order('id')),
    traerTodo<any>(() => db.from('opex_variable').select('*').order('id')),
    traerTodo<any>(() => db.from('opex_fijo_pozo').select('*').order('id')),
    traerTodo<any>(() => db.from('formulas_precio').select('*').order('id')),
    traerTodo<any>(() => db.from('precios_referencia').select('*').order('id')),
    traerTodo<any>(() => db.from('precios_mensuales').select('*').order('id')),
    traerTodo<any>(() => db.from('provincias').select('*').order('id')),
    traerTodo<any>(() => db.from('yacimientos').select('*').order('id')),
    traerTodo<any>(() => db.from('concesiones').select('*').order('id')),
    traerTodo<any>(() => db.from('parametros_impuesto_ganancias').select('*').eq('nivel', 'consolidado').order('id')),
    traerTodo<any>(() => db.from('parametros_debitos_creditos').select('*').order('id')),
  ])
  return {
    pozos, curvas, intervencionesRaw, participaciones, regalias,
    opexFijo, opexVar, opexFijoPozo, formulas, preciosRef, preciosMens,
    provincias, yacimientos, concesiones, ganancias, debitosCreditos,
  }
}

// Multiplicadores para análisis de sensibilidad. 1 = sin cambio. Se aplican
// en el punto de uso y no sobre los datos cargados, así el barrido no depende
// de reconstruir el contexto ni de cómo esté armada cada fórmula de precio.
export type Multiplicadores = {
  precioPetroleo?: number; precioGas?: number
  opex?: number; capex?: number; produccion?: number
}

export async function calcularEscenario(
  escenarioId: number,
  horizonteMeses = HORIZONTE_MESES_MAX,
  opciones: { contexto?: ContextoEscenario; persistir?: boolean; multiplicadores?: Multiplicadores } = {},
) {
  const mult = {
    precioPetroleo: 1, precioGas: 1, opex: 1, capex: 1, produccion: 1,
    ...(opciones.multiplicadores ?? {}),
  }
  const db = createSupabaseServerAdminClient()
  const horizonte = Math.max(1, Math.min(horizonteMeses, HORIZONTE_MESES_MAX))
  const diag = new Diagnosticos()

  const {
    pozos, curvas, intervencionesRaw, participaciones, regalias,
    opexFijo, opexVar, opexFijoPozo, formulas, preciosRef, preciosMens,
    provincias, yacimientos, concesiones, ganancias, debitosCreditos,
  } = opciones.contexto ?? await cargarContexto(escenarioId)

  const intervenciones = [...intervencionesRaw].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))

  // ─── Índices ───────────────────────────────────────────────────────────
  // Antes cada mes de cada pozo hacía un .find() lineal sobre la tabla
  // completa de curvas (240 × pozos × filas de curva). Con índices el motor
  // pasa a ser lineal en filas generadas.
  const concesionPorId = new Map<number, any>(concesiones.map(c => [c.id, c]))
  const yacimientoPorId = new Map<number, any>(yacimientos.map(y => [y.id, y]))
  const provinciaPorId = new Map<number, any>(provincias.map(p => [p.id, p]))

  const curvaPorTipo = new Map<string, any>()
  const curvaPorPozo = new Map<string, any>()
  for (const c of curvas) {
    if (c.pozo_tipo_id != null) curvaPorTipo.set(`${c.pozo_tipo_id}|${c.mes_offset}`, c)
    else if (c.pozo_id != null) curvaPorPozo.set(`${c.pozo_id}|${c.mes_offset}`, c)
  }

  const intervPorPozo = new Map<number, any[]>()
  for (const i of intervenciones) {
    const arr = intervPorPozo.get(i.pozo_id) ?? []
    arr.push(i)
    intervPorPozo.set(i.pozo_id, arr)
  }

  const porConcesion = <T extends { concesion_id: number }>(rows: T[]) => {
    const m = new Map<number, T[]>()
    for (const r of rows) {
      const arr = m.get(r.concesion_id) ?? []
      arr.push(r)
      m.set(r.concesion_id, arr)
    }
    return m
  }
  const regaliasPorConc = porConcesion(regalias)
  const partPorConc = porConcesion(participaciones)
  const opexFijoPorConc = porConcesion(opexFijo)
  const opexFijoPozoPorConc = porConcesion(opexFijoPozo)
  const opexVarPorYac = new Map<number, any[]>()
  for (const o of opexVar) {
    const arr = opexVarPorYac.get(o.yacimiento_id) ?? []
    arr.push(o)
    opexVarPorYac.set(o.yacimiento_id, arr)
  }

  const alicuotaGanancias = vigente(ganancias, new Date().toISOString().slice(0, 10))?.alicuota
    ?? ganancias[ganancias.length - 1]?.alicuota ?? 0.35
  const alicuotaDyC = vigente(debitosCreditos, new Date().toISOString().slice(0, 10))?.alicuota
    ?? debitosCreditos[debitosCreditos.length - 1]?.alicuota ?? 0.006

  const precioMensPorClave = new Map<string, any>(
    preciosMens.map(p => [`${p.yacimiento_id}|${p.producto}|${mesDe(p.fecha)}`, p]),
  )
  const precioRefPorClave = new Map<string, any>(
    preciosRef.map(r => [`${r.referencia}|${mesDe(r.fecha)}`, r]),
  )
  const formulasPorYacProd = new Map<string, any[]>()
  for (const f of formulas) {
    const key = `${f.yacimiento_id}|${f.producto}`
    const arr = formulasPorYacProd.get(key) ?? []
    arr.push(f)
    formulasPorYacProd.set(key, arr)
  }

  function precioEn(yacimiento: any, producto: 'petroleo' | 'gas', fecha: string): number {
    const directo = precioMensPorClave.get(`${yacimiento.id}|${producto}|${mesDe(fecha)}`)
    if (directo) return directo.precio_usd

    const formula = vigente(formulasPorYacProd.get(`${yacimiento.id}|${producto}`) ?? [], fecha)
    if (!formula) {
      diag.add('precio_sin_formula', `${yacimiento.nombre}: no hay precio mensual ni fórmula de precio para ${producto} — se toma 0`)
      return 0
    }
    const ref = precioRefPorClave.get(`${formula.referencia}|${mesDe(fecha)}`)
    if (!ref) {
      diag.add('precio_sin_referencia', `${yacimiento.nombre}: falta la cotización "${formula.referencia}" de ${producto} en ${fecha.slice(0, 7)} — se toma 0`)
      return 0
    }
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

  // ─── Pasada 1: producción, CAPEX y amortización por pozo-mes ───────────
  type Registro = {
    pozo: any; concesion: any; yacimiento: any; provincia: any
    fecha: string; bbl: number; mcf: number; capexUsd: number; depreciacionUsd: number
  }
  const registrosPorPozo = new Map<number, Registro[]>()

  for (const pozo of pozos) {
    const concesion = concesionPorId.get(pozo.concesion_id)
    if (!concesion) {
      diag.add('pozo_sin_concesion', `Pozo "${pozo.nombre}" apunta a una concesión que no existe — se excluye del cálculo`)
      continue
    }
    const yacimiento = yacimientoPorId.get(concesion.yacimiento_id)
    if (!yacimiento) {
      diag.add('concesion_sin_yacimiento', `La concesión "${concesion.nombre}" no tiene yacimiento — sus pozos se excluyen`)
      continue
    }
    const provincia = provinciaPorId.get(yacimiento.provincia_id) ?? null
    if (!provincia) diag.add('yacimiento_sin_provincia', `${yacimiento.nombre}: sin provincia asignada — IIBB se calcula en 0`)

    const intervDelPozo = intervPorPozo.get(pozo.id) ?? []
    // Intervenciones que reemplazan la curva, de la más nueva a la más vieja
    const intervConCurvaDesc = intervDelPozo.filter(i => i.pozo_tipo_id !== null).reverse()

    let fechaCorte: string | null = pozo.fecha_baja ?? null
    if (concesion.fecha_vencimiento && (!fechaCorte || concesion.fecha_vencimiento < fechaCorte)) {
      fechaCorte = concesion.fecha_vencimiento
    }

    const registros: Registro[] = []
    for (let m = 0; m < horizonte; m++) {
      const fecha = mesDesde(pozo.fecha_alta, m)
      if (fechaCorte && fecha >= fechaCorte) break

      const interv = intervConCurvaDesc.find(i => i.fecha <= fecha)
      let bbl = 0, mcf = 0
      if (interv?.pozo_tipo_id) {
        const c = curvaPorTipo.get(`${interv.pozo_tipo_id}|${monthsBetween(interv.fecha, fecha)}`)
        bbl = c?.bbl_petroleo ?? 0
        mcf = c?.mcf_gas ?? 0
      } else {
        const c = curvaPorPozo.get(`${pozo.id}|${m}`)
        bbl = c?.bbl_petroleo ?? 0
        mcf = c?.mcf_gas ?? 0
      }
      bbl *= mult.produccion
      mcf *= mult.produccion
      if (m === 0 && bbl === 0 && mcf === 0 && !interv) {
        diag.add('pozo_sin_curva', `Pozo "${pozo.nombre}": no hay curva de producción cargada para su primer mes`)
      }

      // CAPEX del mes y amortización de intervenciones con vida útil vigente
      let capexUsd = 0, depreciacionUsd = 0
      for (const i of intervDelPozo) {
        // El CAPEX se imputa en el mes en que arranca la perforación, no en el
        // de la primera producción: en una campaña con equipos hay semanas o
        // meses entre una cosa y la otra, y el desembolso es al perforar.
        // La comparación es por mes (no por fecha exacta) porque el cashflow
        // vive en una grilla mensual: comparar con `===` contra el día 1 del
        // mes hacía que una intervención cargada un día 15 nunca matcheara y
        // su CAPEX desapareciera del flujo.
        const fechaCapex = i.fecha_inicio_perforacion ?? i.fecha
        const capexAjustado = i.capex_usd * mult.capex
        if (mesDe(fechaCapex) === mesDe(fecha)) capexUsd += capexAjustado
        if (i.vida_util_meses && i.vida_util_meses > 0) {
          const mesesDesde = monthsBetween(fechaCapex, fecha)
          if (mesesDesde >= 0 && mesesDesde < i.vida_util_meses) {
            depreciacionUsd += capexAjustado / i.vida_util_meses
          }
        }
      }

      // Un mes sin producción ni movimiento de CAPEX no genera fila. Antes se
      // salteaba con solo mirar la producción, y eso hacía desaparecer del
      // cashflow el CAPEX de una intervención hecha sobre un pozo parado.
      if (m > 0 && bbl === 0 && mcf === 0 && capexUsd === 0 && depreciacionUsd === 0) continue

      registros.push({ pozo, concesion, yacimiento, provincia, fecha, bbl, mcf, capexUsd, depreciacionUsd })
    }
    if (registros.length > 0) registrosPorPozo.set(pozo.id, registros)
  }

  // Pozos activos por concesión y mes — para prorratear el OPEX fijo de
  // concesión. Antes se le cobraba el monto completo a cada pozo, así que una
  // concesión con 30 pozos contabilizaba 30 veces su costo fijo mensual.
  const activosPorConcesionMes = new Map<string, number>()
  for (const registros of registrosPorPozo.values()) {
    for (const r of registros) {
      const key = `${r.concesion.id}|${r.fecha}`
      activosPorConcesionMes.set(key, (activosPorConcesionMes.get(key) ?? 0) + 1)
    }
  }

  // ─── Pasada 2: economía por pozo-mes ──────────────────────────────────
  const filas: Record<string, unknown>[] = []

  for (const registros of registrosPorPozo.values()) {
    let mesesNegativosSeguidos = 0
    const primeraFilaDelPozo = filas.length

    for (const r of registros) {
      const { pozo, concesion, yacimiento, provincia, fecha, bbl, mcf, capexUsd, depreciacionUsd } = r

      const precioOil = precioEn(yacimiento, 'petroleo', fecha) * mult.precioPetroleo
      const precioGas = precioEn(yacimiento, 'gas', fecha) * mult.precioGas
      const ingresoBruto = bbl * precioOil + mcf * precioGas

      const regalia = vigente(regaliasPorConc.get(concesion.id) ?? [], fecha)
      if (!regalia) diag.add('sin_regalias', `Concesión "${concesion.nombre}": no hay regalía vigente en ${fecha.slice(0, 7)} — se calcula 0%`)
      const regaliaUsd = ingresoBruto * (regalia?.porcentaje ?? 0)

      const iibbUsd = ingresoBruto * (provincia?.alicuota_iibb ?? 0)
      const dycUsd = ingresoBruto * alicuotaDyC

      const fijo = vigente(opexFijoPorConc.get(concesion.id) ?? [], fecha)
      const activos = activosPorConcesionMes.get(`${concesion.id}|${fecha}`) || 1
      const opexFijoUsd = ((fijo?.monto_usd_mes ?? 0) / activos) * mult.opex
      const variable = vigente(opexVarPorYac.get(yacimiento.id) ?? [], fecha)
      const boe = bbl + mcf / MCF_POR_BOE
      const opexVarUsd = boe * (variable?.usd_por_boe ?? 0) * mult.opex
      // Fijo por pozo: se carga completo a cada pozo activo (a diferencia del
      // opex_fijo de concesión, que sí se prorratea entre los pozos activos)
      const fijoPozo = vigente(opexFijoPozoPorConc.get(concesion.id) ?? [], fecha)
      const opexFijoPozoUsd = (fijoPozo?.usd_mes_pozo ?? 0) * mult.opex

      const baseImponible = ingresoBruto - regaliaUsd - iibbUsd - dycUsd - opexFijoUsd - opexVarUsd - opexFijoPozoUsd - depreciacionUsd
      const impuestoGanancias = baseImponible > 0 ? baseImponible * alicuotaGanancias : 0
      const resultadoNeto = baseImponible - impuestoGanancias

      const part = vigente(partPorConc.get(concesion.id) ?? [], fecha)
      if (!part) diag.add('sin_participacion', `Concesión "${concesion.nombre}": no hay participación vigente en ${fecha.slice(0, 7)} — se asume 100%`)
      const participacionPct = part?.porcentaje ?? 1
      // Cash flow real: la amortización es no-cash (se vuelve a sumar) y el
      // CAPEX sí es una salida de caja real en el mes en que ocurre.
      const cashFlowNeto = (resultadoNeto + depreciacionUsd - capexUsd) * participacionPct

      // Límite económico: dos meses consecutivos en los que el pozo produce y
      // no cubre sus costos operativos. Se mide sobre el flujo OPERATIVO (sin
      // CAPEX): con el flujo total, el desembolso de una perforación o un
      // workover daba dos meses negativos y mataba al pozo recién intervenido.
      const flujoOperativo = resultadoNeto + depreciacionUsd
      const produce = bbl > 0 || mcf > 0
      if (produce && flujoOperativo < 0) mesesNegativosSeguidos++
      else if (produce) mesesNegativosSeguidos = 0
      const cortado = mesesNegativosSeguidos >= 2

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
        economicamente_activo: !cortado,
      })

      if (cortado) {
        diag.add('corte_limite_economico', `Pozo "${pozo.nombre}": cortado por límite económico en ${fecha.slice(0, 7)}`)
        break
      }
    }

    // Costo de abandono y remediación (ARO) al cierre de la vida económica.
    // NI 51-101 pide informar el valor de las reservas neto de estos costos;
    // antes el pozo simplemente dejaba de generar filas y el cierre salía
    // gratis, lo que sobrestimaba el VAN. Se lee de forma defensiva para que
    // el motor funcione con o sin la migración 20260801_reservas_abandono.sql.
    const ultima = filas[filas.length - 1]
    if (ultima && filas.length > primeraFilaDelPozo) {
      const costoAbandono = Number(registros[0].pozo.costo_abandono_usd ?? 0)
      if (costoAbandono > 0) {
        const part = ultima.participacion_pct as number
        // Se suma dentro de capex_usd en lugar de una columna propia: todas
        // las filas de un insert de PostgREST tienen que tener las mismas
        // claves, así que una columna que sólo aparece en la última fila de
        // cada pozo rompería la carga. Queda como desembolso de capital del
        // mes de cierre (afecta también el CAPEX total del Pareto).
        ultima.capex_usd = (ultima.capex_usd as number) + costoAbandono
        ultima.cash_flow_neto_usd = (ultima.cash_flow_neto_usd as number) - costoAbandono * part
        diag.add('abandono_imputado', `Pozo "${registros[0].pozo.nombre}": costo de abandono de US$ ${costoAbandono.toLocaleString('es-AR')} imputado en ${String(ultima.fecha).slice(0, 7)}`)
      }
    }
  }

  // El barrido de fechas corre el motor decenas de veces y no necesita
  // escribir nada: sólo el VAN de cada alternativa.
  if (opciones.persistir !== false) {
    await db.from('cashflow_mensual').delete().eq('escenario_id', escenarioId)
    if (filas.length > 0) {
      const CHUNK = 500
      for (let i = 0; i < filas.length; i += CHUNK) {
        const { error } = await db.from('cashflow_mensual').insert(filas.slice(i, i + CHUNK))
        if (error) throw new Error(error.message)
      }
    }
  }

  return { filas: filas.length, pozos: registrosPorPozo.size, diagnosticos: diag.lista(), cashflow: filas }
}

function monthsBetween(desdeIso: string, fechaIso: string): number {
  const a = new Date(desdeIso + 'T00:00:00Z')
  const b = new Date(fechaIso + 'T00:00:00Z')
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
}

// ─── VAN a las tasas que exige NI 51-101 ─────────────────────────────────
// Crown Point Energy Inc. reporta reservas bajo NI 51-101 (CSA) — así lo
// declara el sitio y así certifica Sproule ERCE. El Form 51-101F1 pide el
// valor presente del future net revenue sin descontar y a 5%, 10%, 15% y 20%,
// antes y después de deducir el impuesto a las ganancias. El simulador
// calculaba una sola tasa y sólo después de impuestos.
export const TASAS_NI_51_101 = [0, 0.05, 0.10, 0.15, 0.20] as const

export type NpvPorTasa = { tasa: number; npv_antes_impuestos_usd: number; npv_despues_impuestos_usd: number }

export async function calcularNpvPorTasa(escenarioId: number): Promise<NpvPorTasa[]> {
  const db = createSupabaseServerAdminClient()
  const filas = await traerTodo<any>(() => db
    .from('cashflow_mensual')
    .select('fecha, cash_flow_neto_usd, resultado_antes_ganancias_usd, depreciacion_usd, capex_usd, participacion_pct')
    .eq('escenario_id', escenarioId)
    .order('fecha'))

  if (filas.length === 0) return []
  const fechaBase = filas[0].fecha

  // Flujo antes de impuestos: se reconstruye de las columnas ya guardadas
  // (base imponible + amortización no-cash − CAPEX) × participación.
  const antes = filas.map(f => ({
    fecha: f.fecha,
    cash_flow_neto_usd: (f.resultado_antes_ganancias_usd + f.depreciacion_usd - f.capex_usd) * f.participacion_pct,
  }))

  return TASAS_NI_51_101.map(tasa => ({
    tasa,
    npv_antes_impuestos_usd: calcularNPV(antes, tasa, fechaBase),
    npv_despues_impuestos_usd: calcularNPV(filas, tasa, fechaBase),
  }))
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
//
// Base: NETO A CPE. Todos los inputs del simulador (curvas, CAPEX, OPEX,
// precios) se cargan al 100% del proyecto, y el motor los afecta por la
// participación vigente en cada mes — incluidos los volúmenes. Como la
// participación cambia en el tiempo, cada mes se pondera con la suya y recién
// después se suma el año; no sirve aplicar un porcentaje promedio al total.
//
// cashflow_mensual sigue guardando las líneas al 100% y la participación del
// mes en una columna aparte: es la pista de auditoría del proyecto completo, y
// de ahí sale esta agregación.
export async function calcularAgregadosAnuales(escenarioId: number) {
  const db = createSupabaseServerAdminClient()

  const [cashflows, pozos, concesiones] = await Promise.all([
    traerTodo<any>(() => db.from('cashflow_mensual').select('*').eq('escenario_id', escenarioId).order('id')),
    traerTodo<any>(() => db.from('pozos').select('id, concesion_id').order('id')),
    traerTodo<any>(() => db.from('concesiones').select('id, yacimiento_id').order('id')),
  ])

  const concesionPorId = new Map<number, any>(concesiones.map(c => [c.id, c]))
  const yacimientoPorPozo = new Map<number, number | null>(
    pozos.map(p => [p.id, concesionPorId.get(p.concesion_id)?.yacimiento_id ?? null]),
  )

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

  function acumular(acc: Acc, cf: any) {
    // Participación del mes: todas las líneas se netean con la misma, así que
    // la tabla queda internamente consistente (antes mezclaba EBITDA al 100%
    // con un resultado neto ya ponderado).
    const w = cf.participacion_pct ?? 1
    acc.produccion_petroleo_bbl += cf.bbl_petroleo * w
    acc.produccion_gas_mcf += cf.mcf_gas * w
    acc.ingresos_usd += cf.ingreso_bruto_usd * w
    acc.regalias_usd += cf.regalias_usd * w
    acc.opex_usd += (cf.opex_fijo_usd + cf.opex_variable_usd + cf.opex_fijo_pozo_usd) * w
    acc.depreciacion_usd += cf.depreciacion_usd * w
    acc.resultado_antes_ganancias_usd += cf.resultado_antes_ganancias_usd * w
    acc.impuesto_ganancias_usd += cf.impuesto_ganancias_usd * w
    acc.resultado_neto_usd += cf.resultado_neto_usd * w
  }

  const porYacimiento = new Map<string, Acc>() // key = `${yacimientoId}_${anio}`
  const porConsolidado = new Map<number, Acc>() // key = anio

  for (const cf of cashflows) {
    const anio = Number(String(cf.fecha).slice(0, 4))
    const yacId = yacimientoPorPozo.get(cf.pozo_id) ?? null

    const accYac = porYacimiento.get(`${yacId ?? 'null'}_${anio}`) ?? empty()
    acumular(accYac, cf)
    porYacimiento.set(`${yacId ?? 'null'}_${anio}`, accYac)

    const accCons = porConsolidado.get(anio) ?? empty()
    acumular(accCons, cf)
    porConsolidado.set(anio, accCons)
  }

  function fila(yacimientoId: number | null, anio: number, acc: Acc) {
    const boe = acc.produccion_petroleo_bbl + acc.produccion_gas_mcf / MCF_POR_BOE
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
    const sep = key.lastIndexOf('_')
    const yacRaw = key.slice(0, sep)
    if (yacRaw === 'null') continue
    filas.push(fila(Number(yacRaw), Number(key.slice(sep + 1)), acc))
  }
  // Filas consolidado (yacimiento_id = null) — siempre suma TODOS los pozos del escenario
  for (const [anio, acc] of porConsolidado) {
    filas.push(fila(null, anio, acc))
  }

  await db.from('resultados_escenario_anual').delete().eq('escenario_id', escenarioId)
  if (filas.length > 0) {
    const CHUNK = 500
    for (let i = 0; i < filas.length; i += CHUNK) {
      const { error } = await db.from('resultados_escenario_anual').insert(filas.slice(i, i + CHUNK))
      if (error) throw new Error(error.message)
    }
  }

  return { anios: filas.length }
}

// ─── Métricas del escenario: NPV, IRR, payback ───────────────────────────
function irrAnual(cashflowsAnuales: number[]): number | null {
  // Bisección entre -99% y 1000% — robusto para series con un único cambio
  // de signo (CAPEX inicial negativo, luego flujo positivo), que es el caso
  // típico de un pozo/yacimiento.
  const npvAt = (r: number) => cashflowsAnuales.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0)
  let lo = -0.99, hi = 10
  let vLo = npvAt(lo)
  if (vLo * npvAt(hi) > 0) return null // no hay cambio de signo detectable en el rango
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const v = npvAt(mid)
    if (Math.abs(v) < 1) return mid
    if (vLo * v < 0) hi = mid
    else { lo = mid; vLo = v }
  }
  return (lo + hi) / 2
}

export async function calcularMetricasEscenario(escenarioId: number, tasaAnual: number, horizonteAnios: number) {
  const db = createSupabaseServerAdminClient()
  const cashflows = await traerTodo<{ fecha: string; cash_flow_neto_usd: number }>(() => db
    .from('cashflow_mensual')
    .select('fecha, cash_flow_neto_usd')
    .eq('escenario_id', escenarioId)
    .order('fecha'))

  const fechaBase = cashflows[0]?.fecha ?? new Date().toISOString().slice(0, 10)
  const npv = calcularNPV(cashflows, tasaAnual, fechaBase)
  const totalCashflow = cashflows.reduce((s, c) => s + c.cash_flow_neto_usd, 0)

  // Serie anual para IRR y payback
  const porAnio = new Map<number, number>()
  for (const cf of cashflows) {
    const anioIdx = Math.floor(monthsBetween(fechaBase, cf.fecha) / 12)
    porAnio.set(anioIdx, (porAnio.get(anioIdx) ?? 0) + cf.cash_flow_neto_usd)
  }
  const maxAnio = Math.max(0, ...porAnio.keys())
  const serieAnual = Array.from({ length: maxAnio + 1 }, (_, i) => porAnio.get(i) ?? 0)

  const irr = irrAnual(serieAnual)

  let acumulado = 0
  let paybackAnios: number | null = null
  for (let i = 0; i < serieAnual.length; i++) {
    const previo = acumulado
    acumulado += serieAnual[i]
    if (acumulado >= 0) {
      // Fracción del año i en la que el acumulado cruza cero. Si el primer año
      // ya es positivo (proyecto sin desembolso inicial), el payback es la
      // fracción de ese año, no 0.
      const fraccion = serieAnual[i] !== 0 ? Math.min(1, Math.max(0, -previo / serieAnual[i])) : 0
      paybackAnios = i + fraccion
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

  // Delete + insert en lugar de upsert: no depende de que exista un unique
  // index exacto sobre (escenario_id, tasa_descuento, horizonte_anios).
  await db.from('escenario_metricas').delete()
    .eq('escenario_id', escenarioId)
    .eq('tasa_descuento', tasaAnual)
    .eq('horizonte_anios', horizonteAnios)
  const { error: insErr } = await db.from('escenario_metricas').insert(row)
  if (insErr) throw new Error(insErr.message)

  return { ...row, total_cashflow: totalCashflow }
}

// ─── Roll-forward de depleción de reservas ───────────────────────────────
// Opening (reserve report) → Depletion (producción del año, del motor) →
// Closing, por yacimiento/categoría/año. Requiere haber corrido
// calcularAgregadosAnuales() antes para tener resultados_escenario_anual.
//
// P1/P2/P3 son categorías INCREMENTALES (Probadas / Probables / Posibles),
// definición confirmada por el cliente. Por eso la producción de cada año
// cascadea: agota primero las probadas y sólo el excedente pasa a probables y
// después a posibles. El factor de certeza pondera el saldo de cierre; no se
// aplica antes de depletar, porque la producción es física.
export type AperturaCategoria = { categoria: string; boe: number; anioBase: number; factor: number }
export type MovimientoReservas = {
  categoria: string; anio: number; apertura: number; depletion: number
  cierre: number; cierreRiesgo: number; factor: number; excedente: number
}

// Roll-forward con cascada entre categorías incrementales. `aperturas` viene
// ordenado de más cierta a menos cierta (P1, P2, P3): la producción de cada
// año agota la primera y sólo el excedente pasa a la siguiente. `excedente`
// queda cargado en el último movimiento del año e indica cuánta producción no
// tuvo reservas contra las que imputarse.
export function rollForwardIncremental(
  aperturas: AperturaCategoria[],
  produccionPorAnio: { anio: number; boe: number }[],
): MovimientoReservas[] {
  if (aperturas.length === 0) return []
  const saldo = new Map(aperturas.map(a => [a.categoria, a.boe]))
  const anioInicio = Math.min(...aperturas.map(a => a.anioBase))
  const out: MovimientoReservas[] = []

  for (const { anio, boe: produccion } of [...produccionPorAnio].sort((a, b) => a.anio - b.anio)) {
    if (anio < anioInicio) continue
    let restante = Math.max(produccion, 0)
    const delAnio: MovimientoReservas[] = []

    for (const a of aperturas) {
      if (anio < a.anioBase) continue
      const apertura = saldo.get(a.categoria) ?? 0
      const depletion = Math.min(restante, Math.max(apertura, 0))
      const cierre = Math.max(apertura - depletion, 0)
      restante -= depletion
      saldo.set(a.categoria, cierre)
      delAnio.push({
        categoria: a.categoria, anio, apertura, depletion, cierre,
        cierreRiesgo: cierre * a.factor, factor: a.factor, excedente: 0,
      })
    }

    if (delAnio.length > 0 && restante > 0) delAnio[delAnio.length - 1].excedente = restante
    out.push(...delAnio)
  }

  return out
}

export async function calcularDepletionReservas(escenarioId: number) {
  const db = createSupabaseServerAdminClient()
  const diag = new Diagnosticos()

  // La producción se toma de cashflow_mensual, que está al 100%. Las reservas
  // son un volumen físico en el subsuelo, así que el roll-forward va contra el
  // volumen del proyecto completo y no contra la producción neta a CPE (que es
  // lo que informa resultados_escenario_anual).
  const [reservas, cashflows, certezas, yacimientos, pozosRef, concesionesRef] = await Promise.all([
    traerTodo<any>(() => db.from('reservas_anuales').select('*').or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id')),
    traerTodo<any>(() => db.from('cashflow_mensual').select('pozo_id, fecha, bbl_petroleo, mcf_gas').eq('escenario_id', escenarioId).order('id')),
    traerTodo<any>(() => db.from('parametros_certeza_reservas').select('*').order('id')),
    traerTodo<any>(() => db.from('yacimientos').select('id, nombre').order('id')),
    traerTodo<any>(() => db.from('pozos').select('id, concesion_id').order('id')),
    traerTodo<any>(() => db.from('concesiones').select('id, yacimiento_id').order('id')),
  ])

  const concPorId = new Map<number, any>(concesionesRef.map(c => [c.id, c]))
  const yacDePozo = new Map<number, number | null>(
    pozosRef.map(p => [p.id, concPorId.get(p.concesion_id)?.yacimiento_id ?? null]),
  )
  // Producción física por yacimiento y año, en BOE
  const produccionYacAnio = new Map<string, number>()
  for (const cf of cashflows) {
    const yac = yacDePozo.get(cf.pozo_id)
    if (yac == null) continue
    const key = `${yac}|${String(cf.fecha).slice(0, 4)}`
    produccionYacAnio.set(key, (produccionYacAnio.get(key) ?? 0) + cf.bbl_petroleo + cf.mcf_gas / MCF_POR_BOE)
  }

  // Las columnas cierre_riesgo_boe / factor_certeza vienen de la migración
  // 20260801_reservas_certeza_incremental.sql. Se comprueba una vez si están
  // presentes: si la migración no corrió todavía, se omiten en el insert en
  // lugar de hacer fallar todo el cálculo.
  const { error: sinColumnas } = await db.from('reservas_depletion_anual').select('cierre_riesgo_boe').limit(1)
  const guardarRiesgo = !sinColumnas
  if (!guardarRiesgo) {
    diag.add('migracion_pendiente', 'Falta correr 20260801_reservas_certeza_incremental.sql — el saldo ponderado por certeza no se guarda todavía')
  }

  const nombreYac = new Map<number, string>(yacimientos.map(y => [y.id, y.nombre]))
  const yacimientoNombre = (id: number) => nombreYac.get(id) ?? `Yacimiento #${id}`

  const yacimientoIds = Array.from(new Set(reservas.map(r => r.yacimiento_id)))
  const categorias = ['P1', 'P2', 'P3'] as const

  const filas: Record<string, unknown>[] = []

  for (const yacId of yacimientoIds) {
    const produccionPorAnio = [...produccionYacAnio.entries()]
      .filter(([k]) => Number(k.split('|')[0]) === yacId)
      .map(([k, boe]) => ({ anio: Number(k.split('|')[1]), boe }))
      .sort((a, b) => a.anio - b.anio)

    // Saldo vivo de cada categoría. Volúmenes FÍSICOS, sin ponderar por
    // certeza: la producción es física y no sabe de factores de riesgo. El
    // factor se aplica al final, sobre el saldo, para el número ponderado.
    const saldo = new Map<string, number>()
    const anioBaseDe = new Map<string, number>()
    const factorDe = new Map<string, number>()

    for (const categoria of categorias) {
      // Apertura base: el reserve report más reciente para este yacimiento/categoría
      const reporte = reservas
        .filter(r => r.yacimiento_id === yacId && r.categoria === categoria)
        .sort((a, b) => String(b.fecha_corte).localeCompare(String(a.fecha_corte)))[0]
      if (!reporte) continue
      saldo.set(categoria, reporte.reservas_boe)
      anioBaseDe.set(categoria, reporte.anio)
      // Factor de certeza: override del registro, o el parámetro vigente de la
      // categoría a la fecha de corte del reporte (P1=100%, P2=50%, P3=20% por
      // defecto).
      factorDe.set(categoria, reporte.factor_certeza_override
        ?? vigente(certezas.filter(c => c.categoria === categoria), String(reporte.fecha_corte))?.factor
        ?? 1)
    }
    if (saldo.size === 0) continue

    const movimientos = rollForwardIncremental(
      categorias.filter(c => saldo.has(c)).map(c => ({
        categoria: c,
        boe: saldo.get(c) ?? 0,
        anioBase: anioBaseDe.get(c) ?? 0,
        factor: factorDe.get(c) ?? 1,
      })),
      produccionPorAnio,
    )

    for (const m of movimientos) {
      filas.push({
        escenario_id: escenarioId,
        yacimiento_id: yacId,
        categoria: m.categoria,
        anio: m.anio,
        apertura_boe: m.apertura,
        depletion_boe: m.depletion,
        cierre_boe: m.cierre,
        // Saldo ponderado por el grado de certeza de la categoría. Se deriva
        // del cierre físico en lugar de arrastrarse año a año: ponderar la
        // apertura y después depletar hacía que la relación con el volumen
        // físico se fuera desviando en cada período.
        ...(guardarRiesgo ? { cierre_riesgo_boe: m.cierreRiesgo, factor_certeza: m.factor } : {}),
      })
    }
    for (const e of movimientos.filter(m => m.excedente > 0)) {
      diag.add('produccion_excede_reservas', `${yacimientoNombre(yacId)}: la producción de ${e.anio} supera en ${Math.round(e.excedente).toLocaleString('es-AR')} BOE las reservas P1+P2+P3 disponibles`)
    }
  }

  await db.from('reservas_depletion_anual').delete().eq('escenario_id', escenarioId)
  if (filas.length > 0) {
    const CHUNK = 500
    for (let i = 0; i < filas.length; i += CHUNK) {
      const { error: insErr } = await db.from('reservas_depletion_anual').insert(filas.slice(i, i + CHUNK))
      if (insErr) throw new Error(insErr.message)
    }
  }

  return { depletion_filas: filas.length, diagnosticos_reservas: diag.lista() }
}

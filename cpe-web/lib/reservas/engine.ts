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

export const HORIZONTE_MESES_MAX = 240

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
    pozos, pozosTipo, curvas, intervencionesRaw, participaciones, regalias,
    opexFijo, opexVar, opexFijoPozo, formulas, preciosRef, preciosMens,
    provincias, yacimientos, concesiones, ganancias, debitosCreditos,
  ] = await Promise.all([
    traerTodo<any>(() => db.from('pozos').select('*').order('id')),
    traerTodo<any>(() => db.from('pozos_tipo').select('*').order('id')),
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

  // Base de reservas para la amortización por unidades de producción.
  const reservasAnuales = await traerTodo<any>(() => db.from('reservas_anuales').select('*')
    .or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id')).catch(() => [] as any[])

  // Price deck del escenario. Tablas opcionales: sin la migración
  // 20260801_price_decks.sql el motor sigue resolviendo contra
  // precios_referencia como hasta ahora.
  const { data: escenarioRow } = await db.from('escenarios').select('*').eq('id', escenarioId).maybeSingle()
  const deckId = (escenarioRow as any)?.price_deck_id ?? null
  const [deckRows, deckPuntos] = deckId == null ? [[] as any[], [] as any[]] : await Promise.all([
    traerTodo<any>(() => db.from('price_decks').select('*').eq('id', deckId).order('id')).catch(() => [] as any[]),
    traerTodo<any>(() => db.from('price_deck_puntos').select('*').eq('price_deck_id', deckId).order('id')).catch(() => [] as any[]),
  ])

  return {
    pozos, pozosTipo, curvas, intervencionesRaw, participaciones, regalias,
    opexFijo, opexVar, opexFijoPozo, formulas, preciosRef, preciosMens,
    provincias, yacimientos, concesiones, ganancias, debitosCreditos,
    deck: (deckRows[0] ?? null) as any, deckPuntos, reservasAnuales,
    metodoAmortizacion: String((escenarioRow as any)?.metodo_amortizacion ?? 'unidades_produccion'),
  }
}

// ─── Amortización por unidades de producción ─────────────────────────────
// Método estándar del sector para petróleo y gas: la inversión se consume al
// ritmo al que se produce, no por el paso del tiempo.
//
//   tasa      = producción del mes / reservas remanentes al inicio del mes
//   cuota     = valor residual x tasa
//   residual -= cuota   ·   reservas -= producción
//
// Se expone aparte para poder verificarla: es la pieza que decide cuánto
// impuesto a las ganancias paga el proyecto en cada mes.
export type MesUoP = { fecha: string; capex: number; produccionBoe: number }
export type CuotaUoP = { fecha: string; capexDelMes: number; residualInicial: number; produccionBoe: number; reservasInicio: number; tasa: number; cuota: number; residualFinal: number; reservasFinal: number }

export function amortizacionUnidadesProduccion(reservasIniciales: number, meses: MesUoP[]): CuotaUoP[] {
  let residual = 0
  let reservas = Math.max(reservasIniciales, 0)
  const out: CuotaUoP[] = []

  for (const m of [...meses].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const residualInicial = residual + m.capex
    const reservasInicio = reservas
    const prod = Math.max(m.produccionBoe, 0)
    // La tasa se topea en 1: producir más que las reservas remanentes amortiza
    // todo lo que queda, no más que eso.
    const tasa = reservasInicio > 0 ? Math.min(prod / reservasInicio, 1) : 0
    const cuota = residualInicial * tasa
    residual = residualInicial - cuota
    reservas = Math.max(reservasInicio - prod, 0)
    out.push({
      fecha: m.fecha, capexDelMes: m.capex, residualInicial, produccionBoe: prod,
      reservasInicio, tasa, cuota, residualFinal: residual, reservasFinal: reservas,
    })
  }
  return out
}

// ─── Huella de los datos de entrada ──────────────────────────────────────
// Sirve para saber si una corrida quedó vieja. Se calcula sobre todo lo que
// el motor lee, así que editar un precio, una curva, una intervención o un
// tramo de participación cambia la huella y delata que hay que recalcular.
//
// Es un hash no criptográfico (FNV-1a): no protege contra manipulación, sólo
// detecta cambios accidentales, que es exactamente el problema.
export function hashContexto(ctx: ContextoEscenario): string {
  // Se ordena por id antes de serializar para que el hash no dependa del orden
  // en que responda Postgres.
  const partes = [
    ctx.pozos, ctx.curvas, ctx.intervencionesRaw, ctx.participaciones, ctx.regalias,
    ctx.opexFijo, ctx.opexVar, ctx.opexFijoPozo, ctx.formulas, ctx.preciosRef,
    ctx.preciosMens, ctx.provincias, ctx.yacimientos, ctx.concesiones,
    ctx.ganancias, ctx.debitosCreditos, ctx.deckPuntos, ctx.reservasAnuales,
    ctx.deck ? [ctx.deck] : [],
  ]

  let h = 0x811c9dc5
  for (const arr of partes) {
    const ordenado = [...(arr ?? [])].sort((a: any, b: any) => (a?.id ?? 0) - (b?.id ?? 0))
    const txt = JSON.stringify(ordenado)
    for (let i = 0; i < txt.length; i++) {
      h ^= txt.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    h ^= 0x5bf03635 // separador entre tablas, para que mover filas de una a otra cambie el hash
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
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
    pozos, pozosTipo, curvas, intervencionesRaw, participaciones, regalias,
    opexFijo, opexVar, opexFijoPozo, formulas, preciosRef, preciosMens,
    provincias, yacimientos, concesiones, ganancias, debitosCreditos,
    deck, deckPuntos, reservasAnuales, metodoAmortizacion,
  } = opciones.contexto ?? await cargarContexto(escenarioId)

  // Categoría de actividad (básico/drilling/workover/pulling) de cada pozo
  // tipo — se persiste en cashflow_mensual para poder armar el gráfico de
  // producción apilado por categoría (como el del Excel del cliente), sin
  // tener que reconstruirla después cruzando intervenciones a mano.
  const categoriaPorTipo = new Map<number, string>(pozosTipo.map((pt: any) => [pt.id, String(pt.categoria ?? 'basico')]))

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

  // Por fecha simulada, no por la fecha real del día en que se corre el
  // cálculo — todas las demás tasas (regalías, OPEX, participación) ya se
  // resuelven así con `vigente()` dentro del loop mensual. Esta quedaba
  // anclada a "hoy": un cambio de alícuota con vigencia futura nunca se
  // aplicaba en ningún mes de los 20 años de proyección, todo el horizonte
  // usaba la tasa vigente el día del click en "Calcular".
  const alicuotaGananciasEn = (fecha: string) => vigente(ganancias, fecha)?.alicuota
    ?? ganancias[ganancias.length - 1]?.alicuota ?? 0.35
  const alicuotaDyCEn = (fecha: string) => vigente(debitosCreditos, fecha)?.alicuota
    ?? debitosCreditos[debitosCreditos.length - 1]?.alicuota ?? 0.006

  const precioMensPorClave = new Map<string, any>(
    preciosMens.map(p => [`${p.yacimiento_id}|${p.producto}|${mesDe(p.fecha)}`, p]),
  )
  const precioRefPorClave = new Map<string, any>(
    preciosRef.map(r => [`${r.referencia}|${mesDe(r.fecha)}`, r]),
  )
  // ─── Precio de referencia desde el price deck ─────────────────────────
  // El deck da unos pocos puntos anuales; entre ellos se interpola linealmente
  // y después del último se aplica la escalación configurada. Un deck
  // constante es simplemente uno con escalación 0.
  // "t" es el año con fracción (2026.75 = octubre 2026) — si el punto trae
  // mes (ej. una corrida de futuros con un contrato por mes), se usa
  // exacto; si no, es un punto anual de siempre (equivale a enero).
  const puntosPorRef = new Map<string, { t: number; precio: number }[]>()
  for (const p of deckPuntos ?? []) {
    const arr = puntosPorRef.get(p.referencia) ?? []
    const mes = (p as any).mes != null ? Number((p as any).mes) : 1
    arr.push({ t: Number(p.anio) + (mes - 1) / 12, precio: Number(p.precio_usd) })
    puntosPorRef.set(p.referencia, arr)
  }
  for (const arr of puntosPorRef.values()) arr.sort((a, b) => a.t - b.t)

  function precioDeck(referencia: string, fecha: string): number | null {
    const pts = puntosPorRef.get(referencia)
    if (!pts || pts.length === 0) return null
    const t = Number(fecha.slice(0, 4)) + (Number(fecha.slice(5, 7)) - 1) / 12

    if (t <= pts[0].t) return pts[0].precio
    const ultimo = pts[pts.length - 1]
    if (t >= ultimo.t) {
      const escal = Number((deck as any)?.escalacion_anual ?? 0)
      return ultimo.precio * Math.pow(1 + escal, t - ultimo.t)
    }
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i].t) {
        const a = pts[i - 1], b = pts[i]
        const w = (t - a.t) / (b.t - a.t || 1)
        return a.precio + (b.precio - a.precio) * w
      }
    }
    return ultimo.precio
  }

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
    // Orden de resolución de la referencia: el price deck del escenario si
    // hay uno, y si no la tabla de cotizaciones cargada mes a mes.
    const precioRef = precioDeck(formula.referencia, fecha)
      ?? precioRefPorClave.get(`${formula.referencia}|${mesDe(fecha)}`)?.precio_usd
      ?? null
    if (precioRef == null) {
      diag.add('precio_sin_referencia', `${yacimiento.nombre}: falta la cotización "${formula.referencia}" de ${producto} en ${fecha.slice(0, 7)} — se toma 0`)
      return 0
    }
    // DDE% no lo tipea nadie mes a mes: es la escala lineal por nivel de
    // Brent (dde_brent_min/max, dde_pct_min/max), o el fijo (dde_pct) sólo si
    // no hay tramo cargado. "aplicar_dde" en false lo apaga sin borrar el
    // tramo, para un período donde puntualmente no corresponda aplicarlo.
    const ddePct = formula.aplicar_dde === false ? 0
      : (formula.dde_brent_min != null && formula.dde_brent_max != null)
      ? (precioRef <= formula.dde_brent_min ? (formula.dde_pct_min ?? 0)
        : precioRef >= formula.dde_brent_max ? (formula.dde_pct_max ?? 0)
        : (formula.dde_pct_min ?? 0) + ((formula.dde_pct_max ?? 0) - (formula.dde_pct_min ?? 0))
          * (precioRef - formula.dde_brent_min) / (formula.dde_brent_max - formula.dde_brent_min))
      : (formula.dde_pct ?? 0)
    // Orden real del Excel del equipo técnico (Sproule/ERCE): el descuento
    // fijo se suma ANTES del recorte por DDE% (suele venir negativo, ej. -3),
    // y el extra se suma DESPUÉS de dividir — no se resta al final como en
    // una primera lectura de la fórmula.
    const descuentoFijo = formula.descuento_fijo_usd ?? 0
    const extra = formula.descuento_adicional_usd ?? 0
    const precioNetoCuenca = ((precioRef + descuentoFijo) * (1 - ddePct / 100)) / (formula.divisor || 1) + extra
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
    fecha: string; bbl: number; mcf: number; capexUsd: number
    depreciacionLineal: number; depreciacionUsd: number
    // CAPEX de facilities: sostiene el yacimiento activo pero no genera
    // producción propia. Se excluye del prorrateo de OPEX fijo por pozo (no es
    // un pozo real) y del corte por límite económico (produce=false ya lo
    // hace inofensivo, pero queda explícito acá).
    esFacilities?: boolean
    // Pozo virtual de una Intervención sin pozo real (perforación/workover/
    // pulling a probar, ver más abajo). A diferencia de facilities SÍ es un
    // pozo activo (cuenta para prorratear OPEX fijo y sí recibe el fijo por
    // pozo) — lo único que cambia es que al persistir en cashflow_mensual va
    // con pozo_id null, porque su id negativo no existe en la tabla `pozos`
    // y rompería la FK.
    sinPozoReal?: boolean
    categoria: string
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

    // El pozo puede tener CAPEX de perforación anterior a fecha_alta (que es
    // la fecha de PRIMERA PRODUCCIÓN, no la de inicio de perforación — hay
    // semanas o meses entre una cosa y otra, ver el comentario de más abajo
    // sobre `fecha_inicio_perforacion`). El loop antes arrancaba siempre en
    // fecha_alta, así que esos meses de perforación nunca se visitaban y su
    // CAPEX desaparecía del cash flow sin dejar rastro. Se arranca desde la
    // fecha más temprana entre fecha_alta y el inicio de perforación de sus
    // propias intervenciones.
    const inicioLoop = intervDelPozo.reduce((min, i) => {
      const f = i.fecha_inicio_perforacion ?? i.fecha
      return f < min ? f : min
    }, pozo.fecha_alta)

    const registros: Registro[] = []
    for (let m = 0; m < horizonte; m++) {
      const fecha = mesDesde(inicioLoop, m)
      if (fechaCorte && fecha >= fechaCorte) break

      // Antes de la primera producción sólo puede haber CAPEX (perforación en
      // curso) — no hay curva que buscar todavía.
      const enProduccion = fecha >= pozo.fecha_alta
      const interv = enProduccion ? intervConCurvaDesc.find(i => i.fecha <= fecha) : undefined
      let bbl = 0, mcf = 0
      if (enProduccion) {
        if (interv?.pozo_tipo_id) {
          const c = curvaPorTipo.get(`${interv.pozo_tipo_id}|${monthsBetween(interv.fecha, fecha)}`)
          bbl = c?.bbl_petroleo ?? 0
          mcf = c?.mcf_gas ?? 0
        } else {
          const c = curvaPorPozo.get(`${pozo.id}|${monthsBetween(pozo.fecha_alta, fecha)}`)
          bbl = c?.bbl_petroleo ?? 0
          mcf = c?.mcf_gas ?? 0
        }
      }
      bbl *= mult.produccion
      mcf *= mult.produccion
      if (fecha === pozo.fecha_alta && bbl === 0 && mcf === 0 && !interv) {
        diag.add('pozo_sin_curva', `Pozo "${pozo.nombre}": no hay curva de producción cargada para su primer mes`)
      }

      // CAPEX del mes. La amortización ya no se calcula acá: con unidades de
      // producción depende de la producción y de las reservas remanentes del
      // yacimiento, que recién se conocen cuando terminó toda la pasada 1.
      let capexUsd = 0, depreciacionLineal = 0
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
            depreciacionLineal += capexAjustado / i.vida_util_meses
          }
        }
      }

      // Un mes sin producción ni movimiento de CAPEX no genera fila. Antes se
      // salteaba con solo mirar la producción, y eso hacía desaparecer del
      // cashflow el CAPEX de una intervención hecha sobre un pozo parado.
      if (m > 0 && bbl === 0 && mcf === 0 && capexUsd === 0 && depreciacionLineal === 0) continue

      const categoria = interv?.pozo_tipo_id ? (categoriaPorTipo.get(interv.pozo_tipo_id) ?? 'basico') : 'basico'
      registros.push({ pozo, concesion, yacimiento, provincia, fecha, bbl, mcf, capexUsd, depreciacionLineal, depreciacionUsd: 0, categoria })
    }
    if (registros.length > 0) registrosPorPozo.set(pozo.id, registros)
  }

  // ─── CAPEX de facilities (sin pozo, no agrega producción) ──────────────
  // Instalaciones que sostienen el yacimiento activo pero no disparan una
  // curva propia: líneas, baterías, tratamiento. Se cargan con pozo_id vacío
  // y concesion_id (ver entityConfig "Pozo (vacío si es drilling nuevo o
  // facilities)"). Antes quedaban agrupadas bajo una clave que ningún otro
  // paso del cálculo leía — el CAPEX desaparecía sin dejar rastro: no entraba
  // al pool de amortización del yacimiento, no salía en el cash flow, no se
  // deducía de ganancias.
  //
  // Se modelan como un pozo virtual (id negativo, nunca choca con un id real)
  // con producción cero. Al entrar al mismo pool de CAPEX-por-yacimiento que
  // los pozos reales, su cuota de amortización se reparte entre los pozos que
  // sí producen ese mes — que es exactamente cómo tiene que funcionar: el
  // costo de sostener el yacimiento se recupera contra la producción del
  // yacimiento, no contra una producción propia que no existe. El desembolso
  // de CAPEX sí queda en su propia fila del mes en que se hizo.
  const intervFacilitiesPorConcesion = new Map<number, any[]>()
  for (const i of intervenciones) {
    if (i.pozo_id != null || i.tipo !== 'facilities') continue
    const arr = intervFacilitiesPorConcesion.get(i.concesion_id) ?? []
    arr.push(i)
    intervFacilitiesPorConcesion.set(i.concesion_id, arr)
  }

  let facilitiesIdSeq = -1
  for (const [concesionId, intervFac] of intervFacilitiesPorConcesion) {
    const concesion = concesionPorId.get(concesionId)
    if (!concesion) {
      diag.add('facilities_sin_concesion', `Una intervención de facilities apunta a una concesión que no existe — se excluye del cálculo`)
      continue
    }
    const yacimiento = yacimientoPorId.get(concesion.yacimiento_id)
    if (!yacimiento) {
      diag.add('facilities_concesion_sin_yacimiento', `La concesión "${concesion.nombre}" no tiene yacimiento — su CAPEX de facilities se excluye`)
      continue
    }
    const provincia = provinciaPorId.get(yacimiento.provincia_id) ?? null

    // Se ordena por el mismo campo que se usa para anclar el loop
    // (fecha_inicio_perforacion, con .fecha como fallback) — antes se
    // ordenaba por .fecha pero se anclaba por fecha_inicio_perforacion, dos
    // campos distintos: si otra intervención del grupo tenía una
    // fecha_inicio_perforacion más temprana que la del "ancla" elegido por
    // .fecha, su CAPEX caía antes de m=0 y se perdía sin dejar rastro.
    const anclaje = [...intervFac].sort((a, b) =>
      String(a.fecha_inicio_perforacion ?? a.fecha).localeCompare(String(b.fecha_inicio_perforacion ?? b.fecha)))[0]
    const inicioLoop = anclaje.fecha_inicio_perforacion ?? anclaje.fecha
    const pozoVirtual = { id: facilitiesIdSeq--, nombre: `Facilities — ${concesion.nombre}`, costo_abandono_usd: 0 }

    const registros: Registro[] = []
    for (let m = 0; m < horizonte; m++) {
      const fecha = mesDesde(inicioLoop, m)
      if (concesion.fecha_vencimiento && fecha >= concesion.fecha_vencimiento) break

      let capexUsd = 0, depreciacionLineal = 0
      for (const i of intervFac) {
        const fechaCapex = i.fecha_inicio_perforacion ?? i.fecha
        const capexAjustado = i.capex_usd * mult.capex
        if (mesDe(fechaCapex) === mesDe(fecha)) capexUsd += capexAjustado
        if (i.vida_util_meses && i.vida_util_meses > 0) {
          const mesesDesde = monthsBetween(fechaCapex, fecha)
          if (mesesDesde >= 0 && mesesDesde < i.vida_util_meses) {
            depreciacionLineal += capexAjustado / i.vida_util_meses
          }
        }
      }
      if (capexUsd === 0 && depreciacionLineal === 0) continue

      registros.push({
        pozo: pozoVirtual, concesion, yacimiento, provincia, fecha,
        bbl: 0, mcf: 0, capexUsd, depreciacionLineal, depreciacionUsd: 0, esFacilities: true, categoria: 'facilities',
      })
    }
    if (registros.length > 0) registrosPorPozo.set(pozoVirtual.id, registros)
  }

  // ─── Pozos nuevos vía Intervención sin pozo real (a perforar) ──────────
  // El helpText de "14. Intervenciones" dice "vacío si es drilling nuevo o
  // facilities", pero hasta acá el motor solo sintetizaba un pozo virtual
  // para facilities — una Perforación/Workover/Pulling sin pozo_id no
  // generaba nada: ni producción ni CAPEX. Se necesita para poder testear
  // "¿conviene perforar en El Tordillo o en LT_PQO?" sin tener que crear a
  // mano el Pozo antes de saber si conviene. Cada Intervención sin pozo_id
  // (con su curva asignada) se modela como su propio pozo virtual, igual
  // que un pozo real pero con una sola intervención en su vida.
  let nuevoPozoIdSeq = -1_000_000
  for (const i of intervenciones) {
    if (i.pozo_id != null || i.tipo === 'facilities' || !i.pozo_tipo_id) continue
    const concesion = concesionPorId.get(i.concesion_id)
    if (!concesion) {
      diag.add('interv_sin_pozo_sin_concesion', `Una intervención sin pozo apunta a una concesión que no existe — se excluye del cálculo`)
      continue
    }
    const yacimiento = yacimientoPorId.get(concesion.yacimiento_id)
    if (!yacimiento) {
      diag.add('interv_sin_pozo_concesion_sin_yacimiento', `La concesión "${concesion.nombre}" no tiene yacimiento — la intervención sin pozo se excluye`)
      continue
    }
    const provincia = provinciaPorId.get(yacimiento.provincia_id) ?? null
    const pozoVirtual = { id: nuevoPozoIdSeq--, nombre: `${i.tipo} nuevo — ${concesion.nombre} (#${i.id})`, costo_abandono_usd: 0 }
    const fechaCorte: string | null = concesion.fecha_vencimiento ?? null

    const registros: Registro[] = []
    for (let m = 0; m < horizonte; m++) {
      const fecha = mesDesde(i.fecha_inicio_perforacion ?? i.fecha, m)
      if (fechaCorte && fecha >= fechaCorte) break

      const c = curvaPorTipo.get(`${i.pozo_tipo_id}|${m}`)
      const bbl = (c?.bbl_petroleo ?? 0) * mult.produccion
      const mcf = (c?.mcf_gas ?? 0) * mult.produccion

      const fechaCapex = i.fecha_inicio_perforacion ?? i.fecha
      const capexAjustado = i.capex_usd * mult.capex
      let capexUsd = 0, depreciacionLineal = 0
      if (mesDe(fechaCapex) === mesDe(fecha)) capexUsd += capexAjustado
      if (i.vida_util_meses && i.vida_util_meses > 0) {
        const mesesDesde = monthsBetween(fechaCapex, fecha)
        if (mesesDesde >= 0 && mesesDesde < i.vida_util_meses) depreciacionLineal += capexAjustado / i.vida_util_meses
      }

      if (m > 0 && bbl === 0 && mcf === 0 && capexUsd === 0 && depreciacionLineal === 0) continue
      const categoria = categoriaPorTipo.get(i.pozo_tipo_id) ?? 'drilling'
      registros.push({ pozo: pozoVirtual, concesion, yacimiento, provincia, fecha, bbl, mcf, capexUsd, depreciacionLineal, depreciacionUsd: 0, sinPozoReal: true, categoria })
    }
    if (registros.length > 0) registrosPorPozo.set(pozoVirtual.id, registros)
  }

  // ─── Amortización por unidades de producción (UoP) ────────────────────
  // Método estándar del sector, y el que definió el cliente: la cuota del mes
  // es el valor residual del CAPEX por la proporción de reservas que se produjo
  // ese mes.
  //
  //   tasa       = producción del mes / reservas remanentes al inicio del mes
  //   cuota      = valor residual x tasa
  //   residual  -= cuota
  //   reservas  -= producción
  //
  // Antes se amortizaba en línea recta sobre `vida_util_meses`, que ignora que
  // un pozo consume su inversión al ritmo al que produce: con una curva de
  // declinación, la línea recta subamortiza los primeros años y sobreamortiza
  // la cola.
  //
  // El centro de costo es el YACIMIENTO: se juntan el CAPEX y la producción de
  // todos sus pozos contra su base de reservas P1+P2+P3, y después la cuota del
  // mes se reparte entre los pozos en proporción a lo que produjo cada uno.
  const usarUoP = metodoAmortizacion !== 'lineal'

  // Base de reservas: la producción total que el propio escenario proyecta
  // para el yacimiento. Todo yacimiento tiene al menos su producción básica,
  // así que la base siempre existe — no depende de que el reserve report esté
  // cargado. Y como la base es exactamente lo que se va a producir, el residual
  // llega a cero justo cuando se agota la curva: el CAPEX queda amortizado al
  // 100% por construcción.
  //
  // Las reservas del reserve report (P1+P2+P3) se leen igual, para poder
  // avisar cuando la curva y el informe del evaluador no coinciden.
  const reservasReporte = new Map<number, number>()
  for (const r of (reservasAnuales ?? [])) {
    const masReciente = (reservasAnuales ?? [])
      .filter((x: any) => x.yacimiento_id === r.yacimiento_id && x.categoria === r.categoria)
      .sort((a: any, b: any) => String(b.fecha_corte).localeCompare(String(a.fecha_corte)))[0]
    if (masReciente?.id !== r.id) continue // sólo el reporte más reciente de cada categoría
    reservasReporte.set(r.yacimiento_id, (reservasReporte.get(r.yacimiento_id) ?? 0) + Number(r.reservas_boe ?? 0))
  }

  const depreciacionPorPozoMes = new Map<string, number>()
  const yacimientosConUoP = new Set<number>()

  if (usarUoP) {
    // Producción y CAPEX por yacimiento y mes
    const prodYacMes = new Map<string, number>()
    const capexYacMes = new Map<string, number>()
    const mesesPorYac = new Map<number, Set<string>>()
    for (const registros of registrosPorPozo.values()) {
      for (const r of registros) {
        const key = `${r.yacimiento.id}|${r.fecha}`
        prodYacMes.set(key, (prodYacMes.get(key) ?? 0) + r.bbl + r.mcf / MCF_POR_BOE)
        capexYacMes.set(key, (capexYacMes.get(key) ?? 0) + r.capexUsd)
        const set = mesesPorYac.get(r.yacimiento.id) ?? new Set<string>()
        set.add(r.fecha)
        mesesPorYac.set(r.yacimiento.id, set)
      }
    }

    const deplYacMes = new Map<string, number>()
    for (const [yacId, meses] of mesesPorYac) {
      const nombreYac = yacimientoPorId.get(yacId)?.nombre ?? `#${yacId}`
      // La base es la producción total proyectada del yacimiento.
      const base = [...meses].reduce((acc, f) => acc + (prodYacMes.get(`${yacId}|${f}`) ?? 0), 0)
      if (!(base > 0)) {
        diag.add('amortizacion_sin_produccion', `${nombreYac}: no produce nada en el escenario, así que no hay base contra la cual amortizar — se usa la vida útil lineal`)
        continue
      }
      const delReporte = reservasReporte.get(yacId)
      if (delReporte != null && delReporte > 0) {
        const desvio = Math.abs(base - delReporte) / delReporte
        if (desvio > 0.10) {
          diag.add('curva_vs_reserve_report', `${nombreYac}: la curva proyecta ${Math.round(base).toLocaleString('es-AR')} BOE y el reserve report tiene ${Math.round(delReporte).toLocaleString('es-AR')} BOE (${(desvio * 100).toFixed(0)}% de diferencia) — la amortización usa la curva`)
        }
      }
      const cuotas = amortizacionUnidadesProduccion(base, [...meses].sort().map(fecha => ({
        fecha,
        capex: capexYacMes.get(`${yacId}|${fecha}`) ?? 0,
        produccionBoe: prodYacMes.get(`${yacId}|${fecha}`) ?? 0,
      })))
      for (const c of cuotas) deplYacMes.set(`${yacId}|${c.fecha}`, c.cuota)
      yacimientosConUoP.add(yacId)

    }

    // Reparto de la cuota del yacimiento entre sus pozos, en proporción a lo
    // que produjo cada uno ese mes.
    for (const registros of registrosPorPozo.values()) {
      for (const r of registros) {
        const key = `${r.yacimiento.id}|${r.fecha}`
        const cuota = deplYacMes.get(key)
        if (cuota == null || cuota === 0) continue
        const prodYac = prodYacMes.get(key) ?? 0
        if (prodYac <= 0) continue
        const prodPozo = r.bbl + r.mcf / MCF_POR_BOE
        depreciacionPorPozoMes.set(`${r.pozo.id}|${r.fecha}`, cuota * (prodPozo / prodYac))
      }
    }
  }

  // Se asigna la amortización definitiva a cada registro: UoP si el yacimiento
  // tiene reservas cargadas, y si no la lineal de siempre.
  for (const registros of registrosPorPozo.values()) {
    for (const r of registros) {
      const uop = depreciacionPorPozoMes.get(`${r.pozo.id}|${r.fecha}`)
      r.depreciacionUsd = usarUoP && yacimientosConUoP.has(r.yacimiento.id) ? (uop ?? 0) : r.depreciacionLineal
    }
  }

  // Pozos activos por concesión y mes — para prorratear el OPEX fijo de
  // concesión. Antes se le cobraba el monto completo a cada pozo, así que una
  // concesión con 30 pozos contabilizaba 30 veces su costo fijo mensual.
  // Facilities no cuenta: no es un pozo activo, y contarlo diluiría el OPEX
  // fijo de concesión entre un pozo de menos de los que realmente lo generan.
  const activosPorConcesionMes = new Map<string, number>()
  for (const registros of registrosPorPozo.values()) {
    for (const r of registros) {
      if (r.esFacilities) continue
      const key = `${r.concesion.id}|${r.fecha}`
      activosPorConcesionMes.set(key, (activosPorConcesionMes.get(key) ?? 0) + 1)
    }
  }

  // ─── Pasada 2: economía por pozo-mes ──────────────────────────────────
  const filas: Record<string, unknown>[] = []
  // El abandono se suma dentro de capex_usd, pero no es CAPEX amortizable: es
  // un costo de cierre. Se lleva aparte para poder chequear el cuadre.
  let abandonoTotal = 0

  for (const registros of registrosPorPozo.values()) {
    let mesesNegativosSeguidos = 0
    const primeraFilaDelPozo = filas.length

    for (const r of registros) {
      const { pozo, concesion, yacimiento, provincia, fecha, bbl, mcf, capexUsd, depreciacionUsd, esFacilities, sinPozoReal, categoria } = r

      const precioOil = precioEn(yacimiento, 'petroleo', fecha) * mult.precioPetroleo
      const precioGas = precioEn(yacimiento, 'gas', fecha) * mult.precioGas
      const ingresoBruto = bbl * precioOil + mcf * precioGas

      const regalia = vigente(regaliasPorConc.get(concesion.id) ?? [], fecha)
      if (!regalia) diag.add('sin_regalias', `Concesión "${concesion.nombre}": no hay regalía vigente en ${fecha.slice(0, 7)} — se calcula 0%`)
      const regaliaUsd = ingresoBruto * (regalia?.porcentaje ?? 0)

      const iibbUsd = ingresoBruto * (provincia?.alicuota_iibb ?? 0)
      const dycUsd = ingresoBruto * alicuotaDyCEn(fecha)

      const fijo = vigente(opexFijoPorConc.get(concesion.id) ?? [], fecha)
      const activos = activosPorConcesionMes.get(`${concesion.id}|${fecha}`) || 1
      const opexFijoUsd = ((fijo?.monto_usd_mes ?? 0) / activos) * mult.opex
      const variable = vigente(opexVarPorYac.get(yacimiento.id) ?? [], fecha)
      const boe = bbl + mcf / MCF_POR_BOE
      const opexVarUsd = boe * (variable?.usd_por_boe ?? 0) * mult.opex
      // Fijo por pozo: se carga completo a cada pozo activo (a diferencia del
      // opex_fijo de concesión, que sí se prorratea entre los pozos activos).
      // Facilities no es un pozo activo, no le corresponde este cargo.
      const fijoPozo = vigente(opexFijoPozoPorConc.get(concesion.id) ?? [], fecha)
      const opexFijoPozoUsd = esFacilities ? 0 : (fijoPozo?.usd_mes_pozo ?? 0) * mult.opex

      const baseImponible = ingresoBruto - regaliaUsd - iibbUsd - dycUsd - opexFijoUsd - opexVarUsd - opexFijoPozoUsd - depreciacionUsd
      const impuestoGanancias = baseImponible > 0 ? baseImponible * alicuotaGananciasEn(fecha) : 0
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
        // El pozo virtual de facilities (o de una Intervención sin pozo real)
        // tiene un id negativo que sólo existe en esta corrida, no en la
        // tabla `pozos` — persistirlo rompería la FK. Sin pozo_id, esta fila
        // se ve en el consolidado del yacimiento (resultados_escenario_anual)
        // pero no en el detalle por pozo.
        pozo_id: (esFacilities || sinPozoReal) ? null : pozo.id,
        // Se guarda directo en vez de derivarlo después por pozo_id -> concesion
        // -> yacimiento: esa derivación da null para facilities y para
        // Intervenciones sin pozo real (pozo_id es null a propósito en esos
        // casos), y eso las excluía en silencio de los reportes por yacimiento
        // y de la depleción de reservas.
        yacimiento_id: yacimiento.id,
        categoria,
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
    let costoAbandonoDeEstePozo = 0
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
        abandonoTotal += costoAbandono
        costoAbandonoDeEstePozo = costoAbandono
        diag.add('abandono_imputado', `Pozo "${registros[0].pozo.nombre}": costo de abandono de US$ ${costoAbandono.toLocaleString('es-AR')} imputado en ${String(ultima.fecha).slice(0, 7)}`)
      }
    }

    // ─── Cuadre POR POZO: la amortización de este pozo tiene que dar su
    // propio CAPEX ────────────────────────────────────────────────────────
    // Antes este chequeo se hacía UNA VEZ sobre el total del escenario y el
    // faltante se volcaba sobre `filas[filas.length - 1]` — la última fila
    // de TODO el escenario, es decir del último pozo insertado en
    // `registrosPorPozo`, sin ninguna relación con cuál pozo era el que
    // realmente se había cortado. Con dos o más pozos cortados en la misma
    // corrida, sus faltantes se sumaban y el total terminaba imputado a un
    // pozo (y una concesión, con su propia participación) que no tenía nada
    // que ver. Se mueve dentro del loop para que cada pozo cuadre contra su
    // propio CAPEX y su propia última fila.
    const filasDelPozo = filas.slice(primeraFilaDelPozo)
    const capexAmortizablePozo = filasDelPozo.reduce((acc, f) => acc + (f.capex_usd as number), 0) - costoAbandonoDeEstePozo
    const amortizadoPozo = filasDelPozo.reduce((acc, f) => acc + (f.depreciacion_usd as number), 0)
    const faltantePozo = capexAmortizablePozo - amortizadoPozo

    if (faltantePozo > 1 && filasDelPozo.length > 0) {
      const ultimaDelPozo = filas[filas.length - 1]
      const nuevaDepr = (ultimaDelPozo.depreciacion_usd as number) + faltantePozo
      // Se recalcula la fila afectada de punta a punta: la baja es deducible,
      // así que cambia el impuesto y el flujo, no sólo la línea de amortización.
      const base = (ultimaDelPozo.resultado_antes_ganancias_usd as number) - faltantePozo
      const impuesto = base > 0 ? base * alicuotaGananciasEn(String(ultimaDelPozo.fecha)) : 0
      const neto = base - impuesto
      const part = ultimaDelPozo.participacion_pct as number
      ultimaDelPozo.depreciacion_usd = nuevaDepr
      ultimaDelPozo.resultado_antes_ganancias_usd = base
      ultimaDelPozo.impuesto_ganancias_usd = impuesto
      ultimaDelPozo.resultado_neto_usd = neto
      ultimaDelPozo.cash_flow_neto_usd = (neto + nuevaDepr - (ultimaDelPozo.capex_usd as number)) * part
      diag.add('baja_por_abandono', `Pozo "${registros[0].pozo.nombre}": US$ ${Math.round(faltantePozo).toLocaleString('es-AR')} de CAPEX quedaron sin amortizar porque se cortó antes de agotar su curva — se imputan como baja en su último mes`)
    }
  }

  // ─── Cuadre global: verificación, no corrección ────────────────────────
  // Cada pozo ya cuadró su propio CAPEX contra su propia amortización arriba
  // — esto sólo confirma que la suma total efectivamente cierra, como
  // chequeo de sanidad.
  const capexAmortizable = filas.reduce((acc, f) => acc + (f.capex_usd as number), 0) - abandonoTotal
  const amortizadoFinal = filas.reduce((acc, f) => acc + (f.depreciacion_usd as number), 0)
  const descuadre = Math.abs(capexAmortizable - amortizadoFinal)
  if (descuadre > 1) {
    diag.add('descuadre_amortizacion', `La amortización total (US$ ${Math.round(amortizadoFinal).toLocaleString('es-AR')}) no coincide con el CAPEX amortizable (US$ ${Math.round(capexAmortizable).toLocaleString('es-AR')}) — diferencia de US$ ${Math.round(descuadre).toLocaleString('es-AR')}`)
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

  return {
    filas: filas.length, pozos: registrosPorPozo.size, diagnosticos: diag.lista(), cashflow: filas,
    cuadre_amortizacion: {
      capex_amortizable_usd: capexAmortizable,
      amortizacion_total_usd: amortizadoFinal,
      abandono_usd: abandonoTotal,
      diferencia_usd: capexAmortizable - amortizadoFinal,
      cuadra: descuadre <= 1,
    },
  }
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

  const [cashflows] = await Promise.all([
    traerTodo<any>(() => db.from('cashflow_mensual').select('*').eq('escenario_id', escenarioId).order('id')),
    // Los 6 movimientos de NI 51-101 que no calcula el motor. Si la migración
    // 20260801_reservas_reconciliacion.sql no corrió todavía, la tabla no
    // existe y la reconciliación se reduce a apertura → producción → cierre.
    traerTodo<any>(() => db.from('reservas_movimientos').select('*')
      .or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id'))
      .catch(() => [] as any[]),
  ])

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
    const yacId = cf.yacimiento_id ?? null

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
export function irrAnual(cashflowsAnuales: number[]): number | null {
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

export async function calcularMetricasEscenario(
  escenarioId: number,
  tasaAnual: number,
  horizonteAnios: number,
  traza: { hashInputs?: string; calculadoPor?: string } = {},
) {
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

  const row: Record<string, unknown> = {
    escenario_id: escenarioId,
    tasa_descuento: tasaAnual,
    horizonte_anios: horizonteAnios,
    npv_usd: npv,
    irr_pct: irr !== null ? irr * 100 : null,
    payback_anios: paybackAnios,
  }

  // Columnas de trazabilidad: se escriben sólo si la migración ya corrió, para
  // que el cálculo no falle en una base que todavía no las tiene.
  const { error: sinTraza } = await db.from('escenario_metricas').select('hash_inputs').limit(1)
  if (!sinTraza) {
    row.calculado_en = new Date().toISOString()
    row.calculado_por = traza.calculadoPor ?? null
    row.hash_inputs = traza.hashInputs ?? null
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

// Las 6 categorías de NI 51-101 que no calcula el motor: vienen del informe
// del evaluador y se cargan a mano. La producción la aporta el cashflow.
export const TIPOS_MOVIMIENTO = [
  'revision_tecnica', 'extension_recuperacion_mejorada', 'descubrimiento',
  'adquisicion', 'cesion', 'factores_economicos',
] as const
export type TipoMovimiento = typeof TIPOS_MOVIMIENTO[number]

export type MovimientoReservas = {
  categoria: string; anio: number; apertura: number; depletion: number
  cierre: number; cierreRiesgo: number; factor: number; excedente: number
  ajustes: Record<TipoMovimiento, number>
}

const ajustesVacios = (): Record<TipoMovimiento, number> =>
  Object.fromEntries(TIPOS_MOVIMIENTO.map(t => [t, 0])) as Record<TipoMovimiento, number>

// Roll-forward con cascada entre categorías incrementales. `aperturas` viene
// ordenado de más cierta a menos cierta (P1, P2, P3): la producción de cada
// año agota la primera y sólo el excedente pasa a la siguiente. `excedente`
// queda cargado en el último movimiento del año e indica cuánta producción no
// tuvo reservas contra las que imputarse.
export function rollForwardIncremental(
  aperturas: AperturaCategoria[],
  produccionPorAnio: { anio: number; boe: number }[],
  // Ajustes manuales por categoría, año y tipo. Clave: `${categoria}|${anio}`.
  ajustesPorCatAnio: Map<string, Partial<Record<TipoMovimiento, number>>> = new Map(),
): MovimientoReservas[] {
  if (aperturas.length === 0) return []
  const saldo = new Map(aperturas.map(a => [a.categoria, a.boe]))
  const anioInicio = Math.min(...aperturas.map(a => a.anioBase))

  // Los años a recorrer son los de producción MÁS los que sólo tienen ajustes:
  // una revisión técnica sin producción también mueve las reservas y tiene que
  // aparecer en la reconciliación.
  const anios = [...new Set([
    ...produccionPorAnio.map(p => p.anio),
    ...[...ajustesPorCatAnio.keys()].map(k => Number(k.split('|')[1])),
  ])].filter(a => a >= anioInicio).sort((a, b) => a - b)

  const produccionDe = new Map(produccionPorAnio.map(p => [p.anio, p.boe]))
  const out: MovimientoReservas[] = []

  for (const anio of anios) {
    let restante = Math.max(produccionDe.get(anio) ?? 0, 0)
    const delAnio: MovimientoReservas[] = []

    for (const a of aperturas) {
      if (anio < a.anioBase) continue

      const apertura = saldo.get(a.categoria) ?? 0

      // Primero los ajustes del evaluador (revisiones, extensiones,
      // adquisiciones…), después la producción. Ése es el orden de la
      // reconciliación: la producción del año se descuenta del saldo ya
      // revisado, no del de apertura.
      const ajustes = { ...ajustesVacios(), ...(ajustesPorCatAnio.get(`${a.categoria}|${anio}`) ?? {}) }
      const sumaAjustes = TIPOS_MOVIMIENTO.reduce((s, t) => s + (ajustes[t] ?? 0), 0)
      const trasAjustes = Math.max(apertura + sumaAjustes, 0)

      const depletion = Math.min(restante, trasAjustes)
      const cierre = Math.max(trasAjustes - depletion, 0)
      restante -= depletion
      saldo.set(a.categoria, cierre)

      delAnio.push({
        categoria: a.categoria, anio, apertura, depletion, cierre,
        cierreRiesgo: cierre * a.factor, factor: a.factor, excedente: 0, ajustes,
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
  const [reservas, cashflows, certezas, yacimientos, movimientos] = await Promise.all([
    traerTodo<any>(() => db.from('reservas_anuales').select('*').or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id')),
    // yacimiento_id se guarda directo en la fila (ver 20260805_cashflow_yacimiento_id.sql)
    // en vez de derivarse de pozo_id -> concesion_id -> yacimiento_id, que daba null
    // para facilities y para Intervenciones sin pozo real y las excluía en silencio
    // de la depleción de reservas.
    traerTodo<any>(() => db.from('cashflow_mensual').select('yacimiento_id, fecha, bbl_petroleo, mcf_gas').eq('escenario_id', escenarioId).order('id')),
    traerTodo<any>(() => db.from('parametros_certeza_reservas').select('*').order('id')),
    traerTodo<any>(() => db.from('yacimientos').select('id, nombre').order('id')),
    // Los 6 movimientos de NI 51-101 que no calcula el motor. Si la migración
    // 20260801_reservas_reconciliacion.sql no corrió todavía, la tabla no
    // existe y la reconciliación se reduce a apertura → producción → cierre.
    traerTodo<any>(() => db.from('reservas_movimientos').select('*')
      .or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id'))
      .catch(() => [] as any[]),
  ])

  // Producción física por yacimiento y año, en BOE
  const produccionYacAnio = new Map<string, number>()
  for (const cf of cashflows) {
    const yac = cf.yacimiento_id
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
  const { error: sinRecon } = await db.from('reservas_depletion_anual').select('revision_tecnica_boe').limit(1)
  const guardarRecon = !sinRecon
  if (!guardarRecon && movimientos.length > 0) {
    diag.add('migracion_pendiente', 'Falta correr 20260801_reservas_reconciliacion.sql — hay movimientos de reservas cargados pero el roll-forward no puede guardarlos por categoría')
  }
  if (!guardarRiesgo) {
    diag.add('migracion_pendiente', 'Falta correr 20260801_reservas_certeza_incremental.sql — el saldo ponderado por certeza no se guarda todavía')
  }

  const nombreYac = new Map<number, string>(yacimientos.map(y => [y.id, y.nombre]))
  const yacimientoNombre = (id: number) => nombreYac.get(id) ?? `Yacimiento #${id}`

  // Ajustes indexados por yacimiento → `categoria|anio` → tipo
  const ajustesPorYac = new Map<number, Map<string, Partial<Record<TipoMovimiento, number>>>>()
  for (const m of movimientos) {
    const porCat = ajustesPorYac.get(m.yacimiento_id) ?? new Map()
    const key = `${m.categoria}|${m.anio}`
    const actual = porCat.get(key) ?? {}
    actual[m.tipo as TipoMovimiento] = (actual[m.tipo as TipoMovimiento] ?? 0) + Number(m.boe)
    porCat.set(key, actual)
    ajustesPorYac.set(m.yacimiento_id, porCat)
  }

  const yacimientoIds = Array.from(new Set([
    ...reservas.map(r => r.yacimiento_id),
    ...movimientos.map(m => m.yacimiento_id),
  ]))
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
      ajustesPorYac.get(yacId) ?? new Map(),
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
        ...(guardarRecon ? {
          revision_tecnica_boe: m.ajustes.revision_tecnica,
          extension_boe: m.ajustes.extension_recuperacion_mejorada,
          descubrimiento_boe: m.ajustes.descubrimiento,
          adquisicion_boe: m.ajustes.adquisicion,
          cesion_boe: m.ajustes.cesion,
          factores_economicos_boe: m.ajustes.factores_economicos,
        } : {}),
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

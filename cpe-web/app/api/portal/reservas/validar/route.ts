import { NextRequest, NextResponse } from 'next/server'
import { requireReservasAccess } from '@/lib/reservas/access'
import { cargarContexto, calcularEscenario } from '@/lib/reservas/engine'

// ─── Validación previa (preflight) ───────────────────────────────────────
// Los diagnósticos del motor aparecían recién después de calcular. Si falta la
// cotización de un mes, el motor asume precio 0, devuelve ingresos 0 y el VAN
// parece válido. Acá se corre el motor SIN escribir nada y se devuelve un
// semáforo por dimensión, para poder ver qué falta antes de creerle al número.

export const maxDuration = 120

type Estado = 'ok' | 'aviso' | 'error'
type Chequeo = { dimension: string; estado: Estado; detalle: string; seccion?: string }

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  if (!Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  }

  try {
    const ctx = await cargarContexto(escenarioId)
    const chequeos: Chequeo[] = []
    const add = (dimension: string, estado: Estado, detalle: string, seccion?: string) =>
      chequeos.push({ dimension, estado, detalle, seccion })

    // ─── Estructura ───
    if (ctx.pozos.length === 0) add('Pozos', 'error', 'No hay pozos cargados: el motor no tiene nada que recorrer.', 'pozos')
    else add('Pozos', 'ok', `${ctx.pozos.length} pozos cargados.`, 'pozos')

    const concesionesSinYac = ctx.concesiones.filter(c => c.yacimiento_id == null)
    if (concesionesSinYac.length > 0) add('Concesiones', 'error', `${concesionesSinYac.length} concesiones sin yacimiento — sus pozos se excluyen del cálculo.`, 'concesiones')
    else if (ctx.concesiones.length === 0) add('Concesiones', 'error', 'No hay concesiones cargadas.', 'concesiones')
    else add('Concesiones', 'ok', `${ctx.concesiones.length} concesiones, todas con yacimiento.`, 'concesiones')

    const yacSinProv = ctx.yacimientos.filter(y => y.provincia_id == null)
    if (yacSinProv.length > 0) add('Provincias', 'aviso', `${yacSinProv.length} yacimientos sin provincia — IIBB se calcula en 0.`, 'yacimientos')
    else add('Provincias', 'ok', 'Todos los yacimientos tienen provincia.', 'yacimientos')

    // ─── Curvas ───
    const pozosConCurva = new Set(ctx.curvas.filter(c => c.pozo_id != null).map(c => c.pozo_id))
    const tiposConCurva = new Set(ctx.curvas.filter(c => c.pozo_tipo_id != null).map(c => c.pozo_tipo_id))
    const intervConTipo = ctx.intervencionesRaw.filter(i => i.pozo_tipo_id != null)
    const tiposUsadosSinCurva = [...new Set(intervConTipo.map(i => i.pozo_tipo_id))].filter(t => !tiposConCurva.has(t))
    const pozosSinNada = ctx.pozos.filter(p =>
      !pozosConCurva.has(p.id) && !intervConTipo.some(i => i.pozo_id === p.id))

    if (ctx.curvas.length === 0) add('Curvas de producción', 'error', 'No hay ninguna curva cargada. Sin curva no hay producción y todo el VAN da 0.', 'curvas_produccion')
    else if (pozosSinNada.length > 0) add('Curvas de producción', 'error', `${pozosSinNada.length} pozos sin curva propia ni intervención que les active una: ${pozosSinNada.slice(0, 4).map(p => p.nombre).join(', ')}${pozosSinNada.length > 4 ? '…' : ''}.`, 'curvas_produccion')
    else if (tiposUsadosSinCurva.length > 0) add('Curvas de producción', 'error', `${tiposUsadosSinCurva.length} pozos tipo usados en intervenciones no tienen curva cargada.`, 'curvas_produccion')
    else add('Curvas de producción', 'ok', `${ctx.curvas.length} filas de curva; todos los pozos tienen de dónde producir.`, 'curvas_produccion')

    // ─── Precios ───
    const yacConPrecio = new Set([
      ...ctx.preciosMens.map(p => p.yacimiento_id),
      ...ctx.formulas.map(f => f.yacimiento_id),
    ])
    const yacSinPrecio = ctx.yacimientos.filter(y => !yacConPrecio.has(y.id))
    if (yacConPrecio.size === 0) add('Precios', 'error', 'No hay precios mensuales ni fórmulas de precio. Los ingresos van a dar 0.', 'precios_mensuales')
    else if (yacSinPrecio.length > 0) add('Precios', 'aviso', `${yacSinPrecio.length} yacimientos sin precio ni fórmula: ${yacSinPrecio.map(y => y.nombre).join(', ')}.`, 'formulas_precio')
    else add('Precios', 'ok', `${ctx.preciosMens.length} precios mensuales y ${ctx.formulas.length} fórmulas.`, 'precios_mensuales')

    const refsUsadas = new Set(ctx.formulas.map(f => f.referencia))
    const refsCargadas = new Set(ctx.preciosRef.map(r => r.referencia))
    const refsFaltantes = [...refsUsadas].filter(r => !refsCargadas.has(r))
    if (refsFaltantes.length > 0) add('Cotizaciones de referencia', 'error', `Faltan cotizaciones de: ${refsFaltantes.join(', ')}. Las fórmulas que las usan devuelven 0.`, 'precios_referencia')
    else if (refsUsadas.size > 0) add('Cotizaciones de referencia', 'ok', `${ctx.preciosRef.length} cotizaciones cargadas para ${refsUsadas.size} referencias.`, 'precios_referencia')

    // ─── Fiscal y participación ───
    const concConRegalia = new Set(ctx.regalias.map(r => r.concesion_id))
    const sinRegalia = ctx.concesiones.filter(c => !concConRegalia.has(c.id))
    if (sinRegalia.length > 0) add('Regalías', 'error', `${sinRegalia.length} concesiones sin regalía: ${sinRegalia.map(c => c.nombre).join(', ')}. Se calculan al 0%.`, 'regalias')
    else if (ctx.concesiones.length > 0) add('Regalías', 'ok', 'Todas las concesiones tienen regalía.', 'regalias')

    const concConPart = new Set(ctx.participaciones.map(p => p.concesion_id))
    const sinPart = ctx.concesiones.filter(c => !concConPart.has(c.id))
    if (sinPart.length > 0) add('Participación', 'error', `${sinPart.length} concesiones sin participación: ${sinPart.map(c => c.nombre).join(', ')}. Se asume 100%, que casi nunca es lo correcto.`, 'concesion_participacion')
    else add('Participación', 'ok', `${ctx.participaciones.length} tramos de participación cargados.`, 'concesion_participacion')

    const concConOpex = new Set([...ctx.opexFijo.map(o => o.concesion_id), ...ctx.opexFijoPozo.map(o => o.concesion_id)])
    const yacConOpexVar = new Set(ctx.opexVar.map(o => o.yacimiento_id))
    if (concConOpex.size === 0 && yacConOpexVar.size === 0) add('OPEX', 'error', 'No hay OPEX cargado de ningún tipo. El EBITDA va a salir igual a los ingresos netos de regalías.', 'opex_fijo')
    else {
      const faltan = ctx.concesiones.filter(c => !concConOpex.has(c.id)).length
      if (faltan > 0) add('OPEX', 'aviso', `${faltan} concesiones sin OPEX fijo cargado.`, 'opex_fijo')
      else add('OPEX', 'ok', 'OPEX fijo y variable cargados.', 'opex_fijo')
    }

    if (ctx.ganancias.length === 0) add('Impuestos', 'aviso', 'No hay alícuota de ganancias cargada — se usa 35% por defecto.', 'escenarios')
    else add('Impuestos', 'ok', `Alícuota de ganancias y de débitos/créditos cargadas.`)

    // ─── Corrida en seco ───
    // Se corre el motor de verdad, sin escribir, para que aparezcan los huecos
    // que sólo se ven mes a mes (una cotización que falta justo en 2029-03).
    const seco = await calcularEscenario(escenarioId, 240, { contexto: ctx, persistir: false })
    if (seco.filas === 0) {
      add('Corrida en seco', 'error', 'El motor no generó ninguna fila. Revisá fechas de alta, vencimiento de concesiones y curvas.')
    } else {
      add('Corrida en seco', 'ok', `${seco.filas.toLocaleString('es-AR')} filas mensuales sobre ${seco.pozos} pozos.`)
    }

    const errores = chequeos.filter(c => c.estado === 'error').length
    const avisos = chequeos.filter(c => c.estado === 'aviso').length

    return NextResponse.json({
      escenario_id: escenarioId,
      semaforo: errores > 0 ? 'error' : avisos > 0 ? 'aviso' : 'ok',
      errores, avisos,
      chequeos,
      diagnosticos_motor: seco.diagnosticos,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'
import { traerTodo } from '@/lib/reservas/engine'

// ─── Clonar un escenario ─────────────────────────────────────────────────
// Crear una variante implicaba recargar todo a mano. Ahora se duplica el
// escenario con sus intervenciones, campañas y costos de proyecto, y sobre la
// copia se cambia lo que se quiera probar.
//
// Es la primera mitad del flujo de economía incremental: se clona el caso
// base, se le agrega la intervención a la copia, y se comparan los dos para
// ver si la intervención paga por sí sola.
//
// NO se copian los resultados: la copia nace sin calcular, que es lo correcto
// — arrastrar el cashflow del original daría números que no corresponden a
// los datos de la copia.

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const origenId = Number(body.escenario_id)
  const nombreNuevo = String(body.nombre ?? '').trim()

  if (!Number.isFinite(origenId)) return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  if (nombreNuevo.length < 2) return NextResponse.json({ error: 'Poné un nombre para el escenario nuevo' }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  try {
    const { data: origen, error: errOrigen } = await db
      .from('escenarios').select('*').eq('id', origenId).single()
    if (errOrigen) throw new Error(errOrigen.message)

    const { id: _id, ...campos } = origen as Record<string, any>
    const { data: copia, error: errCopia } = await db.from('escenarios').insert({
      ...campos,
      nombre: nombreNuevo,
      // La copia nunca nace como base: si no, habría dos bases en el mismo
      // proyecto y el consolidado no sabría cuál tomar.
      es_base: false,
    }).select().single()
    if (errCopia) throw new Error(errCopia.message)

    const nuevoId = copia.id
    const copiado: Record<string, number> = {}

    // Campañas primero: las intervenciones las referencian.
    const campanas = await traerTodo<any>(() => db.from('campanas').select('*').eq('escenario_id', origenId).order('id'))
      .catch(() => [] as any[])
    const mapaCampanas = new Map<number, number>()
    for (const c of campanas) {
      const { id, ...resto } = c
      const { data } = await db.from('campanas').insert({ ...resto, escenario_id: nuevoId, nombre: c.nombre }).select('id').single()
      if (data) mapaCampanas.set(id, data.id)
    }
    copiado.campanas = mapaCampanas.size

    // Sólo las intervenciones propias del escenario. Las de escenario_id NULL
    // son del plan base y ya aplican a todos, copiarlas las duplicaría.
    const intervenciones = await traerTodo<any>(() => db.from('intervenciones').select('*').eq('escenario_id', origenId).order('id'))
    if (intervenciones.length > 0) {
      const filas = intervenciones.map(({ id, ...resto }) => ({
        ...resto,
        escenario_id: nuevoId,
        campana_id: resto.campana_id != null ? (mapaCampanas.get(resto.campana_id) ?? null) : null,
      }))
      const { error } = await db.from('intervenciones').insert(filas)
      if (error) throw new Error(error.message)
    }
    copiado.intervenciones = intervenciones.length

    const costos = await traerTodo<any>(() => db.from('costos_proyecto').select('*').eq('escenario_id', origenId).order('id'))
      .catch(() => [] as any[])
    if (costos.length > 0) {
      await db.from('costos_proyecto').insert(costos.map(({ id, ...r }) => ({ ...r, escenario_id: nuevoId })))
    }
    copiado.costos_proyecto = costos.length

    // reservas_anuales y reservas_movimientos: sólo las filas PROPIAS del
    // escenario (escenario_id = origenId) — las de escenario_id null son del
    // reporte base y ya aplican a todos, copiarlas las duplicaría. Antes no
    // se copiaba ninguna de las dos: un override de reservas específico del
    // escenario origen (ej. una revisión técnica cargada sólo para probar un
    // caso) se perdía en la copia sin ningún aviso.
    const reservasAnuales = await traerTodo<any>(() => db.from('reservas_anuales').select('*').eq('escenario_id', origenId).order('id'))
      .catch(() => [] as any[])
    if (reservasAnuales.length > 0) {
      await db.from('reservas_anuales').insert(reservasAnuales.map(({ id, ...r }) => ({ ...r, escenario_id: nuevoId })))
    }
    copiado.reservas_anuales = reservasAnuales.length

    const reservasMovimientos = await traerTodo<any>(() => db.from('reservas_movimientos').select('*').eq('escenario_id', origenId).order('id'))
      .catch(() => [] as any[])
    if (reservasMovimientos.length > 0) {
      await db.from('reservas_movimientos').insert(reservasMovimientos.map(({ id, ...r }) => ({ ...r, escenario_id: nuevoId })))
    }
    copiado.reservas_movimientos = reservasMovimientos.length

    // supuestos_generales: escenario_id es NOT NULL acá (no hay caso "aplica
    // a todos"), así que se copian todas las filas del origen sin filtrar.
    const supuestos = await traerTodo<any>(() => db.from('supuestos_generales').select('*').eq('escenario_id', origenId).order('id'))
      .catch(() => [] as any[])
    if (supuestos.length > 0) {
      await db.from('supuestos_generales').insert(supuestos.map(({ id, ...r }) => ({ ...r, escenario_id: nuevoId })))
    }
    copiado.supuestos_generales = supuestos.length

    return NextResponse.json({
      escenario: { id: nuevoId, nombre: nombreNuevo },
      copiado,
      aviso: 'La copia todavía no tiene resultados: corré el cálculo después de hacerle los cambios.',
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

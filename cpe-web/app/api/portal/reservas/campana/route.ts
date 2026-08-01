import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'
import { traerTodo } from '@/lib/reservas/engine'
import { programarCampana, resumenCampana, type PozoAProgramar } from '@/lib/reservas/cronograma'

// Programa una campaña: calcula en qué fecha arranca a perforarse cada pozo
// según la cantidad de equipos y los días de cada etapa.
//
//   GET  ?campana_id=N            → cronograma calculado (preview, no escribe)
//   POST { campana_id, aplicar }  → con aplicar:true escribe las fechas
//                                   calculadas en las intervenciones
//
// El preview y la escritura usan exactamente el mismo cálculo, así que lo que
// se ve es lo que se guarda.

async function calcular(campanaId: number) {
  const db = createSupabaseServerAdminClient()

  const { data: campana, error: errCampana } = await db
    .from('campanas').select('*').eq('id', campanaId).single()
  if (errCampana) throw new Error(errCampana.message)
  if (!campana) throw new Error('Campaña no encontrada')

  const intervenciones = await traerTodo<any>(() => db
    .from('intervenciones').select('*').eq('campana_id', campanaId).order('orden').order('id'))

  if (intervenciones.length === 0) {
    return { campana, cronograma: [], resumen: null, aviso: 'La campaña todavía no tiene intervenciones asignadas. Asignalas desde la sección "Intervención", eligiendo esta campaña y un orden.' }
  }

  const pozos = await traerTodo<any>(() => db.from('pozos').select('id, nombre').order('id'))
  const nombrePozo = new Map<number, string>(pozos.map(p => [p.id, p.nombre]))

  const aProgramar: PozoAProgramar[] = intervenciones.map((i, idx) => ({
    intervencionId: i.id,
    etiqueta: i.pozo_id != null ? (nombrePozo.get(i.pozo_id) ?? `Pozo #${i.pozo_id}`) : `${i.tipo ?? 'intervención'} #${i.id}`,
    orden: i.orden ?? idx + 1,
    diasPerforacion: i.dias_perforacion,
    diasTerminacion: i.dias_terminacion,
  }))

  const cronograma = programarCampana({
    fechaInicio: String(campana.fecha_inicio),
    equiposPerforacion: campana.equipos_perforacion,
    equiposTerminacion: campana.equipos_terminacion,
    diasPerforacion: campana.dias_perforacion,
    diasTerminacion: campana.dias_terminacion,
    diasMovilizacion: campana.dias_movilizacion,
  }, aProgramar)

  return { campana, cronograma, resumen: resumenCampana(cronograma), aviso: null }
}

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const campanaId = Number(req.nextUrl.searchParams.get('campana_id'))
  if (!Number.isFinite(campanaId)) {
    return NextResponse.json({ error: 'campana_id inválido' }, { status: 400 })
  }

  try {
    return NextResponse.json(await calcular(campanaId))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const campanaId = Number(body.campana_id)
  if (!Number.isFinite(campanaId)) {
    return NextResponse.json({ error: 'campana_id inválido' }, { status: 400 })
  }

  try {
    const resultado = await calcular(campanaId)
    if (!body.aplicar) return NextResponse.json(resultado)
    if (resultado.cronograma.length === 0) {
      return NextResponse.json({ error: resultado.aviso ?? 'No hay nada para programar' }, { status: 400 })
    }

    // `fecha` es la primera producción (desde ahí arranca la curva del pozo
    // tipo) y `fecha_inicio_perforacion` es donde se imputa el CAPEX.
    const db = createSupabaseServerAdminClient()
    for (const p of resultado.cronograma) {
      const { error } = await db.from('intervenciones').update({
        fecha: p.primeraProduccion,
        fecha_inicio_perforacion: p.inicioPerforacion,
      }).eq('id', p.intervencionId)
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ ...resultado, aplicado: resultado.cronograma.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'
import { traerTodo, cargarContexto, calcularEscenario, calcularNPV, type ContextoEscenario } from '@/lib/reservas/engine'
import { programarCampana, type PozoAProgramar } from '@/lib/reservas/cronograma'

// ─── Barrido de fechas de inicio de campaña ──────────────────────────────
// Ésta es la pregunta que motiva todo el simulador: la participación de CPE en
// la concesión cambia de porcentaje en el tiempo, así que ¿cuándo conviene
// arrancar a perforar?
//
// Se prueba mes a mes un rango de fechas de arranque, se reprograma la campaña
// completa con cada una, se corre el motor en memoria (sin escribir nada) y se
// devuelve el VAN de cada alternativa.
//
// Detalle que hace que la comparación sea válida: **todos los candidatos se
// descuentan a la misma fecha base**. Si cada uno se descontara a su propio
// primer mes de flujo, arrancar más tarde daría un VAN artificialmente mejor
// (menos meses de descuento) y el barrido recomendaría siempre postergar.

export const maxDuration = 300

const MAX_CANDIDATOS = 72

function mesMas(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 7) + '-01T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const campanaId = Number(body.campana_id)
  const meses = Number(body.meses ?? 36)
  const paso = Math.max(1, Number(body.paso ?? 1))
  const tasaAnual = Number(body.tasa_anual ?? 0.10)
  const horizonteAnios = Number(body.horizonte_anios ?? 20)
  const desdeOffset = Number(body.desde_offset ?? 0)

  if (!Number.isFinite(campanaId)) return NextResponse.json({ error: 'campana_id inválido' }, { status: 400 })
  if (!Number.isFinite(meses) || meses < 1) return NextResponse.json({ error: 'meses inválido' }, { status: 400 })
  if (!Number.isFinite(tasaAnual) || tasaAnual <= -1 || tasaAnual > 10) {
    return NextResponse.json({ error: 'tasa_anual inválida' }, { status: 400 })
  }

  const candidatosPedidos = Math.floor(meses / paso) + 1
  if (candidatosPedidos > MAX_CANDIDATOS) {
    return NextResponse.json({
      error: `El barrido pediría ${candidatosPedidos} corridas y el tope es ${MAX_CANDIDATOS}. Achicá el rango de meses o agrandá el paso.`,
    }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  try {
    const { data: campana, error: errCampana } = await db
      .from('campanas').select('*').eq('id', campanaId).single()
    if (errCampana) throw new Error(errCampana.message)

    const escenarioId = campana.escenario_id
    if (escenarioId == null) {
      throw new Error('La campaña no tiene escenario asignado. Asignale uno para poder barrer fechas: el motor corre por escenario.')
    }

    const intervCampana = await traerTodo<any>(() => db
      .from('intervenciones').select('*').eq('campana_id', campanaId).order('orden').order('id'))
    if (intervCampana.length === 0) {
      throw new Error('La campaña no tiene intervenciones asignadas.')
    }

    const pozosRef = await traerTodo<any>(() => db.from('pozos').select('id, nombre').order('id'))
    const nombrePozo = new Map<number, string>(pozosRef.map(p => [p.id, p.nombre]))
    const aProgramar: PozoAProgramar[] = intervCampana.map((i, idx) => ({
      intervencionId: i.id,
      etiqueta: i.pozo_id != null ? (nombrePozo.get(i.pozo_id) ?? `Pozo #${i.pozo_id}`) : `${i.tipo ?? 'intervención'} #${i.id}`,
      orden: i.orden ?? idx + 1,
      diasPerforacion: i.dias_perforacion,
      diasTerminacion: i.dias_terminacion,
    }))

    // Una sola lectura de todas las tablas; cada candidato reusa este contexto.
    const contexto = await cargarContexto(escenarioId)

    // Fecha base común de descuento: el arranque más temprano del barrido.
    const fechaBase = mesMas(String(campana.fecha_inicio), desdeOffset)

    const puntos: {
      offset_meses: number; fecha_inicio: string; primera_produccion: string
      ultima_produccion: string; npv_usd: number; capex_total_usd: number
      participacion_primera_produccion: number | null
    }[] = []

    for (let k = desdeOffset; k <= desdeOffset + meses; k += paso) {
      const fechaInicio = mesMas(String(campana.fecha_inicio), k)

      const cronograma = programarCampana({
        fechaInicio,
        equiposPerforacion: campana.equipos_perforacion,
        equiposTerminacion: campana.equipos_terminacion,
        diasPerforacion: campana.dias_perforacion,
        diasTerminacion: campana.dias_terminacion,
        diasMovilizacion: campana.dias_movilizacion,
      }, aProgramar)

      const porInterv = new Map(cronograma.map(p => [p.intervencionId, p]))

      // Se mueven las fechas de las intervenciones de la campaña y, para las
      // perforaciones, el alta del pozo nuevo (que es cuando empieza a existir).
      // Un workover no mueve el alta: el pozo ya venía produciendo.
      const nuevaAlta = new Map<number, string>()
      for (const i of intervCampana) {
        const p = porInterv.get(i.id)
        if (p && i.pozo_id != null && i.tipo === 'perforacion') nuevaAlta.set(i.pozo_id, p.primeraProduccion)
      }

      const ctxCandidato: ContextoEscenario = {
        ...contexto,
        intervencionesRaw: contexto.intervencionesRaw.map(i => {
          const p = porInterv.get(i.id)
          return p ? { ...i, fecha: p.primeraProduccion, fecha_inicio_perforacion: p.inicioPerforacion } : i
        }),
        pozos: contexto.pozos.map(pz =>
          nuevaAlta.has(pz.id) ? { ...pz, fecha_alta: nuevaAlta.get(pz.id) } : pz),
      }

      const { cashflow } = await calcularEscenario(
        escenarioId,
        Math.round(horizonteAnios * 12),
        { contexto: ctxCandidato, persistir: false },
      )

      const flujos = cashflow as unknown as { fecha: string; cash_flow_neto_usd: number; capex_usd: number }[]
      const npv = calcularNPV(flujos, tasaAnual, fechaBase)
      const capexTotal = flujos.reduce((s, f) => s + f.capex_usd, 0)
      const primeraProd = cronograma.reduce((a, p) => (p.primeraProduccion < a ? p.primeraProduccion : a), cronograma[0].primeraProduccion)
      const ultimaProd = cronograma.reduce((a, p) => (p.primeraProduccion > a ? p.primeraProduccion : a), cronograma[0].primeraProduccion)

      // Participación vigente en la concesión de la campaña al momento de la
      // primera producción — es la variable que hace que la fecha importe.
      const concesionId = intervCampana[0]?.concesion_id
      const part = contexto.participaciones
        .filter(p => p.concesion_id === concesionId && p.fecha_desde <= primeraProd && (p.fecha_hasta === null || primeraProd < p.fecha_hasta))
        .sort((a, b) => String(b.fecha_desde).localeCompare(String(a.fecha_desde)))[0]

      puntos.push({
        offset_meses: k,
        fecha_inicio: fechaInicio,
        primera_produccion: primeraProd,
        ultima_produccion: ultimaProd,
        npv_usd: npv,
        capex_total_usd: capexTotal,
        participacion_primera_produccion: part?.porcentaje ?? null,
      })
    }

    const mejor = puntos.reduce((a, p) => (p.npv_usd > a.npv_usd ? p : a), puntos[0])

    // Fechas en las que cambia la participación, para marcarlas en el gráfico.
    const concesionId = intervCampana[0]?.concesion_id
    const cambiosParticipacion = contexto.participaciones
      .filter(p => p.concesion_id === concesionId)
      .map(p => ({ fecha: String(p.fecha_desde), porcentaje: p.porcentaje }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))

    return NextResponse.json({
      campana: { id: campana.id, nombre: campana.nombre, fecha_inicio: campana.fecha_inicio },
      fecha_base_descuento: fechaBase,
      tasa_descuento: tasaAnual,
      puntos,
      mejor,
      cambios_participacion: cambiosParticipacion,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { cargarContexto, hashContexto } from '@/lib/reservas/engine'

// ─── ¿Los resultados que estoy mirando siguen siendo válidos? ────────────
// Compara la huella de los datos actuales contra la que se selló al correr el
// motor. Si alguien editó un precio, una curva o una intervención desde
// entonces, el VAN que está en pantalla es viejo — y ese es justo el número
// que termina en una presentación.

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  if (!Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  try {
    const { data: metricas } = await db
      .from('escenario_metricas')
      .select('*')
      .eq('escenario_id', escenarioId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!metricas) {
      return NextResponse.json({ estado: 'sin_correr', mensaje: 'Este escenario todavía no se calculó.' })
    }

    // Sin la migración de trazabilidad no hay huella guardada: se informa el
    // resultado igual, aclarando que no se puede verificar si quedó viejo.
    if (metricas.hash_inputs == null) {
      return NextResponse.json({
        estado: 'sin_huella',
        calculado_en: metricas.calculado_en ?? null,
        mensaje: 'No se puede verificar si los resultados están al día: falta correr 20260801_trazabilidad_corridas.sql.',
      })
    }

    const actual = hashContexto(await cargarContexto(escenarioId))
    const alDia = actual === metricas.hash_inputs

    return NextResponse.json({
      estado: alDia ? 'al_dia' : 'desactualizado',
      calculado_en: metricas.calculado_en ?? null,
      calculado_por: metricas.calculado_por ?? null,
      tasa_descuento: metricas.tasa_descuento,
      horizonte_anios: metricas.horizonte_anios,
      mensaje: alDia
        ? 'Los resultados corresponden a los datos actuales.'
        : 'Los datos cambiaron desde la última corrida. Volvé a calcular antes de usar estos números.',
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

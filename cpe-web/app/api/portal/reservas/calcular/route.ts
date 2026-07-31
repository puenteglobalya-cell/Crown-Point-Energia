import { NextRequest, NextResponse } from 'next/server'
import { requireReservasAccess } from '@/lib/reservas/access'
import { calcularEscenario, calcularAgregadosAnuales, calcularMetricasEscenario } from '@/lib/reservas/engine'
import { isSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const escenarioId = Number(body.escenario_id)
  const tasaAnual = Number(body.tasa_anual ?? 0.10)
  const horizonteAnios = Number(body.horizonte_anios ?? 999) // 999 = full-life por convención
  if (!Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  }

  try {
    const resumen = await calcularEscenario(escenarioId)
    const agregados = await calcularAgregadosAnuales(escenarioId)
    const metricas = await calcularMetricasEscenario(escenarioId, tasaAnual, horizonteAnios)

    return NextResponse.json({ ...resumen, ...agregados, ...metricas })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { calcularEscenario, calcularNPV } from '@/lib/reservas/engine'
import { isSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const escenarioId = Number(body.escenario_id)
  const tasaAnual = Number(body.tasa_anual ?? 0.10)
  if (!Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  }

  try {
    const resumen = await calcularEscenario(escenarioId)

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

    return NextResponse.json({ ...resumen, npv, total_cashflow: totalCashflow, tasa_anual: tasaAnual })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

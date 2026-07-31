import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = req.nextUrl.searchParams.get('escenario_id')
  if (!escenarioId) return NextResponse.json({ error: 'Falta escenario_id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('cashflow_mensual')
    .select('*')
    .eq('escenario_id', escenarioId)
    .order('fecha')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

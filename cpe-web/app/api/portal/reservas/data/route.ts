import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

const TABLES = [
  'provincias', 'yacimientos', 'concesiones', 'concesion_participacion',
  'pozos', 'pozos_tipo', 'curvas_produccion', 'intervenciones',
  'formulas_precio', 'precios_referencia', 'precios_mensuales',
  'opex_fijo', 'opex_variable', 'regalias', 'escenarios',
] as const
type Tabla = typeof TABLES[number]

export async function GET() {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const results = await Promise.all(TABLES.map(t => db.from(t).select('*').order('id')))
  const err = results.find(r => r.error)
  if (err?.error) return NextResponse.json({ error: err.error.message }, { status: 500 })

  const data: Record<string, unknown> = {}
  TABLES.forEach((t, i) => { data[t] = results[i].data })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { tabla, valores } = body as { tabla: Tabla; valores: Record<string, unknown> }

  if (!TABLES.includes(tabla)) {
    return NextResponse.json({ error: `Tabla inválida: ${tabla}` }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from(tabla).insert(valores).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

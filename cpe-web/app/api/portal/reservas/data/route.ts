import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const TABLES = [
  'provincias', 'yacimientos', 'concesiones', 'concesion_participacion',
  'pozos', 'pozos_tipo', 'curvas_produccion', 'intervenciones',
  'formulas_precio', 'precios_referencia', 'precios_mensuales',
  'opex_fijo', 'opex_variable', 'opex_fijo_pozo', 'regalias', 'escenarios',
  'reservas_anuales', 'parametros_certeza_reservas', 'supuestos_generales', 'deuda_notas', 'comparables_mercado',
  'resultados_escenario_anual', 'escenario_metricas', 'reservas_depletion_anual',
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
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
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

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { tabla, id, valores } = body as { tabla: Tabla; id: number; valores: Record<string, unknown> }

  if (!TABLES.includes(tabla)) {
    return NextResponse.json({ error: `Tabla inválida: ${tabla}` }, { status: 400 })
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from(tabla).update(valores).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { tabla, id } = body as { tabla: Tabla; id: number }

  if (!TABLES.includes(tabla)) {
    return NextResponse.json({ error: `Tabla inválida: ${tabla}` }, { status: 400 })
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from(tabla).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

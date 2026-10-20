import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole, logActivity } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const runtime = 'nodejs'

const CLASES = ['Aframax', 'Suezmax', 'otra'] as const

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, role, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (role?.role !== 'admin' && role?.role !== 'finanzas') {
    return NextResponse.json({ error: 'No autorizado para cargar referencias de mercado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })

  const fecha = String(body.fecha ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  if (!body.ruta) return NextResponse.json({ error: 'Falta la ruta' }, { status: 400 })
  if (!CLASES.includes(body.clase)) return NextResponse.json({ error: 'Clase de buque inválida' }, { status: 400 })
  const sinNingunaTarifa = body.tarifaWs == null && body.tarifaUsdTon == null && body.tarifaUsdBbl == null
  if (sinNingunaTarifa) return NextResponse.json({ error: 'Cargá al menos una tarifa (WS, US$/ton o US$/bbl)' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('fletes_referencia_mercado').insert({
    fecha, ruta: String(body.ruta).slice(0, 200), clase: body.clase,
    tarifa_ws: body.tarifaWs != null ? Number(body.tarifaWs) : null,
    tarifa_usd_ton: body.tarifaUsdTon != null ? Number(body.tarifaUsdTon) : null,
    tarifa_usd_bbl: body.tarifaUsdBbl != null ? Number(body.tarifaUsdBbl) : null,
    fuente: body.fuente ? String(body.fuente).slice(0, 200) : null,
  }).select('id').single()
  if (error) return dbError(error)

  await logActivity({
    userId: user.id, userEmail: user.email ?? null, action: 'cargar_referencia_flete',
    resourceType: 'fletes_referencia_mercado', resourceId: data.id,
  })

  return NextResponse.json({ id: data.id }, { status: 201 })
}

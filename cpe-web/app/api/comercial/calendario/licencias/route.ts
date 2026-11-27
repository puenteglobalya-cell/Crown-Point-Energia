import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const runtime = 'nodejs'

const TIPOS = ['vacaciones', 'licencia'] as const

export async function GET(req: NextRequest) {
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const desde = req.nextUrl.searchParams.get('desde')
  const hasta = req.nextUrl.searchParams.get('hasta')
  if (!desde || !hasta || !/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return NextResponse.json({ error: 'Parámetros desde/hasta inválidos (YYYY-MM-DD)' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  // Overlap: la licencia cruza el rango visible si empieza antes de que
  // termine el rango Y termina después de que empieza el rango.
  const { data, error } = await db
    .from('comercial_calendario_licencias')
    .select('id, nombre, tipo, fecha_desde, fecha_hasta, notas')
    .lte('fecha_desde', hasta)
    .gte('fecha_hasta', desde)
    .order('fecha_desde', { ascending: true })
  if (error) return dbError(error)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })

  const nombre = String(body.nombre ?? '').trim()
  const tipo = TIPOS.includes(body.tipo) ? body.tipo : 'vacaciones'
  const fechaDesde = String(body.fecha_desde ?? '')
  const fechaHasta = String(body.fecha_hasta ?? '')
  const notas = body.notas ? String(body.notas).slice(0, 500) : null

  if (!nombre) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 })
  if (nombre.length > 100) return NextResponse.json({ error: 'El nombre no puede superar 100 caracteres' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)) {
    return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
  }
  if (fechaHasta < fechaDesde) return NextResponse.json({ error: 'La fecha hasta no puede ser anterior a desde' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('comercial_calendario_licencias')
    .insert({ nombre, tipo, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, notas, created_by: user.id })
    .select('id, nombre, tipo, fecha_desde, fecha_hasta, notas')
    .single()
  if (error) return dbError(error)

  return NextResponse.json(data)
}

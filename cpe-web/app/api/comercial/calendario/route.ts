import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const desde = req.nextUrl.searchParams.get('desde')
  const hasta = req.nextUrl.searchParams.get('hasta')
  if (!desde || !hasta || !/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return NextResponse.json({ error: 'Parámetros desde/hasta inválidos (YYYY-MM-DD)' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('comercial_calendario_notas')
    .select('id, fecha, texto, hecho, created_at')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('created_at', { ascending: true })
  if (error) return dbError(error)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const fecha = String(body.fecha ?? '')
  const texto = String(body.texto ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  if (!texto) return NextResponse.json({ error: 'Falta el texto' }, { status: 400 })
  if (texto.length > 500) return NextResponse.json({ error: 'El texto no puede superar 500 caracteres' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('comercial_calendario_notas')
    .insert({ fecha, texto, created_by: user.id })
    .select('id, fecha, texto, hecho, created_at')
    .single()
  if (error) return dbError(error)

  return NextResponse.json(data)
}

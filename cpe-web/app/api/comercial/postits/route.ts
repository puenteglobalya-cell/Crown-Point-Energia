import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const runtime = 'nodejs'

export async function GET() {
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('comercial_postits')
    .select('id, texto, hecho, orden, created_at')
    .order('orden', { ascending: true })
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
  const texto = String(body.texto ?? '').trim()
  if (!texto) return NextResponse.json({ error: 'Falta el texto' }, { status: 400 })
  if (texto.length > 500) return NextResponse.json({ error: 'El texto no puede superar 500 caracteres' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { count } = await db.from('comercial_postits').select('id', { count: 'exact', head: true })
  const { data, error } = await db
    .from('comercial_postits')
    .insert({ texto, orden: count ?? 0, created_by: user.id })
    .select('id, texto, hecho, orden, created_at')
    .single()
  if (error) return dbError(error)

  return NextResponse.json(data)
}

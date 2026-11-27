import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.texto === 'string') {
    const texto = body.texto.trim()
    if (!texto) return NextResponse.json({ error: 'El texto no puede estar vacío' }, { status: 400 })
    if (texto.length > 500) return NextResponse.json({ error: 'El texto no puede superar 500 caracteres' }, { status: 400 })
    patch.texto = texto
  }
  if (typeof body.hecho === 'boolean') patch.hecho = body.hecho
  if (typeof body.fecha === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    patch.fecha = body.fecha
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('comercial_calendario_notas')
    .update(patch)
    .eq('id', params.id)
    .select('id, fecha, texto, hecho, created_at')
    .single()
  if (error) return dbError(error)

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('comercial_calendario_notas').delete().eq('id', params.id)
  if (error) return dbError(error)

  return NextResponse.json({ ok: true })
}

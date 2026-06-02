import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireHrUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { logActivity } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('open_positions')
    .select('*')
    .order('orden')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { area, location, tipo } = body
  if (!area) return NextResponse.json({ error: 'El campo "área" es requerido' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data: maxRow } = await db.from('open_positions').select('orden').order('orden', { ascending: false }).limit(1).single()
  const nextOrden = (maxRow?.orden ?? 0) + 1

  const { data, error } = await db.from('open_positions').insert({
    area: area.trim(),
    location: (location ?? '').trim(),
    tipo: (tipo ?? 'Full-time').trim(),
    activo: true,
    orden: nextOrden,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({ userId: user.id, userEmail: user.email ?? null, action: 'create_posicion', resourceType: 'posicion', resourceId: data.id, metadata: { area, location, tipo } })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('open_positions').update({
    ...fields,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({ userId: user.id, userEmail: user.email ?? null, action: 'update_posicion', resourceType: 'posicion', resourceId: id, metadata: fields })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('open_positions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({ userId: user.id, userEmail: user.email ?? null, action: 'delete_posicion', resourceType: 'posicion', resourceId: id })
  return NextResponse.json({ ok: true })
}

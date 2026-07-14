import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/ir-alertas/[id] — toggle activo or update nombre
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await req.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof raw.activo === 'boolean') patch.activo = raw.activo
  if (typeof raw.nombre === 'string') patch.nombre = raw.nombre.trim()

  const sb = createSupabaseServerClient()
  const { data, error } = await sb
    .from('ir_alert_recipients')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

// DELETE /api/admin/ir-alertas/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createSupabaseServerClient()
  const { error } = await sb.from('ir_alert_recipients').delete().eq('id', params.id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

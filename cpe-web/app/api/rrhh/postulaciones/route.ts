import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireHrUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { logActivity } from '@/lib/roles'
import { dbError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('job_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, estado, notas } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (estado !== undefined) update.estado = estado
  if (notas !== undefined) update.notas = notas

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('job_applications').update(update).eq('id', id)
  if (error) return dbError(error)

  await logActivity({ userId: user.id, userEmail: user.email ?? null, action: 'update_postulacion', resourceType: 'postulacion', resourceId: id, metadata: { estado, notas: notas != null } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data: app } = await db.from('job_applications').select('cv_path, nombre').eq('id', id).single()
  if (app?.cv_path) {
    await db.storage.from('documents').remove([app.cv_path])
  }

  const { error } = await db.from('job_applications').delete().eq('id', id)
  if (error) return dbError(error)

  await logActivity({ userId: user.id, userEmail: user.email ?? null, action: 'delete_postulacion', resourceType: 'postulacion', resourceId: id, metadata: { nombre: app?.nombre } })
  return NextResponse.json({ ok: true })
}

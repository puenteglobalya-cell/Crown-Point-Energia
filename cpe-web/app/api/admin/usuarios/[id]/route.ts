import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { role, activo } = body

  if (role !== undefined && !['viewer', 'uploader', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (role !== undefined) updateData.role = role
  if (activo !== undefined) updateData.activo = activo

  // Upsert to handle users that may not have a role row yet
  const { error } = await db.from('user_roles').upsert({
    user_id: params.id,
    ...updateData,
  }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get target user email for logging
  const { data: { user: targetUser } } = await db.auth.admin.getUserById(params.id)

  await logActivity({
    userId: adminUser.id,
    userEmail: adminUser.email ?? null,
    action: role !== undefined ? 'change_role' : 'toggle_activo',
    resourceType: 'user',
    resourceId: params.id,
    metadata: { targetEmail: targetUser?.email ?? null, role, activo },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()

  // Get target user email for logging before deleting
  const { data: { user: targetUser } } = await db.auth.admin.getUserById(params.id)

  // Delete auth user (user_roles will cascade)
  const { error } = await db.auth.admin.deleteUser(params.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity({
    userId: adminUser.id,
    userEmail: adminUser.email ?? null,
    action: 'delete_user',
    resourceType: 'user',
    resourceId: params.id,
    metadata: { targetEmail: targetUser?.email ?? null },
  })

  return NextResponse.json({ ok: true })
}

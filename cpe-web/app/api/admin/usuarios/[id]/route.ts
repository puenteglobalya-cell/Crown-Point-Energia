import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { role, activo, dni, nombre, apellido, ubicacion, sector, telefono, notas } = body

  if (role !== undefined && !['viewer', 'uploader', 'admin', 'rrhh', 'accionista'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const db  = createSupabaseServerAdminClient()
  const now = new Date().toISOString()
  const ops: PromiseLike<unknown>[] = []

  // ── Role / activo ──────────────────────────────────────────────────────────
  if (role !== undefined || activo !== undefined) {
    const roleData: Record<string, unknown> = { user_id: params.id, updated_at: now }
    if (role   !== undefined) roleData.role   = role
    if (activo !== undefined) roleData.activo = activo
    ops.push(db.from('user_roles').upsert(roleData, { onConflict: 'user_id' }))
  }

  // ── Profile fields ─────────────────────────────────────────────────────────
  const profileFields = { dni, nombre, apellido, ubicacion, sector, telefono, notas }
  const hasProfile = Object.values(profileFields).some(v => v !== undefined)
  if (hasProfile) {
    const profileData: Record<string, unknown> = { user_id: params.id, updated_at: now }
    for (const [k, v] of Object.entries(profileFields)) {
      if (v !== undefined) profileData[k] = String(v).slice(0, 500)
    }
    ops.push(db.from('user_profiles').upsert(profileData, { onConflict: 'user_id' }))
  }

  const results = await Promise.all(ops)
  const firstError = results.find((r: any) => r?.error)
  if (firstError) return dbError((firstError as any).error)

  const { data: { user: targetUser } } = await db.auth.admin.getUserById(params.id)

  await logActivity({
    userId:       adminUser.id,
    userEmail:    adminUser.email ?? null,
    action:       role !== undefined ? 'change_role' : activo !== undefined ? 'toggle_activo' : 'update_profile',
    resourceType: 'user',
    resourceId:   params.id,
    metadata:     { targetEmail: targetUser?.email ?? null, role, activo, ...hasProfile ? { dni, sector, ubicacion } : {} },
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
    return dbError(error)
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

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function getAdminUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (user.email && CMS_ADMIN_EMAILS.includes(user.email)) return user

  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (roleRow?.role === 'admin' && roleRow?.activo) return user

  return null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const adminUser = await getAdminUser()
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
  const adminUser = await getAdminUser()
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

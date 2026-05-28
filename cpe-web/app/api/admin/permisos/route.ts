import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { PERMISSIONS, PERMISSION_KEYS, ADMIN_LOCKED, type Permission } from '@/lib/permissions-config'
import type { UserRole } from '@/lib/roles'

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
  const { data } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  return data?.role === 'admin' && data?.activo ? user : null
}

const ROLES: UserRole[] = ['viewer', 'uploader', 'admin']

// GET — returns full permissions matrix
export async function GET() {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('role_permissions').select('role, permission, enabled')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build matrix: { viewer: { view_drafts: false, ... }, uploader: {...}, admin: {...} }
  const matrix: Record<string, Record<string, boolean>> = {}
  for (const role of ROLES) {
    matrix[role] = {}
    for (const perm of PERMISSION_KEYS) {
      matrix[role][perm] = false
    }
  }
  for (const row of data ?? []) {
    if (matrix[row.role]) matrix[row.role][row.permission] = row.enabled
  }
  // Admin locked permissions are always true
  for (const perm of ADMIN_LOCKED) {
    matrix['admin'][perm] = true
  }

  return NextResponse.json(matrix)
}

// PUT — update a single role+permission toggle
export async function PUT(req: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, permission, enabled } = await req.json()

  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  if (!PERMISSION_KEYS.includes(permission as Permission)) return NextResponse.json({ error: 'Permiso inválido' }, { status: 400 })

  // Prevent disabling locked admin permissions
  if (role === 'admin' && ADMIN_LOCKED.includes(permission as Permission) && !enabled) {
    return NextResponse.json({ error: 'Este permiso no puede desactivarse para el rol admin' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('role_permissions').upsert(
    { role, permission, enabled, updated_at: new Date().toISOString() },
    { onConflict: 'role,permission' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

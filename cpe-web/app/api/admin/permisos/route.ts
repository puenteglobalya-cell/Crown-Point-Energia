import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { PERMISSIONS, PERMISSION_KEYS, ADMIN_LOCKED, type Permission } from '@/lib/permissions-config'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import type { UserRole } from '@/lib/roles'
import { dbError } from '@/lib/api-error'

const ROLES: UserRole[] = ['viewer', 'uploader', 'admin']

// GET — returns full permissions matrix
export async function GET() {
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('role_permissions').select('role, permission, enabled')
  if (error) return dbError(error)

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
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
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
  if (error) return dbError(error)

  return NextResponse.json({ ok: true })
}

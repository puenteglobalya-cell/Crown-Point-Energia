import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'viewer' | 'uploader' | 'admin'
export type RoleRow = { role: UserRole; activo: boolean }

export type Permission =
  | 'view_drafts'
  | 'upload_reports'
  | 'publish_reports'
  | 'manage_users'
  | 'manage_cms'

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_drafts:     'Ver reportes borrador',
  upload_reports:  'Subir reportes',
  publish_reports: 'Publicar / despublicar reportes',
  manage_users:    'Gestionar usuarios',
  manage_cms:      'Panel CMS / Admin',
}

// Permissions that are always locked for admin (structural — can't lock yourself out)
export const ADMIN_LOCKED: Permission[] = ['manage_users', 'manage_cms']

// Fallback defaults when role_permissions table has no data
const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer:   [],
  uploader: ['view_drafts', 'upload_reports'],
  admin:    ['view_drafts', 'upload_reports', 'publish_reports', 'manage_users', 'manage_cms'],
}

export async function getPermissionsForRole(role: UserRole): Promise<Set<Permission>> {
  try {
    const db = createSupabaseServerAdminClient()
    const { data } = await db
      .from('role_permissions')
      .select('permission, enabled')
      .eq('role', role)
    if (!data || data.length === 0) return new Set(DEFAULT_PERMISSIONS[role])
    return new Set(
      data.filter(r => r.enabled).map(r => r.permission as Permission)
    )
  } catch {
    return new Set(DEFAULT_PERMISSIONS[role])
  }
}

// Returns user + role (checks CMS_ADMIN_EMAILS first for backward compat)
export async function getCurrentUserAndRole(): Promise<{
  user: User | null
  role: RoleRow | null
  permissions: Set<Permission>
}> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, role: null, permissions: new Set() }

  const adminEmails = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (user.email && adminEmails.includes(user.email)) {
    const role: RoleRow = { role: 'admin', activo: true }
    const permissions = await getPermissionsForRole('admin')
    // Admin email always gets manage_users + manage_cms regardless of DB
    ADMIN_LOCKED.forEach(p => permissions.add(p))
    return { user, role, permissions }
  }

  const { data } = await createSupabaseServerAdminClient()
    .from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (!data) return { user, role: null, permissions: new Set() }

  const roleRow = data as RoleRow
  const permissions = roleRow.activo
    ? await getPermissionsForRole(roleRow.role)
    : new Set<Permission>()

  if (roleRow.role === 'admin') {
    ADMIN_LOCKED.forEach(p => permissions.add(p))
  }

  return { user, role: roleRow, permissions }
}

export function canUpload(permissions: Set<Permission> | UserRole | null | undefined): boolean {
  if (!permissions) return false
  if (permissions instanceof Set) return permissions.has('upload_reports')
  // Legacy: role string fallback
  return permissions === 'uploader' || permissions === 'admin'
}

export function isAdminRole(permissions: Set<Permission> | UserRole | null | undefined): boolean {
  if (!permissions) return false
  if (permissions instanceof Set) return permissions.has('manage_users')
  return permissions === 'admin'
}

export function canPublish(permissions: Set<Permission>): boolean {
  return permissions.has('publish_reports')
}

export function canManageCms(permissions: Set<Permission>): boolean {
  return permissions.has('manage_cms')
}

// Log an action to activity_log
export async function logActivity(opts: {
  userId: string | null
  userEmail: string | null
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await createSupabaseServerAdminClient().from('activity_log').insert({
      user_id: opts.userId,
      user_email: opts.userEmail,
      action: opts.action,
      resource_type: opts.resourceType ?? null,
      resource_id: opts.resourceId ?? null,
      metadata: opts.metadata ?? null,
    })
  } catch {}
}

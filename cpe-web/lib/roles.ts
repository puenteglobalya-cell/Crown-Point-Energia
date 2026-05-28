import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'viewer' | 'uploader' | 'admin'
export type RoleRow = { role: UserRole; activo: boolean }

// Returns user + role (checks CMS_ADMIN_EMAILS first for backward compat)
export async function getCurrentUserAndRole(): Promise<{ user: User | null; role: RoleRow | null }> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, role: null }

  const adminEmails = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (user.email && adminEmails.includes(user.email)) {
    return { user, role: { role: 'admin', activo: true } }
  }

  const { data } = await createSupabaseServerAdminClient()
    .from('user_roles').select('role, activo').eq('user_id', user.id).single()
  return { user, role: data ?? null }
}

export function canUpload(role: UserRole | null | undefined) {
  return role === 'uploader' || role === 'admin'
}

export function isAdminRole(role: UserRole | null | undefined) {
  return role === 'admin'
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

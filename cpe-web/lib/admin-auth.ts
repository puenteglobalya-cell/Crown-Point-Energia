import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const CMS_ADMIN_EMAILS: string[] =
  (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && CMS_ADMIN_EMAILS.includes(email)
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getUserRole(userId: string): Promise<{ role: string; activo: boolean } | null> {
  const db = createSupabaseServerAdminClient()
  const { data } = await db
    .from('user_roles')
    .select('role, activo')
    .eq('user_id', userId)
    .single()
  return data
}

/** Returns the authenticated user or null. Checks admin email list first, then user_roles table. */
export async function requireAdminUser() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  if (isAdminEmail(user.email)) return user

  const roleRow = await getUserRole(user.id)
  if (!roleRow?.activo || roleRow.role !== 'admin') return null

  return user
}

/** Returns the authenticated user if they have role 'rrhh' or 'admin'. */
export async function requireHrUser() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  if (isAdminEmail(user.email)) return user

  const roleRow = await getUserRole(user.id)
  if (!roleRow?.activo) return null
  if (roleRow.role !== 'rrhh' && roleRow.role !== 'admin') return null

  return user
}

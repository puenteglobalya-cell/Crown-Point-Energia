import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const CMS_ADMIN_EMAILS: string[] =
  (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && CMS_ADMIN_EMAILS.includes(email)
}

/** Returns the authenticated user or null. Checks admin email list first, then user_roles table. */
export async function requireAdminUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (isAdminEmail(user.email)) return user

  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db
    .from('user_roles')
    .select('role, activo')
    .eq('user_id', user.id)
    .single()
  if (!roleRow?.activo || roleRow.role !== 'admin') return null

  return user
}

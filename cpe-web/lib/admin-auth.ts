import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const CMS_ADMIN_EMAILS: string[] =
  (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

// Supabase Auth normaliza emails a minúsculas, pero sin este .toLowerCase()
// acá el allowlist dependía de que CMS_ADMIN_EMAILS también se hubiera
// tipeado en minúsculas en Vercel — si alguien lo cargaba con mayúsculas, ese
// admin perdía acceso elevado en silencio (falla cerrado, no es un agujero de
// seguridad, pero sí un problema operativo).
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && CMS_ADMIN_EMAILS.includes(email.toLowerCase())
}

function getAuthClient() {
  // Need a fresh instance per call since `cookies()` ties it to the request.
  return (async () => {
    const cookieStore = await cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
  })()
}

async function getAuthenticatedUser() {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Mismo criterio que enforceAdminMfa en middleware.ts, pero exigido también
// en la API (el middleware solo protege rutas de página, nunca /api/*, así
// que sin esto cualquiera con la sesión de un admin/rrhh/etc. sin MFA
// configurado podía pegarle directo al endpoint y saltearse el paso de
// autenticación de dos factores).
export async function hasAal2(): Promise<boolean> {
  const supabase = await getAuthClient()
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return aal?.currentLevel === 'aal2'
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

  const isEmailAdmin = isAdminEmail(user.email)
  if (!isEmailAdmin) {
    const roleRow = await getUserRole(user.id)
    if (!roleRow?.activo || roleRow.role !== 'admin') return null
  }

  if (!(await hasAal2())) return null

  return user
}

/** Returns the authenticated user if they have role 'rrhh' or 'admin'. */
export async function requireHrUser() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  if (!isAdminEmail(user.email)) {
    const roleRow = await getUserRole(user.id)
    if (!roleRow?.activo) return null
    if (roleRow.role !== 'rrhh' && roleRow.role !== 'admin') return null
  }

  if (!(await hasAal2())) return null

  return user
}

/** Returns the authenticated user if they have role 'compliance' or 'admin'. */
export async function requireComplianceUser() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  if (!isAdminEmail(user.email)) {
    const roleRow = await getUserRole(user.id)
    if (!roleRow?.activo) return null
    if (roleRow.role !== 'compliance' && roleRow.role !== 'admin') return null
  }

  if (!(await hasAal2())) return null

  return user
}

/** Returns the authenticated user if they have role 'finanzas' or 'admin'. */
export async function requireFinanzasUser() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  if (!isAdminEmail(user.email)) {
    const roleRow = await getUserRole(user.id)
    if (!roleRow?.activo) return null
    if (roleRow.role !== 'finanzas' && roleRow.role !== 'admin') return null
  }

  if (!(await hasAal2())) return null

  return user
}

/** Returns user + role for any authenticated active user (admin, viewer, uploader, rrhh…). */
export async function requireAnyActiveUser() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  if (isAdminEmail(user.email)) {
    return { user, role: 'admin' as const, isAdmin: true }
  }

  const roleRow = await getUserRole(user.id)
  if (!roleRow?.activo) return null

  return { user, role: roleRow.role, isAdmin: roleRow.role === 'admin' }
}

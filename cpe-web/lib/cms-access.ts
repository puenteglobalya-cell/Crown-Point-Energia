import { requireAnyActiveUser, hasAal2 } from '@/lib/admin-auth'
import { getPermissionsForRole, type UserRole } from '@/lib/roles'

// Mismo patrón que requireReservasAccess (lib/reservas/access.ts) — permite
// habilitar edición del contenido de la web (/admin/cms) a un rol sin darle
// el resto de las capacidades de Admin (usuarios, permisos, etc.).
//
// manage_cms puede defacear el sitio público (ver 20261107_security_hardening_rls.sql),
// así que exige AAL2 igual que los demás roles privilegiados, aunque
// requireAnyActiveUser (de la que depende) no lo exige para el resto de roles.
export async function requireCmsUser() {
  const auth = await requireAnyActiveUser()
  if (!auth) return null
  if (!auth.isAdmin) {
    const permissions = await getPermissionsForRole(auth.role as UserRole)
    if (!permissions.has('manage_cms')) return null
  }
  if (!(await hasAal2())) return null
  return auth
}

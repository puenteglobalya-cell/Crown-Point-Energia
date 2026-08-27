import { requireAnyActiveUser } from '@/lib/admin-auth'
import { getPermissionsForRole, type UserRole } from '@/lib/roles'

// Mismo patrón que requireReservasAccess (lib/reservas/access.ts) — permite
// habilitar edición del contenido de la web (/admin/cms) a un rol sin darle
// el resto de las capacidades de Admin (usuarios, permisos, etc.).
export async function requireCmsUser() {
  const auth = await requireAnyActiveUser()
  if (!auth) return null
  if (auth.isAdmin) return auth
  const permissions = await getPermissionsForRole(auth.role as UserRole)
  if (!permissions.has('manage_cms')) return null
  return auth
}

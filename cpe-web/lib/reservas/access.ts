import { requireAnyActiveUser } from '@/lib/admin-auth'
import { getPermissionsForRole, type UserRole } from '@/lib/roles'

export async function requireReservasAccess() {
  const auth = await requireAnyActiveUser()
  if (!auth) return null
  const permissions = await getPermissionsForRole(auth.role as UserRole)
  if (!permissions.has('view_reservas')) return null
  return auth
}

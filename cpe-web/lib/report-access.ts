import { createSupabaseServerAdminClient } from '@/lib/supabase'

/**
 * Object-level access control for a single report — mirrors the portal listing
 * logic (app/portal/(auth)/page.tsx) so the API can't be used to bypass the UI.
 *
 *  - admin           → all reports
 *  - accionista      → reports of a type granted in report_type_access (blanket,
 *                       e.g. "todo el Modelo Comercial"), OR individually granted
 *                       in portal_report_access (one-off exceptions)
 *  - other roles     → only report types granted in report_type_access (can_view)
 *
 * Returns true if the user may access the report.
 */
export async function canAccessReport(
  userId: string,
  role: string,
  reporteId: string,
  typeId: string | null,
): Promise<boolean> {
  if (role === 'admin') return true

  const db = createSupabaseServerAdminClient()

  if (role === 'accionista') {
    if (typeId) {
      const { data: tipoAcceso } = await db
        .from('report_type_access')
        .select('type_id')
        .eq('role', 'accionista')
        .eq('can_view', true)
        .eq('type_id', typeId)
        .maybeSingle()
      if (tipoAcceso) return true
    }

    const { data } = await db
      .from('portal_report_access')
      .select('reporte_id')
      .eq('user_id', userId)
      .eq('reporte_id', reporteId)
      .maybeSingle()
    return !!data
  }

  // Non-admin, non-accionista roles: gated by report type
  if (!typeId) return true // untyped reports are visible to all active users (matches portal)
  const { data } = await db
    .from('report_type_access')
    .select('type_id')
    .eq('role', role)
    .eq('can_view', true)
    .eq('type_id', typeId)
    .maybeSingle()
  return !!data
}

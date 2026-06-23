import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()

  const [
    cmsSettings,
    cmsFields,
    cmsSections,
    reportes,
    userRoles,
    rolePermissions,
  ] = await Promise.all([
    db.from('cms_settings').select('*'),
    db.from('cms_fields').select('*'),
    db.from('cms_sections').select('*'),
    db.from('reportes').select('id, type_id, titulo, periodo, estado, created_at, updated_at'),
    db.from('user_roles').select('user_id, role, activo, updated_at'),
    db.from('role_permissions').select('role, permission, enabled, updated_at'),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: adminUser.email,
    version: 1,
    cms_settings:    cmsSettings.data    ?? [],
    cms_fields:      cmsFields.data      ?? [],
    cms_sections:    cmsSections.data    ?? [],
    reportes:        reportes.data       ?? [],
    user_roles:      userRoles.data      ?? [],
    role_permissions: rolePermissions.data ?? [],
  }

  const json = JSON.stringify(payload, null, 2)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="cpe-backup-${date}.json"`,
    },
  })
}

// ─── Single source of truth for portal permissions ──────────────────────────
// To add a new section: append one entry here. The admin matrix and all
// permission checks pick it up automatically.

export const PERMISSIONS = {
  view_reports:    'Ver reportes',
  view_dashboard:  'Ver dashboard',
  view_comercial:  'Ver sección comercial',
  view_drafts:     'Ver reportes borrador',
  upload_reports:  'Subir reportes',
  publish_reports: 'Publicar / despublicar reportes',
  delete_reports:  'Eliminar reportes',
  manage_users:    'Gestionar usuarios',
  manage_cms:      'Panel CMS / Admin',
  view_investor:   'Ver sección inversores',
} as const

export type Permission = keyof typeof PERMISSIONS
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[]

// These are always enabled for admin and cannot be toggled off
export const ADMIN_LOCKED: Permission[] = ['manage_users', 'manage_cms']

// Defaults applied when no DB row exists for a given permission.
// DB rows override these — new permissions added here won't break existing users.
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  viewer:     ['view_reports', 'view_dashboard', 'view_comercial'],
  uploader:   ['view_reports', 'view_dashboard', 'view_comercial', 'view_drafts', 'upload_reports'],
  admin:      PERMISSION_KEYS,
  rrhh:       ['view_reports', 'view_dashboard'],
  accionista: ['view_reports', 'view_dashboard', 'view_comercial', 'view_investor'],
  finanzas:   ['view_reports', 'view_dashboard', 'view_drafts', 'upload_reports'],
}

// Report types the 'finanzas' role can see/upload in its sandboxed sub-portal
// (/portal/finanzas) — everything else (Comercial, Producción, Seguimiento…)
// is out of scope for that role, the same way /admin/rrhh is the only admin
// screen an 'rrhh' user can reach.
export const FINANZAS_REPORT_TYPES = ['financiero', 'facturacion'] as const

// Report types the 'accionista' role can see in its sandboxed sub-portal
// (/portal/accionista) — same sandboxing pattern as finanzas/rrhh.
export const ACCIONISTA_REPORT_TYPES = ['financiero', 'produccion'] as const

// ─── Single source of truth for portal permissions ──────────────────────────
// To add a new section: append one entry here. The admin matrix and all
// permission checks pick it up automatically.

export const PERMISSIONS = {
  view_drafts:     'Ver reportes borrador',
  upload_reports:  'Subir reportes',
  publish_reports: 'Publicar / despublicar reportes',
  manage_users:    'Gestionar usuarios',
  manage_cms:      'Panel CMS / Admin',
  // ↓ future sections — add here
} as const

export type Permission = keyof typeof PERMISSIONS
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[]

// These are always enabled for admin and cannot be toggled off
export const ADMIN_LOCKED: Permission[] = ['manage_users', 'manage_cms']

// Fallback defaults when the DB has no row for a given permission
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  viewer:   [],
  uploader: ['view_drafts', 'upload_reports'],
  admin:    PERMISSION_KEYS,
}

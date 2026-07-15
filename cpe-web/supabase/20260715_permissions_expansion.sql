-- Allow rrhh/accionista roles to receive DB-level permission overrides
-- (previously the CHECK constraint silently rejected any row for these
-- roles, pinning them to the hardcoded DEFAULT_PERMISSIONS fallback with
-- no visibility in the admin matrix UI).
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh', 'accionista'));

-- Seed the new delete_reports permission — separate from upload_reports,
-- so an uploader can create/replace reports without being able to delete them.
INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('viewer',     'delete_reports', false),
  ('uploader',   'delete_reports', false),
  ('admin',      'delete_reports', true),
  ('rrhh',       'delete_reports', false),
  ('accionista', 'delete_reports', false)
ON CONFLICT (role, permission) DO NOTHING;

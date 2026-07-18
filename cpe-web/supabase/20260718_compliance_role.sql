-- Add a dedicated 'compliance' role for reviewing the Línea Ética denuncias
-- channel (/admin/denuncias), instead of reusing 'admin' — so someone can be
-- given access to sensitive whistleblower reports without also getting full
-- CMS/admin control over the rest of the site.
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas', 'compliance'));

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas', 'compliance'));

INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('compliance', 'view_reports',    true),
  ('compliance', 'view_dashboard',  true),
  ('compliance', 'view_comercial',  false),
  ('compliance', 'view_drafts',     false),
  ('compliance', 'upload_reports',  false),
  ('compliance', 'publish_reports', false),
  ('compliance', 'delete_reports',  false),
  ('compliance', 'manage_users',    false),
  ('compliance', 'manage_cms',      false),
  ('compliance', 'view_investor',   false)
ON CONFLICT (role, permission) DO NOTHING;

-- RLS: allow 'compliance' the same admin-only read/write access to
-- denuncias_etica that 'admin' already has (defined in
-- 20260718_denuncias_etica.sql), since that policy currently only checks
-- role = 'admin'.
DROP POLICY IF EXISTS "admin all denuncias" ON denuncias_etica;
CREATE POLICY "admin all denuncias" ON denuncias_etica
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role IN ('admin', 'compliance'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role IN ('admin', 'compliance'))
  );

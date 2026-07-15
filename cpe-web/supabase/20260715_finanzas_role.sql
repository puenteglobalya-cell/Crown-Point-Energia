-- Add a 'finanzas' role, sandboxed to its own sub-portal (/portal/finanzas)
-- the same way 'rrhh' is sandboxed to /admin/rrhh — can upload/manage only
-- financial-type reports (Financiero, Facturación), nothing else.
--
-- Also fixes a latent bug: user_roles never actually had 'accionista' added
-- to its CHECK constraint (only role_permissions did, in the previous
-- migration), so assigning that role to a user would have failed outright.
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas'));

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas'));

INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('finanzas', 'view_reports',    true),
  ('finanzas', 'view_dashboard',  true),
  ('finanzas', 'view_comercial',  false),
  ('finanzas', 'view_drafts',     true),
  ('finanzas', 'upload_reports',  true),
  ('finanzas', 'publish_reports', false),
  ('finanzas', 'delete_reports',  false),
  ('finanzas', 'manage_users',    false),
  ('finanzas', 'manage_cms',      false)
ON CONFLICT (role, permission) DO NOTHING;

-- Report-type-level visibility for finanzas — only Financiero and Facturación
INSERT INTO report_type_access (type_id, role, can_view, can_upload) VALUES
  ('financiero',  'finanzas', true, true),
  ('facturacion', 'finanzas', true, true)
ON CONFLICT (type_id, role) DO NOTHING;

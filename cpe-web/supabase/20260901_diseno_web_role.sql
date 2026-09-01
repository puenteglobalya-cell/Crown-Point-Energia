-- Rol dedicado 'diseno_web' para agencias externas (Micaela Fontán -
-- agenciagloria.com, Mariana M. - vgv.com.ar) que solo deben poder editar el
-- contenido de la web pública (todo el grupo "Contenido Web" del nav de
-- Admin), sin ver reportes internos, el simulador de reservas, ni el resto
-- de Administración.
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas', 'compliance', 'diseno_web'));

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas', 'compliance', 'diseno_web'));

INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('diseno_web', 'view_reports',    false),
  ('diseno_web', 'view_dashboard',  false),
  ('diseno_web', 'view_comercial',  false),
  ('diseno_web', 'view_drafts',     false),
  ('diseno_web', 'upload_reports',  false),
  ('diseno_web', 'publish_reports', false),
  ('diseno_web', 'delete_reports',  false),
  ('diseno_web', 'manage_users',    false),
  ('diseno_web', 'manage_cms',      true),
  ('diseno_web', 'view_investor',   false),
  ('diseno_web', 'view_reservas',   false)
ON CONFLICT (role, permission) DO UPDATE SET enabled = EXCLUDED.enabled;

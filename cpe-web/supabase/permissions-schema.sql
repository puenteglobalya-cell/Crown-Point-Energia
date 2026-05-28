-- Role permissions table — configurable per-role access matrix
CREATE TABLE IF NOT EXISTS role_permissions (
  role        TEXT    NOT NULL CHECK (role IN ('viewer', 'uploader', 'admin')),
  permission  TEXT    NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role, permission)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Admins read/write; service role always bypasses RLS
CREATE POLICY "role_permissions_admin_all" ON role_permissions
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND activo = true
    )
  );

-- Defaults
INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('viewer',   'view_drafts',     false),
  ('viewer',   'upload_reports',  false),
  ('viewer',   'publish_reports', false),
  ('viewer',   'manage_users',    false),
  ('viewer',   'manage_cms',      false),
  ('uploader', 'view_drafts',     true),
  ('uploader', 'upload_reports',  true),
  ('uploader', 'publish_reports', false),
  ('uploader', 'manage_users',    false),
  ('uploader', 'manage_cms',      false),
  ('admin',    'view_drafts',     true),
  ('admin',    'upload_reports',  true),
  ('admin',    'publish_reports', true),
  ('admin',    'manage_users',    true),
  ('admin',    'manage_cms',      true)
ON CONFLICT (role, permission) DO NOTHING;

-- Fix incorrect permission overrides found live in /admin/permisos:
-- 'viewer' (Consulta) had manage_users, manage_cms, upload_reports and
-- publish_reports enabled — a viewer could reach the admin panel and
-- manage other users. 'uploader' (Carga) had publish_reports enabled,
-- letting an uploader self-publish without admin review. Resets both
-- roles to the intended defaults (segregation of duties).
UPDATE role_permissions SET enabled = false, updated_at = NOW()
WHERE role = 'viewer' AND permission IN ('upload_reports', 'publish_reports', 'delete_reports', 'manage_users', 'manage_cms');

UPDATE role_permissions SET enabled = false, updated_at = NOW()
WHERE role = 'uploader' AND permission IN ('publish_reports', 'delete_reports', 'manage_users', 'manage_cms');

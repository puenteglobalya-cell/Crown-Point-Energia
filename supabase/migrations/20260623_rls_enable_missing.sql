-- ============================================================
-- RLS enablement for tables that had policies but no ENABLE
-- Run in Supabase SQL Editor
-- ============================================================

-- CMS tables (written only via service_role in /api/cms/*)
ALTER TABLE IF EXISTS cms_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cms_fields          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cms_sections        ENABLE ROW LEVEL SECURITY;

-- Public can read CMS (needed for SSR rendering with anon key)
DROP POLICY IF EXISTS "anon read cms_settings" ON cms_settings;
CREATE POLICY "anon read cms_settings" ON cms_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon read cms_fields" ON cms_fields;
CREATE POLICY "anon read cms_fields" ON cms_fields
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon read cms_sections" ON cms_sections;
CREATE POLICY "anon read cms_sections" ON cms_sections
  FOR SELECT TO anon, authenticated USING (true);

-- Contact form submissions: anon INSERT (public form), service_role reads
ALTER TABLE IF EXISTS contact_submissions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert contact" ON contact_submissions;
CREATE POLICY "anon insert contact" ON contact_submissions
  FOR INSERT TO anon WITH CHECK (true);

-- Job applications: anon INSERT (public form), service_role manages all
ALTER TABLE IF EXISTS job_applications     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert applications" ON job_applications;
CREATE POLICY "anon insert applications" ON job_applications
  FOR INSERT TO anon WITH CHECK (true);

-- Activity log: service_role writes, admins can read
ALTER TABLE IF EXISTS activity_log         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role all activity_log" ON activity_log;
CREATE POLICY "service_role all activity_log" ON activity_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_roles: service_role manages; users can read their own row only
ALTER TABLE IF EXISTS user_roles           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role all user_roles" ON user_roles;
CREATE POLICY "service_role all user_roles" ON user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth read own role" ON user_roles;
CREATE POLICY "auth read own role" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- role_permissions: public read (checked client-side and server-side)
ALTER TABLE IF EXISTS role_permissions     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role all role_permissions" ON role_permissions;
CREATE POLICY "service_role all role_permissions" ON role_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth read role_permissions" ON role_permissions;
CREATE POLICY "auth read role_permissions" ON role_permissions
  FOR SELECT TO authenticated USING (true);

-- ── Verify ────────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('cms_settings','cms_fields','cms_sections',
--                     'contact_submissions','job_applications',
--                     'activity_log','user_roles','role_permissions')
-- ORDER BY tablename;

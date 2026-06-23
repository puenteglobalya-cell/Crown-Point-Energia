-- ============================================================
-- Security hardening — RLS policy fixes
-- Run in Supabase SQL Editor
-- ============================================================

-- ── C1: ir_subscribers — remove public UPDATE and over-broad auth policy ──
-- The server-side route uses service_role to upsert; anon only needs INSERT
DROP POLICY IF EXISTS "public update ir_sub"  ON ir_subscribers;
DROP POLICY IF EXISTS "auth all ir_sub"       ON ir_subscribers;

-- ── C2: CMS tables — restrict writes to service_role only ────────────────
-- API routes (/api/cms/*) already use the service_role key server-side.
-- The authenticated catch-all allowed any portal user to write CMS directly.
DROP POLICY IF EXISTS "auth insert/update settings" ON cms_settings;
DROP POLICY IF EXISTS "auth insert/update sections" ON cms_sections;
DROP POLICY IF EXISTS "auth insert/update fields"   ON cms_fields;

CREATE POLICY "service_role write settings" ON cms_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role write sections" ON cms_sections
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role write fields"   ON cms_fields
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── C3: contact_submissions — restrict to service_role ───────────────────
DROP POLICY IF EXISTS "auth all contact" ON contact_submissions;

CREATE POLICY "service_role all contact" ON contact_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── C4 + C5: job_applications — restrict SELECT and ALL to service_role ──
DROP POLICY IF EXISTS "auth select applications" ON job_applications;
DROP POLICY IF EXISTS "auth update applications" ON job_applications;

CREATE POLICY "service_role all applications" ON job_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── C6: activity_logs — restrict read to admins only ─────────────────────
DROP POLICY IF EXISTS "admins_read_logs" ON public.activity_logs;

CREATE POLICY "admins_read_logs" ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role = 'admin'
        AND activo = true
    )
  );

-- ── H6: reportes — anon SELECT only allowed for non-sensitive summary data ─
-- The portal enforces per-user access via API; the DB should require auth.
DROP POLICY IF EXISTS "reportes_public_select" ON reportes;

CREATE POLICY "reportes_auth_select" ON reportes
  FOR SELECT TO authenticated
  USING (estado = 'publicado');

-- Allow truly public published reports to be read by the public website
-- (home page / /reportes/* routes render SSR with service role, so they work)
-- If you need anon read for public-facing pages, restrict to specific type_ids:
-- USING (estado = 'publicado' AND type_id IN ('ingresos'))

-- ── Verify policies are active ────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('ir_subscribers','cms_settings','cms_sections','cms_fields',
--                     'contact_submissions','job_applications','activity_logs','reportes')
-- ORDER BY tablename, policyname;

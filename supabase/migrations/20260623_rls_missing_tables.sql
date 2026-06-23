-- ============================================================
-- RLS hardening — tables missing policies
-- Run in Supabase SQL Editor
-- ============================================================

-- ── portal_report_access — only service_role or admin ──────────────────────
-- API routes use service_role key; portal users must NOT query this directly.
ALTER TABLE IF EXISTS portal_report_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role all portal_access" ON portal_report_access;
CREATE POLICY "service_role all portal_access" ON portal_report_access
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── report_comments — owner can read own, service_role manages all ──────────
ALTER TABLE IF EXISTS report_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role all report_comments" ON report_comments;
CREATE POLICY "service_role all report_comments" ON report_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Portal users read their own comments via authenticated session
DROP POLICY IF EXISTS "auth read own comments" ON report_comments;
CREATE POLICY "auth read own comments" ON report_comments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── push_subscriptions — user reads own, service_role manages all ───────────
ALTER TABLE IF EXISTS push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role all push_subs" ON push_subscriptions;
CREATE POLICY "service_role all push_subs" ON push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth read own push_subs" ON push_subscriptions;
CREATE POLICY "auth read own push_subs" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── ir_subscribers — anon INSERT only; service_role manages all ────────────
ALTER TABLE IF EXISTS ir_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert ir_sub" ON ir_subscribers;
CREATE POLICY "anon insert ir_sub" ON ir_subscribers
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role all ir_sub" ON ir_subscribers;
CREATE POLICY "service_role all ir_sub" ON ir_subscribers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Verify ─────────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('portal_report_access','report_comments','push_subscriptions','ir_subscribers')
-- ORDER BY tablename, policyname;

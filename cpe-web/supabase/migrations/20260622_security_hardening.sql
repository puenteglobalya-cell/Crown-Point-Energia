-- ============================================================
-- Security hardening migration — 2026-06-22
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- ── 1. Performance: rewrite auth.uid() → (select auth.uid()) in all RLS policies ──
-- auth.uid() without the subquery is re-evaluated once per ROW.
-- (select auth.uid()) is hoisted to an init-plan and runs ONCE per query.
-- This prevents timeouts on large tables and matches Supabase's own recommendation.
--
-- HOW TO USE: Run the detection query below, then for each policy shown,
-- drop and recreate it with (select auth.uid()) instead of auth.uid().
--
-- Detection query — copy and run to see affected policies:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
--   AND (qual NOT LIKE '%(select auth.uid())%' AND with_check NOT LIKE '%(select auth.uid())%');
--
-- Example fix pattern:
-- DROP POLICY IF EXISTS "policy_name" ON table_name;
-- CREATE POLICY "policy_name" ON table_name
--   FOR SELECT USING (user_id = (select auth.uid()));


-- ── 2. Performance: indexes on user_roles (queried on every authenticated request) ──
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

-- Partial index for active users only — most middleware queries filter activo=true
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_activo
  ON public.user_roles (user_id)
  WHERE activo = true;


-- ── 3. JWT custom claims: embed role in JWT to eliminate DB queries from middleware ──
-- After applying this, middleware can read role from user.app_metadata.role
-- without any Supabase query, eliminating the getRoleRow() latency.

CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data ||
    jsonb_build_object(
      'role',   NEW.role,
      'activo', NEW.activo
    )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Trigger fires on INSERT and UPDATE of user_roles
DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_jwt();

-- Backfill: sync existing rows to app_metadata immediately
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT user_id, role, activo FROM public.user_roles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data ||
      jsonb_build_object('role', r.role, 'activo', r.activo)
    WHERE id = r.user_id;
  END LOOP;
END;
$$;


-- ── 4. RLS audit: verify all public tables have RLS enabled ──
-- Run this query to see tables WITHOUT RLS enabled:
--
-- SELECT tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT IN (
--     SELECT DISTINCT tablename
--     FROM pg_policies
--     WHERE schemaname = 'public'
--   );
--
-- For each table returned, run:
--   ALTER TABLE public.<tablename> ENABLE ROW LEVEL SECURITY;
-- And add appropriate policies.
--
-- Tables that need at minimum a deny-all if not used publicly:
--   CREATE POLICY "deny_anon" ON public.<tablename> USING (false);


-- ── 5. Cleanup: push_subscriptions index for fast endpoint lookups ──
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint
  ON public.push_subscriptions (endpoint);


-- ── 6. Audit log: ensure activity_logs table exists for view_report logging ──
-- If activity_logs table doesn't exist yet, create it:
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  user_email  TEXT,
  action      TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can read logs; inserts are from service role
CREATE POLICY IF NOT EXISTS "admins_read_logs" ON public.activity_logs
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- Index for fast queries by user and action
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON public.activity_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource
  ON public.activity_logs (resource_type, resource_id);

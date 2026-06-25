-- ============================================================
-- Security hardening migration — 2026-06-22
-- Run in Supabase SQL Editor in TWO separate queries (see below)
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- QUERY 1 — Paste and run this block first
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_activo
  ON public.user_roles (user_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint
  ON public.push_subscriptions (endpoint);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID,
  user_email    TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_logs" ON public.activity_logs;
CREATE POLICY "admins_read_logs" ON public.activity_logs
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON public.activity_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource
  ON public.activity_logs (resource_type, resource_id);


-- ══════════════════════════════════════════════════════════════
-- QUERY 2 — Open a NEW query tab, paste and run this block
-- (uses single-quoted function body and plain UPDATE for
--  backfill — avoids the Supabase editor dollar-quote bug)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, ''{}''::jsonb) ||
    jsonb_build_object(''role'', NEW.role, ''activo'', NEW.activo)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_jwt();

UPDATE auth.users AS u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('role', r.role, 'activo', r.activo)
FROM public.user_roles AS r
WHERE u.id = r.user_id;

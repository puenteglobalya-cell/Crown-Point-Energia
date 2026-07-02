-- ============================================================
-- 20260702 — Comunicados (sala de prensa) + REVOKE de escritura anon
-- Correr en el SQL Editor de Supabase (proyecto CPE).
-- Idempotente: se puede correr más de una vez sin efectos adversos.
-- ============================================================

-- ── 1) Tabla comunicados ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comunicados (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha        DATE NOT NULL,
  titulo_es    TEXT NOT NULL DEFAULT '',
  titulo_en    TEXT NOT NULL DEFAULT '',
  resumen_es   TEXT NOT NULL DEFAULT '',
  resumen_en   TEXT NOT NULL DEFAULT '',
  url          TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  file_name    TEXT NOT NULL DEFAULT '',
  tipo         TEXT NOT NULL DEFAULT 'general',
  publicado    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comunicados_fecha_idx ON comunicados (fecha DESC);

ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;

-- Lectura pública SOLO de publicados.
DROP POLICY IF EXISTS "public select comunicados" ON comunicados;
CREATE POLICY "public select comunicados" ON comunicados
  FOR SELECT USING (publicado = true);

-- Escrituras: SOLO service_role (todas las rutas de admin usan la service key
-- tras verificar requireAdminUser). NO se otorga escritura a 'authenticated'
-- para que un usuario logueado del portal no pueda insertar/editar comunicados
-- directamente contra la REST API saltándose la validación de admin.
DROP POLICY IF EXISTS "auth all comunicados"        ON comunicados;  -- política vieja, demasiado amplia
DROP POLICY IF EXISTS "service_role all comunicados" ON comunicados;
CREATE POLICY "service_role all comunicados" ON comunicados
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comunicados_set_updated_at ON comunicados;
CREATE TRIGGER comunicados_set_updated_at
  BEFORE UPDATE ON comunicados
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2) REVOKE de escritura anónima en tablas IR ─────────────────────────────
-- Estas tablas se pueblan/actualizan solo por procesos server-side (service_role).
-- Aunque RLS ya bloquea, revocar los GRANT de tabla a 'anon' es defensa en
-- profundidad: elimina la posibilidad incluso si una política quedara laxa.
REVOKE INSERT, UPDATE, DELETE ON public.ir_documents        FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.cnv_hechos          FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.shareholder_meetings FROM anon;

-- ── Verificación (opcional) ─────────────────────────────────────────────────
-- SELECT tablename, policyname, roles, cmd FROM pg_policies
--   WHERE tablename = 'comunicados';
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_name IN ('ir_documents','cnv_hechos','shareholder_meetings')
--     AND grantee = 'anon';

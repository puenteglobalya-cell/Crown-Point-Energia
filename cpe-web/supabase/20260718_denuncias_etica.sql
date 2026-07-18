-- ═══════════════════════════════════════════════════════════════════════════
-- Canal de denuncias e irregularidades — Línea ética
--
-- Reemplaza el Google Form externo (que quedó mal configurado, exigiendo
-- login de Google — rompiendo el anonimato) por un formulario propio dentro
-- del sitio, con opción real de anonimato total.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS denuncias_etica (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria      TEXT NOT NULL DEFAULT 'otro',
    -- 'anticorrupcion' | 'informacion_privilegiada' | 'conflicto_interes' |
    -- 'acoso_discriminacion' | 'fraude_financiero' | 'seguridad_ambiente' | 'otro'
  descripcion    TEXT NOT NULL DEFAULT '',
  fecha_incidente DATE,
  anonimo        BOOLEAN NOT NULL DEFAULT true,
  nombre         TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  telefono       TEXT NOT NULL DEFAULT '',
  evidencia_path TEXT,
  evidencia_name TEXT,
  evidencia_size INTEGER,
  estado         TEXT NOT NULL DEFAULT 'nueva', -- 'nueva' | 'en_revision' | 'cerrada'
  notas          TEXT NOT NULL DEFAULT '',       -- internal-only, never shown to the reporter
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS denuncias_etica_created_idx ON denuncias_etica (created_at DESC);

ALTER TABLE denuncias_etica ENABLE ROW LEVEL SECURITY;

-- Anyone can submit — this is the whole point of the channel
DROP POLICY IF EXISTS "public insert denuncias" ON denuncias_etica;
CREATE POLICY "public insert denuncias" ON denuncias_etica FOR INSERT WITH CHECK (true);

-- Only admins can read/manage — this is sensitive data, more restrictive than
-- the usual "any authenticated" pattern used elsewhere in this app.
DROP POLICY IF EXISTS "admin all denuncias" ON denuncias_etica;
CREATE POLICY "admin all denuncias" ON denuncias_etica
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'admin')
  );

-- Private storage bucket for optional evidence attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'denuncias-evidencia', 'denuncias-evidencia', false, 20971520,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public insert denuncias-evidencia storage" ON storage.objects;
CREATE POLICY "public insert denuncias-evidencia storage" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'denuncias-evidencia');

DROP POLICY IF EXISTS "admin read denuncias-evidencia storage" ON storage.objects;
CREATE POLICY "admin read denuncias-evidencia storage" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'denuncias-evidencia'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'admin')
  );

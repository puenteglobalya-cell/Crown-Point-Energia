-- Additional schema for document storage and maintenance mode
-- Run AFTER cms-schema.sql

-- ── Maintenance mode ───────────────────────────────────────────────────────

ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS maintenance BOOLEAN NOT NULL DEFAULT false;

-- ── Documents ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documentos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_es    TEXT NOT NULL DEFAULT '',
  titulo_en    TEXT NOT NULL DEFAULT '',
  tipo         TEXT NOT NULL DEFAULT 'financiero',
  periodo      TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  file_name    TEXT NOT NULL DEFAULT '',
  file_size    BIGINT,
  publico      BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public select documentos" ON documentos;
DROP POLICY IF EXISTS "auth all documentos"      ON documentos;

-- Anyone can read publicly-listed documents
CREATE POLICY "public select documentos" ON documentos
  FOR SELECT USING (publico = true);

-- Authenticated users (admin) can do everything
CREATE POLICY "auth all documentos" ON documentos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── Storage bucket ─────────────────────────────────────────────────────────
-- NOTE: Storage policies need RLS enabled on storage.objects (done automatically
-- by Supabase). Run the INSERT first; if the bucket already exists the ON CONFLICT
-- clause silently skips it.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read documents"  ON storage.objects;
DROP POLICY IF EXISTS "auth upload documents"  ON storage.objects;
DROP POLICY IF EXISTS "auth delete documents"  ON storage.objects;
DROP POLICY IF EXISTS "auth update documents"  ON storage.objects;

CREATE POLICY "public read documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "auth upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "auth delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "auth update documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents');

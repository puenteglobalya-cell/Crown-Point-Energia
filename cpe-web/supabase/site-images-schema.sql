-- ── Site Images bucket ──────────────────────────────────────────────────────
-- Public bucket for hero photos, drone/hero video and site imagery (not documents).
-- Max 100 MB per file — raised from 10 MB to fit hero background video (mp4).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  104857600,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies
DROP POLICY IF EXISTS "public read site-images"  ON storage.objects;
DROP POLICY IF EXISTS "auth upload site-images"  ON storage.objects;
DROP POLICY IF EXISTS "auth delete site-images"  ON storage.objects;
DROP POLICY IF EXISTS "auth update site-images"  ON storage.objects;

CREATE POLICY "public read site-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-images');

CREATE POLICY "auth upload site-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images');

CREATE POLICY "auth delete site-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-images');

CREATE POLICY "auth update site-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images');

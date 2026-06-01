-- ── Site Images bucket ──────────────────────────────────────────────────────
-- Public bucket for hero photos and site imagery (not documents).
-- Max 10 MB per file, images only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

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

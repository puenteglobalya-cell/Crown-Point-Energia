-- Photo gallery per operations block (up to 5 photos each), replacing the
-- single img.ops.<slug> CMS field with an ordered set of rows so the
-- operaciones page can render a carousel instead of one static photo.
CREATE TABLE IF NOT EXISTS operations_block_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_slug TEXT NOT NULL,
  url        TEXT NOT NULL,
  alt        TEXT NOT NULL DEFAULT '',
  orden      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operations_block_photos_slug_orden_idx
  ON operations_block_photos (block_slug, orden);

ALTER TABLE operations_block_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public select block photos" ON operations_block_photos;
CREATE POLICY "public select block photos" ON operations_block_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "auth manage block photos" ON operations_block_photos;
CREATE POLICY "auth manage block photos" ON operations_block_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- One-time backfill: carry over the existing single photo per block (if any)
-- from cms_fields so nothing goes blank after the migration.
INSERT INTO operations_block_photos (block_slug, url, orden)
SELECT substring(key from 9), value_es, 0
FROM cms_fields
WHERE key LIKE 'img.ops.%' AND key NOT LIKE '%.map' AND key NOT LIKE '%.alt' AND value_es <> '';

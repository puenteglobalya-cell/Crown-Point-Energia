-- ═══════════════════════════════════════════════════════════════
-- CMS Version History
-- Ejecutar completo en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cms_history (
  id          BIGSERIAL    PRIMARY KEY,
  snapshot    JSONB        NOT NULL,       -- full CMSState at the time of save
  label       TEXT,                        -- optional description
  created_by  TEXT,                        -- admin email
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE cms_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access cms_history" ON cms_history;
CREATE POLICY "Admin full access cms_history"
  ON cms_history FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = ANY(
      string_to_array(current_setting('app.admin_emails', true), ',')
    )
    OR auth.jwt() ->> 'email' = ANY(ARRAY['mezquieta@crownpointenergy.com'])
  );

-- Keep only the last 50 versions to avoid unbounded growth
CREATE OR REPLACE FUNCTION prune_cms_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM cms_history
  WHERE id IN (
    SELECT id FROM cms_history
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prune_cms_history ON cms_history;
CREATE TRIGGER trg_prune_cms_history
  AFTER INSERT ON cms_history
  FOR EACH ROW EXECUTE PROCEDURE prune_cms_history();

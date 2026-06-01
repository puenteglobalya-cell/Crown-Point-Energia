-- ═══════════════════════════════════════════════════════════════════════════
-- Contact Submissions + IR Subscribers — Crown Point Energía
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Contact form submissions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         TEXT    NOT NULL DEFAULT '',
  nombre       TEXT    NOT NULL DEFAULT '',
  organizacion TEXT    NOT NULL DEFAULT '',
  email        TEXT    NOT NULL DEFAULT '',
  telefono     TEXT    NOT NULL DEFAULT '',
  mensaje      TEXT    NOT NULL DEFAULT '',
  estado       TEXT    NOT NULL DEFAULT 'nueva',  -- 'nueva' | 'respondida' | 'archivada'
  notas        TEXT    NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert contact" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "auth all contact" ON contact_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── IR mailing list subscribers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ir_subscribers (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT    NOT NULL DEFAULT '',
  email      TEXT    UNIQUE NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ir_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert ir_sub" ON ir_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "public update ir_sub" ON ir_subscribers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "auth all ir_sub" ON ir_subscribers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- IR Alert Recipients
-- Internal/professional contacts who receive notifications when financial
-- documents are published (estados contables, hechos relevantes, etc.)
-- Distinct from ir_subscribers (public newsletter list)

CREATE TABLE IF NOT EXISTS ir_alert_recipients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL DEFAULT '',
  email      TEXT UNIQUE NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ir_alert_recipients ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can manage this list
CREATE POLICY "Admins manage ir_alert_recipients"
  ON ir_alert_recipients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS ir_alert_recipients_activo_idx ON ir_alert_recipients (activo);

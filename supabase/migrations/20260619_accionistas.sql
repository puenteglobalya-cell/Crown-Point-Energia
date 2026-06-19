-- Reports visible to each accionista user (admin-managed)
CREATE TABLE IF NOT EXISTS portal_report_access (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporte_id UUID NOT NULL REFERENCES reportes(id)   ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, reporte_id)
);

-- Comments left by portal users on reports (private: user sees own, admin sees all)
CREATE TABLE IF NOT EXISTS report_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID        NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto      TEXT        NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_comments_reporte_user ON report_comments(reporte_id, user_id);
CREATE INDEX IF NOT EXISTS portal_report_access_user    ON portal_report_access(user_id);

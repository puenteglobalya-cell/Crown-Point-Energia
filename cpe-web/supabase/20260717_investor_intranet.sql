-- ═══════════════════════════════════════════════════════════════════════════
-- Investor intranet — internal IR documents + investor contact registry
--
-- The public /inversores page and the reportes/portal_report_access system
-- already cover published reports for the 'accionista' role. This adds two
-- NEW pieces the intranet didn't have yet:
--   investor_documents — internal-only IR materials (board minutes, cap
--     table, etc.) not meant for the public site; visible to accionista +
--     admin, managed by admin only. Stored in a PRIVATE bucket, unlike the
--     public "documents" bucket used by /inversores.
--   investor_contacts  — a registry of current/prospective investors so the
--     company can reach out later (e.g. for an ON — Obligación Negociable —
--     placement). Admin-only, not exposed to the accionista role.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS investor_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT NOT NULL DEFAULT '',
  descripcion  TEXT NOT NULL DEFAULT '',
  categoria    TEXT NOT NULL DEFAULT 'otro', -- 'directorio' | 'cap_table' | 'legal' | 'otro'
  storage_path TEXT NOT NULL,
  file_name    TEXT,
  file_size    INTEGER,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE investor_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accionista select investor_documents" ON investor_documents;
CREATE POLICY "accionista select investor_documents" ON investor_documents
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'accionista'
    )
  );

-- Write access (insert/update/delete) is admin-only. All application code
-- that manages this table uses the service-role client (bypasses RLS) and
-- is gated by requireAdminUser() — this policy is defense-in-depth only.
DROP POLICY IF EXISTS "admin all investor_documents" ON investor_documents;
CREATE POLICY "admin all investor_documents" ON investor_documents
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'admin')
  );

-- Private storage bucket — NOT public, unlike the "documents" bucket used
-- by the public-facing IR page.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'investor-documents', 'investor-documents', false, 52428800,
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth all investor-documents storage" ON storage.objects;
CREATE POLICY "auth all investor-documents storage" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'investor-documents') WITH CHECK (bucket_id = 'investor-documents');

-- ── Investor contact registry (admin-only outreach tool) ────────────────────
CREATE TABLE IF NOT EXISTS investor_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  telefono          TEXT NOT NULL DEFAULT '',
  tipo              TEXT NOT NULL DEFAULT 'prospecto', -- 'accionista_actual' | 'prospecto' | 'institucional' | 'individual'
  tenencia_estimada TEXT NOT NULL DEFAULT '',            -- free text: e.g. "1.2M acciones" — not auto-computed, entered manually
  interes_on        BOOLEAN NOT NULL DEFAULT false,       -- flagged as a candidate to contact for a future Obligación Negociable placement
  notas             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS investor_contacts_email_unique ON investor_contacts (lower(email)) WHERE email <> '';

ALTER TABLE investor_contacts ENABLE ROW LEVEL SECURITY;

-- Admin-only — this is an internal outreach registry, not accionista-facing.
-- Application code uses the service-role client + requireAdminUser(); this
-- policy is defense-in-depth only.
DROP POLICY IF EXISTS "admin all investor_contacts" ON investor_contacts;
CREATE POLICY "admin all investor_contacts" ON investor_contacts
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.activo AND ur.role = 'admin')
  );

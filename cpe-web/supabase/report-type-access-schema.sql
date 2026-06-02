-- ═══════════════════════════════════════════════════════════════
-- Tipos de reporte y control de acceso por rol
-- Ejecutar completo en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Registrar / actualizar todos los tipos de reporte ───────

INSERT INTO report_types (id, nombre, descripcion, parser) VALUES
  ('ingresos',   'Ingresos Estimados',    'Revenue mensual petróleo & gas (Excel .xlsx)',    'ingresos_mensual'),
  ('accionista', 'Informe de Seguimiento','Cash flow operativo + comercial (PowerPoint .pptx)', 'accionista'),
  ('produccion', 'Reporte de Producción', 'Volúmenes y pozos por área',                     'custom'),
  ('financiero', 'Reporte Financiero',    'Estados financieros — P&L, balance, deuda',      'custom')
ON CONFLICT (id) DO UPDATE SET
  nombre      = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  parser      = EXCLUDED.parser,
  activo      = TRUE;

-- ── 2. Tabla de acceso por tipo de reporte × rol ──────────────
-- can_view   = puede ver reportes de ese tipo (publicados o borradores según su rol)
-- can_upload = puede subir / publicar reportes de ese tipo
-- Si un rol no figura para un type_id → sin acceso por defecto.

CREATE TABLE IF NOT EXISTS report_type_access (
  type_id    TEXT    NOT NULL REFERENCES report_types(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL,   -- 'viewer' | 'uploader' | 'admin' | 'rrhh'
  can_view   BOOLEAN NOT NULL DEFAULT FALSE,
  can_upload BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (type_id, role)
);

ALTER TABLE report_type_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access report_type_access" ON report_type_access;
CREATE POLICY "Admin full access report_type_access"
  ON report_type_access FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY['mezquieta@crownpointenergy.com'])
  );

-- ── 3. Permisos por defecto ────────────────────────────────────
--
-- INGRESOS ESTIMADOS (sector comercial / operativo)
--   viewer   → puede ver reportes publicados
--   uploader → puede ver y subir
--   admin    → acceso completo
--   rrhh     → puede ver (información general de la empresa)
--
-- INFORME DE SEGUIMIENTO — ACCIONISTA (sector dirección / inversores)
--   viewer   → sin acceso
--   uploader → sin acceso
--   admin    → acceso completo
--   rrhh     → sin acceso
--
-- REPORTE DE PRODUCCIÓN (sector operaciones)
--   viewer   → puede ver reportes publicados
--   uploader → puede ver y subir
--   admin    → acceso completo
--   rrhh     → sin acceso (no es su sector)
--
-- REPORTE FINANCIERO (sector finanzas / dirección)
--   viewer   → sin acceso
--   uploader → sin acceso
--   admin    → acceso completo
--   rrhh     → sin acceso
--
-- Estos valores son el punto de partida; se pueden modificar desde
-- /admin/reportes en la matriz de permisos.

INSERT INTO report_type_access (type_id, role, can_view, can_upload) VALUES

  -- Ingresos Estimados
  ('ingresos', 'viewer',   TRUE,  FALSE),
  ('ingresos', 'uploader', TRUE,  TRUE),
  ('ingresos', 'admin',    TRUE,  TRUE),
  ('ingresos', 'rrhh',     TRUE,  FALSE),

  -- Informe de Seguimiento (Accionista)
  ('accionista', 'viewer',   FALSE, FALSE),
  ('accionista', 'uploader', FALSE, FALSE),
  ('accionista', 'admin',    TRUE,  TRUE),
  ('accionista', 'rrhh',     FALSE, FALSE),

  -- Reporte de Producción
  ('produccion', 'viewer',   TRUE,  FALSE),
  ('produccion', 'uploader', TRUE,  TRUE),
  ('produccion', 'admin',    TRUE,  TRUE),
  ('produccion', 'rrhh',     FALSE, FALSE),

  -- Reporte Financiero
  ('financiero', 'viewer',   FALSE, FALSE),
  ('financiero', 'uploader', FALSE, FALSE),
  ('financiero', 'admin',    TRUE,  TRUE),
  ('financiero', 'rrhh',     FALSE, FALSE)

ON CONFLICT (type_id, role) DO NOTHING;

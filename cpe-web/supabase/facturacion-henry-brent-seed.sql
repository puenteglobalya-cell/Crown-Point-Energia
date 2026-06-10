-- ═══════════════════════════════════════════════════════════════
-- Agregar tipos de reporte faltantes: facturacion, henry_hub, ice_brent
-- Ejecutar en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Registrar los tres tipos ───────────────────────────────

INSERT INTO report_types (id, nombre, descripcion, parser) VALUES
  ('facturacion', 'Reporte de Facturación', 'Detalle de ventas por artículo y bloque (Excel bajada sistema)', 'facturacion'),
  ('henry_hub',   'Henry Hub',              'Precios forward Henry Hub (gas natural)',                         'henry_hub'),
  ('ice_brent',   'ICE Brent',              'Precios forward ICE Brent (petróleo)',                            'ice_brent')
ON CONFLICT (id) DO UPDATE SET
  nombre      = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  parser      = EXCLUDED.parser,
  activo      = TRUE;

-- ── 2. Permisos de acceso ─────────────────────────────────────
-- facturacion: datos comerciales / impuestos — uploader y admin pueden ver y subir
-- henry_hub / ice_brent: datos de mercado — todos los roles pueden ver, solo admin/uploader suben

INSERT INTO report_type_access (type_id, role, can_view, can_upload) VALUES

  -- Facturación
  ('facturacion', 'viewer',   TRUE,  FALSE),
  ('facturacion', 'uploader', TRUE,  TRUE),
  ('facturacion', 'admin',    TRUE,  TRUE),
  ('facturacion', 'rrhh',     FALSE, FALSE),

  -- Henry Hub
  ('henry_hub', 'viewer',   TRUE,  FALSE),
  ('henry_hub', 'uploader', TRUE,  TRUE),
  ('henry_hub', 'admin',    TRUE,  TRUE),
  ('henry_hub', 'rrhh',     FALSE, FALSE),

  -- ICE Brent
  ('ice_brent', 'viewer',   TRUE,  FALSE),
  ('ice_brent', 'uploader', TRUE,  TRUE),
  ('ice_brent', 'admin',    TRUE,  TRUE),
  ('ice_brent', 'rrhh',     FALSE, FALSE)

ON CONFLICT (type_id, role) DO NOTHING;

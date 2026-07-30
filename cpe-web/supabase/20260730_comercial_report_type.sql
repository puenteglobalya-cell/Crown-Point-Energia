-- Registra el tipo de reporte 'comercial' (Modelo de Comercialización) y
-- le da acceso de visualización a los roles que ya tenían el permiso
-- view_comercial (finanzas, compliance) además de admin.
-- Ejecutar en Supabase → SQL Editor.

INSERT INTO report_types (id, nombre, descripcion, parser) VALUES
  ('comercial', 'Modelo de Comercialización', 'Precios de referencia, yacimientos y optimizaciones (HTML)', 'custom')
ON CONFLICT (id) DO UPDATE SET
  nombre      = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  parser      = EXCLUDED.parser,
  activo      = TRUE;

INSERT INTO report_type_access (type_id, role, can_view, can_upload) VALUES
  ('comercial', 'admin',      true, true),
  ('comercial', 'finanzas',   true, false),
  ('comercial', 'compliance', true, false)
ON CONFLICT (type_id, role) DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_upload = EXCLUDED.can_upload;

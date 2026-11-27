-- Licencias / vacaciones del equipo comercial, mostradas sombreadas en el
-- calendario. Mismo patrón que el resto de /api/comercial/*: RLS
-- habilitada, sin policies -- se lee/escribe solo con la service role
-- desde /api/comercial/calendario/licencias[/:id], que valida el permiso
-- 'view_comercial' en el server.
CREATE TABLE IF NOT EXISTS comercial_calendario_licencias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL CHECK (char_length(nombre) > 0 AND char_length(nombre) <= 100),
  tipo          TEXT NOT NULL DEFAULT 'vacaciones' CHECK (tipo IN ('vacaciones', 'licencia')),
  fecha_desde   DATE NOT NULL,
  fecha_hasta   DATE NOT NULL CHECK (fecha_hasta >= fecha_desde),
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE comercial_calendario_licencias ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comercial_calendario_licencias_rango_idx ON comercial_calendario_licencias (fecha_desde, fecha_hasta);

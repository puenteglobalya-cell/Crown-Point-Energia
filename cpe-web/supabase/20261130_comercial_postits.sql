-- Post-its de Comercial: tareas pendientes sin fecha ni plazo, por fuera
-- del calendario. Mismo patrón que comercial_calendario_notas: RLS
-- habilitada, sin policies -- se lee/escribe solo con la service role
-- desde /api/comercial/postits[/:id], que valida el permiso
-- 'view_comercial' en el server.
CREATE TABLE IF NOT EXISTS comercial_postits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto       TEXT NOT NULL CHECK (char_length(texto) > 0 AND char_length(texto) <= 500),
  hecho       BOOLEAN NOT NULL DEFAULT false,
  orden       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE comercial_postits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comercial_postits_orden_idx ON comercial_postits (orden);

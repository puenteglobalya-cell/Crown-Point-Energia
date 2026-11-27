-- Calendario de to-dos de la sección Comercial (/portal/comercial). Mismo
-- patrón que fletes: RLS habilitada, sin policies -- se lee/escribe solo
-- con la service role desde /api/comercial/calendario/*, que valida el
-- permiso 'view_comercial' en el server.
CREATE TABLE IF NOT EXISTS comercial_calendario_notas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL,
  texto       TEXT NOT NULL CHECK (char_length(texto) > 0 AND char_length(texto) <= 500),
  hecho       BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE comercial_calendario_notas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comercial_calendario_notas_fecha_idx ON comercial_calendario_notas (fecha);

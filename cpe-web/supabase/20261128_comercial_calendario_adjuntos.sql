-- Adjuntos por nota del calendario de Comercial. Mismo patrón que el resto
-- de /api/comercial/*: RLS habilitada, sin policies -- se lee/escribe solo
-- con la service role desde /api/comercial/calendario/adjuntos, que valida
-- el permiso 'view_comercial' en el server. Los archivos en sí van al
-- bucket privado 'documents' (storage_path = 'calendario-comercial/...'),
-- servidos solo vía signed URL desde esa misma ruta -- nunca una URL
-- pública directa.
CREATE TABLE IF NOT EXISTS comercial_calendario_adjuntos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id       UUID NOT NULL REFERENCES comercial_calendario_notas(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE comercial_calendario_adjuntos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comercial_calendario_adjuntos_nota_idx ON comercial_calendario_adjuntos (nota_id);

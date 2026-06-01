-- Tables

CREATE TABLE IF NOT EXISTS bib_grupos (
  id    SERIAL PRIMARY KEY,
  slug  TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  orden INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bib_usuario_grupos (
  user_id  UUID NOT NULL,
  grupo_id INT  NOT NULL REFERENCES bib_grupos (id),
  PRIMARY KEY (user_id, grupo_id)
);

CREATE TABLE IF NOT EXISTS bib_carpetas (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  descripcion TEXT    NOT NULL DEFAULT '',
  orden       INT     NOT NULL DEFAULT 0,
  activa      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS bib_carpeta_grupos (
  carpeta_id INT NOT NULL REFERENCES bib_carpetas (id) ON DELETE CASCADE,
  grupo_id   INT NOT NULL REFERENCES bib_grupos   (id) ON DELETE CASCADE,
  PRIMARY KEY (carpeta_id, grupo_id)
);

CREATE TABLE IF NOT EXISTS bib_documentos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  carpeta_id  INT         NOT NULL REFERENCES bib_carpetas (id) ON DELETE CASCADE,
  nombre      TEXT        NOT NULL,
  path        TEXT        NOT NULL,
  size_bytes  BIGINT,
  mime_type   TEXT,
  vigente     BOOLEAN     NOT NULL DEFAULT true,
  subido_por  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed bib_grupos

INSERT INTO bib_grupos (slug, label, orden) VALUES
  ('directorio',   'Directorio',  1),
  ('contabilidad', 'Contabilidad',2),
  ('tesoreria',    'Tesorería',   3),
  ('compras',      'Compras',     4),
  ('comercial',    'Comercial',   5),
  ('impuestos',    'Impuestos',   6),
  ('rrhh',         'RRHH',        7)
ON CONFLICT (slug) DO NOTHING;

-- RLS

ALTER TABLE bib_grupos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bib_usuario_grupos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bib_carpetas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bib_carpeta_grupos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bib_documentos      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bib_grupos' AND policyname = 'bib_grupos_select'
  ) THEN
    CREATE POLICY bib_grupos_select ON bib_grupos
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bib_usuario_grupos' AND policyname = 'bib_usuario_grupos_select'
  ) THEN
    CREATE POLICY bib_usuario_grupos_select ON bib_usuario_grupos
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bib_carpetas' AND policyname = 'bib_carpetas_select'
  ) THEN
    CREATE POLICY bib_carpetas_select ON bib_carpetas
      FOR SELECT TO authenticated
      USING (
        activa = true
        AND EXISTS (
          SELECT 1
          FROM bib_carpeta_grupos cg
          JOIN bib_usuario_grupos ug ON ug.grupo_id = cg.grupo_id
          WHERE cg.carpeta_id = bib_carpetas.id
            AND ug.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bib_carpeta_grupos' AND policyname = 'bib_carpeta_grupos_select'
  ) THEN
    CREATE POLICY bib_carpeta_grupos_select ON bib_carpeta_grupos
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bib_documentos' AND policyname = 'bib_documentos_select'
  ) THEN
    CREATE POLICY bib_documentos_select ON bib_documentos
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM bib_carpeta_grupos cg
          JOIN bib_usuario_grupos ug ON ug.grupo_id = cg.grupo_id
          WHERE cg.carpeta_id = bib_documentos.carpeta_id
            AND ug.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Storage

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'biblioteca',
  'biblioteca',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/octet-stream',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'biblioteca_insert'
  ) THEN
    CREATE POLICY biblioteca_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'biblioteca');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'biblioteca_delete'
  ) THEN
    CREATE POLICY biblioteca_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'biblioteca');
  END IF;
END $$;

-- Seguimiento de fletes de exportación (Escalante/Medanito FOB) y
-- razonabilidad vs. mercado. Vive en /portal/comercial/fletes, separado del
-- Reporte Comercial (no toca reportes ni su JSONB).
--
-- Sin políticas públicas en ninguna tabla: se lee/escribe solo con la
-- service role desde las rutas de /api/comercial/*, que validan el permiso
-- 'view_comercial' (lectura) / rol finanzas-admin (escritura) en el server.

-- Serie histórica de precios diarios -- hoy no existe ningún lugar que
-- persista esto entre reportes (ingresos.ts solo calcula una ventana de 45
-- días transitoria por reporte). Se puebla automáticamente cada vez que se
-- publica un reporte de Ingresos Estimados.
CREATE TABLE IF NOT EXISTS precios_diarios (
  fecha                    DATE PRIMARY KEY,
  ice_brent                NUMERIC,
  medanito                 NUMERIC,
  escalante_fob            NUMERIC,
  la_brent_futures_strip   NUMERIC,
  fuente                   TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE precios_diarios ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS cargamentos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_bl                DATE NOT NULL,
  puerto                  TEXT NOT NULL,
  crudo                   TEXT NOT NULL CHECK (crudo IN ('Escalante', 'Medanito')),
  volumen_bbl             NUMERIC NOT NULL CHECK (volumen_bbl > 0),
  comprador               TEXT,
  destino                 TEXT,
  buque                   TEXT,
  clase                   TEXT NOT NULL CHECK (clase IN ('Aframax', 'Suezmax', 'otra')),
  -- Precio FOB realizado: no hay ninguna tabla de ventas/facturación con
  -- este dato por cargamento individual -- se carga a mano acá.
  precio_fob_usd_bbl      NUMERIC,
  descuento_pactado_usd_bbl NUMERIC,
  notas                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE cargamentos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS cargamentos_fecha_bl_idx ON cargamentos (fecha_bl DESC);

CREATE TABLE IF NOT EXISTS fletes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargamento_id        UUID NOT NULL UNIQUE REFERENCES cargamentos(id) ON DELETE CASCADE,
  tipo                 TEXT NOT NULL CHECK (tipo IN ('spot', 'time_charter')),
  tarifa_ws            NUMERIC,
  tarifa_lump_sum_usd  NUMERIC,
  flat_rate_usado      NUMERIC,
  costo_total_usd      NUMERIC NOT NULL CHECK (costo_total_usd >= 0),
  demoras_usd          NUMERIC NOT NULL DEFAULT 0,
  combustible_usd      NUMERIC NOT NULL DEFAULT 0,
  canal_otros_usd      NUMERIC NOT NULL DEFAULT 0,
  proveedor_broker     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE fletes ENABLE ROW LEVEL SECURITY;

-- Referencia de mercado para fletes -- no hay ningún feed automático de
-- Worldscale en el sistema, se carga manual (UI o Excel). tarifa_usd_bbl es
-- el campo que realmente se usa para comparar contra el flete propio: no
-- se inventa ningún factor de conversión ton→bbl (depende de la densidad
-- del crudo), así que WS/US$-ton quedan como referencia informativa y la
-- comparación solo corre cuando hay un US$/bbl cargado.
CREATE TABLE IF NOT EXISTS fletes_referencia_mercado (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           DATE NOT NULL,
  ruta            TEXT NOT NULL,
  clase           TEXT NOT NULL CHECK (clase IN ('Aframax', 'Suezmax', 'otra')),
  tarifa_ws       NUMERIC,
  tarifa_usd_ton  NUMERIC,
  tarifa_usd_bbl  NUMERIC,
  fuente          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE fletes_referencia_mercado ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS fletes_referencia_fecha_idx ON fletes_referencia_mercado (fecha DESC);

-- Umbrales del semáforo de razonabilidad -- editables desde la UI en vez de
-- una constante de código, fila única (igual patrón que cms_settings).
CREATE TABLE IF NOT EXISTS fletes_config (
  id                   SMALLINT PRIMARY KEY DEFAULT 1,
  umbral_verde_pct     NUMERIC NOT NULL DEFAULT 10,
  umbral_amarillo_pct  NUMERIC NOT NULL DEFAULT 25,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);
ALTER TABLE fletes_config ENABLE ROW LEVEL SECURITY;
INSERT INTO fletes_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

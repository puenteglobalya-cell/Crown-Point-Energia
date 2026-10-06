-- Tabla de clientes SAP (CUIT <-> código SAP) usada para cruzar contra el
-- padrón de AGIP (agentes de percepción/retención de IIBB CABA) y mostrar
-- la alícuota + código SAP de cada CUIT. Se carga/actualiza subiendo el
-- Excel de clientes SAP (hoja KNA1) desde /portal/finanzas/padron-agip.
CREATE TABLE IF NOT EXISTS sap_clientes (
  cuit          TEXT PRIMARY KEY,
  codigo_sap    TEXT NOT NULL,
  razon_social  TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sap_clientes ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo se lee/escribe con la service role (admin client) desde el servidor.

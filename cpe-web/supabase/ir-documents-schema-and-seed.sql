-- Crown Point Energy -- IR Documents schema + seed
-- Source: crownpointenergy.com · Scraped 2026-06-29
-- Financial CPI: 74, CPESA: 26, AGM: 11, ESTMA: 10, Governance: 9
-- URLs are direct PDF links (documents from Supabase are NOT duplicated here)
-- Safe to re-run: ON CONFLICT (url) DO NOTHING

CREATE TABLE IF NOT EXISTS ir_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria   TEXT NOT NULL,
  entidad     TEXT NOT NULL DEFAULT 'CPI',
  fecha       DATE,
  periodo     TEXT NOT NULL DEFAULT '',
  tipo        TEXT NOT NULL DEFAULT '',
  titulo_en   TEXT NOT NULL DEFAULT '',
  titulo_es   TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  publicado   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ir_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select ir_documents" ON ir_documents;
CREATE POLICY "public select ir_documents" ON ir_documents
  FOR SELECT USING (publicado = true);
DROP POLICY IF EXISTS "auth all ir_documents" ON ir_documents;
CREATE POLICY "auth all ir_documents" ON ir_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS ir_documents_categoria_idx ON ir_documents (categoria);
CREATE INDEX IF NOT EXISTS ir_documents_fecha_idx ON ir_documents (fecha DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ir_documents_url_key'
  ) THEN
    ALTER TABLE ir_documents ADD CONSTRAINT ir_documents_url_key UNIQUE (url);
  END IF;
END $$;

INSERT INTO ir_documents (categoria, entidad, fecha, periodo, tipo, titulo_en, titulo_es, url, publicado)
VALUES
  ('financiero', 'CPI', '2026-01-01', 'Dec 31, 2025', 'MDA', 'December 31, 2025 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2026/05/2025-Annual-MDA-Crown-Point-Energy-Inc_.pdf', true),
  ('financiero', 'CPI', '2026-01-01', 'Dec 31, 2025', 'FS', 'Annual Financial Statements 2025', '', 'https://crownpointenergy.com/wp-content/uploads/2026/05/2025-Audited-Annual-Financial-Statements-Crown-Point-Energy-Inc_.pdf', true),
  ('financiero', 'CPI', '2025-01-01', 'Jun 30, 2025', 'MDA', 'June 30, 2025 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2025/08/2-Crown-Point-MDA-Jun-2025-FINAL.pdf', true),
  ('financiero', 'CPI', '2025-01-01', 'Jun 30, 2025', 'FS', 'Condensed Interim FS — Jun 2025', '', 'https://crownpointenergy.com/wp-content/uploads/2025/08/1-Crown-Point-FS-Jun-2025-FINAL.pdf', true),
  ('financiero', 'CPI', '2025-01-01', 'Mar 31, 2025', 'MDA', 'March 31, 2025 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2025/05/Crown-Point-MDA-Mar-2025-FINAL.pdf', true),
  ('financiero', 'CPI', '2025-01-01', 'Mar 31, 2025', 'FS', 'Condensed Interim FS — Mar 2025', '', 'https://crownpointenergy.com/wp-content/uploads/2025/05/Crown-Point-FS-Mar-2025-FINAL.pdf', true),
  ('financiero', 'CPI', '2025-01-01', 'Dec 31, 2024', 'MDA', 'December 31, 2024 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2025/04/2-Crown-Point-MDA-Dec-2024-FINAL.pdf', true),
  ('financiero', 'CPI', '2025-01-01', 'Dec 31, 2024', 'FS', 'Annual Financial Statements 2024', '', 'https://crownpointenergy.com/wp-content/uploads/2025/04/Crown-Point-Energy-Inc.-December-31-2024-Consolidated-Financial-Statements-SEDAR.pdf', true),
  ('financiero', 'CPI', '2024-01-01', 'Mar 31, 2024', 'MDA', 'March 31, 2024 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2024/06/Crown-Point-MDA-March-31-2024.pdf', true),
  ('financiero', 'CPI', '2024-01-01', 'Mar 31, 2024', 'FS', 'Condensed Interim FS — Mar 2024', '', 'https://crownpointenergy.com/wp-content/uploads/2024/06/Crown-Point-FS-March-31-2024.pdf', true),
  ('financiero', 'CPI', '2024-01-01', 'Dec 31, 2023', 'MDA', 'December 31, 2023 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2024/03/2-Crown-Point-MDA-Dec-2023.pdf', true),
  ('financiero', 'CPI', '2024-01-01', 'Dec 31, 2023', 'FS', 'Annual Financial Statements 2023', '', 'https://crownpointenergy.com/wp-content/uploads/2024/03/1-Crown-Point-FS-Dec-2023.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Sep 30, 2023', 'MDA', 'September 30, 2023 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2023/11/2-Crown-Point-MDA-Sep-2023-final.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Sep 30, 2023', 'FS', 'Condensed Interim FS — Sep 2023', '', 'https://crownpointenergy.com/wp-content/uploads/2023/11/1-Crown-Point-FS-Sept-2023-final.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Jun 30, 2023', 'MDA', 'June 30, 2023 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2023/08/2-Crown-Point-MDA-Jun-2023-Final.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Jun 30, 2023', 'FS', 'Condensed Interim FS — Jun 2023', '', 'https://crownpointenergy.com/wp-content/uploads/2023/08/1-Crown-Point-FS-Jun-2023-FINAL.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Mar 31, 2023', 'MDA', 'March 31, 2023 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2023/05/Crown-Point-MDA-March-2023.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Mar 31, 2023', 'FS', 'Condensed Interim FS — Mar 2023', '', 'https://crownpointenergy.com/wp-content/uploads/2023/05/Crown-Point-FS-March-2023.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Dec 31, 2022', 'MDA', 'December 31, 2022 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2023/03/Crown-Point-MDA-Dec-2022-final.pdf', true),
  ('financiero', 'CPI', '2023-01-01', 'Dec 31, 2022', 'FS', 'Annual Financial Statements 2022', '', 'https://crownpointenergy.com/wp-content/uploads/2023/03/Crown-Point-FS-Dec-2022-SEDAR.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Sep 30, 2022', 'MDA', 'September 30, 2022 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2022/11/2-Crown-Point-MDA-Sep-2022-FINAL.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Sep 30, 2022', 'FS', 'Condensed Interim FS — Sep 2022', '', 'https://crownpointenergy.com/wp-content/uploads/2022/11/1-Crown-Point-FS-Sep-2022-FINAL.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Jun 30, 2022', 'MDA', 'June 30, 2022 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2022/08/MDAQ2.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Jun 30, 2022', 'FS', 'Condensed Interim FS — Jun 2022', '', 'https://crownpointenergy.com/wp-content/uploads/2022/08/FinancialsQ2.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Mar 31, 2022', 'MDA', 'March 31, 2022 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2022/05/Crown-Point-MDA-Mar-2022-Final.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Mar 31, 2022', 'FS', 'Condensed Interim FS — Mar 2022', '', 'https://crownpointenergy.com/wp-content/uploads/2022/05/1-Crown-Point-FS-Mar-2022-Final.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Dec 31, 2021', 'MDA', 'December 31, 2021 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2022/03/MDA.pdf', true),
  ('financiero', 'CPI', '2022-01-01', 'Dec 31, 2021', 'FS', 'Annual Financial Statements 2021', '', 'https://crownpointenergy.com/wp-content/uploads/2022/03/Financials.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Sep 30, 2021', 'MDA', 'September 30, 2021 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2021/11/Crown-Point-MDA-Sep-2021.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Sep 30, 2021', 'FS', 'Condensed Interim FS — Sep 2021', '', 'https://crownpointenergy.com/wp-content/uploads/2021/11/Crown-Point-FS-Sep-2021.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Jun 30, 2021', 'MDA', 'June 30, 2021 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2021/08/2-Crown-Point-MDA-Jun-2021-final.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Jun 30, 2021', 'FS', 'Condensed Interim FS — Jun 2021', '', 'https://crownpointenergy.com/wp-content/uploads/2021/08/Crown-Point-FS-Jun-2021.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Mar 31, 2021', 'MDA', 'March 31, 2021 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2021/05/MDA.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Mar 31, 2021', 'FS', 'Condensed Interim FS — Mar 2021', '', 'https://crownpointenergy.com/wp-content/uploads/2021/05/Financials.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Dec 31, 2020', 'MDA', 'December 31, 2020 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2021/03/2-Crown-Point-MDA-Dec-2020-final.pdf', true),
  ('financiero', 'CPI', '2021-01-01', 'Dec 31, 2020', 'FS', 'Annual Financial Statements 2020', '', 'https://crownpointenergy.com/wp-content/uploads/2021/03/1-Crown-Point-FS-Dec-2020-final-w-audit-report.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Sep 30, 2020', 'MDA', 'September 30, 2020 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2020/11/Crown-Point-MDA-Sep-2020.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Sep 30, 2020', 'FS', 'Condensed Interim FS — Sep 2020', '', 'https://crownpointenergy.com/wp-content/uploads/2020/11/Crown-Point-FS-Sep-2020.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Jun 30, 2020', 'MDA', 'June 30, 2020 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2020/08/Crown-Point-MDA-Jun-2020.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Jun 30, 2020', 'FS', 'Condensed Interim FS — Jun 2020', '', 'https://crownpointenergy.com/wp-content/uploads/2020/08/1-Crown-Point-FS-Jun-2020-final.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Mar 31, 2020', 'MDA', 'March 31, 2020 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2020/05/2-Crown-Point-MDA-Mar-2020-final.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Mar 31, 2020', 'FS', 'Condensed Interim FS — Mar 2020', '', 'https://crownpointenergy.com/wp-content/uploads/2020/05/1-Crown-Point-FS-Mar-2020-final.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Dec 31, 2019', 'MDA', 'December 31, 2019 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2020/04/2-Crown-Point-MDA-Dec-2019-FINAL_10145304_1.pdf', true),
  ('financiero', 'CPI', '2020-01-01', 'Dec 31, 2019', 'FS', 'Annual Financial Statements 2019–2018', '', 'https://crownpointenergy.com/wp-content/uploads/2020/04/Financial-Statements-FINAL_10145966_1.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Sep 30, 2019', 'MDA', 'September 30, 2019 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2019/11/Crown-Point-MDA-Sep-2019-9896492_1.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Sep 30, 2019', 'FS', 'Condensed Interim FS — Sep 2019', '', 'https://crownpointenergy.com/wp-content/uploads/2019/11/Crown-Point-FS-Sep-2019-9896496_1.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Jun 30, 2019', 'MDA', 'June 30, 2019 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2019/08/Crown-Point-MDA-Jun-2019.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Jun 30, 2019', 'FS', 'Condensed Interim FS — Jun 2019', '', 'https://crownpointenergy.com/wp-content/uploads/2019/08/Crown-Point-FS-Jun-2019.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Mar 31, 2019', 'MDA', 'March 31, 2019 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2019/05/MDA.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Mar 31, 2019', 'FS', 'Condensed Interim FS — Mar 2019', '', 'https://crownpointenergy.com/wp-content/uploads/2019/05/Financials.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Dec 31, 2018', 'MDA', 'December 31, 2018 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2019/04/Crown-Point-MDA-Dec-2018-final.pdf', true),
  ('financiero', 'CPI', '2019-01-01', 'Dec 31, 2018', 'FS', 'Annual Financial Statements 2018', '', 'https://crownpointenergy.com/wp-content/uploads/2019/04/Crown-Point-FS-Dec-2018-final.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Sep 30, 2018', 'MDA', 'September 30, 2018 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2018/11/CWV-Q3-2018-MDA.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Sep 30, 2018', 'FS', 'Condensed Interim FS — Sep 2018', '', 'https://crownpointenergy.com/wp-content/uploads/2018/11/CWV-Q3-2018-FS.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Jun 30, 2018', 'MDA', 'June 30, 2018 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2018/08/CWV-Q2-2018-MDA.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Jun 30, 2018', 'FS', 'Condensed Interim FS — Jun 2018', '', 'https://crownpointenergy.com/wp-content/uploads/2018/08/CWV-Q2-2018-FS.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Mar 31, 2018', 'MDA', 'March 31, 2018 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2018/06/CWV-MDA-Q1-2018.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Mar 31, 2018', 'FS', 'Condensed Interim FS — Mar 2018', '', 'https://crownpointenergy.com/wp-content/uploads/2018/06/CWV-FS-Q1-2018.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Dec 31, 2017', 'MDA', 'December 31, 2017 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2018/03/Crown-Point-MDA-Dec-2017-final.pdf', true),
  ('financiero', 'CPI', '2018-01-01', 'Dec 31, 2017', 'FS', 'Annual Financial Statements 2017', '', 'https://crownpointenergy.com/wp-content/uploads/2018/03/Crown-Point-FS-Dec-2017-final-w-audit-rpt.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Sep 30, 2017', 'MDA', 'September 30, 2017 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2017/12/CWV-Q3-2017-MDA.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Sep 30, 2017', 'FS', 'Condensed Interim FS — Sep 2017', '', 'https://crownpointenergy.com/wp-content/uploads/2017/12/CWV-Q3-2017-FS.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Jun 30, 2017', 'MDA', 'June 30, 2017 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2017/08/CWV-Q2-2017-MDA.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Jun 30, 2017', 'FS', 'Condensed Interim FS — Jun 2017', '', 'https://crownpointenergy.com/wp-content/uploads/2017/08/CWV-Q2-2017-FS.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Mar 31, 2017', 'MDA', 'March 31, 2017 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2017/05/Crown-Point-MDA-Mar-2017.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Mar 31, 2017', 'FS', 'Condensed Interim FS — Mar 2017', '', 'https://crownpointenergy.com/wp-content/uploads/2017/05/Crown-Point-FS-Mar-2017.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Dec 31, 2016', 'MDA', 'December 31, 2016 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2017/03/CWP-Q4-2016-MDA.pdf', true),
  ('financiero', 'CPI', '2017-01-01', 'Dec 31, 2016', 'FS', 'Annual Financial Statements 2016', '', 'https://crownpointenergy.com/wp-content/uploads/2017/03/CWP-Q4-2016-Financials.pdf', true),
  ('financiero', 'CPI', '2016-01-01', 'Sep 30, 2016', 'MDA', 'September 30, 2016 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2016/11/Q3-2016-CWP-MDA.pdf', true),
  ('financiero', 'CPI', '2016-01-01', 'Sep 30, 2016', 'FS', 'Condensed Interim FS — Sep 2016', '', 'https://crownpointenergy.com/wp-content/uploads/2016/11/Q3-2016-CWP-FS.pdf', true),
  ('financiero', 'CPI', '2016-01-01', 'Jun 30, 2016', 'MDA', 'June 30, 2016 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2016/08/Crown-Point-MDA-Jun-2016-final.pdf', true),
  ('financiero', 'CPI', '2016-01-01', 'Jun 30, 2016', 'FS', 'Condensed Interim FS — Jun 2016', '', 'https://crownpointenergy.com/wp-content/uploads/2016/08/Crown-Point-FS-Jun-2016-final.pdf', true),
  ('financiero', 'CPI', '2016-01-01', 'Mar 31, 2016', 'MDA', 'March 31, 2016 MD&A', '', 'https://crownpointenergy.com/wp-content/uploads/2016/05/Crown-Point-MDA-Mar-2016-final.pdf', true),
  ('financiero', 'CPI', '2016-01-01', 'Mar 31, 2016', 'FS', 'Condensed Interim FS — Mar 2016', '', 'https://crownpointenergy.com/wp-content/uploads/2016/05/Crown-Point-FS-Mar-2016-final.pdf', true),
  ('financiero', 'CPESA', '2026-01-01', 'Mar 31, 2026', 'Trimestral', '', 'EEFF Condensados Intermedios — Mar 2026', 'https://crownpointenergy.com/wp-content/uploads/2026/05/Crown-Point-Energia-S.A.-estados-financieros-al-31-03-2026-LEGALIZADOS_compressed.pdf', true),
  ('financiero', 'CPESA', '2026-01-01', 'Dic 31, 2025', 'Anual', '', 'Memoria y Estados Financieros 2025', 'https://crownpointenergy.com/wp-content/uploads/2026/04/CROWN-POINT-ENERGIA-SA-EEFF-AL-31122025-LEGALIZADO_compressed.pdf', true),
  ('financiero', 'CPESA', '2025-01-01', 'Sep 30, 2025', 'Trimestral', '', 'EEFF Condensados Intermedios — Sep 2025', 'https://crownpointenergy.com/wp-content/uploads/2025/11/CPESA-Estados-Financieros-30-09-20025-Certificado_comprimido.pdf', true),
  ('financiero', 'CPESA', '2025-01-01', 'Jun 30, 2025', 'Trimestral', '', 'EEFF Condensados Intermedios — Jun 2025', 'https://crownpointenergy.com/wp-content/uploads/2025/08/EEFF-CPESA-30062025-Certificado-comprimido.pdf', true),
  ('financiero', 'CPESA', '2025-01-01', 'Mar 31, 2025', 'Trimestral', '', 'EEFF Condensados Intermedios — Mar 2025', 'https://crownpointenergy.com/wp-content/uploads/2025/05/EEFF-CPESA-31.03.2025-Legalizado-comprimido.pdf', true),
  ('financiero', 'CPESA', '2025-01-01', 'Dic 31, 2024', 'Anual', '', 'Memoria y Estados Financieros 2024', 'https://crownpointenergy.com/wp-content/uploads/2025/03/EEFF-CPESA-31.12.2024-Informe-de-Auditoria-FIRMADOS-comprimido-web.pdf', true),
  ('financiero', 'CPESA', '2024-01-01', 'Sep 30, 2024', 'Trimestral', '', 'EEFF Condensados Intermedios — Sep 2024', 'https://crownpointenergy.com/wp-content/uploads/2024/11/EEFF-CPESA-30092024-Firmado-Certificado_.pdf', true),
  ('financiero', 'CPESA', '2024-01-01', 'Jun 30, 2024', 'Trimestral', '', 'EEFF Condensados Intermedios — Jun 2024', 'https://crownpointenergy.com/wp-content/uploads/2024/08/EEFF-CPESA-30062024-firmado-digital.pdf', true),
  ('financiero', 'CPESA', '2024-01-01', 'Mar 31, 2024', 'Trimestral', '', 'EEFF Condensados Intermedios — Mar 2024', 'https://crownpointenergy.com/wp-content/uploads/2024/06/EEFF-CPESA-31032024-Firmado-Final.pdf', true),
  ('financiero', 'CPESA', '2024-01-01', 'Dic 31, 2023', 'Anual', '', 'Memoria y Estados Financieros 2023', 'https://crownpointenergy.com/wp-content/uploads/2024/03/EEFF-CPESA-31.12.2023-firmado.pdf', true),
  ('financiero', 'CPESA', '2023-01-01', 'Sep 30, 2023', 'Trimestral', '', 'EEFF Condensados Intermedios — Sep 2023', 'https://crownpointenergy.com/wp-content/uploads/2023/11/EEFF-CPESA-30092023-FINAL-FIRMADO.pdf', true),
  ('financiero', 'CPESA', '2023-01-01', 'Jun 30, 2023', 'Trimestral', '', 'EEFF Condensados Intermedios — Jun 2023', 'https://crownpointenergy.com/wp-content/uploads/2023/08/EEFF-CPESA-Financials-Q2-2023.pdf', true),
  ('financiero', 'CPESA', '2023-01-01', 'Mar 31, 2023', 'Trimestral', '', 'EEFF Condensados Intermedios — Mar 2023', 'https://crownpointenergy.com/wp-content/uploads/2023/05/CWV-CPESA-Financials-Q1-2023.pdf', true),
  ('financiero', 'CPESA', '2023-01-01', 'Dic 31, 2022', 'Anual', '', 'Memoria y Estados Financieros 2022', 'https://crownpointenergy.com/wp-content/uploads/2023/03/EEFF-CPESA-31.12.2022-firmado.pdf', true),
  ('financiero', 'CPESA', '2022-01-01', 'Sep 30, 2022', 'Trimestral', '', 'EEFF Condensados Intermedios — Sep 2022', 'https://crownpointenergy.com/wp-content/uploads/2023/02/EEFF_CPESA_30.09.22_firmados.pdf', true),
  ('financiero', 'CPESA', '2022-01-01', 'Jun 30, 2022', 'Trimestral', '', 'EEFF Condensados Intermedios — Jun 2022', 'https://crownpointenergy.com/wp-content/uploads/2023/02/EEFF_CPESA_30062022_signedfinal_firmado.pdf', true),
  ('financiero', 'CPESA', '2022-01-01', 'Mar 31, 2022', 'Trimestral', '', 'EEFF Condensados Intermedios — Mar 2022', 'https://crownpointenergy.com/wp-content/uploads/2022/05/EEFF-CPESA-31_03_2022.pdf', true),
  ('financiero', 'CPESA', '2022-01-01', 'Dic 31, 2021', 'Anual', '', 'Memoria y Estados Financieros 2021', 'https://crownpointenergy.com/wp-content/uploads/2022/03/EEFF-CPESA-31.12.2021.pdf', true),
  ('financiero', 'CPESA', '2021-01-01', 'Sep 30, 2021', 'Trimestral', '', 'EEFF Condensados Intermedios — Sep 2021', 'https://crownpointenergy.com/wp-content/uploads/2021/11/EEFF-CPESA-30092021-Final.pdf', true),
  ('financiero', 'CPESA', '2021-01-01', 'Jun 30, 2021', 'Trimestral', '', 'EEFF Condensados Intermedios — Jun 2021', 'https://crownpointenergy.com/wp-content/uploads/2021/08/EEFF-CPESA-30.06.2021-VF-signed.pdf', true),
  ('financiero', 'CPESA', '2021-01-01', 'Mar 31, 2021', 'Trimestral', '', 'EEFF Condensados Intermedios — Mar 2021', 'https://crownpointenergy.com/wp-content/uploads/2021/05/EEFF-CPESA-31.03.2021-FINAL.pdf', true),
  ('financiero', 'CPESA', '2021-01-01', 'Dic 31, 2020', 'Anual', '', 'Memoria y Estados Financieros 2020', 'https://crownpointenergy.com/wp-content/uploads/2021/04/EEFF-CPESA-31-12-20-NIIF-FINAL.pdf', true),
  ('financiero', 'CPESA', '2020-01-01', 'Sep 30, 2020', 'Trimestral', '', 'EEFF Especiales Intermedios — Sep 2020', 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EF-30-septiembre-2020.pdf', true),
  ('financiero', 'CPESA', '2020-01-01', 'Dic 31, 2019', 'Trimestral', '', 'Estados Financieros Consolidados — Dic 2019', 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EF-31-diciembre-2019.pdf', true),
  ('financiero', 'CPESA', '2019-01-01', 'Dic 31, 2018', 'Anual', '', 'Memoria y Estados Contables 2018', 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EC-31-diciembre-2018.pdf', true),
  ('financiero', 'CPESA', '2018-01-01', 'Dic 31, 2017', 'Anual', '', 'Memoria y Estados Contables 2017', 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EC-31-diciembre-2017.pdf', true),
  ('agm', 'CPI', '2025-11-25', '', 'Circular', 'Management Information Circular — AGM 2025', '', 'https://crownpointenergy.com/wp-content/uploads/2025/11/Circular-CWV-2025-AGM.pdf', true),
  ('agm', 'CPI', '2025-11-25', '', 'Notice', 'Notice and Access Notification — AGM 2025', '', 'https://crownpointenergy.com/wp-content/uploads/2025/11/Notice-and-Access-Crown-Point-AGM-2025.pdf', true),
  ('agm', 'CPI', '2025-11-18', '', 'Proxy', 'Form of Proxy — AGM 2025', '', 'https://crownpointenergy.com/wp-content/uploads/2025/11/Form-of-Proxy-Crown-Point-AGM-2025.pdf', true),
  ('agm', 'CPI', '2024-08-01', '', 'Circular', 'Management Information Circular — AGM 2024', '', 'https://crownpointenergy.com/wp-content/uploads/2024/08/Informal-Circular-2024-AGM-CWV-Compiled.pdf', true),
  ('agm', 'CPI', '2024-08-01', '', 'Notice', 'Notice and Access Notification — AGM 2024', '', 'https://crownpointenergy.com/wp-content/uploads/2024/08/Notice-and-Access-Notification-Crown-Point-AGM-2024.pdf', true),
  ('agm', 'CPI', '2023-09-01', '', 'Circular', 'Management Information Circular — AGM 2023', '', 'https://crownpointenergy.com/wp-content/uploads/2023/09/Information-Circular-2023.pdf', true),
  ('agm', 'CPI', '2022-06-01', '', 'Circular', 'Management Information Circular — AGM 2022', '', 'https://crownpointenergy.com/wp-content/uploads/2022/06/InformationCircular.pdf', true),
  ('agm', 'CPI', '2022-06-01', '', 'Notice', 'Notice of Annual General Meeting 2022', '', 'https://crownpointenergy.com/wp-content/uploads/2022/06/NoticeofMeeting.pdf', true),
  ('agm', 'CPI', '2021-06-01', '', 'Circular', 'Management Information Circular — AGM 2021', '', 'https://crownpointenergy.com/wp-content/uploads/2021/06/CWV-Circular.pdf', true),
  ('agm', 'CPI', '2021-06-01', '', 'Notice', 'Notice and Access Notification — AGM 2021', '', 'https://crownpointenergy.com/wp-content/uploads/2021/06/CWV-notice-of-NA.pdf', true),
  ('agm', 'CPI', '2018-07-01', '', 'Circular', 'Management Information Circular — AGM 2018', '', 'https://crownpointenergy.com/wp-content/uploads/2018/07/CWV-Information-Circular-2018-06-FINAL_9181520_1.pdf', true),
  ('estma', 'CPI', '2026-01-01', '', 'ESTMA', '2025 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2026/04/E986627-CROWN-POINT-ENERGY-INC.-2025-ESTMA-Report-filed.pdf', true),
  ('estma', 'CPI', '2025-01-01', '', 'ESTMA', '2024 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2025/03/CPE-ESTMA-Report-2024.pdf', true),
  ('estma', 'CPI', '2024-01-01', '', 'ESTMA', '2023 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2024/02/CPE-ESTMA-Report-2023.pdf', true),
  ('estma', 'CPI', '2023-01-01', '', 'ESTMA', '2022 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2023/03/CPE-ESTMA-Report-2022.pdf', true),
  ('estma', 'CPI', '2022-01-01', '', 'ESTMA', '2021 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2022/03/CPE-ESTMA-Report-2021-1.pdf', true),
  ('estma', 'CPI', '2021-01-01', '', 'ESTMA', '2020 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2021/05/CPE-ESTMA-Report-2020.pdf', true),
  ('estma', 'CPI', '2020-01-01', '', 'ESTMA', '2019 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2020/05/ESTMA-Reporting-CPE-INC-2019-1.pdf', true),
  ('estma', 'CPI', '2019-01-01', '', 'ESTMA', '2018 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2019/05/ESTMA-Reporting-CPE-INC-2018-1.pdf', true),
  ('estma', 'CPI', '2018-01-01', '', 'ESTMA', '2017 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2018/04/CWV-2017-ESTMA.pdf', true),
  ('estma', 'CPI', '2017-01-01', '', 'ESTMA', '2016 ESTMA Report', '', 'https://crownpointenergy.com/wp-content/uploads/2017/05/CWV-2016-ESTMA.pdf', true),
  ('gobernanza', 'CPI', NULL, '', 'governance', 'Audit Committee Mandate', '', 'https://crownpointenergy.com/wp-content/uploads/2015/01/CWV-Audit-Committee-Mandate.pdf', true),
  ('gobernanza', 'CPI', NULL, '', 'governance', 'Compensation Committee Mandate', '', 'https://crownpointenergy.com/wp-content/uploads/2016/11/Compensation-Committee-Mandate-draft-amendment-March-7-2016_7433875_2....pdf', true),
  ('gobernanza', 'CPI', NULL, '', 'governance', 'Reserves, Health, Safety and Environment Committee Mandate', '', 'https://crownpointenergy.com/wp-content/uploads/2015/01/CWV-Reserves-and-Health-Safety-and-Environment-Committee-Mandate.pdf', true),
  ('gobernanza', 'CPI', NULL, '', 'governance', 'Whistleblower Policy', '', 'https://crownpointenergy.com/wp-content/uploads/2014/12/CWV-Whistleblower-Policy.pdf', true),
  ('gobernanza', 'CPESA', NULL, '', 'governance', '', 'Política Anticorrupción', 'https://crownpointenergy.com/wp-content/uploads/2021/01/01.Politica-Anticorrupcion-Final-ESP.pdf', true),
  ('gobernanza', 'CPESA', NULL, '', 'governance', '', 'Código de Conducta y Ética Empresarial', 'https://crownpointenergy.com/wp-content/uploads/2021/01/02.Codigo-de-Conducta-y-Etica-Empresarial-Final-ESP.pdf', true),
  ('gobernanza', 'CPESA', NULL, '', 'governance', '', 'Política de Uso de Información Privilegiada', 'https://crownpointenergy.com/wp-content/uploads/2021/01/03.Politica-de-Uso-de-Informacion-Privilegiada-Final-ESP.pdf', true),
  ('gobernanza', 'CPESA', NULL, '', 'governance', '', 'Política de Denuncia de Irregularidades', 'https://crownpointenergy.com/wp-content/uploads/2021/01/04.Politica-de-denuncia-de-irregularidades-Final-ESP.pdf', true),
  ('gobernanza', 'CPESA', NULL, '', 'governance', '', 'Formulario de Denuncias e Irregularidades', 'https://forms.gle/L8AmmZ8NeSKQxMGC7', true)
ON CONFLICT (url) DO NOTHING;
-- Total: 130 documents

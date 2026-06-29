/**
 * Crown Point Energy — Document Migration Script
 * Downloads PDFs from crownpointenergy.com and uploads to Supabase Storage.
 * Updates ir_documents and comunicados tables with new storage URLs.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node download-upload-docs.mjs
 *
 * Optional env vars:
 *   CONCURRENCY=3          (default: 3 parallel downloads)
 *   BUCKET=ir-documents    (default: ir-documents)
 *   DRY_RUN=1              (list files without downloading)
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { URL } from 'url'

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET       = process.env.BUCKET || 'ir-documents'
const CONCURRENCY  = parseInt(process.env.CONCURRENCY || '3')
const DRY_RUN      = process.env.DRY_RUN === '1'
const LOG_FILE     = './migration-log.json'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── All PDFs to migrate ───────────────────────────────────────────────────────
const DOCS = [
  // ── FINANCIAL REPORTS CPI ─────────────────────────────────────────────────
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2026/05/2025-Annual-MDA-Crown-Point-Energy-Inc_.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2026/05/2025-Audited-Annual-Financial-Statements-Crown-Point-Energy-Inc_.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2025/08/2-Crown-Point-MDA-Jun-2025-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2025/08/1-Crown-Point-FS-Jun-2025-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2025/05/Crown-Point-MDA-Mar-2025-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2025/05/Crown-Point-FS-Mar-2025-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2025/04/2-Crown-Point-MDA-Dec-2024-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2025/04/Crown-Point-Energy-Inc.-December-31-2024-Consolidated-Financial-Statements-SEDAR.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2024/06/Crown-Point-MDA-March-31-2024.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2024/06/Crown-Point-FS-March-31-2024.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2024/03/2-Crown-Point-MDA-Dec-2023.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2024/03/1-Crown-Point-FS-Dec-2023.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/11/2-Crown-Point-MDA-Sep-2023-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/11/1-Crown-Point-FS-Sept-2023-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/08/2-Crown-Point-MDA-Jun-2023-Final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/08/1-Crown-Point-FS-Jun-2023-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/05/Crown-Point-MDA-March-2023.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/05/Crown-Point-FS-March-2023.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/03/Crown-Point-MDA-Dec-2022-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2023/03/Crown-Point-FS-Dec-2022-SEDAR.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/11/2-Crown-Point-MDA-Sep-2022-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/11/1-Crown-Point-FS-Sep-2022-FINAL.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/08/MDAQ2.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/08/FinancialsQ2.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/05/Crown-Point-MDA-Mar-2022-Final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/05/1-Crown-Point-FS-Mar-2022-Final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/03/MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2022/03/Financials.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/11/Crown-Point-MDA-Sep-2021.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/11/Crown-Point-FS-Sep-2021.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/08/2-Crown-Point-MDA-Jun-2021-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/08/Crown-Point-FS-Jun-2021.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/05/MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/05/Financials.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/03/2-Crown-Point-MDA-Dec-2020-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2021/03/1-Crown-Point-FS-Dec-2020-final-w-audit-report.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/11/Crown-Point-MDA-Sep-2020.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/11/Crown-Point-FS-Sep-2020.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/08/Crown-Point-MDA-Jun-2020.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/08/1-Crown-Point-FS-Jun-2020-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/05/2-Crown-Point-MDA-Mar-2020-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/05/1-Crown-Point-FS-Mar-2020-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/04/2-Crown-Point-MDA-Dec-2019-FINAL_10145304_1.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2020/04/Financial-Statements-FINAL_10145966_1.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/11/Crown-Point-MDA-Sep-2019-9896492_1.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/11/Crown-Point-FS-Sep-2019-9896496_1.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/08/Crown-Point-MDA-Jun-2019.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/08/Crown-Point-FS-Jun-2019.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/05/MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/05/Financials.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/04/Crown-Point-MDA-Dec-2018-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2019/04/Crown-Point-FS-Dec-2018-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/11/CWV-Q3-2018-MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/11/CWV-Q3-2018-FS.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/08/CWV-Q2-2018-MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/08/CWV-Q2-2018-FS.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/06/CWV-MDA-Q1-2018.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/06/CWV-FS-Q1-2018.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/03/Crown-Point-MDA-Dec-2017-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2018/03/Crown-Point-FS-Dec-2017-final-w-audit-rpt.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/12/CWV-Q3-2017-MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/12/CWV-Q3-2017-FS.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/08/CWV-Q2-2017-MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/08/CWV-Q2-2017-FS.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/05/Crown-Point-MDA-Mar-2017.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/05/Crown-Point-FS-Mar-2017.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/03/CWP-Q4-2016-MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2017/03/CWP-Q4-2016-Financials.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2016/11/Q3-2016-CWP-MDA.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2016/11/Q3-2016-CWP-FS.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2016/08/Crown-Point-MDA-Jun-2016-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2016/08/Crown-Point-FS-Jun-2016-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2016/05/Crown-Point-MDA-Mar-2016-final.pdf' },
  { cat: 'financiero/cpi', url: 'https://crownpointenergy.com/wp-content/uploads/2016/05/Crown-Point-FS-Mar-2016-final.pdf' },
  // ── FINANCIAL REPORTS CPESA ───────────────────────────────────────────────
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2026/05/Crown-Point-Energia-S.A.-estados-financieros-al-31-03-2026-LEGALIZADOS_compressed.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2026/04/CROWN-POINT-ENERGIA-SA-EEFF-AL-31122025-LEGALIZADO_compressed.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2025/11/CPESA-Estados-Financieros-30-09-20025-Certificado_comprimido.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2025/08/EEFF-CPESA-30062025-Certificado-comprimido.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2025/05/EEFF-CPESA-31.03.2025-Legalizado-comprimido.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2025/03/EEFF-CPESA-31.12.2024-Informe-de-Auditoria-FIRMADOS-comprimido-web.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2024/11/EEFF-CPESA-30092024-Firmado-Certificado_.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2024/08/EEFF-CPESA-30062024-firmado-digital.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2024/06/EEFF-CPESA-31032024-Firmado-Final.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2024/03/EEFF-CPESA-31.12.2023-firmado.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2023/11/EEFF-CPESA-30092023-FINAL-FIRMADO.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2023/08/EEFF-CPESA-Financials-Q2-2023.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2023/05/CWV-CPESA-Financials-Q1-2023.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2023/03/EEFF-CPESA-31.12.2022-firmado.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2023/02/EEFF_CPESA_30.09.22_firmados.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2023/02/EEFF_CPESA_30062022_signedfinal_firmado.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2022/05/EEFF-CPESA-31_03_2022.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2022/03/EEFF-CPESA-31.12.2021.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/11/EEFF-CPESA-30092021-Final.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/08/EEFF-CPESA-30.06.2021-VF-signed.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/05/EEFF-CPESA-31.03.2021-FINAL.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/04/EEFF-CPESA-31-12-20-NIIF-FINAL.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EF-30-septiembre-2020.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EF-31-diciembre-2019.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EC-31-diciembre-2018.pdf' },
  { cat: 'financiero/cpesa', url: 'https://crownpointenergy.com/wp-content/uploads/2021/02/CPESA-EC-31-diciembre-2017.pdf' },
  // ── AGM ───────────────────────────────────────────────────────────────────
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2025/11/Circular-CWV-2025-AGM.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2025/11/Notice-and-Access-Crown-Point-AGM-2025.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2025/11/Form-of-Proxy-Crown-Point-AGM-2025.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2024/08/Informal-Circular-2024-AGM-CWV-Compiled.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2024/08/Notice-and-Access-Notification-Crown-Point-AGM-2024.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2023/09/Information-Circular-2023.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2022/06/InformationCircular.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2022/06/NoticeofMeeting.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2021/06/CWV-Circular.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2021/06/CWV-notice-of-NA.pdf' },
  { cat: 'agm', url: 'https://crownpointenergy.com/wp-content/uploads/2018/07/CWV-Information-Circular-2018-06-FINAL_9181520_1.pdf' },
  // ── ESTMA ─────────────────────────────────────────────────────────────────
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2026/04/E986627-CROWN-POINT-ENERGY-INC.-2025-ESTMA-Report-filed.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2025/03/CPE-ESTMA-Report-2024.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2024/02/CPE-ESTMA-Report-2023.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2023/03/CPE-ESTMA-Report-2022.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2022/03/CPE-ESTMA-Report-2021-1.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2021/05/CPE-ESTMA-Report-2020.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2020/05/ESTMA-Reporting-CPE-INC-2019-1.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2019/05/ESTMA-Reporting-CPE-INC-2018-1.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2018/04/CWV-2017-ESTMA.pdf' },
  { cat: 'estma', url: 'https://crownpointenergy.com/wp-content/uploads/2017/05/CWV-2016-ESTMA.pdf' },
  // ── GOVERNANCE ────────────────────────────────────────────────────────────
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2015/01/CWV-Audit-Committee-Mandate.pdf' },
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2016/11/Compensation-Committee-Mandate-draft-amendment-March-7-2016_7433875_2....pdf' },
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2015/01/CWV-Reserves-and-Health-Safety-and-Environment-Committee-Mandate.pdf' },
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2014/12/CWV-Whistleblower-Policy.pdf' },
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2021/01/01.Politica-Anticorrupcion-Final-ESP.pdf' },
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2021/01/02.Codigo-de-Conducta-y-Etica-Empresarial-Final-ESP.pdf' },
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2021/01/03.Politica-de-Uso-de-Informacion-Privilegiada-Final-ESP.pdf' },
  { cat: 'gobernanza', url: 'https://crownpointenergy.com/wp-content/uploads/2021/01/04.Politica-de-denuncia-de-irregularidades-Final-ESP.pdf' },
]

const PR_PDFS = [
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2025/11/Press-release-Q3-2025-FINAL.pdf', page: 'https://crownpointenergy.com/?p=3344' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2025/07/News_Release_-_June_9_2025.pdf', page: 'https://crownpointenergy.com/?p=3248' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2024/11/Press-release-Q32024-Final.pdf', page: 'https://crownpointenergy.com/?p=3194' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2024/11/CPE-Inc.-Acquisition-Santa-Cruz-Concessions-PCKK-Closing.pdf', page: 'https://crownpointenergy.com/?p=3181' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2024/08/Press-release-Q2-2024-Final.pdf', page: 'https://crownpointenergy.com/?p=3121' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2024/04/PC-KK-YE-2023-Draft-Reserves-News-Release-Final13786105.5.pdf', page: 'https://crownpointenergy.com/?p=3073' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2024/03/Press-release-Q4-2023-FINAL13753195.1.pdf', page: 'https://crownpointenergy.com/?p=3061' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2024/03/CPE-YE-2023-Reserves-News-Release-Final-Mar-11.pdf', page: 'https://crownpointenergy.com/?p=3009' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2024/01/CROWNPOINT-Note-Offering-Issue-Settlement-December-2023_ENG.pdf', page: 'https://crownpointenergy.com/?p=3000' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2023/08/CrownPoint-Q2-Press-Release.pdf', page: 'https://crownpointenergy.com/?p=2927' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2023/07/CWV-Note-Offering-Issue-Settlement-July-2023.pdf', page: 'https://crownpointenergy.com/?p=2914' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2023/05/CrownPoint-Q1-Press-Release.pdf', page: 'https://crownpointenergy.com/?p=2884' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2023/03/Crown-point-Q4-2022.pdf', page: 'https://crownpointenergy.com/?p=2848' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2023/03/Crown-point_Reserves-News-Release-2022.pdf', page: 'https://crownpointenergy.com/?p=2814' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/11/Press-release-Q3-2022.pdf', page: 'https://crownpointenergy.com/?p=2787' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/08/Press-release-PPCO-Aug-11.pdf', page: 'https://crownpointenergy.com/?p=2773' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/08/Press-release-Q2-2022-Final.pdf', page: 'https://crownpointenergy.com/?p=2762' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/08/CWV-Note-Offering-Issue-Settlement-Revision-August-8-2022.pdf', page: 'https://crownpointenergy.com/?p=2754' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/06/CWV-PR-Ops-Update-June-6-202215.pdf', page: 'https://crownpointenergy.com/?p=2716' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/05/Crown-Point-Q1-2022-News-Release-final.pdf', page: 'https://crownpointenergy.com/?p=2692' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/03/Crown-Point-Q4-2021-News-Release.pdf', page: 'https://crownpointenergy.com/?p=2647' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2022/03/CPEI-Press-Release-March-1-2022.pdf', page: 'https://crownpointenergy.com/?p=2610' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/11/Crown-Point-Q3-2021-News-Release.pdf', page: 'https://crownpointenergy.com/?p=2576' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/11/CH-Reserves-Draft-News-Release-v2-November-2-2021_11236100_1.pdf', page: 'https://crownpointenergy.com/?p=2528' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/08/Crown-Point-Q2-2021-News-Release.pdf', page: 'https://crownpointenergy.com/?p=2455' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/06/CWV-Press-Release-Option-Grants-2021_10958715_1-May-31.pdf', page: 'https://crownpointenergy.com/?p=2433' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/05/Q1NewsRelease.pdf', page: 'https://crownpointenergy.com/?p=2398' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/03/Crown-Point-Q4-2020-News-Release-final.pdf', page: 'https://crownpointenergy.com/?p=2377' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/03/Debt-Offering-PR.pdf', page: 'https://crownpointenergy.com/?p=2369' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/03/CPE-March-2020-News-Release-Final.pdf', page: 'https://crownpointenergy.com/?p=2330' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/03/Press-Release-Termination_10821347_1-003.pdf', page: 'https://crownpointenergy.com/?p=2307' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/03/CP-YE-2020-Reserves-Draft-News-Release-v23.pdf', page: 'https://crownpointenergy.com/?p=2312' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2021/01/Crown-Point-CENTAURUS-Press-Release-January-7-2021.pdf', page: 'https://crownpointenergy.com/?p=2114' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/12/CPE-December-28-2020-News-Release.pdf', page: 'https://crownpointenergy.com/?p=2109' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/11/Crown-Point-Q3-2020-News-Release.pdf', page: 'https://crownpointenergy.com/?p=2096' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/09/CWV-March-Ops-Update-September-14-v3_10529796_2.pdf', page: 'https://crownpointenergy.com/?p=2089' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/08/Crown-Point-Q2-2020-News-Release.pdf', page: 'https://crownpointenergy.com/?p=2075' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/05/Crown-Point-Q1-2020-News-Release-May-28.pdf', page: 'https://crownpointenergy.com/?p=2059' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/04/Crown-Point-Q4-2019-News-Release-FINAL_10145287_1.pdf', page: 'https://crownpointenergy.com/?p=2036' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/03/CP-YE-2019-Reserves-News-Release-update-March-30-Final.pdf', page: 'https://crownpointenergy.com/?p=2019' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/03/CWV-March-Ops-Update-March-27.pdf', page: 'https://crownpointenergy.com/?p=2015' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2020/02/CWV-Feb-Ops-Update-Feb-25-BDP.pdf', page: 'https://crownpointenergy.com/?p=1990' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/12/Crown-Point-News-Release-Dec-4.pdf', page: 'https://crownpointenergy.com/?p=1976' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/11/Press-Release-RoC-Details-Due-Bills.pdf', page: 'https://crownpointenergy.com/?p=1972' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/11/Crown-Point-Q3-2019-News-Release-v4-FINAL.pdf', page: 'https://crownpointenergy.com/?p=1967' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/11/Press-Release-Confirmation-of-RoC_9894697_1.pdf', page: 'https://crownpointenergy.com/?p=1963' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/11/CWV-November-12-2019-News-Release.pdf', page: 'https://crownpointenergy.com/?p=1955' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/09/Press-Release-Proposal-and-Special-Meeting-v3_9795711_1.pdf', page: 'https://crownpointenergy.com/?p=1949' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/09/Third-Quarter-Dividend-and-Special-Dividend.pdf', page: 'https://crownpointenergy.com/?p=1941' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/08/Q2pressrelease.pdf', page: 'https://crownpointenergy.com/?p=1926' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/06/News-Release-Initial-Dividend-June-10-2019.pdf', page: 'https://crownpointenergy.com/?p=1901' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/05/Crown-Point-Q1-2019.pdf', page: 'https://crownpointenergy.com/?p=1882' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/04/News-Release-TDF-Interest-Sale-Closing-v2_9583989_2.pdf', page: 'https://crownpointenergy.com/?p=1865' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/04/News-Release-TDF-Interest-Sale.pdf', page: 'https://crownpointenergy.com/?p=1856' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/04/Crown-Point-Q4-2018-News-Release.pdf', page: 'https://crownpointenergy.com/?p=1820' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/03/CP-YE-2018-Reserves-News-Release-vFINAL_9513685_1.pdf', page: 'https://crownpointenergy.com/?p=1799' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/02/News-Release_Crown-Points-Partners-Exercise-Rights-of-First-Refusal.pdf', page: 'https://crownpointenergy.com/?p=1793' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2019/01/News-Release_Crown-Point-Takes-Steps-to-Implement-Arbitration-Award.pdf', page: 'https://crownpointenergy.com/?p=1775' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/12/News-Release-Arbitration-Tribunal-.pdf', page: 'https://crownpointenergy.com/?p=1763' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/11/CWV-Q3-2018-News-Release-Final_9331981_1.pdf', page: 'https://crownpointenergy.com/?p=1747' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/10/CWV-October-2018-News-Release.pdf', page: 'https://crownpointenergy.com/?p=1739' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/08/CWV-Q2-2018-News-Release-final.pdf', page: 'https://crownpointenergy.com/?p=1725' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/08/CWV-8.28.18-PR.pdf', page: 'https://crownpointenergy.com/?p=1720' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/08/CWV-8.20.18-PR.pdf', page: 'https://crownpointenergy.com/?p=1714' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/06/CWV-Apco-6.8.18.pdf', page: 'https://crownpointenergy.com/?p=1705' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/05/CVW-Rights-Offering-Close-5.23.18.pdf', page: 'https://crownpointenergy.com/?p=1693' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/05/CWV-Q1-2018-PR.pdf', page: 'https://crownpointenergy.com/?p=1682' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/05/CWV-Acquisition-Status-5.18.18.pdf', page: 'https://crownpointenergy.com/?p=1677' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/04/CVW-Rights-Offering-4.17.18.pdf', page: 'https://crownpointenergy.com/?p=1666' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/03/CWV-Q4-2017-News-Release-final.pdf', page: 'https://crownpointenergy.com/?p=1655' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/02/CWV-Roch-2.26.18.pdf', page: 'https://crownpointenergy.com/?p=1650' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/02/CWV-Preliminary-Prospectus-PR-2.22.18.pdf', page: 'https://crownpointenergy.com/?p=1645' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/02/CWV-YE-2017-Reserves-PR-2.8.18.pdf', page: 'https://crownpointenergy.com/?p=1636' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/01/CWV-January-2018-Operational-Update.pdf', page: 'https://crownpointenergy.com/?p=1627' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2018/01/Press-Release-Share-Consolidation_8721338_1.pdf', page: 'https://crownpointenergy.com/?p=1617' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2017/11/CWV-Apco-PR-11.22.17.pdf', page: 'https://crownpointenergy.com/?p=1603' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2017/11/CWV-Q3-2017-News-Release-final.pdf', page: 'https://crownpointenergy.com/?p=1593' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2017/10/CWV-Rights-Offering-Closing-10.23.17.pdf', page: 'https://crownpointenergy.com/?p=1587' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2017/10/CWV-October-2017-Operational-Update.pdf', page: 'https://crownpointenergy.com/?p=1580' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2017/09/CWV-Rights-Offering-9.18.17.pdf', page: 'https://crownpointenergy.com/?p=1573' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2017/08/CWV-Q2-2017-PR-FINAL_8514018_1.pdf', page: 'https://crownpointenergy.com/?p=1562' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2016/09/Rights-Offering-Update-9.23.16.pdf', page: 'https://crownpointenergy.com/?p=1466' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2016/08/Rights-Offering-8.12.16.pdf', page: 'https://crownpointenergy.com/?p=1443' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2016/08/CWV-Q2-News-Release-Financial-and-Operations-PR-final.pdf', page: 'https://crownpointenergy.com/?p=1426' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2016/05/CWV-Q1-2016-PR-final.pdf', page: 'https://crownpointenergy.com/?p=1411' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2016/03/CWV-YE-2015-PR-final_7473403_1.pdf', page: 'https://crownpointenergy.com/?p=1384' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2015/12/CWV-PR-Exchange-rate-NR-18-12-2015vfinal.pdf', page: 'https://crownpointenergy.com/?p=1370' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2015/12/CWV-PR-12.18.15-Vega-del-Sol-NR-18-12-2015fina-l.pdf', page: 'https://crownpointenergy.com/?p=1365' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2015/11/CWV-Q3-2015-PR.pdf', page: 'https://crownpointenergy.com/?p=1358' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2015/07/CVW-Operational-Update-July-27-2015-final.pdf', page: 'https://crownpointenergy.com/?p=1310' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2015/05/CWV-Q1-2015-PR-FINAL.pdf', page: 'https://crownpointenergy.com/?p=1271' },
  { cat: 'comunicados', url: 'http://crownpointenergy.com/wp-content/uploads/2015/04/CWV-YE-2014-PR-FINAL.pdf', page: 'https://crownpointenergy.com/?p=1259' },
]

function storagePathFor(cat, rawUrl) {
  const u = new URL(rawUrl.startsWith('http') ? rawUrl : 'https:' + rawUrl)
  const filename = path.basename(u.pathname)
  return `${cat}/${filename}`
}

function downloadBuffer(rawUrl) {
  return new Promise((resolve, reject) => {
    const url = rawUrl.startsWith('http://') ? rawUrl.replace('http://', 'https://') : rawUrl
    const req = https.get(url, { headers: { 'User-Agent': 'CrownPoint-Migration/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadBuffer(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'application/pdf' }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout: ' + url)) })
  })
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

let log = {}
if (fs.existsSync(LOG_FILE)) {
  log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'))
  console.log(`Resuming: ${Object.keys(log).length} already done`)
}
function saveLog() { fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2)) }

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false })
    if (error) throw new Error('Cannot create bucket: ' + error.message)
    console.log(`✓ Created bucket: ${BUCKET}`)
  } else {
    console.log(`✓ Bucket exists: ${BUCKET}`)
  }
}

async function processDoc(doc) {
  const storagePath = storagePathFor(doc.cat, doc.url)
  if (log[doc.url]) return { ...log[doc.url], skipped: true }
  if (DRY_RUN) {
    console.log(`[DRY] ${doc.cat} → ${storagePath}`)
    return { storagePath, supabaseUrl: null, skipped: false }
  }
  let buffer, contentType
  try {
    ;({ buffer, contentType } = await downloadBuffer(doc.url))
  } catch (err) {
    console.error(`  ✗ Download failed: ${doc.url} — ${err.message}`)
    return { error: err.message, url: doc.url }
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: contentType.includes('pdf') ? 'application/pdf' : contentType,
      upsert: true,
    })
  if (error) {
    console.error(`  ✗ Upload failed: ${storagePath} — ${error.message}`)
    return { error: error.message, url: doc.url }
  }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const result = { storagePath, supabaseUrl: publicUrl, originalUrl: doc.url, cat: doc.cat, page: doc.page || null }
  log[doc.url] = result
  saveLog()
  return result
}

async function updateDatabase(results) {
  console.log('\n── Updating database records ──────────────────────────────')
  let irOk = 0, irFail = 0, comOk = 0, comFail = 0
  for (const r of results) {
    if (!r.supabaseUrl || r.skipped) continue
    const isComunicado = r.cat === 'comunicados' || r.cat === 'comunicados-es'
    if (isComunicado && r.page) {
      const { error } = await supabase.from('comunicados')
        .update({ url_pdf: r.supabaseUrl })
        .eq('url', r.page)
      if (error) { console.error(`  ✗ comunicados: ${error.message}`); comFail++ }
      else comOk++
    } else if (!isComunicado) {
      const { error } = await supabase.from('ir_documents')
        .update({ url: r.supabaseUrl })
        .eq('url', r.originalUrl)
      if (error) { console.error(`  ✗ ir_documents: ${error.message}`); irFail++ }
      else irOk++
    }
  }
  console.log(`  comunicados: ${comOk} updated, ${comFail} failed`)
  console.log(`  ir_documents: ${irOk} updated, ${irFail} failed`)
}

async function main() {
  console.log(`\n Crown Point Energy — Document Migration`)
  console.log(`  Bucket: ${BUCKET} | Concurrency: ${CONCURRENCY} | Dry: ${DRY_RUN}`)
  console.log(`  IR docs: ${DOCS.length} | Press release PDFs: ${PR_PDFS.length} | Total: ${DOCS.length + PR_PDFS.length}\n`)
  if (!DRY_RUN) await ensureBucket()
  const allDocs = [...DOCS.map(d => ({ ...d, page: null })), ...PR_PDFS]
  const results = []
  let done = 0
  const total = allDocs.length
  for (let i = 0; i < allDocs.length; i += CONCURRENCY) {
    const batch = allDocs.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(d => processDoc(d)))
    results.push(...batchResults)
    done += batch.length
    const ok = batchResults.filter(r => r.supabaseUrl && !r.skipped).length
    const skip = batchResults.filter(r => r.skipped).length
    const fail = batchResults.filter(r => r.error).length
    console.log(`[${done}/${total}] ok:${ok} skip:${skip} fail:${fail}`)
    if (!DRY_RUN) await sleep(300)
  }
  const ok = results.filter(r => r.supabaseUrl).length
  const failed = results.filter(r => r.error)
  console.log(`\n── Summary ─────────────────────────────────────────────────`)
  console.log(`  Total: ${total} | OK: ${ok} | Failed: ${failed.length}`)
  if (failed.length) {
    console.log('\n  Failed:')
    failed.forEach(r => console.log(`    ${r.url} — ${r.error}`))
  }
  if (!DRY_RUN) await updateDatabase(results)
  console.log('\nDone. Log:', LOG_FILE)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

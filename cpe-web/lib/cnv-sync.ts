import { parse } from 'node-html-parser'
import { createClient } from '@supabase/supabase-js'

const CNV_CUIT    = '30709346268'
const CNV_BASE    = 'https://www.cnv.gov.ar'
const CNV_EMPRESA = `${CNV_BASE}/SitioWeb/Empresas/Empresa/${CNV_CUIT}`

export type CnvHecho = {
  doc_id:      number
  fecha:       string   // 'YYYY-MM-DD'
  hora:        string
  tipo:        'hecho_relevante' | 'estado_contable'
  descripcion: string
  pdf_url:     string | null
}

// ── Date parsing ─────────────────────────────────────────────────────────────

const MONTH: Record<string, string> = {
  'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
}

function parseDate(raw: string): string {
  // "27 mar. 2024" → "2024-03-27"
  const m = raw.trim().toLowerCase().match(/(\d{1,2})\s+([a-z]{3})\.?\s+(\d{4})/)
  if (!m) return raw
  const [, d, mon, y] = m
  return `${y}-${MONTH[mon] ?? '01'}-${d.padStart(2, '0')}`
}

// ── HTML scraper ──────────────────────────────────────────────────────────────

async function fetchCnvHtml(): Promise<string> {
  const res = await fetch(CNV_EMPRESA, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      'Cache-Control':   'no-cache',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`CNV HTTP ${res.status}`)
  return res.text()
}

function parseTable(
  html: string,
  sectionKeyword: string,
  tipo: CnvHecho['tipo'],
): CnvHecho[] {
  const root = parse(html)
  const results: CnvHecho[] = []

  // Find the accordion/panel that contains the keyword
  const panels = root.querySelectorAll('h3, h4, div[class*="panel"], div[class*="header"], span, th')
  let targetTable: ReturnType<typeof root.querySelector> | null = null

  for (const el of panels) {
    if (el.text.toLowerCase().includes(sectionKeyword.toLowerCase())) {
      // Look for the next table sibling (up to 5 parent levels)
      let node = el as typeof el | null
      for (let i = 0; i < 6 && node; i++) {
        const tbl = node.querySelector('table')
        if (tbl) { targetTable = tbl; break }
        const nextSibling = node.nextElementSibling
        if (nextSibling) {
          const tbl2 = nextSibling.tagName === 'TABLE'
            ? nextSibling
            : nextSibling.querySelector('table')
          if (tbl2) { targetTable = tbl2; break }
        }
        node = node.parentNode as typeof el | null
      }
      if (targetTable) break
    }
  }

  if (!targetTable) return results

  const rows = targetTable.querySelectorAll('tr')
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length < 4) continue

    const rawFecha = cells[0].text.trim()
    const hora     = cells[1].text.trim()
    const desc     = cells[2].text.trim().replace(/\s+/g, ' ')
    const rawDoc   = cells[3].text.trim().replace(/\D/g, '')

    if (!rawFecha || !rawDoc || !/^\d{4,}$/.test(rawDoc)) continue

    // Build PDF/document URL — CNV uses this pattern for AIF documents
    const docId  = parseInt(rawDoc, 10)
    const pdfUrl = `${CNV_BASE}/SitioWeb/Empresas/HechoRelevante/${docId}`

    results.push({
      doc_id:      docId,
      fecha:       parseDate(rawFecha),
      hora,
      tipo,
      descripcion: desc,
      pdf_url:     pdfUrl,
    })
  }

  return results
}

export async function scrapeCnvHechos(): Promise<CnvHecho[]> {
  const html = await fetchCnvHtml()
  const hechos  = parseTable(html, 'hechos relevantes',   'hecho_relevante')
  const estados = parseTable(html, 'estados contables',   'estado_contable')
  return [...hechos, ...estados]
}

// ── Supabase upsert ───────────────────────────────────────────────────────────

export async function syncCnvToSupabase(): Promise<{ inserted: number; errors: string[] }> {
  const hechos = await scrapeCnvHechos()
  if (!hechos.length) return { inserted: 0, errors: ['No rows parsed from CNV — page may be JS-rendered'] }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const rows = hechos.map(h => ({ ...h, synced_at: new Date().toISOString() }))
  const { error } = await db
    .from('cnv_hechos')
    .upsert(rows, { onConflict: 'doc_id' })

  if (error) return { inserted: 0, errors: [error.message] }
  return { inserted: rows.length, errors: [] }
}

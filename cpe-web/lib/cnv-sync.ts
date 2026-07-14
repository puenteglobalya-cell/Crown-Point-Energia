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

  // The CNV page uses Bootstrap accordion panels. Each section has:
  //   <div class="panel-heading"> → <h4> → <a> → <strong>TITLE</strong>
  //   <div class="panel-collapse">  (sibling of panel-heading)
  //     <table class="tabla-hechos-relevantes">
  // We match <strong> text, walk up to panel-heading, then read its sibling.
  const strongs = root.querySelectorAll('h4 strong, h4 a strong')
  let targetTable: ReturnType<typeof root.querySelector> | null = null

  for (const el of strongs) {
    if (!el.text.toLowerCase().includes(sectionKeyword.toLowerCase())) continue

    let heading = el.parentNode as typeof el | null
    while (heading && !(heading.getAttribute?.('class') ?? '').includes('panel-heading')) {
      heading = heading.parentNode as typeof el | null
    }
    if (!heading) continue

    const collapse = heading.nextElementSibling
    const tbl = collapse?.querySelector?.('table')
    if (tbl) {
      const trs = tbl.querySelectorAll('tr').filter(tr => tr.querySelectorAll('td').length >= 4)
      if (trs.length > 0) { targetTable = tbl; break }
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

    const docId = parseInt(rawDoc, 10)

    // Extract real AIF link from the VER column if available
    const verCell = cells.length >= 5 ? cells[4] : null
    const aifLink = verCell?.querySelector('a')?.getAttribute('href') ?? null
    const pdfUrl  = aifLink || `${CNV_BASE}/SitioWeb/Empresas/HechoRelevante/${docId}`

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

// Esta emisora publica casi todo bajo "Estados Contables" en la AIF; los hechos
// relevantes reales (calificación, reservas, convocatorias, hechos relevantes,
// actas de asamblea) van mezclados ahí. Los reclasificamos por descripción.
const HECHO_RELEVANTE_RE = /hecho relevante|otra informaci[oó]n del adm|convocatoria|calificaci[oó]n|reservas|asamblea/i

export async function scrapeCnvHechos(): Promise<CnvHecho[]> {
  const html = await fetchCnvHtml()

  // Parse from three sections and dedupe by doc_id
  const ultima  = parseTable(html, 'última información recibida', 'hecho_relevante')
  const hechos  = parseTable(html, 'hechos relevantes',           'hecho_relevante')
  const estados = parseTable(html, 'estados contables',           'estado_contable')

  const reclasificados = [...ultima, ...estados].map(h =>
    HECHO_RELEVANTE_RE.test(h.descripcion) ? { ...h, tipo: 'hecho_relevante' as const } : h
  )

  const seen = new Set<number>()
  const all: CnvHecho[] = []
  for (const h of [...hechos, ...reclasificados]) {
    if (seen.has(h.doc_id)) continue
    seen.add(h.doc_id)
    all.push(h)
  }
  return all
}

// ── Supabase upsert ───────────────────────────────────────────────────────────

export async function syncCnvToSupabase(): Promise<{ inserted: number; errors: string[] }> {
  const scraped = await scrapeCnvHechos()
  // Solo hechos relevantes: los balances/estados contables se publican en la sección EEFF CPESA
  const hechos = scraped.filter(h => h.tipo === 'hecho_relevante')
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

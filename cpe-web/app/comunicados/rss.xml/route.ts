import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const revalidate = 300

const BASE = 'https://crownpointenergy.com'

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

type Comunicado = {
  id: string
  fecha: string | null
  titulo_es: string | null
  titulo_en: string | null
  resumen_es: string | null
  url: string | null
  created_at: string | null
}

export async function GET() {
  let items: Comunicado[] = []
  try {
    const { data } = await createSupabaseServerAdminClient()
      .from('comunicados')
      .select('id, fecha, titulo_es, titulo_en, resumen_es, url, created_at')
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .limit(50)
    items = (data as Comunicado[] | null) ?? []
  } catch {
    // Table may not exist yet — serve an empty but valid feed.
    items = []
  }

  const entries = items.map((c) => {
    const link = c.url && /^https?:\/\//.test(c.url) ? c.url : `${BASE}/comunicados/${c.id}`
    const pub = c.fecha || c.created_at
    const pubDate = pub ? new Date(pub).toUTCString() : new Date(0).toUTCString()
    const title = c.titulo_es || c.titulo_en || 'Comunicado'
    return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(c.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${c.resumen_es ? `<description>${esc(c.resumen_es)}</description>` : ''}
    </item>`
  }).join('\n')

  const lastBuild = items[0]?.fecha || items[0]?.created_at
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Crown Point Energy — Comunicados</title>
    <link>${BASE}/comunicados</link>
    <description>Comunicados de prensa, hechos relevantes y novedades corporativas de Crown Point Energy (TSXV: CWV).</description>
    <language>es-AR</language>
    <lastBuildDate>${(lastBuild ? new Date(lastBuild) : new Date(0)).toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/comunicados/rss.xml" rel="self" type="application/rss+xml" />
${entries}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  })
}

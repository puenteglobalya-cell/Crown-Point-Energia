import Link from 'next/link'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Result = { title: string; snippet: string; href: string; kind: string }

async function search(q: string): Promise<Result[]> {
  if (!q.trim()) return []
  const db = createSupabaseServerAdminClient()
  const like = `%${q}%`

  const [comunicados, operaciones, documentos, hechos] = await Promise.all([
    db.from('comunicados')
      .select('id, titulo_es, resumen_es')
      .eq('publicado', true)
      .or(`titulo_es.ilike.${like},resumen_es.ilike.${like}`)
      .limit(8),
    db.from('operations_blocks')
      .select('slug, titulo, lede_es')
      .eq('activo', true)
      .or(`titulo.ilike.${like},lede_es.ilike.${like}`)
      .limit(8),
    db.from('documentos')
      .select('id, titulo_es')
      .eq('publico', true)
      .ilike('titulo_es', like)
      .limit(8),
    db.from('cnv_hechos')
      .select('doc_id, descripcion, pdf_url')
      .ilike('descripcion', like)
      .limit(8),
  ])

  const results: Result[] = []
  for (const c of comunicados.data ?? []) {
    results.push({ title: c.titulo_es, snippet: c.resumen_es ?? '', href: `/comunicados/${c.id}`, kind: 'Comunicado' })
  }
  for (const o of operaciones.data ?? []) {
    results.push({ title: o.titulo, snippet: o.lede_es ?? '', href: `/operaciones#${o.slug}`, kind: 'Operaciones' })
  }
  for (const d of documentos.data ?? []) {
    results.push({ title: d.titulo_es, snippet: '', href: `/inversores`, kind: 'Documento' })
  }
  for (const h of hechos.data ?? []) {
    results.push({ title: h.descripcion, snippet: '', href: h.pdf_url ?? '/inversores#hechos-cnv', kind: 'Hecho relevante CNV' })
  }
  return results
}

export default async function BuscarPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q ?? ''
  const results = q ? await search(q) : []

  return (
    <section className="section" style={{ minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="crumbs">
          <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
          <span>/</span>
          <span>Búsqueda</span>
        </div>
        <h1 className="section-title" style={{ marginTop: 14, marginBottom: 24 }}>
          <span className="lang-es">Resultados para &ldquo;{q}&rdquo;</span>
          <span className="lang-en">Results for &ldquo;{q}&rdquo;</span>
        </h1>

        <form action="/buscar" style={{ marginBottom: 32, display: 'flex', gap: 8 }}>
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Buscar comunicados, operaciones, documentos…"
            style={{ flex: 1, fontSize: 14, padding: '10px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)' }}
          />
          <button type="submit" className="btn btn-primary" style={{ fontSize: 14, padding: '10px 20px' }}>Buscar</button>
        </form>

        {q && results.length === 0 && (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>
            <span className="lang-es">Sin resultados. Probá con otro término.</span>
            <span className="lang-en">No results. Try another term.</span>
          </p>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {results.map((r, i) => (
            <a
              key={i}
              href={r.href}
              target={r.href.startsWith('http') ? '_blank' : undefined}
              rel={r.href.startsWith('http') ? 'noreferrer' : undefined}
              style={{
                display: 'block', padding: '16px 18px', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)',
                textDecoration: 'none', color: 'var(--fg)', background: 'var(--surface)',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>{r.kind}</span>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{r.title}</div>
              {r.snippet && <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{r.snippet}</div>}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

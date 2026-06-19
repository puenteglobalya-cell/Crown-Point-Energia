'use client'

import Link from 'next/link'
import { useState } from 'react'

type Comunicado = {
  id: string
  fecha: string
  titulo_es: string
  titulo_en: string
  resumen_es: string
  resumen_en: string
  url: string
  tipo: string
}

const CATS = [
  { key: 'all',        es: 'Todos',               en: 'All' },
  { key: 'resultados', es: 'Resultados',           en: 'Results' },
  { key: 'operaciones',es: 'Operaciones',          en: 'Operations' },
  { key: 'mercados',   es: 'Mercado de capitales', en: 'Capital markets' },
  { key: 'esg',        es: 'ESG',                  en: 'ESG' },
  { key: 'gobierno',   es: 'Gobierno corporativo', en: 'Governance' },
  { key: 'general',    es: 'General',              en: 'General' },
]

const CAT_LABELS: Record<string, { es: string; en: string }> = Object.fromEntries(
  CATS.map(c => [c.key, { es: c.es, en: c.en }])
)

const CAT_COLORS: Record<string, string> = {
  resultados:  'rgba(108,174,82,0.14)',
  operaciones: 'rgba(201,162,74,0.14)',
  mercados:    'rgba(31,37,102,0.1)',
  esg:         'rgba(47,160,138,0.14)',
  gobierno:    'rgba(79,84,120,0.14)',
  general:     'rgba(120,120,130,0.1)',
}

function fmtFecha(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function getYear(iso: string) {
  return iso ? Number(iso.slice(0, 4)) : 0
}

export default function ComunicadosList({ initialData }: { initialData: Comunicado[] }) {
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const filtered = initialData.filter(r => {
    const matchCat = cat === 'all' || r.tipo === cat
    const q = search.toLowerCase()
    const matchSearch = !q || r.titulo_es.toLowerCase().includes(q) || r.titulo_en.toLowerCase().includes(q) || r.resumen_es.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const years = [...new Set(filtered.map(r => getYear(r.fecha)))].sort((a, b) => b - a)

  return (
    <section className="section">
      <div className="container">
        <style>{`
          .press-toolbar { display: flex; flex-direction: column; gap: var(--s-4); margin-bottom: var(--s-8); }
          .search-wrap { position: relative; background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-md); display: flex; align-items: center; gap: 10px; padding: 4px 16px; max-width: 460px; }
          .search-wrap svg { color: var(--fg-muted); flex-shrink: 0; }
          .search-wrap input { flex: 1; border: 0; outline: 0; background: transparent; padding: 14px 0; font-family: inherit; font-size: 15px; color: var(--fg); }
          .search-wrap:focus-within { border-color: var(--accent); }
          .year-divider { display: flex; align-items: center; gap: 16px; padding: var(--s-8) 0 var(--s-5); font-family: var(--font-display); font-size: 26px; font-weight: 600; letter-spacing: -0.02em; color: var(--fg); }
          .year-divider::after { content: ""; flex: 1; height: 1px; background: var(--rule); }
          .year-divider span.num { color: var(--fg-muted); font-size: 14px; font-weight: 400; letter-spacing: 0; }
          .press-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--s-5); }
          .press-card { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-lg); padding: var(--s-6); display: flex; flex-direction: column; gap: var(--s-3); text-decoration: none; color: inherit; transition: box-shadow .2s, transform .2s, border-color var(--t-fast); }
          .press-card:hover { box-shadow: 0 8px 32px rgba(31,37,102,.1); transform: translateY(-2px); border-color: color-mix(in oklab, var(--accent) 40%, var(--rule)); }
          .press-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
          .press-card-date { font-family: var(--font-mono); font-size: 11px; color: var(--fg-muted); letter-spacing: 0.04em; }
          .press-card-title { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.35; color: var(--fg); margin: 0; flex: 1; }
          .press-card-summary { font-size: 13px; color: var(--fg-soft); line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .press-card-cta { font-size: 12px; font-weight: 600; color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; display: flex; align-items: center; gap: 5px; margin-top: auto; padding-top: var(--s-2); }
          .press-subscribe { background: var(--bg-alt); border: 1px solid var(--rule); border-radius: var(--r-xl); padding: var(--s-10) var(--s-12); margin-top: var(--s-16); display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-12); align-items: center; }
          .press-subscribe-form { display: flex; gap: 10px; flex-wrap: wrap; }
          .press-subscribe-form input { flex: 1; min-width: 200px; padding: 13px 16px; border: 1px solid var(--rule); background: var(--surface); color: var(--fg); border-radius: var(--r-md); font-family: inherit; font-size: 15px; }
          .press-subscribe-form input:focus { outline: none; border-color: var(--accent); }
          @media (max-width: 720px) { .press-subscribe { grid-template-columns: 1fr; gap: var(--s-6); } }
          @media (max-width: 520px) { .press-card-grid { grid-template-columns: 1fr; } }
        `}</style>

        {initialData.length === 0 ? (
          <div className="press-subscribe" style={{ marginTop: 0 }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--accent)' }}>
                <span className="lang-es">Alertas de prensa</span>
                <span className="lang-en">Press alerts</span>
              </span>
              <h3 style={{ fontSize: 28, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', marginTop: 8, marginBottom: 8 }}>
                <span className="lang-es">Suscribite para recibir los comunicados.</span>
                <span className="lang-en">Subscribe to receive press releases.</span>
              </h3>
              <p style={{ color: 'var(--fg-soft)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                <span className="lang-es">Te notificaremos ante cada comunicado de prensa, resultado trimestral y evento material firmado por la Responsable de Relaciones con el Mercado.</span>
                <span className="lang-en">We'll notify you of each press release, quarterly result and material event signed by the Investor Relations Officer.</span>
              </p>
            </div>
            {subscribed ? (
              <div style={{ background: 'color-mix(in oklab, var(--cp-green) 12%, var(--surface))', border: '1px solid var(--cp-green)', borderRadius: 'var(--r-lg)', padding: 'var(--s-6)', display: 'flex', gap: 12, alignItems: 'start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <p style={{ fontWeight: 600, margin: '0 0 4px', color: 'var(--fg)' }}>
                    <span className="lang-es">¡Suscripto!</span>
                    <span className="lang-en">Subscribed!</span>
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
                    <span className="lang-es">Te notificaremos ante cada comunicado nuevo.</span>
                    <span className="lang-en">We'll notify you on every new release.</span>
                  </p>
                </div>
              </div>
            ) : (
              <form className="press-subscribe-form" onSubmit={e => { e.preventDefault(); setSubscribed(true) }}>
                <input type="email" required placeholder="correo@empresa.com" />
                <button type="submit" className="btn btn-primary">
                  <span className="lang-es">Suscribirme</span>
                  <span className="lang-en">Subscribe</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="press-toolbar">
              <div className="search-wrap">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.6"/><path d="m18 18-4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input type="search" placeholder="Buscar comunicados…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="filter-row">
                {CATS.filter(c => c.key === 'all' || initialData.some(d => d.tipo === c.key)).map(c => (
                  <button key={c.key} className={`filter-chip${cat === c.key ? ' active' : ''}`} onClick={() => setCat(c.key)}>
                    <span className="lang-es">{c.es}</span><span className="lang-en">{c.en}</span>
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p style={{ color: 'var(--fg-muted)', fontSize: 14, padding: 'var(--s-6) 0' }}>
                <span className="lang-es">No hay resultados para esa búsqueda.</span>
                <span className="lang-en">No results for that search.</span>
              </p>
            ) : years.map(year => {
              const items = filtered.filter(r => getYear(r.fecha) === year)
              return (
                <div key={year}>
                  <div className="year-divider">
                    {year}{' '}
                    <span className="num">
                      <span className="lang-es">{items.length} comunicados</span>
                      <span className="lang-en">{items.length} releases</span>
                    </span>
                  </div>
                  <div className="press-card-grid">
                    {items.map(item => {
                      const catLabel = CAT_LABELS[item.tipo] ?? { es: item.tipo, en: item.tipo }
                      const catColor = CAT_COLORS[item.tipo] ?? 'rgba(120,120,130,0.1)'
                      const href = item.url || `/comunicados/${item.id}`
                      const isExternal = !!item.url

                      const cardContent = (
                        <>
                          <div className="press-card-top">
                            <span className="chip" style={{ background: catColor }}>
                              <span className="lang-es">{catLabel.es}</span>
                              <span className="lang-en">{catLabel.en}</span>
                            </span>
                            <span className="press-card-date">{fmtFecha(item.fecha)}</span>
                          </div>
                          <h3 className="press-card-title">
                            <span className="lang-es">{item.titulo_es}</span>
                            <span className="lang-en">{item.titulo_en}</span>
                          </h3>
                          {(item.resumen_es || item.resumen_en) && (
                            <p className="press-card-summary">
                              <span className="lang-es">{item.resumen_es}</span>
                              <span className="lang-en">{item.resumen_en}</span>
                            </p>
                          )}
                          <div className="press-card-cta">
                            <span className="lang-es">Leer más</span>
                            <span className="lang-en">Read more</span>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        </>
                      )

                      return isExternal ? (
                        <a key={item.id} className="press-card" href={href} target="_blank" rel="noreferrer">
                          {cardContent}
                        </a>
                      ) : (
                        <Link key={item.id} className="press-card" href={href}>
                          {cardContent}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Email subscription */}
            <div className="press-subscribe">
              <div>
                <span className="eyebrow" style={{ color: 'var(--accent)' }}>
                  <span className="lang-es">Alertas de prensa</span>
                  <span className="lang-en">Press alerts</span>
                </span>
                <h3 style={{ fontSize: 28, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', marginTop: 8, marginBottom: 8 }}>
                  <span className="lang-es">Recibí los comunicados en tu casilla.</span>
                  <span className="lang-en">Get releases in your inbox.</span>
                </h3>
                <p style={{ color: 'var(--fg-soft)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  <span className="lang-es">Suscribite para recibir comunicados de prensa, resultados trimestrales y eventos materiales.</span>
                  <span className="lang-en">Subscribe to receive press releases, quarterly results and material events.</span>
                </p>
              </div>
              {subscribed ? (
                <div style={{ background: 'color-mix(in oklab, var(--cp-green) 12%, var(--surface))', border: '1px solid var(--cp-green)', borderRadius: 'var(--r-lg)', padding: 'var(--s-6)', display: 'flex', gap: 12, alignItems: 'start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, margin: '0 0 4px', color: 'var(--fg)' }}>
                      <span className="lang-es">¡Suscripto!</span>
                      <span className="lang-en">Subscribed!</span>
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
                      <span className="lang-es">Te notificaremos ante cada comunicado nuevo.</span>
                      <span className="lang-en">We'll notify you on every new release.</span>
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  className="press-subscribe-form"
                  onSubmit={e => { e.preventDefault(); setSubscribed(true) }}
                >
                  <input type="email" required placeholder="correo@empresa.com" />
                  <button type="submit" className="btn btn-primary">
                    <span className="lang-es">Suscribirme</span>
                    <span className="lang-en">Subscribe</span>
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

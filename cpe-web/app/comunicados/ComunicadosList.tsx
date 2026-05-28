'use client'

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

function fmtFecha(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${day} · ${months[d.getUTCMonth()]} · ${d.getUTCFullYear()}`
}

function getYear(iso: string) {
  return iso ? Number(iso.slice(0, 4)) : 0
}

export default function ComunicadosList({ initialData }: { initialData: Comunicado[] }) {
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')

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
          .year-divider { display: flex; align-items: center; gap: 16px; padding: var(--s-8) 0 var(--s-3); font-family: var(--font-display); font-size: 26px; font-weight: 600; letter-spacing: -0.02em; color: var(--fg); border-bottom: 1px solid var(--rule); }
          .year-divider::after { content: ""; flex: 1; height: 1px; background: var(--rule); }
          .year-divider span.num { color: var(--fg-muted); font-size: 14px; font-weight: 400; letter-spacing: 0; }
        `}</style>

        {initialData.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 15, padding: 'var(--s-8) 0', fontStyle: 'italic' }}>
            <span className="lang-es">Próximamente — los comunicados aparecen aquí cuando se publican.</span>
            <span className="lang-en">Coming soon — press releases appear here when published.</span>
          </p>
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
                  <ul className="press-list">
                    {items.map(item => {
                      const catLabel = CAT_LABELS[item.tipo] ?? { es: item.tipo, en: item.tipo }
                      return (
                        <li className="press-item" key={item.id}>
                          <span className="press-date num">{fmtFecha(item.fecha)}</span>
                          <div>
                            <span className="chip">
                              <span className="lang-es">{catLabel.es}</span>
                              <span className="lang-en">{catLabel.en}</span>
                            </span>
                            <h3>
                              <span className="lang-es">{item.titulo_es}</span>
                              <span className="lang-en">{item.titulo_en}</span>
                            </h3>
                            {(item.resumen_es || item.resumen_en) && (
                              <p>
                                <span className="lang-es">{item.resumen_es}</span>
                                <span className="lang-en">{item.resumen_en}</span>
                              </p>
                            )}
                          </div>
                          {item.url ? (
                            <a className="press-arrow" href={item.url} target="_blank" rel="noreferrer" aria-label="Leer">
                              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11h12M12 5l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </a>
                          ) : (
                            <span className="press-arrow" style={{ opacity: 0.2 }}>
                              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11h12M12 5l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </>
        )}
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'

export type IrDocument = {
  id: string
  categoria: string
  entidad: string
  fecha: string | null
  periodo: string
  tipo: string
  titulo_es: string
  titulo_en: string
  url: string
  publicado: boolean
}

function getYear(doc: IrDocument): string {
  if (doc.fecha) return doc.fecha.slice(0, 4)
  const m = doc.periodo.match(/\b(20\d{2})\b/)
  return m ? m[1] : ''
}

function getQuarter(doc: IrDocument): string {
  const q = doc.periodo.match(/\b(Q[1-4])\b/i)
  if (q) return q[1].toUpperCase()
  if (/\b(anual|annual|full[\s-]year|year[\s-]end|dec|diciembre|december|annual)\b/i.test(doc.periodo)) return 'Annual'
  if (/\b(mar|march|jun|june|sep|sept|september)\b/i.test(doc.periodo)) {
    const m = doc.periodo.match(/\b(mar|jun|sep)/i)
    if (m) {
      const mo = m[1].toLowerCase()
      if (mo === 'mar') return 'Q1'
      if (mo === 'jun') return 'Q2'
      if (mo === 'sep') return 'Q3'
    }
  }
  return 'Other'
}

const QUARTER_ORDER = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Other']

function isStorageUrl(url: string) {
  return url.includes('supabase.co/storage')
}

function DocRow({ doc }: { doc: IrDocument }) {
  const label = doc.tipo || (isStorageUrl(doc.url) ? 'PDF' : 'PDF')
  const title = doc.titulo_en || doc.titulo_es

  return (
    <li className="doc-item" style={{ padding: '10px 12px' }}>
      <div className="doc-icon">{label === 'FS' || label === 'MDA' || label === 'PDF' ? label : 'PDF'}</div>
      <div className="doc-title">
        <span className="lang-es">{doc.titulo_es || title}</span>
        <span className="lang-en">{doc.titulo_en || title}</span>
        {doc.entidad && doc.entidad !== 'CPI' && (
          <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 600, letterSpacing: '0.08em', display: 'inline-block', marginLeft: 6, padding: '1px 6px', border: '1px solid var(--rule)', borderRadius: 'var(--r-pill)' }}>
            {doc.entidad}
          </span>
        )}
        {doc.periodo && (
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400, display: 'block', marginTop: 1 }}>{doc.periodo}</span>
        )}
      </div>
      <div className="doc-meta">{doc.periodo}</div>
      <a className="doc-action" href={doc.url} target="_blank" rel="noreferrer noopener">
        <span className="lang-es">Descargar</span>
        <span className="lang-en">Download</span>
      </a>
    </li>
  )
}

export default function IrDocsTabs({
  docs,
  categoria,
  entidad,
  showEntidadTabs = false,
}: {
  docs: IrDocument[]
  categoria: string
  entidad?: string
  showEntidadTabs?: boolean
}) {
  const byCat = docs.filter(d => d.categoria === categoria)
  const entidades = showEntidadTabs
    ? Array.from(new Set(byCat.map(d => d.entidad))).sort()
    : []
  const [activeEntidad, setActiveEntidad] = useState<string>(entidad ?? entidades[0] ?? 'CPI')

  const filtered = entidad
    ? byCat.filter(d => d.entidad === entidad)
    : showEntidadTabs
    ? byCat.filter(d => d.entidad === activeEntidad)
    : byCat

  const years = Array.from(new Set(filtered.map(getYear).filter(Boolean))).sort((a, b) => +b - +a)
  const [openYear, setOpenYear] = useState<string>(years[0] ?? '')

  if (byCat.length === 0) {
    return (
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
        <span className="lang-es">Próximamente.</span>
        <span className="lang-en">Coming soon.</span>
      </p>
    )
  }

  return (
    <>
      <style>{`
        .ir-accordion { border: 1px solid var(--rule); border-radius: var(--r-lg); overflow: hidden; }
        .ir-yr-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: var(--surface); cursor: pointer; border-bottom: 1px solid var(--rule); transition: background var(--t-fast); user-select: none; }
        .ir-yr-row:last-of-type { border-bottom: 0; }
        .ir-yr-row:hover { background: color-mix(in oklab, var(--accent) 5%, var(--surface)); }
        .ir-yr-row.open { background: color-mix(in oklab, var(--accent) 9%, var(--surface)); }
        .ir-yr-left { display: flex; align-items: center; gap: 12px; }
        .ir-chevron { color: var(--fg-muted); transition: transform var(--t-fast); flex-shrink: 0; }
        .ir-yr-row.open .ir-chevron { transform: rotate(90deg); }
        .ir-yr-label { font-size: 15px; font-weight: 600; font-family: var(--font-display); color: var(--fg); }
        .ir-yr-count { font-size: 11px; color: var(--fg-muted); background: var(--rule); padding: 2px 8px; border-radius: var(--r-pill); }
        .ir-yr-body { border-bottom: 1px solid var(--rule); }
        .ir-yr-body:last-child { border-bottom: 0; }
        .ir-q-section { border-top: 1px solid var(--rule); }
        .ir-q-section:first-child { border-top: 0; }
        .ir-q-label { font-size: 10px; letter-spacing: 0.14em; font-weight: 700; text-transform: uppercase; color: var(--fg-muted); padding: 8px 20px 2px; }
        .ir-entidad-tabs { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
        .ir-entidad-tab { font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: var(--r-pill); border: 1px solid var(--rule); background: transparent; cursor: pointer; color: var(--fg-soft); font-family: inherit; transition: all var(--t-fast); }
        .ir-entidad-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
        .ir-entidad-tab:hover:not(.active) { border-color: var(--accent); color: var(--accent); }
      `}</style>

      {showEntidadTabs && entidades.length > 1 && (
        <div className="ir-entidad-tabs">
          {entidades.map(e => (
            <button
              key={e}
              className={`ir-entidad-tab${activeEntidad === e ? ' active' : ''}`}
              onClick={() => { setActiveEntidad(e); setOpenYear(years[0] ?? '') }}
            >
              {e === 'CPI' ? 'Crown Point Energy Inc.' : e === 'CPESA' ? 'Crown Point Energía S.A.' : e}
            </button>
          ))}
        </div>
      )}

      <div className="ir-accordion">
        {years.map(year => {
          const yearDocs = filtered.filter(d => getYear(d) === year)
          const byQ: Record<string, IrDocument[]> = {}
          for (const d of yearDocs) {
            const q = getQuarter(d)
            ;(byQ[q] ??= []).push(d)
          }
          const quarters = QUARTER_ORDER.filter(q => byQ[q]?.length)
          const multiQ = quarters.length > 1
          const isOpen = openYear === year

          return (
            <div key={year}>
              <div
                className={`ir-yr-row${isOpen ? ' open' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setOpenYear(isOpen ? '' : year)}
                onKeyDown={e => e.key === 'Enter' && setOpenYear(isOpen ? '' : year)}
              >
                <div className="ir-yr-left">
                  <svg className="ir-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="ir-yr-label">{year}</span>
                  <span className="ir-yr-count">{yearDocs.length}</span>
                </div>
              </div>
              {isOpen && (
                <div className="ir-yr-body">
                  {multiQ ? quarters.map(q => (
                    <div className="ir-q-section" key={q}>
                      <div className="ir-q-label">
                        {q === 'Annual'
                          ? <><span className="lang-es">Anual</span><span className="lang-en">Annual</span></>
                          : q === 'Other'
                          ? <><span className="lang-es">Otros</span><span className="lang-en">Other</span></>
                          : q}
                      </div>
                      <ul className="doc-list" style={{ margin: 0, padding: '4px 8px 8px' }}>
                        {byQ[q].map(d => <DocRow key={d.id} doc={d} />)}
                      </ul>
                    </div>
                  )) : (
                    <ul className="doc-list" style={{ margin: 0, padding: '8px' }}>
                      {yearDocs.map(d => <DocRow key={d.id} doc={d} />)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

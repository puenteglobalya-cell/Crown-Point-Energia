'use client'

import { useState } from 'react'

type Documento = {
  id: string
  titulo_es: string
  titulo_en: string
  tipo: string
  periodo: string
  storage_path: string
  file_name: string
  file_size: number | null
}

function docExt(fileName: string) {
  const ext = fileName.split('.').pop()?.toUpperCase() ?? 'PDF'
  return ['XLS', 'XLSX'].includes(ext) ? 'XLS' : ext
}

function publicUrl(path: string, supabaseUrl: string) {
  return `${supabaseUrl}/storage/v1/object/public/documents/${path}`
}

function getYear(doc: Documento): string {
  const m = doc.periodo.match(/\b(20\d{2})\b/)
  return m ? m[1] : ''
}

function getQuarter(doc: Documento): string {
  const q = doc.periodo.match(/\b(Q[1-4])\b/i)
  if (q) return q[1].toUpperCase()
  if (/\b(anual|annual|full[\s-]year|year[\s-]end)\b/i.test(doc.periodo)) return 'Annual'
  return 'Other'
}

const QUARTER_ORDER = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual', 'Other']

function DocRow({ d, supabaseUrl }: { d: Documento; supabaseUrl: string }) {
  const ext = docExt(d.file_name)
  const url = publicUrl(d.storage_path, supabaseUrl)
  const kb = d.file_size ? Math.round(d.file_size / 1024) : null
  const size = kb ? (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`) : null

  return (
    <li className="doc-item" style={{ padding: '10px 12px' }}>
      <div className="doc-icon">{ext}</div>
      <div className="doc-title">
        <span className="lang-es">{d.titulo_es}</span>
        <span className="lang-en">{d.titulo_en}</span>
        {size && <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400, display: 'block', marginTop: 2 }}>{size}</span>}
      </div>
      <div className="doc-meta">{d.periodo}</div>
      <a className="doc-action" href={url} target="_blank" rel="noreferrer">
        <span className="lang-es">Descargar</span>
        <span className="lang-en">Download</span>
      </a>
    </li>
  )
}

export default function InversoresDocsTabs({
  docs,
  tipo,
  supabaseUrl,
}: {
  docs: Documento[]
  tipo: string
  supabaseUrl: string
}) {
  const filtered = docs.filter(d => d.tipo === tipo)
  const years = Array.from(new Set(filtered.map(getYear).filter(Boolean))).sort((a, b) => +b - +a)
  const [openYear, setOpenYear] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  if (filtered.length === 0) {
    return (
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
        <span className="lang-es">Próximamente.</span>
        <span className="lang-en">Coming soon.</span>
      </p>
    )
  }

  async function downloadAll(year: string) {
    const yearDocs = filtered.filter(d => getYear(d) === year)
    setDownloading(true)
    for (let i = 0; i < yearDocs.length; i++) {
      const a = Object.assign(document.createElement('a'), {
        href: publicUrl(yearDocs[i].storage_path, supabaseUrl),
        download: yearDocs[i].file_name,
        target: '_blank',
      })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (i < yearDocs.length - 1) await new Promise(r => setTimeout(r, 700))
    }
    setDownloading(false)
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
        .ir-dl-all { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; padding: 5px 12px; border-radius: var(--r-pill); border: 1px solid var(--rule); background: transparent; cursor: pointer; color: var(--fg-soft); display: flex; align-items: center; gap: 5px; transition: all var(--t-fast); font-family: inherit; }
        .ir-dl-all:hover { border-color: var(--accent); color: var(--accent); }
        .ir-dl-all:disabled { opacity: 0.5; cursor: wait; }
        .ir-yr-body { border-bottom: 1px solid var(--rule); }
        .ir-yr-body:last-child { border-bottom: 0; }
        .ir-q-section { border-top: 1px solid var(--rule); }
        .ir-q-section:first-child { border-top: 0; }
        .ir-q-label { font-size: 10px; letter-spacing: 0.14em; font-weight: 700; text-transform: uppercase; color: var(--fg-muted); padding: 8px 20px 2px; }
      `}</style>
      <div className="ir-accordion">
        {years.map(year => {
          const yearDocs = filtered.filter(d => getYear(d) === year)
          const byQ: Record<string, Documento[]> = {}
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
                {isOpen && (
                  <button
                    className="ir-dl-all"
                    onClick={e => { e.stopPropagation(); downloadAll(year) }}
                    disabled={downloading}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v8m0 0-3-3m3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="lang-es">Descargar todo</span>
                    <span className="lang-en">Download all</span>
                  </button>
                )}
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
                        {byQ[q].map(d => <DocRow key={d.id} d={d} supabaseUrl={supabaseUrl} />)}
                      </ul>
                    </div>
                  )) : (
                    <ul className="doc-list" style={{ margin: 0, padding: '8px' }}>
                      {yearDocs.map(d => <DocRow key={d.id} d={d} supabaseUrl={supabaseUrl} />)}
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

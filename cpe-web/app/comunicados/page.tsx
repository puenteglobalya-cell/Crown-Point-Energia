'use client'

import Link from 'next/link'
import { useState } from 'react'

const RELEASES = [
  { year: 2026, cat: 'resultados', date: '15 · 04 · 2026', catEs: 'Resultados', catEn: 'Results',
    titleEs: 'Crown Point reporta resultados del primer trimestre 2026', titleEn: 'Crown Point reports Q1 2026 results',
    bodyEs: 'Producción promedio de 1.840 boe/d, EBITDA ajustado de USD 11,9M y reducción de deuda neta del 12%.', bodyEn: 'Average production of 1,840 boe/d, adjusted EBITDA of USD 11.9M and a 12% net debt reduction.' },
  { year: 2026, cat: 'operaciones', date: '02 · 04 · 2026', catEs: 'Operaciones', catEn: 'Operations',
    titleEs: 'Inicio de la campaña de workover en Chañares Herrados', titleEn: 'Workover campaign begins at Chañares Herrados',
    bodyEs: 'El plan contempla intervenir 6 pozos productores con incremento estimado de 180 boe/d en el segundo trimestre.', bodyEn: 'The plan covers 6 producing wells with an estimated 180 boe/d uplift in Q2.' },
  { year: 2026, cat: 'mercados', date: '11 · 03 · 2026', catEs: 'Mercado de capitales', catEn: 'Capital markets',
    titleEs: 'Emisión exitosa de Obligaciones Negociables Clase IV por USD 8M', titleEn: 'Successful Class IV notes issuance of USD 8M',
    bodyEs: 'Oferta sobresuscrita 2,3x. Los fondos se destinan al plan de inversión en Cerro de Los Leones.', bodyEn: 'Offer 2.3x oversubscribed. Proceeds go to the Cerro de Los Leones investment plan.' },
  { year: 2026, cat: 'resultados', date: '28 · 02 · 2026', catEs: 'Resultados', catEn: 'Results',
    titleEs: 'Estados financieros auditados año fiscal 2025', titleEn: '2025 audited annual results',
    bodyEs: 'Ingresos por USD 38,7M (+22% YoY), EBITDA ajustado USD 14,2M, ratio Deuda/EBITDA 1,2x.', bodyEn: 'Revenue of USD 38.7M (+22% YoY), adjusted EBITDA USD 14.2M, net debt/EBITDA 1.2x.' },
  { year: 2026, cat: 'esg', date: '22 · 02 · 2026', catEs: 'ESG', catEn: 'ESG',
    titleEs: 'Publicamos el Reporte de Sustentabilidad 2025', titleEn: '2025 Sustainability Report published',
    bodyEs: 'Reducción del 11% en intensidad de emisiones GEI y avances en plan de social license en Tierra del Fuego.', bodyEn: '11% reduction in GHG emissions intensity and progress on the Tierra del Fuego social license plan.' },
  { year: 2026, cat: 'operaciones', date: '14 · 02 · 2026', catEs: 'Operaciones', catEn: 'Operations',
    titleEs: 'Adquisición sísmica 3D en Piedra Clavada – Koluel Kaike', titleEn: '3D seismic acquired at Piedra Clavada – Koluel Kaike',
    bodyEs: 'Cobertura de 220 km² para identificar oportunidades de waterflood y nuevos targets de desarrollo.', bodyEn: '220 km² coverage to identify waterflood opportunities and new development targets.' },
  { year: 2026, cat: 'gobierno', date: '28 · 01 · 2026', catEs: 'Gobierno corporativo', catEn: 'Governance',
    titleEs: 'Cambios en el directorio de Crown Point Energy Inc.', titleEn: 'Changes to the Crown Point Energy Inc. board',
    bodyEs: 'Designación de la directora independiente Camila Pereyra, con más de 20 años de experiencia en upstream argentino.', bodyEn: 'Camila Pereyra appointed as independent director, with over 20 years\' experience in Argentine upstream.' },
  { year: 2026, cat: 'mercados', date: '12 · 01 · 2026', catEs: 'Mercado de capitales', catEn: 'Capital markets',
    titleEs: 'Crown Point realiza presentación a inversores en TSX Venture Forum 2026', titleEn: 'Crown Point presents at TSX Venture Forum 2026',
    bodyEs: 'El CEO Andrés Suárez expuso ante más de 60 inversores institucionales en Toronto y Calgary.', bodyEn: 'CEO Andrés Suárez addressed 60+ institutional investors in Toronto and Calgary.' },
  { year: 2025, cat: 'resultados', date: '14 · 11 · 2025', catEs: 'Resultados', catEn: 'Results',
    titleEs: 'Resultados Q3 2025: EBITDA récord de USD 4,1M', titleEn: 'Q3 2025 results: record EBITDA of USD 4.1M',
    bodyEs: 'Crecimiento del 31% en EBITDA YoY apoyado en mejores precios de gas natural en el mercado interno.', bodyEn: '31% YoY EBITDA growth driven by improved natural gas pricing in the domestic market.' },
  { year: 2025, cat: 'mercados', date: '06 · 10 · 2025', catEs: 'Mercado de capitales', catEn: 'Capital markets',
    titleEs: 'Aprobación del Programa Global de ON por USD 50M', titleEn: 'Global Notes program of USD 50M approved',
    bodyEs: 'La CNV aprobó el programa que permitirá a la compañía emitir en pesos y dólares en los próximos 24 meses.', bodyEn: 'CNV approved the program enabling peso and dollar issuances over the next 24 months.' },
  { year: 2025, cat: 'operaciones', date: '18 · 09 · 2025', catEs: 'Operaciones', catEn: 'Operations',
    titleEs: 'Cierre de la adquisición Piedra Clavada – Koluel Kaike', titleEn: 'Closing of the Piedra Clavada – Koluel Kaike acquisition',
    bodyEs: 'La compañía suma 8.840 hectáreas operadas y 22 pozos productores en Cuenca Golfo San Jorge.', bodyEn: 'The company adds 8,840 operated hectares and 22 producing wells in San Jorge Gulf.' },
  { year: 2025, cat: 'resultados', date: '14 · 08 · 2025', catEs: 'Resultados', catEn: 'Results',
    titleEs: 'Resultados Q2 2025: estabilización de la producción base', titleEn: 'Q2 2025 results: base production stabilization',
    bodyEs: 'Producción promedio 1.640 boe/d con costos operativos en USD 13,8/boe.', bodyEn: 'Average production 1,640 boe/d with operating costs at USD 13.8/boe.' },
]

const CATS = [
  { key: 'all', es: 'Todos', en: 'All' },
  { key: 'resultados', es: 'Resultados', en: 'Results' },
  { key: 'operaciones', es: 'Operaciones', en: 'Operations' },
  { key: 'mercados', es: 'Mercado de capitales', en: 'Capital markets' },
  { key: 'esg', es: 'ESG', en: 'ESG' },
  { key: 'gobierno', es: 'Gobierno corporativo', en: 'Governance' },
]

export default function ComunicadosPage() {
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = RELEASES.filter(r => {
    const matchCat = cat === 'all' || r.cat === cat
    const q = search.toLowerCase()
    const matchSearch = !q || r.titleEs.toLowerCase().includes(q) || r.titleEn.toLowerCase().includes(q) || r.bodyEs.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const years = [...new Set(filtered.map(r => r.year))].sort((a, b) => b - a)

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <Link href="/inversores"><span className="lang-es">Invertir</span><span className="lang-en">Invest</span></Link>
            <span>/</span>
            <span><span className="lang-es">Comunicados</span><span className="lang-en">Press releases</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es">Sala de prensa</span><span className="lang-en">Newsroom</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Comunicados de prensa.</span>
            <span className="lang-en">Press releases.</span>
          </h1>
          <p>
            <span className="lang-es">Eventos relevantes, resultados financieros y anuncios operativos publicados por Crown Point Energy.</span>
            <span className="lang-en">Material events, financial results and operational announcements published by Crown Point Energy.</span>
          </p>
        </div>
      </section>

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

          <div className="press-toolbar">
            <div className="search-wrap">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.6"/><path d="m18 18-4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <input type="search" placeholder="Buscar comunicados…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-row">
              {CATS.map(c => (
                <button key={c.key} className={`filter-chip${cat === c.key ? ' active' : ''}`} onClick={() => setCat(c.key)}>
                  <span className="lang-es">{c.es}</span><span className="lang-en">{c.en}</span>
                </button>
              ))}
            </div>
          </div>

          {years.map(year => {
            const items = filtered.filter(r => r.year === year)
            return (
              <div key={year}>
                <div className="year-divider">{year} <span className="num"><span className="lang-es">{items.length} comunicados</span><span className="lang-en">{items.length} releases</span></span></div>
                <ul className="press-list">
                  {items.map((item, i) => (
                    <li className="press-item" key={i}>
                      <span className="press-date num">{item.date}</span>
                      <div>
                        <span className="chip"><span className="lang-es">{item.catEs}</span><span className="lang-en">{item.catEn}</span></span>
                        <h3><span className="lang-es">{item.titleEs}</span><span className="lang-en">{item.titleEn}</span></h3>
                        <p><span className="lang-es">{item.bodyEs}</span><span className="lang-en">{item.bodyEn}</span></p>
                      </div>
                      <a className="press-arrow" href="#" aria-label="Leer">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11h12M12 5l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

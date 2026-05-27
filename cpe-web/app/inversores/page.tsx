import Link from 'next/link'
import { getCmsState } from '@/lib/cms'

export const revalidate = 60

export default async function InversoresPage() {
  const s = await getCmsState()
  const f = s.fields

  const price = f['stock.price'] || 'CA $0.205'
  const delta = f['stock.delta'] || '+0.00%'
  const beta  = f['stock.beta']  || '0.93'
  const high52 = f['stock.high52'] || 'CA $0.31'
  const low52  = f['stock.low52']  || 'CA $0.16'
  const cap    = f['stock.cap']    || 'CA $19.8M'
  const shares = f['stock.shares'] || '96.6M'

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Invertir</span><span className="lang-en">Invest</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es">Resumen del inversor</span><span className="lang-en">Investor overview</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Una historia sólida<br/>de creación de valor.</span>
            <span className="lang-en">A solid story<br/>of value creation.</span>
          </h1>
          <p>
            <span className="lang-es">Crown Point Energy Inc. (TSXV: CWV) es una empresa de exploración y producción de petróleo y gas con operaciones íntegramente en Argentina y casa matriz en Calgary, Canadá.</span>
            <span className="lang-en">Crown Point Energy Inc. (TSXV: CWV) is an oil &amp; gas exploration and production company with operations entirely in Argentina and headquarters in Calgary, Canada.</span>
          </p>
        </div>
      </section>

      {/* Quote band */}
      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <div className="quote-band">
            <div className="qb-cell qb-main">
              <span className="qb-label">TSX.V: CWV</span>
              <div className="qb-price">
                <span className="num" data-cpe-field="stock.price">{price}</span>
                <span className={`num delta pos`} data-cpe-field="stock.delta">{delta}</span>
              </div>
              <span className="qb-meta"><span className="lang-es">Última cotización · 15 min de demora</span><span className="lang-en">Last quote · 15-min delayed</span></span>
            </div>
            <div className="qb-cell"><span>Beta</span><strong className="num" data-cpe-field="stock.beta">{beta}</strong></div>
            <div className="qb-cell"><span>52w high</span><strong className="num" data-cpe-field="stock.high52">{high52}</strong></div>
            <div className="qb-cell"><span>52w low</span><strong className="num" data-cpe-field="stock.low52">{low52}</strong></div>
            <div className="qb-cell"><span><span className="lang-es">Cap.</span><span className="lang-en">Cap</span></span><strong className="num" data-cpe-field="stock.cap">{cap}</strong></div>
            <div className="qb-cell"><span><span className="lang-es">Acciones</span><span className="lang-en">Shares</span></span><strong className="num" data-cpe-field="stock.shares">{shares}</strong></div>
          </div>
        </div>
      </section>

      <style>{`
        .quote-band { display: grid; grid-template-columns: 2fr repeat(5, 1fr); gap: 0; border: 1px solid var(--rule); border-radius: var(--r-lg); overflow: hidden; background: var(--surface); }
        .qb-cell { padding: 22px 24px; border-right: 1px solid var(--rule); display: flex; flex-direction: column; gap: 8px; }
        .qb-cell:last-child { border-right: 0; }
        .qb-cell > span { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-muted); font-weight: 600; }
        .qb-cell strong { font-family: var(--font-mono); font-weight: 500; font-size: 20px; color: var(--fg); }
        .qb-main { gap: 6px; }
        .qb-main .qb-label { color: var(--accent-deep); font-size: 11px; letter-spacing: 0.16em; }
        [data-theme="dark"] .qb-main .qb-label { color: var(--cp-green); }
        .qb-main .qb-price { display: flex; align-items: baseline; gap: 12px; }
        .qb-main .qb-price .num:first-child { font-size: 36px; color: var(--fg); font-weight: 500; }
        .qb-main .delta { font-size: 14px; padding: 3px 10px; border-radius: var(--r-pill); }
        .qb-main .delta.pos { background: rgba(108,174,82,0.15); color: var(--cp-green-deep); }
        [data-theme="dark"] .qb-main .delta.pos { color: #8BD478; }
        .qb-meta { color: var(--fg-muted) !important; text-transform: none !important; letter-spacing: 0 !important; font-weight: 400 !important; font-size: 12px !important; }
        @media (max-width: 900px) { .quote-band { grid-template-columns: 1fr 1fr; } .qb-cell { border-bottom: 1px solid var(--rule); } .qb-main { grid-column: 1 / -1; } }
        .analyst-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: var(--r-md); overflow: hidden; }
        .analyst { background: var(--surface); padding: var(--s-6); display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; align-items: baseline; }
        .analyst strong { font-family: var(--font-display); font-size: 20px; font-weight: 600; letter-spacing: -0.01em; grid-column: 1 / -1; }
        .ar-rec { font-family: var(--font-mono); font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: var(--r-sm); letter-spacing: 0.08em; justify-self: start; }
        .ar-rec.buy { background: rgba(108,174,82,0.18); color: var(--cp-green-deep); }
        .ar-rec.hold { background: rgba(201,162,74,0.18); color: var(--cp-gold-deep); }
        .ar-tgt { font-size: 18px; font-weight: 500; color: var(--fg); justify-self: end; }
        .ar-date { font-size: 11px; color: var(--fg-muted); letter-spacing: 0.08em; }
        @media (max-width: 600px) { .analyst-grid { grid-template-columns: 1fr; } }
        .ir-subscribe { display: grid; gap: 12px; }
        @media (max-width: 800px) { .news-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <section className="section">
        <div className="container">
          <div className="two-col">
            <aside className="left-rail">
              <h4><span className="lang-es">En esta página</span><span className="lang-en">On this page</span></h4>
              <nav>
                <a href="#porque" className="active"><span className="lang-es">¿Por qué Crown Point?</span><span className="lang-en">Why Crown Point?</span></a>
                <a href="#financieros"><span className="lang-es">Estados financieros</span><span className="lang-en">Financial statements</span></a>
                <a href="#cobertura"><span className="lang-es">Cobertura de analistas</span><span className="lang-en">Analyst coverage</span></a>
                <a href="#on"><span className="lang-es">Obligaciones negociables</span><span className="lang-en">Notes</span></a>
                <a href="#gobierno"><span className="lang-es">Gobierno corporativo</span><span className="lang-en">Corporate governance</span></a>
              </nav>
            </aside>
            <main>
              <div className="section-block" id="porque">
                <span className="eyebrow"><span className="lang-es">Tesis de inversión</span><span className="lang-en">Investment thesis</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Tres motivos para mirar Crown Point.</span><span className="lang-en">Three reasons to look at Crown Point.</span></h2>
                <div className="kpi-grid" style={{ marginTop: 'var(--s-6)' }}>
                  {[
                    { n: '01', labelEs: 'Producción', labelEn: 'Production', val: '1,840', unit: 'boe/d', metaEs: 'Mix 68% gas / 32% líquidos', metaEn: '68% gas / 32% liquids mix' },
                    { n: '02', labelEs: 'Costos', labelEn: 'Costs', val: 'US$14.2', unit: '/boe', metaEs: 'Opex total LTM', metaEn: 'Total opex LTM' },
                    { n: '03', labelEs: 'Apalancamiento', labelEn: 'Leverage', val: '1.2x', unit: 'Net debt / EBITDA', metaEs: 'Estructura prudente', metaEn: 'Prudent capital structure' },
                    { n: '04', labelEs: 'Pipeline', labelEn: 'Pipeline', val: '12', unit: undefined, unitEs: 'pozos planeados', unitEn: 'planned wells', metaEs: '2026–2027', metaEn: '2026–2027' },
                  ].map(k => (
                    <div className="kpi" key={k.n}>
                      <span className="kpi-label">{k.n} · <span className="lang-es">{k.labelEs}</span><span className="lang-en">{k.labelEn}</span></span>
                      <div><span className="kpi-value num">{k.val}</span><span className="kpi-unit">{k.unit || <><span className="lang-es">{k.unitEs}</span><span className="lang-en">{k.unitEn}</span></>}</span></div>
                      <span className="kpi-meta"><span className="lang-es">{k.metaEs}</span><span className="lang-en">{k.metaEn}</span></span>
                    </div>
                  ))}
                </div>
                <p className="pull">
                  <span className="lang-es">&ldquo;Operamos cuatro bloques en tres cuencas — diversificación geológica real con un solo país.&rdquo;</span>
                  <span className="lang-en">&ldquo;We operate four blocks across three basins — real geological diversification within a single country.&rdquo;</span>
                </p>
              </div>

              <div className="section-block" id="financieros">
                <span className="eyebrow"><span className="lang-es">Reportes recientes</span><span className="lang-en">Recent filings</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Estados financieros</span><span className="lang-en">Financial statements</span></h2>
                <p className="lede"><span className="lang-es">Reportes auditados según IFRS y compilados gerenciales trimestrales. Todos los documentos están disponibles también en SEDAR+.</span><span className="lang-en">IFRS-audited reports and quarterly management filings. All documents are also available on SEDAR+.</span></p>
                <ul className="doc-list">
                  {[
                    { icon: 'PDF', titleEs: 'EE.FF. consolidados Q1 2026 (no auditados)', titleEn: 'Q1 2026 consolidated financial statements (unaudited)', meta: '15 abr 2026 · 2.4 MB' },
                    { icon: 'PDF', titleEs: 'MD&A Q1 2026 — Análisis y discusión', titleEn: 'Q1 2026 MD&A — Discussion and analysis', meta: '15 abr 2026 · 1.1 MB' },
                    { icon: 'PDF', titleEs: 'EE.FF. anuales 2025 — auditados', titleEn: '2025 annual financial statements — audited', meta: '28 feb 2026 · 3.6 MB' },
                    { icon: 'PDF', titleEs: 'Reporte anual integrado 2025', titleEn: '2025 integrated annual report', meta: '28 feb 2026 · 8.9 MB' },
                    { icon: 'XLS', titleEs: 'Modelo financiero — Datos abiertos 2020–2026', titleEn: 'Financial model — Open data 2020–2026', meta: '15 abr 2026 · 480 KB' },
                    { icon: 'PDF', titleEs: 'Reporte NI 51-101 — Reservas certificadas 2025', titleEn: 'NI 51-101 report — 2025 certified reserves', meta: '28 feb 2026 · 5.2 MB' },
                  ].map((d, i) => (
                    <li className="doc-item" key={i}>
                      <div className="doc-icon">{d.icon}</div>
                      <div className="doc-title"><span className="lang-es">{d.titleEs}</span><span className="lang-en">{d.titleEn}</span></div>
                      <div className="doc-meta">{d.meta}</div>
                      <div className="doc-action"><span className="lang-es">Descargar</span><span className="lang-en">Download</span></div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="section-block" id="cobertura">
                <span className="eyebrow">Equity research</span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Cobertura de analistas</span><span className="lang-en">Analyst coverage</span></h2>
                <p className="lede"><span className="lang-es">Brokers e instituciones financieras que mantienen cobertura activa sobre el papel.</span><span className="lang-en">Brokers and financial institutions actively covering the stock.</span></p>
                <div className="analyst-grid">
                  {[
                    { name: 'Eight Capital', rec: 'BUY', tgt: 'CA $0.35', date: 'Mar 2026' },
                    { name: 'Canaccord Genuity', rec: 'HOLD', tgt: 'CA $0.24', date: 'Feb 2026' },
                    { name: 'Stifel GMP', rec: 'BUY', tgt: 'CA $0.32', date: 'Feb 2026' },
                    { name: 'Cormark Securities', rec: 'BUY', tgt: 'CA $0.30', date: 'Jan 2026' },
                  ].map(a => (
                    <div className="analyst" key={a.name}>
                      <strong>{a.name}</strong>
                      <span className={`ar-rec ${a.rec.toLowerCase()}`}>{a.rec}</span>
                      <span className="ar-tgt num">{a.tgt}</span>
                      <span className="ar-date">{a.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-block" id="on">
                <span className="eyebrow"><span className="lang-es">Programa global</span><span className="lang-en">Global program</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Obligaciones negociables</span><span className="lang-en">Notes program</span></h2>
                <p className="lede"><span className="lang-es">Programa global de emisión por hasta USD 50 millones, autorizado por CNV. Clase IV emitida en marzo 2026.</span><span className="lang-en">Global issuance program of up to USD 50 million, authorized by the CNV. Class IV issued in March 2026.</span></p>
                <ul className="doc-list">
                  {[
                    { icon: 'PDF', titleEs: 'Suplemento de Precio · Clase IV (USD 8M)', titleEn: 'Pricing supplement · Class IV (USD 8M)', meta: '11 mar 2026' },
                    { icon: 'PDF', titleEs: 'Prospecto del programa global', titleEn: 'Global program prospectus', meta: '14 nov 2025' },
                    { icon: 'PDF', titleEs: 'Calificación de riesgo · FIX Scr (Fitch)', titleEn: 'Risk rating · FIX Scr (Fitch)', meta: '14 nov 2025' },
                  ].map((d, i) => (
                    <li className="doc-item" key={i}>
                      <div className="doc-icon">{d.icon}</div>
                      <div className="doc-title"><span className="lang-es">{d.titleEs}</span><span className="lang-en">{d.titleEn}</span></div>
                      <div className="doc-meta">{d.meta}</div>
                      <div className="doc-action"><span className="lang-es">Descargar</span><span className="lang-en">Download</span></div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="section-block" id="gobierno">
                <span className="eyebrow"><span className="lang-es">Compliance &amp; ESG</span><span className="lang-en">Compliance &amp; ESG</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Gobierno corporativo</span><span className="lang-en">Corporate governance</span></h2>
                <p className="lede"><span className="lang-es">Crown Point Energy Inc. cotiza en TSX Venture Exchange y reporta bajo las normas canadienses para emisores junior.</span><span className="lang-en">Crown Point Energy Inc. is listed on TSX Venture Exchange and reports under Canadian junior issuer standards.</span></p>
                <ul className="doc-list">
                  {[
                    { icon: 'PDF', titleEs: 'Carta del directorio 2025', titleEn: '2025 Board letter', meta: '28 feb 2026' },
                    { icon: 'PDF', titleEs: 'Código de ética y conducta', titleEn: 'Code of ethics and conduct', meta: 'Actualizado 2025' },
                    { icon: 'PDF', titleEs: 'Política de información privilegiada', titleEn: 'Insider information policy', meta: 'Actualizado 2024' },
                  ].map((d, i) => (
                    <li className="doc-item" key={i}>
                      <div className="doc-icon">{d.icon}</div>
                      <div className="doc-title"><span className="lang-es">{d.titleEs}</span><span className="lang-en">{d.titleEn}</span></div>
                      <div className="doc-meta">{d.meta}</div>
                      <div className="doc-action"><span className="lang-es">Descargar</span><span className="lang-en">Download</span></div>
                    </li>
                  ))}
                </ul>
              </div>
            </main>
          </div>
        </div>
      </section>

      <section className="invest-feature" style={{ paddingTop: 'var(--s-12)', paddingBottom: 'var(--s-12)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--s-12)', alignItems: 'center' }} className="news-grid">
            <div>
              <span className="eyebrow" style={{ color: 'var(--cp-green)' }}><span className="lang-es">Alertas para inversores</span><span className="lang-en">Investor alerts</span></span>
              <h2 className="section-title" style={{ color: '#fff', marginTop: 8 }}>
                <span className="lang-es">Recibí los comunicados<br/>antes que nadie.</span>
                <span className="lang-en">Get our releases<br/>before anyone else.</span>
              </h2>
              <p style={{ color: 'rgba(236,238,251,0.78)', maxWidth: '50ch', marginTop: 'var(--s-4)' }}>
                <span className="lang-es">Suscribite a nuestra lista de IR para recibir comunicados de prensa, resultados trimestrales y eventos relevantes en tu casilla.</span>
                <span className="lang-en">Subscribe to our IR list to get press releases, quarterly results and material events in your inbox.</span>
              </p>
            </div>
            <form className="ir-subscribe" onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <label style={{ color: 'rgba(236,238,251,0.7)' }}><span className="lang-es">Nombre</span><span className="lang-en">Name</span></label>
                <input type="text" required placeholder="—" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)', color: '#fff' }} />
              </div>
              <div className="form-row">
                <label style={{ color: 'rgba(236,238,251,0.7)' }}>Email</label>
                <input type="email" required placeholder="you@firm.com" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)', color: '#fff' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', marginTop: 8 }}>
                <span className="lang-es">Suscribirme</span><span className="lang-en">Subscribe</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

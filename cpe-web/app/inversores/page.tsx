import Link from 'next/link'
import { getCmsState } from '@/lib/cms'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { fetchIrEvents, fetchIrAnalysts, fetchObligaciones } from '@/lib/content-fetch'
import InversoresDocsTabs from './InversoresDocsTabs'
import IrSubscribeForm from './IrSubscribeForm'
import ReservesTable from './ReservesTable'
import StockChart from '@/components/StockChart'

export const revalidate = 60

type Documento = {
  id: string
  titulo_es: string
  titulo_en: string
  tipo: string
  periodo: string
  storage_path: string
  file_name: string
  file_size: number | null
  publico: boolean
}

export default async function InversoresPage() {
  let s, allDocs: Documento[] = [], irEvents: Awaited<ReturnType<typeof fetchIrEvents>> = [],
    analysts: Awaited<ReturnType<typeof fetchIrAnalysts>> = [],
    obligaciones: Awaited<ReturnType<typeof fetchObligaciones>> = []

  type CnvHecho = { doc_id: number; fecha: string; hora: string; tipo: string; descripcion: string; pdf_url: string | null }
  let cnvHechos: CnvHecho[] = []

  try {
    const db = createSupabaseServerAdminClient()
    const [sResult, docsResult, evts, anls, obs, cnvRes] = await Promise.all([
      getCmsState(),
      db.from('documentos')
        .select('*')
        .eq('publico', true)
        .order('created_at', { ascending: false })
        .then(r => (r.data ?? []) as Documento[]),
      fetchIrEvents(),
      fetchIrAnalysts(),
      fetchObligaciones(),
      db.from('cnv_hechos')
        .select('doc_id,fecha,hora,tipo,descripcion,pdf_url')
        .eq('tipo', 'hecho_relevante')
        .order('fecha', { ascending: false })
        .limit(30),
    ])
    s = sResult
    allDocs = docsResult as Documento[]
    irEvents = evts
    analysts = anls
    obligaciones = obs
    cnvHechos = (cnvRes.data ?? []) as CnvHecho[]
  } catch {
    s = await getCmsState()
  }
  const f = s.fields
  const fe = s.fieldsEn
  const heroImg = f['hero.inversores.img'] || ''

  return (
    <>
      <section
        className={`page-hero${heroImg ? ' has-photo' : ''}`}
        style={heroImg ? { '--hero-photo-url': `url(${heroImg})` } as React.CSSProperties : undefined}
      >
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Invertir</span><span className="lang-en">Invest</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es">Resumen del inversor</span><span className="lang-en">Investor overview</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es" dangerouslySetInnerHTML={{ __html: f['page.inversores.h1'] || 'Una historia sólida<br/>de creación de valor.' }} />
            <span className="lang-en" dangerouslySetInnerHTML={{ __html: fe['page.inversores.h1'] || 'A solid story<br/>of value creation.' }} />
          </h1>
          <p>
            <span className="lang-es">{f['page.inversores.lede'] || 'Crown Point Energía S.A. es una empresa dedicada al petróleo y gas con cobertura internacional que opera en el mercado argentino.'}</span>
            <span className="lang-en">{fe['page.inversores.lede'] || 'Crown Point Energía S.A. is an internationally covered oil & gas company operating in the Argentine market.'}</span>
          </p>
        </div>
      </section>

      {/* Quote band + price history — live from Yahoo Finance via /api/stock/cwv */}
      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <StockChart />
        </div>
      </section>

      <style>{`
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
        .on-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .on-table th { text-align: left; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-muted); font-weight: 600; padding: 10px 12px; border-bottom: 1px solid var(--rule); }
        .on-table td { padding: 12px 12px; border-bottom: 1px solid var(--rule); color: var(--fg-soft); vertical-align: middle; }
        .on-table tr:last-child td { border-bottom: 0; }
        .on-isin { font-family: var(--font-mono); font-size: 12px; }
      `}</style>

      <section className="section">
        <div className="container">
          <div className="two-col">
            <aside className="left-rail">
              <h4><span className="lang-es">En esta página</span><span className="lang-en">On this page</span></h4>
              <nav>
                <a href="#porque" className="active"><span className="lang-es">¿Por qué Crown Point?</span><span className="lang-en">Why Crown Point?</span></a>
                <a href="#financieros"><span className="lang-es">Estados financieros</span><span className="lang-en">Financial statements</span></a>
                <a href="#hechos-cnv"><span className="lang-es">Hechos relevantes CNV</span><span className="lang-en">CNV disclosures</span></a>
                <a href="#cobertura"><span className="lang-es">Cobertura de analistas</span><span className="lang-en">Analyst coverage</span></a>
                <a href="#calificacion"><span className="lang-es">Calificación crediticia</span><span className="lang-en">Credit rating</span></a>
                <a href="#on"><span className="lang-es">Obligaciones negociables</span><span className="lang-en">Notes</span></a>
                <a href="#gobierno"><span className="lang-es">Gobierno corporativo</span><span className="lang-en">Corporate governance</span></a>
                <a href="#calendario"><span className="lang-es">Calendario financiero</span><span className="lang-en">Financial calendar</span></a>
              </nav>
            </aside>
            <main>
              <div className="section-block" id="porque">
                <span className="eyebrow"><span className="lang-es">Tesis de inversión</span><span className="lang-en">Investment thesis</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Cuatro motivos para mirar Crown Point.</span><span className="lang-en">Four reasons to look at Crown Point.</span></h2>
                <div className="kpi-grid" style={{ marginTop: 'var(--s-6)' }}>
                  {[
                    { n: '01', labelEs: 'Producción', labelEn: 'Production',
                      val: f['inv.thesis.1.val'] || '8,672',
                      unit: f['inv.thesis.1.unit'] || 'boe/d',
                      metaEs: f['inv.thesis.1.meta'] || '86% petróleo · 14% gas · 1Q 2026',
                      metaEn: fe['inv.thesis.1.meta'] || '86% oil · 14% gas · 1Q 2026' },
                    { n: '02', labelEs: 'Costos', labelEn: 'Costs',
                      val: f['inv.thesis.2.val'] || 'US$14.2',
                      unit: f['inv.thesis.2.unit'] || '/boe',
                      metaEs: f['inv.thesis.2.meta'] || 'Opex total LTM',
                      metaEn: fe['inv.thesis.2.meta'] || 'Total opex LTM' },
                    { n: '03', labelEs: 'Apalancamiento', labelEn: 'Leverage',
                      val: f['inv.thesis.3.val'] || '1.2x',
                      unit: f['inv.thesis.3.unit'] || 'Net debt / EBITDA',
                      metaEs: f['inv.thesis.3.meta'] || 'Estructura prudente',
                      metaEn: fe['inv.thesis.3.meta'] || 'Prudent capital structure' },
                    { n: '04', labelEs: 'Pipeline', labelEn: 'Pipeline',
                      val: f['inv.thesis.4.val'] || '12',
                      unitEs: f['inv.thesis.4.unit'] || 'pozos planeados',
                      unitEn: fe['inv.thesis.4.unit'] || 'planned wells',
                      metaEs: f['inv.thesis.4.meta'] || '2026–2027',
                      metaEn: fe['inv.thesis.4.meta'] || '2026–2027' },
                  ].map(k => (
                    <div className="kpi" key={k.n}>
                      <span className="kpi-label">{k.n} · <span className="lang-es">{k.labelEs}</span><span className="lang-en">{k.labelEn}</span></span>
                      <div><span className="kpi-value num">{k.val}</span><span className="kpi-unit">{k.unit || <><span className="lang-es">{k.unitEs}</span><span className="lang-en">{k.unitEn}</span></>}</span></div>
                      <span className="kpi-meta"><span className="lang-es">{k.metaEs}</span><span className="lang-en">{k.metaEn}</span></span>
                    </div>
                  ))}
                </div>
                <ReservesTable />
                <p className="pull">
                  <span className="lang-es">&ldquo;Operamos seis bloques en cuatro cuencas — diversificación geológica real con un solo país.&rdquo;</span>
                  <span className="lang-en">&ldquo;We operate six blocks across four basins — real geological diversification within a single country.&rdquo;</span>
                </p>
              </div>

              <div className="section-block" id="financieros">
                <span className="eyebrow"><span className="lang-es">Reportes recientes</span><span className="lang-en">Recent filings</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Estados financieros</span><span className="lang-en">Financial statements</span></h2>
                <p className="lede">
                  <span className="lang-es">Reportes auditados según IFRS y compilados gerenciales trimestrales. Disponibles también en <a href="https://www.sedarplus.ca" target="_blank" rel="noreferrer">SEDAR+</a> y en la <a href="https://www.cnv.gob.ar" target="_blank" rel="noreferrer">CNV</a> (buscar &quot;Crown Point Energía S.A.&quot;).</span>
                  <span className="lang-en">IFRS-audited reports and quarterly management filings. Also available on <a href="https://www.sedarplus.ca" target="_blank" rel="noreferrer">SEDAR+</a> and the <a href="https://www.cnv.gob.ar" target="_blank" rel="noreferrer">CNV</a> (search for &quot;Crown Point Energía S.A.&quot;).</span>
                </p>
                <InversoresDocsTabs docs={allDocs} tipo="financiero" supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
              </div>

              <div className="section-block" id="hechos-cnv">
                <span className="eyebrow">CNV · AIF</span>
                <h2 style={{ marginTop: 8 }}>
                  <span className="lang-es">Hechos relevantes</span>
                  <span className="lang-en">Material disclosures</span>
                </h2>
                <p className="lede">
                  <span className="lang-es">Información presentada por Crown Point Energía S.A. ante la Comisión Nacional de Valores. Actualizado automáticamente desde la <a href="https://www.cnv.gov.ar/SitioWeb/Empresas/Empresa/30709346268" target="_blank" rel="noreferrer">AIF de la CNV</a>.</span>
                  <span className="lang-en">Disclosures filed by Crown Point Energía S.A. with the Argentine National Securities Commission (CNV). Auto-synced from the <a href="https://www.cnv.gov.ar/SitioWeb/Empresas/Empresa/30709346268" target="_blank" rel="noreferrer">CNV AIF</a>.</span>
                </p>
                {cnvHechos.length > 0 ? (
                  <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--rule)' }}>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', width: 110 }}>
                            <span className="lang-es">Fecha</span><span className="lang-en">Date</span>
                          </th>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                            <span className="lang-es">Descripción</span><span className="lang-en">Description</span>
                          </th>
                          <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', width: 80 }}>
                            Doc
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cnvHechos.map((h, i) => (
                          <tr key={h.doc_id} style={{ borderTop: i > 0 ? '1px solid var(--rule)' : 'none', background: 'var(--surface)' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--fg-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                              {new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--fg)', lineHeight: 1.5 }}>
                              {h.descripcion}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {h.pdf_url && (
                                <a href={h.pdf_url} target="_blank" rel="noreferrer noopener"
                                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                  {h.doc_id}
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                    <span className="lang-es">Los hechos relevantes se sincronizan automáticamente desde la CNV cada día hábil.</span>
                    <span className="lang-en">Material disclosures are automatically synced from the CNV each business day.</span>
                  </p>
                )}
              </div>

              <div className="section-block" id="cobertura">
                <span className="eyebrow">Equity research</span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Cobertura de analistas</span><span className="lang-en">Analyst coverage</span></h2>
                <p className="lede"><span className="lang-es">Brokers e instituciones financieras que mantienen cobertura activa sobre el papel.</span><span className="lang-en">Brokers and financial institutions actively covering the stock.</span></p>
                {analysts.length > 0 ? (
                  <div className="analyst-grid">
                    {analysts.map(a => (
                      <div className="analyst" key={a.id}>
                        <strong>{a.analyst} · <span style={{ fontWeight: 400, fontSize: 15, color: 'var(--fg-soft)' }}>{a.firm}</span></strong>
                        <span className={`ar-rec ${a.rating_es.toLowerCase().includes('compra') || a.rating_es.toLowerCase() === 'buy' ? 'buy' : 'hold'}`}>
                          <span className="lang-es">{a.rating_es}</span>
                          <span className="lang-en">{a.rating_en}</span>
                        </span>
                        <span className="ar-tgt num">{a.target}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="lede" style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                    <span className="lang-es">Sin cobertura activa registrada.</span>
                    <span className="lang-en">No active coverage registered.</span>
                  </p>
                )}
              </div>

              <div className="section-block" id="calificacion">
                <span className="eyebrow"><span className="lang-es">Deuda local</span><span className="lang-en">Local debt</span></span>
                <h2 style={{ marginTop: 8 }}>
                  <span className="lang-es">Calificación crediticia</span>
                  <span className="lang-en">Credit rating</span>
                </h2>
                <p className="lede">
                  <span className="lang-es">Calificación otorgada por <a href="https://www.fixscr.com/emisor/view?type=emisor&id=4052" target="_blank" rel="noreferrer">FIX SCR</a> (afiliada de Fitch Ratings en Argentina) sobre obligaciones de largo plazo.</span>
                  <span className="lang-en">Rating assigned by <a href="https://www.fixscr.com/emisor/view?type=emisor&id=4052" target="_blank" rel="noreferrer">FIX SCR</a> (Fitch Ratings affiliate in Argentina) on long-term obligations.</span>
                </p>
                <style>{`
                  .fix-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: var(--s-4); }
                  .fix-table th { text-align: left; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-muted); font-weight: 600; padding: 10px 12px; border-bottom: 1px solid var(--rule); }
                  .fix-table td { padding: 14px 12px; color: var(--fg-soft); vertical-align: middle; border-bottom: 0; }
                  .fix-rating-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(31,37,102,.08); border: 1px solid rgba(31,37,102,.18); padding: 6px 14px; border-radius: var(--r-pill); }
                  [data-theme="dark"] .fix-rating-badge { background: rgba(78,126,196,.13); border-color: rgba(78,126,196,.3); }
                  .fix-rating-value { font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--accent-deep); letter-spacing: -0.01em; }
                  [data-theme="dark"] .fix-rating-value { color: var(--cp-blue-light, #7EB3FF); }
                  .fix-perspectiva { display: inline-flex; align-items: center; gap: 6px; }
                  .fix-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cp-green-deep); flex-shrink: 0; }
                  .fix-accion { font-size: 11px; letter-spacing: 0.08em; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: var(--r-pill); background: rgba(108,174,82,0.14); color: var(--cp-green-deep); }
                  [data-theme="dark"] .fix-accion { color: #8BD478; }
                `}</style>
                <table className="fix-table">
                  <thead>
                    <tr>
                      <th><span className="lang-es">Fecha</span><span className="lang-en">Date</span></th>
                      <th><span className="lang-es">Plazo</span><span className="lang-en">Tenor</span></th>
                      <th>Rating</th>
                      <th><span className="lang-es">Perspectiva</span><span className="lang-en">Outlook</span></th>
                      <th><span className="lang-es">Acción</span><span className="lang-en">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>08-may-26</td>
                      <td><span className="lang-es">Largo Plazo</span><span className="lang-en">Long Term</span></td>
                      <td>
                        <span className="fix-rating-badge">
                          <span className="fix-rating-value">BBB(arg)</span>
                        </span>
                      </td>
                      <td>
                        <span className="fix-perspectiva">
                          <span className="fix-dot" />
                          <span className="lang-es">Estable</span><span className="lang-en">Stable</span>
                        </span>
                      </td>
                      <td><span className="fix-accion"><span className="lang-es">Confirma</span><span className="lang-en">Affirmed</span></span></td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ marginTop: 'var(--s-4)', fontSize: 12, color: 'var(--fg-muted)' }}>
                  <span className="lang-es">Ver ficha completa en </span>
                  <span className="lang-en">Full report at </span>
                  <a href="https://www.fixscr.com/emisor/view?type=emisor&id=4052" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>fixscr.com →</a>
                </p>
              </div>

              <div className="section-block" id="on">
                <span className="eyebrow"><span className="lang-es">Programa global</span><span className="lang-en">Global program</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Obligaciones negociables activas</span><span className="lang-en">Active notes</span></h2>
                <p className="lede">
                  <span className="lang-es">Calificaciones otorgadas por <a href="https://www.fixscr.com/emisor/view?type=emisor&id=4052" target="_blank" rel="noreferrer">FIX SCR</a> (afiliada de Fitch Ratings en Argentina). Programa global de emisión autorizado por CNV.</span>
                  <span className="lang-en">Ratings assigned by <a href="https://www.fixscr.com/emisor/view?type=emisor&id=4052" target="_blank" rel="noreferrer">FIX SCR</a> (Fitch Ratings affiliate in Argentina). Global issuance program authorized by the CNV.</span>
                </p>
                <table className="on-table" style={{ marginTop: 'var(--s-4)' }}>
                  <thead>
                    <tr>
                      <th><span className="lang-es">Instrumento</span><span className="lang-en">Instrument</span></th>
                      <th><span className="lang-es">Fecha</span><span className="lang-en">Date</span></th>
                      <th>ISIN</th>
                      <th>Rating</th>
                      <th><span className="lang-es">Perspectiva</span><span className="lang-en">Outlook</span></th>
                      <th><span className="lang-es">Acción</span><span className="lang-en">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        concepto: { es: 'ON Clase VI Garantizadas — hasta USD 20 MM ampliable a USD 30 MM', en: 'Class VI Secured Notes — up to USD 20 MM expandable to USD 30 MM' },
                        fecha: '08-may-26', isin: 'AR0134464806',
                        rating: 'A-(arg)', perspectiva: { es: 'Estable', en: 'Stable' }, accion: { es: 'Confirma', en: 'Affirmed' },
                      },
                      {
                        concepto: { es: 'ON Clase VII — hasta USD 10 MM ampliables hasta USD 25 MM (conjunta con Clase VIII)', en: 'Class VII Notes — up to USD 10 MM expandable to USD 25 MM (combined with Class VIII)' },
                        fecha: '08-may-26', isin: 'AR0370555119',
                        rating: 'BBB(arg)', perspectiva: { es: 'Estable', en: 'Stable' }, accion: { es: 'Confirma', en: 'Affirmed' },
                      },
                      {
                        concepto: { es: 'ON Clase IX Garantizadas — hasta USD 15 MM ampliables hasta USD 30 MM', en: 'Class IX Secured Notes — up to USD 15 MM expandable to USD 30 MM' },
                        fecha: '08-may-26', isin: 'AR0764757453',
                        rating: 'A-(arg)', perspectiva: { es: 'Estable', en: 'Stable' }, accion: { es: 'Confirma', en: 'Affirmed' },
                      },
                    ].map((on, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--fg)', maxWidth: 280 }}>
                          <span className="lang-es">{on.concepto.es}</span>
                          <span className="lang-en">{on.concepto.en}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{on.fecha}</td>
                        <td className="on-isin">{on.isin}</td>
                        <td>
                          <span className="fix-rating-badge">
                            <span className="fix-rating-value" style={{ fontSize: 15 }}>{on.rating}</span>
                          </span>
                        </td>
                        <td>
                          <span className="fix-perspectiva">
                            <span className="fix-dot" />
                            <span className="lang-es">{on.perspectiva.es}</span>
                            <span className="lang-en">{on.perspectiva.en}</span>
                          </span>
                        </td>
                        <td><span className="fix-accion"><span className="lang-es">{on.accion.es}</span><span className="lang-en">{on.accion.en}</span></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ marginTop: 'var(--s-4)', fontSize: 12, color: 'var(--fg-muted)' }}>
                  <span className="lang-es">Ver ficha completa en </span>
                  <span className="lang-en">Full report at </span>
                  <a href="https://www.fixscr.com/emisor/view?type=emisor&id=4052" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>fixscr.com →</a>
                </p>
                <div style={{ marginTop: 'var(--s-6)' }}>
                  <InversoresDocsTabs docs={allDocs} tipo="on" supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
                </div>
              </div>

              <div className="section-block" id="gobierno">
                <span className="eyebrow"><span className="lang-es">Compliance &amp; ESG</span><span className="lang-en">Compliance &amp; ESG</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Gobierno corporativo</span><span className="lang-en">Corporate governance</span></h2>
                <p className="lede"><span className="lang-es">Crown Point Energy Inc. cotiza en TSX Venture Exchange y reporta bajo las normas canadienses para emisores junior.</span><span className="lang-en">Crown Point Energy Inc. is listed on TSX Venture Exchange and reports under Canadian junior issuer standards.</span></p>
                <InversoresDocsTabs docs={allDocs} tipo="gobierno" supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
              </div>

              <div className="section-block" id="calendario" style={{ borderBottom: 0 }}>
                <span className="eyebrow">Investor Relations</span>
                <h2 style={{ marginTop: 8 }}>
                  <span className="lang-es">Calendario financiero</span>
                  <span className="lang-en">Financial calendar</span>
                </h2>
                <p className="lede">
                  <span className="lang-es">Fechas tentativas para resultados trimestrales y eventos corporativos. Sujeto a cambio — confirmación en SEDAR+ con al menos 2 semanas de anticipación.</span>
                  <span className="lang-en">Tentative dates for quarterly results and corporate events. Subject to change — confirmation on SEDAR+ at least 2 weeks in advance.</span>
                </p>
                <style>{`
                  .cal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--s-4); margin-top: var(--s-6); }
                  .cal-event { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-md); padding: var(--s-5); display: flex; flex-direction: column; gap: 8px; }
                  .cal-type-badge { font-size: 10px; letter-spacing: 0.12em; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: var(--r-pill); align-self: start; }
                  .cal-type-badge.results { background: rgba(108,174,82,0.14); color: var(--cp-green-deep); }
                  [data-theme="dark"] .cal-type-badge.results { color: #8BD478; }
                  .cal-type-badge.agm { background: rgba(201,162,74,0.14); color: var(--cp-gold-deep); }
                  [data-theme="dark"] .cal-type-badge.agm { color: var(--cp-gold); }
                  .cal-event-date { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--fg-muted); }
                  .cal-event-title { font-size: 16px; font-weight: 600; color: var(--fg); letter-spacing: -0.01em; line-height: 1.3; }
                  .cal-event-note { font-size: 12px; color: var(--fg-muted); }
                `}</style>
                <div className="cal-grid">
                  {irEvents.map(ev => (
                    <div className="cal-event" key={ev.id}>
                      <span className={`cal-type-badge ${ev.tipo}`}>
                        {ev.tipo === 'results'
                          ? <><span className="lang-es">Resultados</span><span className="lang-en">Results</span></>
                          : ev.tipo === 'agm'
                          ? <><span className="lang-es">Asamblea</span><span className="lang-en">AGM</span></>
                          : ev.tipo}
                      </span>
                      <div className="cal-event-date">
                        <span className="lang-es">{ev.fecha}</span>
                        <span className="lang-en">{ev.fecha}</span>
                      </div>
                      <div className="cal-event-title">
                        <span className="lang-es">{ev.titulo_es}</span>
                        <span className="lang-en">{ev.titulo_en}</span>
                      </div>
                      <div className="cal-event-note">
                        <span className="lang-es">{ev.nota_es}</span>
                        <span className="lang-en">{ev.nota_en}</span>
                      </div>
                    </div>
                  ))}
                  {irEvents.length === 0 && (
                    <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 14 }}>
                      <span className="lang-es">Sin eventos próximos registrados.</span>
                      <span className="lang-en">No upcoming events registered.</span>
                    </p>
                  )}
                </div>
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
              <a
                href="https://www.linkedin.com/company/crown-point-energia-sa"
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  marginTop: 'var(--s-5)',
                  padding: '9px 18px', borderRadius: 'var(--r-md)',
                  border: '1px solid rgba(10,102,194,.45)',
                  color: '#7ab3f5', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', background: 'rgba(10,102,194,.12)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
                LinkedIn
              </a>
            </div>
            <IrSubscribeForm />
          </div>
        </div>
      </section>
    </>
  )
}

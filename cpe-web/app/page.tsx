import Link from 'next/link'
import Image from 'next/image'
import { getCmsState } from '@/lib/cms'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import ArgentinaMap from '@/components/ArgentinaMap'
import { DroneHud } from '@/components/DroneHud'

export const revalidate = 60

const CAT_LABEL: Record<string, { es: string; en: string }> = {
  resultados:  { es: 'Resultados',          en: 'Results' },
  operaciones: { es: 'Operaciones',          en: 'Operations' },
  mercados:    { es: 'Mercado de capitales', en: 'Capital markets' },
  esg:         { es: 'ESG',                  en: 'ESG' },
  gobierno:    { es: 'Gobierno corporativo', en: 'Governance' },
  general:     { es: 'General',              en: 'General' },
}

function fmtFechaHome(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${String(d.getUTCDate()).padStart(2,'0')} · ${months[d.getUTCMonth()]} · ${d.getUTCFullYear()}`
}

export default async function HomePage() {
  const db = createSupabaseServerAdminClient()
  const [s, comunicadosRes, blocksRes] = await Promise.all([
    getCmsState(),
    db.from('comunicados')
      .select('id,fecha,titulo_es,titulo_en,resumen_es,resumen_en,url,tipo')
      .eq('publicado', true)
      .order('fecha', { ascending: false })
      .limit(4),
    db.from('operations_blocks')
      .select('id,slug,titulo,subtitulo_es,subtitulo_en,commodity,wi,operador,chips_es,chips_en')
      .eq('activo', true)
      .order('orden'),
  ])

  const opsBlocks = blocksRes.data ?? []

  const latestComunicados = comunicadosRes.data ?? []

  const f = s.fields
  const show = s.show

  const price  = f['stock.price']  || 'CA $0.205'
  const delta  = f['stock.delta']  || '+0.00%'
  const beta   = f['stock.beta']   || '0.93'
  const vol30  = f['stock.vol30']  || '14,210'
  const cap    = f['stock.cap']    || 'CA $18.4M'

  const kpiProdVal   = f['kpi.production.value'] || '8,672'
  const kpiProdUnit  = f['kpi.production.unit']  || 'boe/d'
  const kpiProdDelta = f['kpi.production.delta'] || '1Q 2026'
  const kpiResVal    = f['kpi.reserves.value']   || '36.996'
  const kpiResUnit   = f['kpi.reserves.unit']    || 'MMboe'
  const kpiResDelta  = f['kpi.reserves.delta']   || 'P1 Sproule'
  const kpiEbVal     = f['kpi.ebitda.value']     || '18'
  const kpiEbUnit    = f['kpi.ebitda.unit']      || 'USD M'
  const kpiEbDelta   = f['kpi.ebitda.delta']     || 'LTM'
  const kpiBlkVal    = f['kpi.blocks.value']     || '11'
  const kpiBlkUnit   = f['kpi.blocks.unit']      || 'concesiones en 4 cuencas'
  const kpiBlkDelta  = f['kpi.blocks.delta']     || '372k ha'

  const stockHigh52  = f['stock.high52']  || 'CA $0.31'
  const stockLow52   = f['stock.low52']   || 'CA $0.150'
  const stockShares  = f['stock.shares']  || '89.7M'

  const heroImg      = f['hero.home.img']   || ''
  const heroVideo    = f['hero.home.video'] || ''
  const heroTitleEs  = f['hero.title.es'] || ''
  const heroTitleEn  = f['hero.title.en'] || ''
  const heroLedeEs   = f['hero.lede.es']  || ''
  const heroLedeEn   = f['hero.lede.en']  || ''
  const kpiPeriodoEs = f['kpis.periodo.es'] || 'Q1 2026 · Cifras clave'
  const kpiPeriodoEn = f['kpis.periodo.en'] || 'Q1 2026 · Key figures'

  return (
    <>
      {/* HERO */}
      {show['hero'] !== false && (
        <section className="hero" data-cpe-section="hero">
          <div className="hero-media">
            {heroVideo ? (
              <video
                autoPlay muted loop playsInline preload="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              >
                <source src={heroVideo} type="video/mp4" />
              </video>
            ) : heroImg ? (
              <Image
                src={heroImg}
                alt={f['hero.home.img.alt'] || ''}
                fill
                loading="eager"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, #0d1230 0%, #1F2566 45%, #142e22 100%)' }} />
            )}
            <div className="hero-veil"></div>
          </div>
          <DroneHud lang={s.lang} />
          <div className="container hero-content">
            <div className="hero-eyebrow">
              <span className="eyebrow" style={{ color: 'var(--cp-green-soft)' }}>
                <span className="lang-es">TSXV: CWV · Petróleo y gas · Argentina</span>
                <span className="lang-en">TSXV: CWV · Oil &amp; gas · Canada</span>
              </span>
            </div>
            <h1 className="hero-title">
              {heroTitleEs
                ? <span className="lang-es">{heroTitleEs}</span>
                : <span className="lang-es">Energía que sostiene<br/>la matriz productiva<br/>argentina.</span>}
              {heroTitleEn
                ? <span className="lang-en">{heroTitleEn}</span>
                : <span className="lang-en">Energy that sustains<br/>Argentina&apos;s productive<br/>energy matrix.</span>}
            </h1>
            <p className="hero-lede">
              {heroLedeEs
                ? <span className="lang-es">{heroLedeEs}</span>
                : <span className="lang-es">Operamos en dos de las cuencas más relevantes del país con 11 concesiones — producción propia, cartera de proyectos de bajo riesgo y estructura financiera prudente.</span>}
              {heroLedeEn
                ? <span className="lang-en">{heroLedeEn}</span>
                : <span className="lang-en">We operate in two of the country&apos;s most relevant basins — our own production, a low-risk project portfolio and a prudent financial structure.</span>}
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary" href="/inversores">
                <span className="lang-es">Resumen del inversor</span>
                <span className="lang-en">Investor overview</span>
              </Link>
              <Link className="btn btn-secondary" href="/operaciones">
                <span className="lang-es">Ver operaciones</span>
                <span className="lang-en">See operations</span>
              </Link>
            </div>
            <div className="hero-quote">
              <div className="hq-row">
                <span className="hq-label">TSX.V: CWV</span>
                <span className="hq-sep"></span>
                <span className="hq-price" data-cpe-field="stock.price">{price}</span>
                <span className="hq-delta pos" data-cpe-field="stock.delta">{delta}</span>
              </div>
              <div className="hq-row hq-sub">
                <span><span className="lang-es">Beta</span><span className="lang-en">Beta</span> · <span data-cpe-field="stock.beta">{beta}</span></span>
                <span><span className="lang-es">Vol.</span><span className="lang-en">Vol.</span> <span data-cpe-field="stock.vol30">{vol30}</span></span>
                <span><span className="lang-es">Cap.</span><span className="lang-en">Mkt&nbsp;cap</span> <span data-cpe-field="stock.cap">{cap}</span></span>
                <span className="hq-stale"><span className="lang-es">Actualizado al cierre anterior</span><span className="lang-en">Updated at prior close</span></span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BASINS STRIP */}
      {show['basinsStrip'] !== false && (
        <section className="basins-strip" aria-label="Cuencas de operación" data-cpe-section="basinsStrip">
          <div className="container">
            <div className="bs-row">
              <span className="eyebrow"><span className="lang-es">Presencia operativa</span><span className="lang-en">Operating footprint</span></span>
              <div className="bs-list">
                {[
                  { num: '01', name: 'Cuyana', es: 'Cuyo, Mendoza', en: 'Cuyo, Mendoza' },
                  { num: '02', name: 'Neuquina', es: 'Mendoza Sur', en: 'Southern Mendoza' },
                  { num: '03', name: 'Golfo San Jorge', es: 'Chubut · Santa Cruz', en: 'Chubut · Santa Cruz' },
                  { num: '04', name: 'Austral', es: 'Tierra del Fuego', en: 'Tierra del Fuego' },
                ].map(b => (
                  <div className="bs-item" key={b.num}>
                    <span className="bs-num num">{b.num}</span>
                    <div>
                      <strong>{b.name}</strong>
                      <span className="lang-es">{b.es}</span>
                      <span className="lang-en">{b.en}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* EN NÚMEROS */}
      <section className="nums-strip" aria-label="Crown Point en números">
        <div className="container">
          <div className="nums-grid">
            {[
              { val: f['stats.pozos']      || '357',  es: 'pozos productivos',     en: 'producing wells' },
              { val: f['stats.inyectores'] || '83',   es: 'pozos inyectores',      en: 'injection wells' },
              { val: f['stats.cuencas']    || '4',    es: 'cuencas productoras',   en: 'producing basins' },
              { val: f['stats.ha']         || '372k', es: 'hectáreas operadas',    en: 'operated hectares' },
              { val: f['stats.anios']      || '25+',  es: 'años en upstream arg.', en: 'yrs Argentine upstream' },
            ].map(s => (
              <div className="nums-item" key={s.es}>
                <span className="nums-val num">{s.val}</span>
                <span className="nums-label">
                  <span className="lang-es">{s.es}</span>
                  <span className="lang-en">{s.en}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs */}
      {show['kpis'] !== false && (
        <section className="section" data-cpe-section="kpis">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow"><span className="lang-es">{kpiPeriodoEs}</span><span className="lang-en">{kpiPeriodoEn}</span></span>
                <h2 className="section-title">
                  <span className="lang-es">Una operación de escala<br/>con balance saneado.</span>
                  <span className="lang-en">An at-scale operation<br/>on a clean balance sheet.</span>
                </h2>
              </div>
              <p>
                <span className="lang-es">Producción diaria, reservas certificadas y disciplina de capital. Datos al cierre del último trimestre, conforme a NI 51-101.</span>
                <span className="lang-en">Daily production, certified reserves and disciplined capital allocation. Figures as of last reported quarter, per NI 51-101.</span>
              </p>
            </div>
            <div className="kpi-grid reveal">
              <div className="kpi">
                <span className="kpi-label"><span className="lang-es">Producción diaria</span><span className="lang-en">Daily production</span></span>
                <div>
                  <span className="kpi-value num" data-cpe-field="kpi.production.value">{kpiProdVal}</span>
                  <span className="kpi-unit" data-cpe-field="kpi.production.unit">{kpiProdUnit}</span>
                </div>
                <span className="kpi-meta">
                  <span className="badge" data-cpe-field="kpi.production.delta">{kpiProdDelta}</span>
                  <span className="lang-es">86% petróleo · 14% gas</span>
                  <span className="lang-en">86% oil · 14% gas</span>
                </span>
              </div>
              <div className="kpi">
                <span className="kpi-label"><span className="lang-es">Reservas P1</span><span className="lang-en">P1 reserves</span></span>
                <div>
                  <span className="kpi-value num" data-cpe-field="kpi.reserves.value">{kpiResVal}</span>
                  <span className="kpi-unit" data-cpe-field="kpi.reserves.unit">{kpiResUnit}</span>
                </div>
                <span className="kpi-meta">
                  <span className="badge" data-cpe-field="kpi.reserves.delta">{kpiResDelta}</span>
                  <span className="lang-es">vida útil estimada</span>
                  <span className="lang-en">reserve life</span>
                </span>
              </div>
              <div className="kpi">
                <span className="kpi-label"><span className="lang-es">EBITDA ajustado</span><span className="lang-en">Adj. EBITDA</span></span>
                <div>
                  <span className="kpi-value num" data-cpe-field="kpi.ebitda.value">{kpiEbVal}</span>
                  <span className="kpi-unit" data-cpe-field="kpi.ebitda.unit">{kpiEbUnit}</span>
                </div>
                <span className="kpi-meta">
                  <span className="badge" data-cpe-field="kpi.ebitda.delta">{kpiEbDelta}</span>
                  <span className="lang-es">últimos 12 meses</span>
                  <span className="lang-en">LTM</span>
                </span>
              </div>
              <div className="kpi">
                <span className="kpi-label"><span className="lang-es">Concesiones</span><span className="lang-en">Concessions</span></span>
                <div>
                  <span className="kpi-value num" data-cpe-field="kpi.blocks.value">{kpiBlkVal}</span>
                  <span className="kpi-unit" data-cpe-field="kpi.blocks.unit">
                    <span className="lang-es">{kpiBlkUnit}</span>
                    <span className="lang-en">concessions in 4 basins</span>
                  </span>
                </div>
                <span className="kpi-meta">
                  <span className="badge" data-cpe-field="kpi.blocks.delta">{kpiBlkDelta}</span>
                  <span className="lang-es">superficie operada</span>
                  <span className="lang-en">operated acreage</span>
                </span>
              </div>
            </div>
            <p className="kpi-foot">
              <span className="lang-es">Cifras gerenciales no auditadas. Para detalle ver <Link href="/inversores#financieros">Estados financieros</Link>.</span>
              <span className="lang-en">Unaudited management figures. See <Link href="/inversores#financieros">Financial statements</Link> for detail.</span>
            </p>
          </div>
        </section>
      )}

      {/* STATEMENT */}
      <section className="statement-section" data-cpe-section="statement">
        <div className="container">
          <blockquote className="statement-quote reveal">
            <span className="lang-es">{f['statement.home.es'] || 'Crecimiento disciplinado con activos reales.'}</span>
            <span className="lang-en">{f['statement.home.en'] || 'Disciplined growth backed by real assets.'}</span>
          </blockquote>
        </div>
      </section>

      {/* OPERATIONS MAP */}
      {show['ops'] !== false && (
        <section className="section ops-section" data-cpe-section="ops">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow"><span className="lang-es">Operaciones</span><span className="lang-en">Operations</span></span>
                <h2 className="section-title">
                  <span className="lang-es">11 concesiones<br/>en cuatro cuencas.</span>
                  <span className="lang-en">11 concessions<br/>across four basins.</span>
                </h2>
              </div>
              <p>
                <span className="lang-es">Cartera diversificada de activos con foco en petróleo convencional y gas natural.</span>
                <span className="lang-en">A diversified portfolio of assets focused on conventional oil and natural gas.</span>
              </p>
            </div>
            <div className="ops-layout reveal">
              <div className="ops-map"><ArgentinaMap /></div>
              <ul className="ops-list">
                {opsBlocks.map(b => (
                  <li className="ops-card" data-pin={b.slug} key={b.id}>
                    <div className="ops-card-hd">
                      <span className="ops-card-num num">{b.id}</span>
                      <span className="chip">
                        <span className="lang-es">{b.operador ? 'Operador' : 'Participación'}</span>
                        <span className="lang-en">{b.operador ? 'Operator' : 'Working interest'}</span>
                        {b.wi ? ` · ${b.wi}` : ''}
                      </span>
                    </div>
                    <h3 className="ops-card-title">{b.titulo}</h3>
                    <p>
                      <span className="lang-es">{b.subtitulo_es}</span>
                      <span className="lang-en">{b.subtitulo_en}</span>
                    </p>
                    <Link className="btn-ghost" href={`/operaciones#${b.slug}`}>
                      <span className="lang-es">Detalle del bloque</span>
                      <span className="lang-en">Block detail</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* INVESTOR HIGHLIGHT */}
      {show['investor'] !== false && (
        <section className="invest-feature" data-cpe-section="investor">
          <div className="container invest-grid">
            <div className="invest-copy reveal">
              <span className="eyebrow"><span className="lang-es">Para inversores</span><span className="lang-en">For investors</span></span>
              <h2 className="section-title">
                <span className="lang-es">Una historia de valor<br/>respaldada por activos reales.</span>
                <span className="lang-en">A value story<br/>backed by real assets.</span>
              </h2>
              <p className="invest-lede">
                <span className="lang-es">Reservas certificadas bajo NI 51-101, contratos de suministro energético en USD y moneda local indexada, y un equipo con más de 25 años de experiencia en el upstream argentino.</span>
                <span className="lang-en">NI 51-101 certified reserves, energy supply contracts denominated in USD and indexed local currency, and a team with 25+ years of Argentine upstream experience.</span>
              </p>
              <ul className="invest-list">
                <li>
                  <span className="bullet"></span>
                  <div>
                    <strong><span className="lang-es">Producción base diversificada</span><span className="lang-en">Diversified base production</span></strong>
                    <span className="lang-es">Mix balanceado de gas natural, crudo y NGL en seis bloques y cuatro cuencas.</span>
                    <span className="lang-en">Balanced mix of natural gas, crude and NGLs across six blocks in four basins.</span>
                  </div>
                </li>
                <li>
                  <span className="bullet"></span>
                  <div>
                    <strong><span className="lang-es">Estructura financiera prudente</span><span className="lang-en">Prudent capital structure</span></strong>
                    <span className="lang-es">Deuda/EBITDA &lt; 1,5x. Obligaciones negociables Clase IV emitidas en 2025.</span>
                    <span className="lang-en">Net debt/EBITDA &lt; 1.5x. Class IV notes issued in 2025.</span>
                  </div>
                </li>
                <li>
                  <span className="bullet"></span>
                  <div>
                    <strong><span className="lang-es">Pipeline de crecimiento</span><span className="lang-en">Growth pipeline</span></strong>
                    <span className="lang-es">Plan de 12 pozos para 2026–2027 enfocados en gas y crudo de bajo punto de equilibrio.</span>
                    <span className="lang-en">12-well program for 2026–2027 targeting low-breakeven gas and oil.</span>
                  </div>
                </li>
              </ul>
              <div className="invest-cta">
                <Link className="btn btn-primary" href="/inversores">
                  <span className="lang-es">Ver resumen completo</span>
                  <span className="lang-en">See full overview</span>
                </Link>
                <Link className="btn-ghost" href="/inversores#financieros">
                  <span className="lang-es">Últimos estados financieros</span>
                  <span className="lang-en">Latest financials</span>
                </Link>
              </div>
            </div>

            {show['investor.quotePanel'] !== false && (
              <aside className="invest-panel reveal" data-cpe-section="investor.quotePanel">
                <header>
                  <span className="eyebrow"><span className="lang-es">Cotización TSX Venture</span><span className="lang-en">TSX Venture quote</span></span>
                  <span className="chip"><span className="live-dot" style={{ background: 'var(--cp-green)' }}></span><span className="lang-es">Cierre anterior</span><span className="lang-en">Prior close</span></span>
                </header>
                <div className="ip-price">
                  <span className="num" data-cpe-field="stock.price">{price}</span>
                  <span className="ip-delta pos num" data-cpe-field="stock.delta">{delta}</span>
                </div>
                <table className="ip-table">
                  <tbody>
                  {show['investor.beta'] !== false && (
                    <tr data-cpe-section="investor.beta"><td>Beta</td><td className="num" data-cpe-field="stock.beta">{beta}</td></tr>
                  )}
                  {show['investor.vol30'] !== false && (
                    <tr data-cpe-section="investor.vol30"><td><span className="lang-es">Vol. promedio (30d)</span><span className="lang-en">Avg vol (30d)</span></td><td className="num" data-cpe-field="stock.vol30">{vol30}</td></tr>
                  )}
                  {show['investor.high52'] !== false && (
                    <tr data-cpe-section="investor.high52"><td><span className="lang-es">Máx. 52 sem.</span><span className="lang-en">52w high</span></td><td className="num" data-cpe-field="stock.high52">{stockHigh52}</td></tr>
                  )}
                  {show['investor.low52'] !== false && (
                    <tr data-cpe-section="investor.low52"><td><span className="lang-es">Mín. 52 sem.</span><span className="lang-en">52w low</span></td><td className="num" data-cpe-field="stock.low52">{stockLow52}</td></tr>
                  )}
                  {show['investor.cap'] !== false && (
                    <tr data-cpe-section="investor.cap"><td><span className="lang-es">Capitalización</span><span className="lang-en">Market cap</span></td><td className="num" data-cpe-field="stock.cap">{cap}</td></tr>
                  )}
                  {show['investor.shares'] !== false && (
                    <tr data-cpe-section="investor.shares"><td><span className="lang-es">Acciones en circulación</span><span className="lang-en">Shares outstanding</span></td><td className="num" data-cpe-field="stock.shares">{stockShares}</td></tr>
                  )}
                  </tbody>
                </table>
                {show['investor.sparkline'] !== false && (
                  <div className="ip-spark" data-cpe-section="investor.sparkline">
                    <svg viewBox="0 0 280 80" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent2)" stopOpacity="0.35"/>
                          <stop offset="100%" stopColor="var(--accent2)" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M0 55 L20 50 L40 53 L60 48 L80 45 L100 50 L120 40 L140 38 L160 42 L180 30 L200 32 L220 25 L240 28 L260 18 L280 22 L280 80 L0 80 Z" fill="url(#sparkFill)"/>
                      <path d="M0 55 L20 50 L40 53 L60 48 L80 45 L100 50 L120 40 L140 38 L160 42 L180 30 L200 32 L220 25 L240 28 L260 18 L280 22" fill="none" stroke="var(--accent2)" strokeWidth="1.5"/>
                    </svg>
                    <span className="ip-spark-meta"><span className="lang-es">12 meses</span><span className="lang-en">12 months</span>{f['stock.delta'] && f['stock.delta'] !== '+0.00%' ? ` · ${f['stock.delta']}` : ''}</span>
                  </div>
                )}
                <footer>
                  <Link className="btn-ghost" href="/inversores"><span className="lang-es">Ver historial</span><span className="lang-en">See history</span></Link>
                </footer>
              </aside>
            )}
          </div>
        </section>
      )}

      {/* PRESS */}
      {show['press'] !== false && (
        <section className="section press-section" data-cpe-section="press">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow"><span className="lang-es">Sala de prensa</span><span className="lang-en">Newsroom</span></span>
                <h2 className="section-title">
                  <span className="lang-es">Últimas novedades.</span>
                  <span className="lang-en">Latest releases.</span>
                </h2>
              </div>
              <Link className="btn-ghost" href="/comunicados"><span className="lang-es">Todos los comunicados</span><span className="lang-en">All press releases</span></Link>
            </div>
            {latestComunicados.length > 0 ? (
              <ul className="press-list reveal">
                {latestComunicados.map(item => {
                  const label = CAT_LABEL[item.tipo] ?? { es: item.tipo, en: item.tipo }
                  const href = item.url || '/comunicados'
                  return (
                    <li className="press-item" key={item.id}>
                      <span className="press-date num">{fmtFechaHome(item.fecha)}</span>
                      <div>
                        <span className="chip">
                          <span className="lang-es">{label.es}</span>
                          <span className="lang-en">{label.en}</span>
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
                      <a className="press-arrow" href={href} target={item.url ? '_blank' : undefined} rel={item.url ? 'noreferrer' : undefined} aria-label="Leer comunicado">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11h12M12 5l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </a>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div style={{ padding: 'var(--s-6) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: 0 }}>
                  <span className="lang-es">No hay comunicados recientes. Consultá el archivo completo.</span>
                  <span className="lang-en">No recent press releases. See the full archive.</span>
                </p>
                <a href="/comunicados" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  <span className="lang-es">Ver todos los comunicados →</span>
                  <span className="lang-en">View all releases →</span>
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CONTACT CTA */}
      {show['contact'] !== false && (
        <section className="contact-cta" data-cpe-section="contact">
          <div className="container">
            <div className="cc-grid reveal">
              <div className="cc-copy">
                <span className="eyebrow"><span className="lang-es">Contacto institucional</span><span className="lang-en">Institutional contact</span></span>
                <h2 className="section-title">
                  <span className="lang-es">¿Sos analista,<br/>inversor o socio?</span>
                  <span className="lang-en">Are you an analyst,<br/>investor or partner?</span>
                </h2>
                <p>
                  <span className="lang-es">Nuestro equipo de Investor Relations responde consultas, agenda reuniones one-on-one y comparte materiales complementarios bajo NDA.</span>
                  <span className="lang-en">Our Investor Relations team responds to enquiries, schedules one-on-one meetings and shares supporting materials under NDA.</span>
                </p>
              </div>
              <div className="cc-card">
                <div className="cc-channel">
                  <span className="cc-key">Investor Relations</span>
                  <a href="mailto:ir@crownpointenergy.com" className="cc-val">ir@crownpointenergy.com</a>
                </div>
                <div className="cc-channel">
                  <span className="cc-key">
                    <span className="lang-es">Comercialización hidrocarburos</span>
                    <span className="lang-en">Hydrocarbon trading</span>
                  </span>
                  <a href="mailto:comercial@crownpointenergy.com" className="cc-val">comercial@crownpointenergy.com</a>
                </div>
                <div className="cc-channel">
                  <span className="cc-key">
                    <span className="lang-es">Proveedores &amp; compras</span>
                    <span className="lang-en">Suppliers &amp; procurement</span>
                  </span>
                  <a href="mailto:compras@crownpointenergy.com" className="cc-val">compras@crownpointenergy.com</a>
                </div>
                <div className="cc-channel">
                  <span className="cc-key"><span className="lang-es">Oficinas Buenos Aires</span><span className="lang-en">Buenos Aires office</span></span>
                  <span className="cc-val">Godoy Cruz 2769, Piso 4 — C1425FQK</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link className="btn btn-primary cc-btn" href="/contacto" style={{ flex: 1, minWidth: 160 }}>
                    <span className="lang-es">Ver todos los contactos</span>
                    <span className="lang-en">All contacts</span>
                  </Link>
                  <a
                    href="https://www.linkedin.com/company/crown-point-energia-sa"
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '10px 18px', borderRadius: 'var(--r-md)',
                      border: '1px solid rgba(10,102,194,.35)',
                      color: '#0a66c2', fontSize: 14, fontWeight: 600,
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      background: 'rgba(10,102,194,.06)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                      <circle cx="4" cy="4" r="2"/>
                    </svg>
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

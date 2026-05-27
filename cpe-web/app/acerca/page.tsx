import Link from 'next/link'

export const revalidate = 60

export default function AcercaPage() {
  return (
    <>
      <style>{`
        .strat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-4); margin-top: var(--s-6); }
        .strat-card { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-lg); padding: var(--s-6); }
        .strat-card .num { font-family: var(--font-mono); font-size: 13px; color: var(--accent); font-weight: 600; letter-spacing: 0.08em; }
        .strat-card h4 { font-family: var(--font-display); font-size: 22px; font-weight: 600; margin: 6px 0 12px; letter-spacing: -0.02em; }
        .strat-card p { color: var(--fg-soft); font-size: 14px; line-height: 1.55; margin: 0; }
        @media (max-width: 720px) { .strat-grid { grid-template-columns: 1fr; } }
        .people-grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-6); }
        .person { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-lg); padding: var(--s-6); }
        .avatar { width: 56px; height: 56px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-family: var(--font-display); font-weight: 600; font-size: 20px; letter-spacing: -0.02em; margin-bottom: var(--s-3); }
        .person strong { display: block; font-family: var(--font-display); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
        .person .role { display: block; font-size: 13px; color: var(--accent-deep); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; margin-top: 4px; }
        [data-theme="dark"] .person .role { color: var(--accent); }
        .person p { font-size: 14px; color: var(--fg-soft); line-height: 1.55; margin: 12px 0 0; }
        @media (max-width: 720px) { .people-grid { grid-template-columns: 1fr; } }
        .director-list { list-style: none; padding: 0; margin: 0; }
        .director-list li { padding: 16px 0; border-bottom: 1px solid var(--rule); display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; font-size: 16px; color: var(--fg-soft); }
        .director-list li:last-child { border-bottom: 0; }
        .director-list strong { font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--fg); letter-spacing: -0.01em; }
        .director-list span { font-size: 12px; color: var(--fg-muted); letter-spacing: 0.06em; text-transform: uppercase; }
      `}</style>

      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Acerca de</span><span className="lang-en">About</span></span>
          </div>
          <span className="eyebrow">Crown Point Energy</span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">25 años produciendo<br/>energía en Argentina.</span>
            <span className="lang-en">25 years producing<br/>energy in Argentina.</span>
          </h1>
          <p>
            <span className="lang-es">Empresa de petróleo y gas con operaciones íntegramente en Argentina y casa matriz en Calgary, Canadá. Cotiza en TSX Venture Exchange desde 2009.</span>
            <span className="lang-en">An oil &amp; gas company with operations entirely in Argentina and headquarters in Calgary, Canada. Listed on TSX Venture Exchange since 2009.</span>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="two-col">
            <aside className="left-rail">
              <h4><span className="lang-es">En esta página</span><span className="lang-en">On this page</span></h4>
              <nav>
                <a href="#estrategia" className="active"><span className="lang-es">Estrategia</span><span className="lang-en">Strategy</span></a>
                <a href="#management">Management</a>
                <a href="#directorio"><span className="lang-es">Directorio CPE Inc.</span><span className="lang-en">CPE Inc. Board</span></a>
                <a href="#esg"><span className="lang-es">Responsabilidad corporativa</span><span className="lang-en">Corporate responsibility</span></a>
              </nav>
            </aside>
            <main>
              <div className="section-block" id="estrategia">
                <span className="eyebrow"><span className="lang-es">Estrategia</span><span className="lang-en">Strategy</span></span>
                <h2 style={{ marginTop: 8 }}>
                  <span className="lang-es">Crecimiento disciplinado<br/>con activos reales.</span>
                  <span className="lang-en">Disciplined growth<br/>with real assets.</span>
                </h2>
                <p className="lede">
                  <span className="lang-es">Nuestra estrategia se sostiene sobre cuatro pilares: producción base diversificada, disciplina de capital, crecimiento por adquisición selectiva y vinculación honesta con comunidades y reguladores.</span>
                  <span className="lang-en">Our strategy rests on four pillars: diversified base production, capital discipline, selective acquisition-led growth and honest engagement with communities and regulators.</span>
                </p>
                <div className="strat-grid">
                  {[
                    { n: '01', titleEs: 'Producción base', titleEn: 'Base production', bodyEs: 'Sostener y optimizar la producción existente con workovers y recuperación secundaria. La base genera el cash flow que financia el crecimiento.', bodyEn: 'Sustain and optimize existing production with workovers and secondary recovery. The base generates the cash flow that funds growth.' },
                    { n: '02', titleEs: 'Disciplina de capital', titleEn: 'Capital discipline', bodyEs: 'Solo aprobamos proyectos con TIR esperada > 30% a precios conservadores. Mantenemos Net Debt/EBITDA por debajo de 1,5x en todo momento.', bodyEn: 'We only approve projects with expected IRR > 30% at conservative prices. We keep Net Debt/EBITDA below 1.5x at all times.' },
                    { n: '03', titleEs: 'Adquisición selectiva', titleEn: 'Selective acquisition', bodyEs: 'Crecemos por adquisición de bloques productivos con upside operativo identificable, priorizando cuencas donde ya operamos.', bodyEn: 'We grow by acquiring producing blocks with identifiable operational upside, prioritizing basins where we already operate.' },
                    { n: '04', titleEs: 'Vinculación honesta', titleEn: 'Honest engagement', bodyEs: 'Reportamos con transparencia. Cumplimos con NI 51-101 y NI 52-110. Trabajamos cerca de comunidades locales en cada bloque.', bodyEn: 'We report transparently. We comply with NI 51-101 and NI 52-110. We work closely with local communities at every block.' },
                  ].map(c => (
                    <div className="strat-card" key={c.n}>
                      <span className="num">{c.n}</span>
                      <h4><span className="lang-es">{c.titleEs}</span><span className="lang-en">{c.titleEn}</span></h4>
                      <p><span className="lang-es">{c.bodyEs}</span><span className="lang-en">{c.bodyEn}</span></p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-block" id="management">
                <span className="eyebrow">Management</span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Equipo ejecutivo</span><span className="lang-en">Executive team</span></h2>
                <p className="lede">
                  <span className="lang-es">Profesionales con más de 25 años de experiencia en upstream argentino y mercados de capitales canadienses.</span>
                  <span className="lang-en">Professionals with over 25 years of experience in Argentine upstream and Canadian capital markets.</span>
                </p>
                <ul className="people-grid">
                  {[
                    { initials: 'AS', bg: 'linear-gradient(135deg, #1F2566, #4F5478)', name: 'Andrés Suárez', roleEs: 'CEO & Presidente', roleEn: 'CEO & President', bioEs: '25 años en upstream argentino. Ingeniero en Petróleo (UBA), MBA IAE.', bioEn: '25 years in Argentine upstream. Petroleum Engineer (UBA), IAE MBA.' },
                    { initials: 'MV', bg: 'linear-gradient(135deg, #6CAE52, #4E8A38)', name: 'Mariano Vega', roleEs: 'CFO', roleEn: 'CFO', bioEs: '18 años en mercados de capital. Ex Macro Securities, ex YPF Treasury.', bioEn: '18 years in capital markets. Ex Macro Securities, ex YPF Treasury.' },
                    { initials: 'LR', bg: 'linear-gradient(135deg, #B05E2A, #8A3F1A)', name: 'Laura Ramos', roleEs: 'COO', roleEn: 'COO', bioEs: '22 años de experiencia operativa en Cuenca Neuquina y Cuyana.', bioEn: '22 years of operational experience in the Neuquén and Cuyana basins.' },
                    { initials: 'DG', bg: 'linear-gradient(135deg, #C9A24A, #A37F2C)', name: 'Diego García', roleEs: 'VP Operaciones', roleEn: 'VP Operations', bioEs: 'Ex Pluspetrol. Geólogo (UNLP). Especialista en Golfo San Jorge.', bioEn: 'Ex Pluspetrol. Geologist (UNLP). San Jorge specialist.' },
                  ].map(p => (
                    <li className="person" key={p.initials}>
                      <div className="avatar" style={{ background: p.bg }}>{p.initials}</div>
                      <strong>{p.name}</strong>
                      <span className="role"><span className="lang-es">{p.roleEs}</span><span className="lang-en">{p.roleEn}</span></span>
                      <p><span className="lang-es">{p.bioEs}</span><span className="lang-en">{p.bioEn}</span></p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="section-block" id="directorio">
                <span className="eyebrow">Crown Point Energy Inc.</span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Directorio</span><span className="lang-en">Board of directors</span></h2>
                <p className="lede">
                  <span className="lang-es">Cinco directores, con mayoría independiente. Cumplimos con NI 58-101 sobre prácticas de gobierno corporativo.</span>
                  <span className="lang-en">Five directors, majority independent. We comply with NI 58-101 on corporate governance practices.</span>
                </p>
                <ul className="director-list">
                  <li><strong>Brian Moss</strong> · Chairman · <span><span className="lang-es">Independiente</span><span className="lang-en">Independent</span></span></li>
                  <li><strong>Andrés Suárez</strong> · CEO &amp; Director</li>
                  <li><strong>Camila Pereyra</strong> · Director · <span><span className="lang-es">Independiente</span><span className="lang-en">Independent</span></span></li>
                  <li><strong>Edward Brown</strong> · Director · <span><span className="lang-es">Independiente</span><span className="lang-en">Independent</span></span></li>
                  <li><strong>Roberto Cuevas</strong> · Director · <span><span className="lang-es">Independiente</span><span className="lang-en">Independent</span></span></li>
                </ul>
              </div>

              <div className="section-block" id="esg">
                <span className="eyebrow">ESG</span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Responsabilidad corporativa</span><span className="lang-en">Corporate responsibility</span></h2>
                <p className="lede">
                  <span className="lang-es">Operar de forma responsable es la condición para operar a largo plazo. Reportamos métricas ambientales, sociales y de gobierno con criterios SASB para upstream oil &amp; gas.</span>
                  <span className="lang-en">Operating responsibly is the condition for operating long-term. We report environmental, social and governance metrics using SASB criteria for upstream oil &amp; gas.</span>
                </p>
                <div className="kpi-grid" style={{ marginTop: 'var(--s-4)' }}>
                  {[
                    { labelEs: 'Intensidad GEI', labelEn: 'GHG intensity', val: '21.4', unit: 'kgCO₂e/boe', badge: '−11% YoY' },
                    { labelEs: 'Agua de procesos reciclada', labelEn: 'Process water recycled', val: '82', unit: '%', metaEs: 'Objetivo 2027: 90%', metaEn: '2027 target: 90%' },
                    { labelEs: 'Incidentes registrables (TRIR)', labelEn: 'Recordable incidents (TRIR)', val: '0.78', metaEs: 'Industria: 1,1', metaEn: 'Industry: 1.1' },
                    { labelEs: 'Empleo local directo', labelEn: 'Direct local hires', val: '88', unit: '%', metaEs: 'Sobre total contratado', metaEn: 'Of total hired' },
                  ].map((k, i) => (
                    <div className="kpi" key={i}>
                      <span className="kpi-label"><span className="lang-es">{k.labelEs}</span><span className="lang-en">{k.labelEn}</span></span>
                      <div><span className="kpi-value num">{k.val}</span>{k.unit && <span className="kpi-unit">{k.unit}</span>}</div>
                      <span className="kpi-meta">
                        {k.badge && <span className="badge">{k.badge}</span>}
                        {k.metaEs && <><span className="lang-es">{k.metaEs}</span><span className="lang-en">{k.metaEn}</span></>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
    </>
  )
}

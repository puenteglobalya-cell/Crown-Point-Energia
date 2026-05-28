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
            <span className="lang-es">Producción real,<br/>base sólida,<br/>visión de largo plazo.</span>
            <span className="lang-en">Real production,<br/>solid foundation,<br/>long-term vision.</span>
          </h1>
          <p>
            <span className="lang-es">Crown Point Energía S.A. opera en el mercado argentino con casa matriz internacional. Dedicada al petróleo y gas con sede en Buenos Aires, genera flujo de caja de su propia producción y mantiene una cartera de oportunidades en las cuencas Austral, Neuquina y Cuyana. La empresa holding Crown Point Energy Inc. cotiza en TSXV: CWV.</span>
            <span className="lang-en">Crown Point Energía S.A. operates in the Argentine market with international headquarters. Dedicated to oil &amp; gas and based in Buenos Aires, it generates cash flow from its own production and maintains a portfolio of opportunities in the Austral, Neuquén and Cuyana basins. Holding company Crown Point Energy Inc. is listed on TSXV: CWV.</span>
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
                <Link href="/esg"><span className="lang-es">ESG &amp; Responsabilidad corporativa</span><span className="lang-en">ESG &amp; Corporate responsibility</span></Link>
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
                  <span className="lang-es">La estrategia de Crown Point se centra en establecer una cartera de activos en producción, además de oportunidades de exploración y mejora de la producción actual en sus yacimientos, para proporcionar una base sólida de crecimiento futuro. Las actividades de exploración y desarrollo se concentran principalmente en la cuenca Austral (Tierra del Fuego) y la cuenca Neuquina (Mendoza y Neuquén).</span>
                  <span className="lang-en">Crown Point&apos;s strategy focuses on building a portfolio of production assets, along with exploration opportunities and improvement of current production at its fields, to provide a solid foundation for future growth. Exploration and development activities are concentrated primarily in the Austral basin (Tierra del Fuego) and the Neuquén basin (Mendoza and Neuquén).</span>
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

              <div className="section-block" id="esg" style={{ borderBottom: 0 }}>
                <span className="eyebrow">ESG</span>
                <h2 style={{ marginTop: 8 }}>
                  <span className="lang-es">Responsabilidad corporativa</span>
                  <span className="lang-en">Corporate responsibility</span>
                </h2>
                <p className="lede">
                  <span className="lang-es">Operar de forma responsable es la condición para operar a largo plazo. Reportamos métricas ambientales, sociales y de gobierno bajo criterios SASB para upstream oil &amp; gas y las recomendaciones del TCFD.</span>
                  <span className="lang-en">Operating responsibly is the condition for operating long-term. We report environmental, social and governance metrics using SASB upstream oil &amp; gas criteria and TCFD recommendations.</span>
                </p>
                <div style={{ display: 'flex', gap: 'var(--s-4)', flexWrap: 'wrap', marginTop: 'var(--s-6)', padding: 'var(--s-6)', background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)' }}>
                  {[
                    { col: '#E2B23A', labelEs: 'Ambiental', labelEn: 'Environmental', metaEs: '−18% emisiones vs 2022', metaEn: '−18% emissions vs 2022' },
                    { col: '#6CAE52', labelEs: 'Social',    labelEn: 'Social',         metaEs: 'TRIR 0.87 · 71% empleo local', metaEn: 'TRIR 0.87 · 71% local hires' },
                    { col: '#2FA08A', labelEs: 'Gobernanza',labelEn: 'Governance',     metaEs: '4/5 directores independientes', metaEn: '4/5 independent directors' },
                  ].map(p => (
                    <div key={p.col} style={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: p.col, flexShrink: 0 }}></span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                          <span className="lang-es">{p.labelEs}</span>
                          <span className="lang-en">{p.labelEn}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                          <span className="lang-es">{p.metaEs}</span>
                          <span className="lang-en">{p.metaEn}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link href="/esg" className="btn btn-secondary" style={{ alignSelf: 'center', flexShrink: 0 }}>
                    <span className="lang-es">Ver reporte ESG completo</span>
                    <span className="lang-en">Full ESG report</span>
                  </Link>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
    </>
  )
}

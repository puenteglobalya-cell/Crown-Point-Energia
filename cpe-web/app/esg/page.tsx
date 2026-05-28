import Link from 'next/link'

export const revalidate = 60

const PILLARS = [
  {
    id: 'ambiental',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M7 10c.5-1 1.5-2 3-2m7 2c-.5-1-1.5-2-3-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#2FA08A',
    titleEs: 'Ambiental',
    titleEn: 'Environmental',
    ledeEs: 'Operamos con un enfoque de minimización de impactos y reducción progresiva de emisiones en todos nuestros bloques.',
    ledeEn: 'We operate with a focus on minimising impacts and progressively reducing emissions across all our blocks.',
    metrics: [
      { labelEs: 'Reducción de emisiones (2024 vs. 2022)', labelEn: 'Emissions reduction (2024 vs. 2022)', val: '−18%' },
      { labelEs: 'Gas antorcha quemado (% de producción)', labelEn: 'Gas flared (% of production)', val: '<2.1%' },
      { labelEs: 'Agua reinyectada / producida', labelEn: 'Water reinjected / produced', val: '94%' },
      { labelEs: 'Pozos remediados 2024', labelEn: 'Remediated wells 2024', val: '11' },
    ],
    initiativesEs: [
      'Programa de monitoreo continuo de emisiones fugitivas en todas las instalaciones de superficie.',
      'Electrificación progresiva de compresores en Tordillo con generación fotovoltaica solar.',
      'Sistema de gestión ambiental certificado bajo ISO 14001 en las operaciones de Tierra del Fuego.',
    ],
    initiativesEn: [
      'Continuous fugitive emission monitoring programme at all surface facilities.',
      'Progressive electrification of Tordillo compressors with solar photovoltaic generation.',
      'Environmental management system certified under ISO 14001 for Tierra del Fuego operations.',
    ],
  },
  {
    id: 'social',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#6CAE52',
    titleEs: 'Social',
    titleEn: 'Social',
    ledeEs: 'Las comunidades donde operamos son parte de nuestra estrategia. Generamos empleo local, apoyamos educación técnica y mantenemos estándares de salud y seguridad de primer nivel.',
    ledeEn: 'The communities where we operate are part of our strategy. We generate local employment, support technical education and maintain world-class health and safety standards.',
    metrics: [
      { labelEs: 'Empleados directos', labelEn: 'Direct employees', val: '328' },
      { labelEs: 'Empleados locales (en provincia)', labelEn: 'Local employees (in province)', val: '71%' },
      { labelEs: 'Horas de capacitación / empleado', labelEn: 'Training hours / employee', val: '42h' },
      { labelEs: 'Tasa de accidentes (TRIR)', labelEn: 'Accident rate (TRIR)', val: '0.87' },
    ],
    initiativesEs: [
      'Programa de becas universitarias para hijos de colaboradores y estudiantes de comunidades aledañas a los bloques operativos.',
      'Acuerdos con institutos técnicos en Mendoza, Chubut y Tierra del Fuego para formación de técnicos en petróleo y gas.',
      'Clínicas móviles de salud y audiciones periódicas en localidades cercanas a los bloques en zonas remotas.',
    ],
    initiativesEn: [
      'University scholarship programme for employees\' children and students from communities near operating blocks.',
      'Agreements with technical institutes in Mendoza, Chubut and Tierra del Fuego for oil and gas technician training.',
      'Mobile health clinics and periodic health screenings in communities near remote operating blocks.',
    ],
  },
  {
    id: 'gobernanza',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    ),
    color: '#C9A24A',
    titleEs: 'Gobernanza',
    titleEn: 'Governance',
    ledeEs: 'Reportamos bajo estándares canadienses con directorio mayoritariamente independiente, política anti-corrupción, línea ética y divulgación completa en SEDAR+.',
    ledeEn: 'We report under Canadian standards with a majority-independent board, anti-corruption policy, ethics hotline and full disclosure on SEDAR+.',
    metrics: [
      { labelEs: 'Directores independientes', labelEn: 'Independent directors', val: '4/5' },
      { labelEs: 'Directoras mujeres', labelEn: 'Female directors', val: '2' },
      { labelEs: 'Auditores externos', labelEn: 'External auditors', val: 'KPMG' },
      { labelEs: 'Cotización regulatoria', labelEn: 'Regulatory listing', val: 'TSXV · CNV' },
    ],
    initiativesEs: [
      'Código de Ética aplicable a todos los directores, ejecutivos, empleados y contratistas, con línea de reporte confidencial.',
      'Política de anti-corrupción y anti-soborno conforme a la Ley Canadiense de Corrupción de Funcionarios Extranjeros (CFPOA).',
      'Política de diversidad en el directorio con objetivo del 30% de representación de géneros no predominantes para 2027.',
    ],
    initiativesEn: [
      'Code of Ethics applicable to all directors, officers, employees and contractors, with a confidential reporting hotline.',
      'Anti-corruption and anti-bribery policy in compliance with the Canadian Corruption of Foreign Public Officials Act (CFPOA).',
      'Board diversity policy with a target of 30% non-predominant gender representation by 2027.',
    ],
  },
]

export default function EsgPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span>ESG</span>
          </div>
          <span className="eyebrow">
            <span className="lang-es">Responsabilidad corporativa</span>
            <span className="lang-en">Corporate responsibility</span>
          </span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Operar bien.<br/>Reportar con claridad.</span>
            <span className="lang-en">Operate responsibly.<br/>Report with clarity.</span>
          </h1>
          <p>
            <span className="lang-es">Nuestra estrategia ESG integra la responsabilidad ambiental, el compromiso social y la gobernanza robusta como pilares de creación de valor a largo plazo.</span>
            <span className="lang-en">Our ESG strategy integrates environmental responsibility, social commitment and robust governance as pillars of long-term value creation.</span>
          </p>
        </div>
      </section>

      <style>{`
        .esg-pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-6); }
        @media (max-width: 900px) { .esg-pillars { grid-template-columns: 1fr; } }
        .esg-pillar { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-xl); overflow: hidden; }
        .esg-pillar-head { padding: var(--s-8); border-bottom: 1px solid var(--rule); }
        .esg-pillar-icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; margin-bottom: var(--s-4); }
        .esg-pillar h3 { font-size: 26px; font-family: var(--font-display); letter-spacing: -0.02em; margin: 0 0 var(--s-3); }
        .esg-pillar .lede { font-size: 14px; color: var(--fg-soft); line-height: 1.65; margin: 0; }
        .esg-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--rule); }
        .esg-metric { background: var(--surface); padding: 14px 18px; }
        .esg-metric-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; color: var(--fg-muted); margin-bottom: 4px; }
        .esg-metric-val { font-family: var(--font-mono); font-size: 22px; font-weight: 600; color: var(--fg); }
        .esg-initiatives { padding: var(--s-6) var(--s-8); }
        .esg-initiatives h4 { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-muted); font-weight: 600; margin: 0 0 var(--s-4); }
        .esg-init-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); }
        .esg-init-list li { font-size: 13px; color: var(--fg-soft); line-height: 1.6; padding-left: 18px; position: relative; }
        .esg-init-list li::before { content: "→"; position: absolute; left: 0; color: var(--fg-muted); }
        .esg-kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: var(--r-lg); overflow: hidden; }
        @media (max-width: 720px) { .esg-kpi-strip { grid-template-columns: repeat(2, 1fr); } .esg-metrics { grid-template-columns: 1fr; } }
      `}</style>

      {/* KPI strip */}
      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <div className="esg-kpi-strip reveal">
            {[
              { valEs: '−18%',  labelEs: 'Reducción emisiones vs 2022',  labelEn: 'Emissions reduction vs 2022' },
              { valEs: '94%',   labelEs: 'Agua reinyectada',              labelEn: 'Water reinjected' },
              { valEs: '0.87',  labelEs: 'TRIR seguridad 2024',           labelEn: 'Safety TRIR 2024' },
              { valEs: '4/5',   labelEs: 'Directores independientes',     labelEn: 'Independent directors' },
            ].map((k, i) => (
              <div className="kpi" key={i} style={{ minHeight: 120 }}>
                <span className="kpi-label">
                  <span className="lang-es">{k.labelEs}</span>
                  <span className="lang-en">{k.labelEn}</span>
                </span>
                <div><span className="kpi-value num" style={{ fontSize: 40 }}>{k.valEs}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="lang-es">Los tres pilares</span><span className="lang-en">Three pillars</span></span>
              <h2 className="section-title" style={{ marginTop: 8 }}>
                <span className="lang-es">Ambiental · Social · Gobernanza</span>
                <span className="lang-en">Environmental · Social · Governance</span>
              </h2>
            </div>
            <p>
              <span className="lang-es">Reportamos ESG anualmente en conformidad con los estándares del SASB (petróleo y gas integrado) y las recomendaciones del TCFD.</span>
              <span className="lang-en">We report ESG annually in conformance with SASB (integrated oil &amp; gas) standards and TCFD recommendations.</span>
            </p>
          </div>

          <div className="esg-pillars">
            {PILLARS.map((p, pi) => (
              <div className={`esg-pillar reveal reveal-d${pi + 1}`} key={p.id}>
                <div className="esg-pillar-head">
                  <div className="esg-pillar-icon" style={{ background: `${p.color}22`, color: p.color }}>
                    {p.icon}
                  </div>
                  <h3 style={{ color: p.color }}>
                    <span className="lang-es">{p.titleEs}</span>
                    <span className="lang-en">{p.titleEn}</span>
                  </h3>
                  <p className="lede">
                    <span className="lang-es">{p.ledeEs}</span>
                    <span className="lang-en">{p.ledeEn}</span>
                  </p>
                </div>
                <div className="esg-metrics">
                  {p.metrics.map((m, i) => (
                    <div className="esg-metric" key={i}>
                      <div className="esg-metric-label">
                        <span className="lang-es">{m.labelEs}</span>
                        <span className="lang-en">{m.labelEn}</span>
                      </div>
                      <div className="esg-metric-val">{m.val}</div>
                    </div>
                  ))}
                </div>
                <div className="esg-initiatives">
                  <h4>
                    <span className="lang-es">Iniciativas</span>
                    <span className="lang-en">Initiatives</span>
                  </h4>
                  <ul className="esg-init-list">
                    {p.initiativesEs.map((item, i) => (
                      <li key={i}>
                        <span className="lang-es">{item}</span>
                        <span className="lang-en">{p.initiativesEn[i]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reporting & frameworks */}
      <section className="section-tight" style={{ borderTop: '1px solid var(--rule)', background: 'var(--bg-alt)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s-8)', textAlign: 'center' }}>
            {[
              { name: 'SASB', descEs: 'Petroleum & Gas Integrated — Oil & Gas Exploration & Production', descEn: 'Petroleum & Gas Integrated — Oil & Gas E&P' },
              { name: 'TCFD', descEs: 'Recomendaciones para divulgación de riesgos climáticos financieros', descEn: 'Recommendations for climate-related financial risk disclosure' },
              { name: 'NI 51-101', descEs: 'Canadian Securities Administrators — estándar de reservas de petróleo y gas', descEn: 'Canadian Securities Administrators — oil & gas reserves standard' },
            ].map(f => (
              <div key={f.name} style={{ padding: 'var(--s-6)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>{f.name}</div>
                <p style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0 }}>
                  <span className="lang-es">{f.descEs}</span>
                  <span className="lang-en">{f.descEn}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

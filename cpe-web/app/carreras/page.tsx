import Link from 'next/link'
import ApplicationForm from './ApplicationForm'

export const revalidate = 60

const CULTURE_CARDS = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    color: '#C9A24A',
    titleEs: 'Seguridad primero',
    titleEn: 'Safety first',
    descEs: 'Ningún trabajo justifica poner en riesgo la integridad de las personas. Trabajamos con permisos de trabajo, análisis de riesgo y cultura de stop-work authority.',
    descEn: 'No job justifies putting people at risk. We operate with work permits, risk analysis and a stop-work authority culture.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    color: '#6CAE52',
    titleEs: 'Innovación aplicada',
    titleEn: 'Applied innovation',
    descEs: 'Resolvemos desafíos técnicos reales: desde sísmica 3D en zonas remotas hasta optimización de inyección de agua con machine learning.',
    descEn: 'We solve real technical challenges: from 3D seismic in remote areas to waterflood optimisation with machine learning.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    color: '#2FA08A',
    titleEs: 'Equipo diverso',
    titleEn: 'Diverse team',
    descEs: 'Nuestro equipo combina trayectorias locales e internacionales en geología, ingeniería, finanzas y ESG. Valoramos perspectivas distintas.',
    descEn: 'Our team combines local and international backgrounds in geology, engineering, finance and ESG. We value different perspectives.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: '#1F2566',
    titleEs: 'Impacto medible',
    titleEn: 'Measurable impact',
    descEs: 'Trabajamos con métricas claras: producción, costos, reservas, emisiones. Cada área tiene objetivos cuantificables y visibility en los resultados de la compañía.',
    descEn: 'We work with clear metrics: production, costs, reserves, emissions. Every area has quantifiable goals and visibility into company results.',
  },
]

const OPEN_POSITIONS = [
  { area: 'Ingeniería de yacimientos', location: 'Buenos Aires / Chubut', type: 'Full-time' },
  { area: 'Geología & geofísica', location: 'Buenos Aires / Mendoza', type: 'Full-time' },
  { area: 'HSE & ESG Coordinator', location: 'Buenos Aires', type: 'Full-time' },
  { area: 'Finance & IR Analyst', location: 'Buenos Aires', type: 'Full-time' },
]

export default function CarrerasPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <span><span className="lang-es">Carreras</span><span className="lang-en">Careers</span></span>
          </div>
          <span className="eyebrow">
            <span className="lang-es">Sumate al equipo</span>
            <span className="lang-en">Join the team</span>
          </span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Construimos el futuro<br/>del energético argentino.</span>
            <span className="lang-en">Building Argentina&apos;s<br/>energy future.</span>
          </h1>
          <p>
            <span className="lang-es">Crown Point opera en cuatro cuencas. Buscamos profesionales que quieran dejar huella en la industria energética con un equipo técnico de alto nivel.</span>
            <span className="lang-en">Crown Point operates across four basins. We look for professionals who want to make a mark in the energy industry alongside a top-tier technical team.</span>
          </p>
        </div>
      </section>

      <style>{`
        .safety-banner { background: linear-gradient(135deg, #C9A24A 0%, #B38828 100%); color: #fff; padding: var(--s-10) var(--s-12); border-radius: var(--r-xl); display: flex; gap: var(--s-8); align-items: center; margin-bottom: var(--s-16); }
        .safety-icon { width: 64px; height: 64px; background: rgba(255,255,255,0.18); border-radius: var(--r-lg); display: grid; place-items: center; flex-shrink: 0; }
        .safety-banner h2 { font-size: 28px; font-family: var(--font-display); letter-spacing: -0.02em; margin: 0 0 8px; color: #fff; }
        .safety-banner p { font-size: 15px; line-height: 1.6; margin: 0; opacity: 0.88; max-width: 56ch; }
        .culture-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-5); margin-top: var(--s-8); }
        @media (max-width: 900px) { .culture-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .culture-grid { grid-template-columns: 1fr; } .safety-banner { flex-direction: column; gap: var(--s-4); padding: var(--s-6); } }
        .culture-card { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-lg); padding: var(--s-6); display: flex; flex-direction: column; gap: var(--s-3); }
        .culture-card-icon { width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center; margin-bottom: 4px; }
        .culture-card h3 { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        .culture-card p { font-size: 13px; color: var(--fg-soft); line-height: 1.65; margin: 0; }
        .positions-list { display: grid; gap: 4px; margin-top: var(--s-6); }
        .position-row { display: grid; grid-template-columns: 1fr auto auto; gap: var(--s-4); align-items: center; padding: 14px 18px; background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-md); transition: border-color var(--t-fast), background var(--t-fast); }
        .position-row:hover { border-color: var(--accent); background: var(--bg-alt); }
        .position-area { font-size: 15px; font-weight: 500; color: var(--fg); }
        .position-location { font-size: 12px; color: var(--fg-muted); }
        .position-type { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 10px; border-radius: var(--r-pill); background: rgba(108,174,82,0.12); color: var(--cp-green-deep); }
        [data-theme="dark"] .position-type { color: #8BD478; }
        .careers-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: var(--s-12); align-items: start; }
        @media (max-width: 860px) { .careers-grid { grid-template-columns: 1fr; } }
      `}</style>

      <section className="section">
        <div className="container">
          {/* Safety first banner */}
          <div className="safety-banner">
            <div className="safety-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2>
                <span className="lang-es">Seguridad: nuestra prioridad #1</span>
                <span className="lang-en">Safety: our #1 priority</span>
              </h2>
              <p>
                <span className="lang-es">Operamos con los más altos estándares HSE de la industria. Todo colaborador tiene la autoridad y la obligación de detener cualquier operación que considere insegura. TRIR 2024: 0.87 — por debajo del promedio de la industria.</span>
                <span className="lang-en">We operate to the highest industry HSE standards. Every person has both the authority and the obligation to stop any operation they consider unsafe. 2024 TRIR: 0.87 — below industry average.</span>
              </p>
            </div>
          </div>

          {/* Culture values */}
          <span className="eyebrow">
            <span className="lang-es">Nuestra cultura</span>
            <span className="lang-en">Our culture</span>
          </span>
          <h2 style={{ fontSize: 'clamp(28px, 3.2vw, 40px)', letterSpacing: '-0.02em', marginTop: 8 }}>
            <span className="lang-es">Por qué trabajar en Crown Point.</span>
            <span className="lang-en">Why work at Crown Point.</span>
          </h2>
          <div className="culture-grid">
            {CULTURE_CARDS.map((c, i) => (
              <div className="culture-card" key={i}>
                <div className="culture-card-icon" style={{ background: `${c.color}18`, color: c.color }}>
                  {c.icon}
                </div>
                <h3>
                  <span className="lang-es">{c.titleEs}</span>
                  <span className="lang-en">{c.titleEn}</span>
                </h3>
                <p>
                  <span className="lang-es">{c.descEs}</span>
                  <span className="lang-en">{c.descEn}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="careers-grid">
            {/* Open positions */}
            <div>
              <span className="eyebrow">
                <span className="lang-es">Búsquedas activas</span>
                <span className="lang-en">Open positions</span>
              </span>
              <h2 style={{ fontSize: 'clamp(26px, 2.8vw, 36px)', letterSpacing: '-0.02em', marginTop: 8 }}>
                <span className="lang-es">Posiciones abiertas</span>
                <span className="lang-en">Current openings</span>
              </h2>
              <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6, marginBottom: 0 }}>
                <span className="lang-es">Posiciones permanentes. Para pasantías o prácticas profesionales, mencionalo en el formulario.</span>
                <span className="lang-en">Permanent positions. For internships or traineeships, note it in the form.</span>
              </p>
              <div className="positions-list">
                {OPEN_POSITIONS.map((pos, i) => (
                  <div className="position-row" key={i}>
                    <span className="position-area">{pos.area}</span>
                    <span className="position-location">{pos.location}</span>
                    <span className="position-type">{pos.type}</span>
                  </div>
                ))}
                <div style={{ padding: '12px 18px', fontSize: 13, color: 'var(--fg-muted)', borderTop: '1px solid var(--rule)', marginTop: 4 }}>
                  <span className="lang-es">¿No encontrás tu perfil? Enviá una postulación espontánea →</span>
                  <span className="lang-en">Don&apos;t see your profile? Send a spontaneous application →</span>
                </div>
              </div>
            </div>

            {/* Application form */}
            <div>
              <span className="eyebrow">
                <span className="lang-es">Postulate</span>
                <span className="lang-en">Apply</span>
              </span>
              <h2 style={{ fontSize: 'clamp(26px, 2.8vw, 36px)', letterSpacing: '-0.02em', marginTop: 8, marginBottom: 'var(--s-6)' }}>
                <span className="lang-es">Contactá con RRHH</span>
                <span className="lang-en">Contact HR</span>
              </h2>
              <ApplicationForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

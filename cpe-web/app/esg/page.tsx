import Link from 'next/link'
import { getCmsState } from '@/lib/cms'
import { cmsLineBreaks } from '@/lib/cms-html'
import { fetchEsgPillars } from '@/lib/content-fetch'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

type PoliticaDoc = {
  id: string
  titulo_es: string
  titulo_en: string
  storage_path: string
  file_name: string
}

export const revalidate = 60

const ESG_ICONS: Record<string, React.ReactNode> = {
  ambiental: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M7 10c.5-1 1.5-2 3-2m7 2c-.5-1-1.5-2-3-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  social: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  gobernanza: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
    </svg>
  ),
}

export const metadata = {
  title: 'ESG / Políticas | Crown Point Energy',
  description: 'Responsabilidad ambiental, social y de gobierno corporativo de Crown Point Energy, y políticas corporativas públicas.',
  alternates: { canonical: 'https://crownpointenergy.com/esg' },
}

export default async function EsgPage() {
  const db = createSupabaseServerAdminClient()
  const [s, pillars, politicasRes] = await Promise.all([
    getCmsState(),
    fetchEsgPillars(),
    db.from('documentos')
      .select('id,titulo_es,titulo_en,storage_path,file_name')
      .eq('tipo', 'politica')
      .eq('publico', true)
      .order('titulo_es'),
  ])
  const politicas = (politicasRes.data ?? []) as PoliticaDoc[]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const f = s.fields
  const fe = s.fieldsEn
  const heroImg = f['hero.esg.img'] || ''

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
            <span>ESG</span>
          </div>
          <span className="eyebrow">
            <span className="lang-es">Responsabilidad corporativa</span>
            <span className="lang-en">Corporate responsibility</span>
          </span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es" dangerouslySetInnerHTML={{ __html: cmsLineBreaks(f['page.esg.h1'] || 'Operar bien.<br/>Reportar con claridad.') }} />
            <span className="lang-en" dangerouslySetInnerHTML={{ __html: cmsLineBreaks(fe['page.esg.h1'] || 'Operate responsibly.<br/>Report with clarity.') }} />
          </h1>
          <p>
            <span className="lang-es">{f['page.esg.lede'] || 'Nuestra estrategia ESG integra la responsabilidad ambiental, el compromiso social y la gobernanza robusta como pilares de creación de valor a largo plazo.'}</span>
            <span className="lang-en">{fe['page.esg.lede'] || 'Our ESG strategy integrates environmental responsibility, social commitment and robust governance as pillars of long-term value creation.'}</span>
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
        .esg-frameworks { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-8); text-align: center; }
        @media (max-width: 720px) { .esg-kpi-strip { grid-template-columns: repeat(2, 1fr); } .esg-metrics { grid-template-columns: 1fr; } .esg-frameworks { grid-template-columns: 1fr; gap: var(--s-4); text-align: left; } }
      `}</style>

      {/* KPI strip */}
      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <div className="esg-kpi-strip reveal">
            {[
              { val: f['esg.kpi.emissions'] || '−18%',   labelEs: 'Reducción emisiones vs 2022',  labelEn: 'Emissions reduction vs 2022' },
              { val: f['esg.kpi.water']     || '94%',    labelEs: 'Agua reinyectada',              labelEn: 'Water reinjected' },
              { val: f['esg.kpi.trir']      || '0.87',   labelEs: 'TRIR seguridad 2024',           labelEn: 'Safety TRIR 2024' },
              { val: f['esg.kpi.directors'] || '4/5',    labelEs: 'Directores independientes',     labelEn: 'Independent directors' },
            ].map((k, i) => (
              <div className="kpi" key={i} style={{ minHeight: 120 }}>
                <span className="kpi-label">
                  <span className="lang-es">{k.labelEs}</span>
                  <span className="lang-en">{k.labelEn}</span>
                </span>
                <div><span className="kpi-value num" style={{ fontSize: 40 }}>{k.val}</span></div>
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
            {pillars.map((p, pi) => (
              <div className={`esg-pillar reveal reveal-d${pi + 1}`} key={p.pilar}>
                <div className="esg-pillar-head">
                  <div className="esg-pillar-icon" style={{ background: `${p.color}22`, color: p.color }}>
                    {ESG_ICONS[p.pilar] ?? null}
                  </div>
                  <h3 style={{ color: p.color }}>
                    <span className="lang-es">{p.pilar.charAt(0).toUpperCase() + p.pilar.slice(1)}</span>
                    <span className="lang-en">{p.pilar === 'ambiental' ? 'Environmental' : p.pilar === 'social' ? 'Social' : 'Governance'}</span>
                  </h3>
                  <p className="lede">
                    <span className="lang-es">{p.lede_es}</span>
                    <span className="lang-en">{p.lede_en}</span>
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
                    {p.initiatives_es.map((item, i) => (
                      <li key={i}>
                        <span className="lang-es">{item}</span>
                        <span className="lang-en">{p.initiatives_en[i] ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Políticas corporativas */}
      {politicas.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--rule)' }}>
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow"><span className="lang-es">Cumplimiento</span><span className="lang-en">Compliance</span></span>
                <h2 className="section-title" style={{ marginTop: 8 }}>
                  <span className="lang-es">Políticas corporativas.</span>
                  <span className="lang-en">Corporate policies.</span>
                </h2>
              </div>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {politicas.map(doc => (
                <li key={doc.id}>
                  <a
                    href={`${supabaseUrl}/storage/v1/object/public/documents/${doc.storage_path}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '16px 20px', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)',
                      textDecoration: 'none', color: 'var(--fg)', background: 'var(--surface)',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--accent)' }}>
                      <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      <span className="lang-es">{doc.titulo_es}</span>
                      <span className="lang-en">{doc.titulo_en || doc.titulo_es}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Reporting & frameworks */}
      <section className="section-tight" style={{ borderTop: '1px solid var(--rule)', background: 'var(--bg-alt)' }}>
        <div className="container">
          <div className="esg-frameworks">
            {[
              { name: 'SASB', descEs: 'Petroleum & Gas Integrated — Oil & Gas Exploration & Production', descEn: 'Petroleum & Gas Integrated — Oil & Gas E&P' },
              { name: 'TCFD', descEs: 'Recomendaciones para divulgación de riesgos climáticos financieros', descEn: 'Recommendations for climate-related financial risk disclosure' },
              { name: 'NI 51-101', descEs: 'Canadian Securities Administrators — estándar de reservas de petróleo y gas', descEn: 'Canadian Securities Administrators — oil & gas reserves standard' },
            ].map(fr => (
              <div key={fr.name} style={{ padding: 'var(--s-6)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>{fr.name}</div>
                <p style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0 }}>
                  <span className="lang-es">{fr.descEs}</span>
                  <span className="lang-en">{fr.descEn}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

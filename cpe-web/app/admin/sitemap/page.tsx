'use client'

import { SITE_SECTIONS, AREA_LABELS, AREA_ORDER, type SiteArea } from '@/lib/site-sections'

const AREA_COLORS: Record<SiteArea, string> = {
  public:    '#1F2566',
  portal:    '#2563a8',
  admin:     '#6cae52',
  biblioteca: '#9a6f00',
}

const ROLE_LABELS: Record<string, string> = {
  viewer:     'Consulta',
  uploader:   'Carga',
  admin:      'Admin',
  rrhh:       'RRHH',
  accionista: 'Accionista',
}

export default function SitemapPage() {
  const byArea = AREA_ORDER.map(area => ({
    area,
    sections: SITE_SECTIONS.filter(s => s.area === area),
  }))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px' }}>
      <style>{`
        @media print {
          /* Hide sidebar, topbar, buttons */
          nav, aside, header, .admin-sidebar, [class*="sidebar"], [class*="Shell"] > *:first-child { display: none !important; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          /* Full width on print */
          div[style*="max-width"] { max-width: 100% !important; margin: 0 !important; padding: 12px !important; }
          /* Force colors visible on paper */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Avoid page breaks inside rows */
          tr, div[style*="grid-template-columns"] { break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 4px' }}>
            Admin
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Sitemap
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
            Todas las secciones del sistema · {SITE_SECTIONS.length} rutas en total.
            Para agregar una nueva, editá <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-alt)', padding: '1px 6px', borderRadius: 4 }}>lib/site-sections.ts</code>.
          </p>
        </div>
        <button
          className="btn no-print"
          onClick={() => window.print()}
          style={{ padding: '9px 18px', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
          </svg>
          Exportar PDF
        </button>
      </div>

      {/* Areas */}
      <div style={{ display: 'grid', gap: 32 }}>
        {byArea.map(({ area, sections }) => (
          <div key={area}>
            {/* Area header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: AREA_COLORS[area], flexShrink: 0 }} />
              <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg)', margin: 0 }}>
                {AREA_LABELS[area]}
              </h2>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>({sections.length})</span>
            </div>

            {/* Sections table */}
            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              {sections.map((s, i) => (
                <div key={s.path} style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr auto',
                  gap: 0,
                  borderBottom: i < sections.length - 1 ? '1px solid var(--rule)' : 'none',
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)',
                }}>
                  {/* Path + label */}
                  <div style={{ padding: '14px 16px', borderRight: '1px solid var(--rule)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>
                      {s.label}
                    </div>
                    <code style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                      {s.path}
                    </code>
                  </div>

                  {/* Description */}
                  <div style={{ padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, color: 'var(--fg)', margin: '0 0 6px', lineHeight: 1.5 }}>
                      {s.description}
                    </p>
                    {s.notes && (
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0, fontStyle: 'italic' }}>
                        ℹ {s.notes}
                      </p>
                    )}
                  </div>

                  {/* Roles */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', justifyContent: 'center', borderLeft: '1px solid var(--rule)', minWidth: 110 }}>
                    {s.roles ? (
                      s.roles.map(r => (
                        <span key={r} style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase', padding: '2px 7px',
                          borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap',
                          background: r === 'admin' ? 'rgba(108,174,82,0.15)' : 'var(--bg-alt)',
                          color: r === 'admin' ? 'var(--cp-green-deep)' : 'var(--fg-muted)',
                          border: '1px solid',
                          borderColor: r === 'admin' ? 'rgba(108,174,82,0.3)' : 'var(--rule)',
                        }}>
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Público</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

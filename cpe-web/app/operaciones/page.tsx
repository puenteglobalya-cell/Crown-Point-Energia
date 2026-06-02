import Link from 'next/link'
import MapSection from './MapSection'
import type { MapBlockData } from '@/components/ArgentinaMapInteractive'
import { getCmsState } from '@/lib/cms'
import { fetchOperationsBlocks } from '@/lib/content-fetch'

export const revalidate = 60

type Commodity = 'oil' | 'gas' | 'mixed'
const COMMODITY: Record<Commodity, { color: string; es: string; en: string }> = {
  oil:   { color: '#E2B23A', es: 'Petróleo',       en: 'Oil' },
  gas:   { color: '#2FA08A', es: 'Gas natural',     en: 'Natural gas' },
  mixed: { color: '#6CAE52', es: 'Petróleo + Gas',  en: 'Oil + Gas' },
}

export default async function OperacionesPage() {
  const [s, blocks] = await Promise.all([
    getCmsState(),
    fetchOperationsBlocks(),
  ])

  const f = s.fields
  const fe = s.fieldsEn
  const heroImg = f['hero.operaciones.img'] || ''

  const mapBlocks: MapBlockData[] = blocks.map(b => ({
    id: b.slug,
    title: b.titulo,
    eyebrow: b.eyebrow,
    commodity: b.commodity,
    stats: b.map_stats.map(stat => [
      { es: stat.label_es, en: stat.label_en },
      stat.val,
    ] as [{ es: string; en: string }, string]),
  }))

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
            <span><span className="lang-es">Operaciones</span><span className="lang-en">Operations</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es">Operaciones</span><span className="lang-en">Operations</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es" dangerouslySetInnerHTML={{ __html: f['page.operaciones.h1'] || 'Seis bloques.<br/>Cuatro cuencas.<br/>Un país.' }} />
            <span className="lang-en" dangerouslySetInnerHTML={{ __html: fe['page.operaciones.h1'] || 'Six blocks.<br/>Four basins.<br/>One country.' }} />
          </h1>
          <p>
            <span className="lang-es">{f['page.operaciones.lede'] || 'Una cartera diversificada de áreas productivas y exploratorias, distribuidas estratégicamente entre el norte y el sur de Argentina.'}</span>
            <span className="lang-en">{fe['page.operaciones.lede'] || 'A diversified portfolio of producing and exploration areas, strategically distributed across northern and southern Argentina.'}</span>
          </p>
        </div>
      </section>

      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <div className="kpi-grid">
            {[
              { labelEs: 'Hectáreas operadas', labelEn: 'Operated acreage',
                val: f['ops.kpi.acreage'] || '372k', unit: 'ha',
                metaEs: `${blocks.length} bloques`, metaEn: `${blocks.length} blocks` },
              { labelEs: 'Pozos productores', labelEn: 'Producing wells',
                val: f['ops.kpi.wells'] || '357', unitEs: 'activos', unitEn: 'active',
                metaEs: f['ops.kpi.wells.meta'] || '+83 inyectores en operación',
                metaEn: fe['ops.kpi.wells.meta'] || '+83 injectors in operation' },
              { labelEs: 'Producción promedio', labelEn: 'Average production',
                val: f['ops.kpi.production'] || '3,090', unit: 'boe/d',
                meta: f['ops.kpi.production.meta'] || 'Q1 2026 · neto' },
              { labelEs: 'Mix producción', labelEn: 'Production mix',
                val: f['ops.kpi.mix'] || '54/46', unitEs: 'gas / líquidos', unitEn: 'gas / liquids',
                metaEs: 'Balance gas/oil', metaEn: 'Gas/oil balance' },
            ].map((k, i) => (
              <div className="kpi" key={i}>
                <span className="kpi-label"><span className="lang-es">{k.labelEs}</span><span className="lang-en">{k.labelEn}</span></span>
                <div>
                  <span className="kpi-value num">{k.val}</span>
                  {k.unit && <span className="kpi-unit">{k.unit}</span>}
                  {k.unitEs && <span className="kpi-unit"><span className="lang-es">{k.unitEs}</span><span className="lang-en">{k.unitEn}</span></span>}
                </div>
                <span className="kpi-meta">
                  {k.meta && k.meta}
                  {k.metaEs && <><span className="lang-es">{k.metaEs}</span><span className="lang-en">{k.metaEn}</span></>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="two-col">
            <aside className="left-rail">
              <h4><span className="lang-es">Bloques</span><span className="lang-en">Blocks</span></h4>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5, margin: '4px 0 12px' }}>
                <span className="lang-es">{blocks.length} bloques · {blocks.reduce((acc, b) => acc + (Array.isArray((b as any).concesiones) ? (b as any).concesiones.length : 1), 0) || 9} concesiones agrupadas</span>
                <span className="lang-en">{blocks.length} blocks · 9 grouped concessions</span>
              </p>
              <nav>
                <a href="#mapa" className="active"><span className="lang-es">Mapa general</span><span className="lang-en">Map overview</span></a>
                {blocks.map(b => <a href={`#${b.slug}`} key={b.slug}>{b.titulo}</a>)}
              </nav>
            </aside>
            <main>
              <div className="section-block" id="mapa">
                <span className="eyebrow"><span className="lang-es">Mapa de operaciones</span><span className="lang-en">Operations map</span></span>
                <h2 style={{ marginTop: 8 }}><span className="lang-es">Dónde operamos.</span><span className="lang-en">Where we operate.</span></h2>
                <p className="lede">
                  <span className="lang-es">Nuestros bloques se distribuyen entre Mendoza, Chubut, Santa Cruz y Tierra del Fuego, en cuatro cuencas históricamente productoras.</span>
                  <span className="lang-en">Our blocks span Mendoza, Chubut, Santa Cruz and Tierra del Fuego across four historically producing basins.</span>
                </p>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: 'var(--s-6) var(--s-4)', marginTop: 'var(--s-6)', overflow: 'hidden' }}>
                  <MapSection blocks={mapBlocks} style={{ maxHeight: 760, margin: '0 auto' }} />
                </div>
              </div>

              {blocks.map((b, bi) => {
                const comm = COMMODITY[b.commodity]
                return (
                  <div className="section-block" id={b.slug} key={b.slug}>
                    <span className="eyebrow">{b.eyebrow}</span>
                    <h2 style={{ marginTop: 8 }}>{b.titulo}</h2>
                    <p className="lede">
                      <span className="lang-es">{b.lede_es}</span>
                      <span className="lang-en">{b.lede_en}</span>
                    </p>
                    <div className="block-card" style={{ borderTop: `3px solid ${comm.color}` }}>
                      <header className="block-card-hd">
                        <h3>
                          <span className="lang-es">{b.card_title_es}</span>
                          <span className="lang-en">{b.card_title_en}</span>
                        </h3>
                        <div className="chips">
                          <span className="chip" style={{ background: `${comm.color}20`, color: comm.color, fontWeight: 600 }}>
                            <span className="lang-es">{comm.es}</span>
                            <span className="lang-en">{comm.en}</span>
                          </span>
                          {b.chips.map((chip, ci) => (
                            <span className="chip" key={ci}>{chip}</span>
                          ))}
                        </div>
                      </header>
                      <div className="block-card-body">
                        <div>
                          {b.body_es.map((para, pi) => (
                            <p key={pi}>
                              <span className="lang-es">{para}</span>
                              <span className="lang-en">{b.body_en[pi] ?? ''}</span>
                            </p>
                          ))}
                        </div>
                        <div className="block-stats">
                          {b.stats.map((stat, si) => (
                            <div key={si}>
                              <span>
                                <span className="lang-es">{stat.label_es}</span>
                                <span className="lang-en">{stat.label_en}</span>
                              </span>
                              <span>{stat.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {blocks.length === 0 && (
                <div className="section-block">
                  <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                    <span className="lang-es">Sin bloques registrados.</span>
                    <span className="lang-en">No blocks registered.</span>
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </>
  )
}

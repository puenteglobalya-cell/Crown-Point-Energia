import Link from 'next/link'
import Image from 'next/image'
import MapSection from './MapSection'
import type { MapBlockData } from '@/components/ArgentinaMapInteractive'
import { getCmsState } from '@/lib/cms'
import { cmsLineBreaks } from '@/lib/cms-html'
import { fetchOperationsBlocks, sumWellsFromBlocks } from '@/lib/content-fetch'
import ScrollSpy from '@/components/ScrollSpy'

export const revalidate = 60

// Display order per section
const EXPLOTACION_ORDER = ['tordillo', 'piedra', 'chanares', 'tdf']
const EXPLORACION_SLUGS = new Set(['cerro'])

type Commodity = 'oil' | 'gas' | 'mixed'
const COMMODITY: Record<Commodity, { color: string; es: string; en: string }> = {
  oil:   { color: '#1F2566', es: 'Petróleo',       en: 'Oil' },
  gas:   { color: '#4a8a3a', es: 'Gas natural',     en: 'Natural gas' },
  mixed: { color: '#6CAE52', es: 'Petróleo + Gas',  en: 'Oil + Gas' },
}

export const metadata = {
  title: 'Operaciones | Crown Point Energy',
  description: '11 concesiones agrupadas en 6 bloques operativos, en cuatro cuencas argentinas — Austral, San Jorge, Neuquén y Cuyo. Producción de petróleo y gas.',
  alternates: { canonical: 'https://crownpointenergy.com/operaciones' },
}

export default async function OperacionesPage() {
  const [s, allBlocks] = await Promise.all([
    getCmsState(),
    fetchOperationsBlocks(),
  ])

  const wells = sumWellsFromBlocks(allBlocks)

  // Split and sort into two groups
  const explotacionBlocks = EXPLOTACION_ORDER
    .map(slug => allBlocks.find(b => b.slug === slug))
    .filter(Boolean) as typeof allBlocks
  const exploracionBlocks = allBlocks.filter(b => EXPLORACION_SLUGS.has(b.slug))
  // Any blocks not in either group fall through to explotación at the end
  const knownSlugs = new Set([...EXPLOTACION_ORDER, ...EXPLORACION_SLUGS])
  const otherBlocks = allBlocks.filter(b => !knownSlugs.has(b.slug))
  const blocks = [...explotacionBlocks, ...otherBlocks, ...exploracionBlocks]

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
      <ScrollSpy />
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
            <span className="lang-es" dangerouslySetInnerHTML={{ __html: cmsLineBreaks(f['page.operaciones.h1'] || 'Once concesiones.<br/>Cuatro cuencas.<br/>Un país.') }} />
            <span className="lang-en" dangerouslySetInnerHTML={{ __html: cmsLineBreaks(fe['page.operaciones.h1'] || 'Eleven concessions.<br/>Four basins.<br/>One country.') }} />
          </h1>
          <p>
            <span className="lang-es">{f['page.operaciones.lede'] || 'Una cartera diversificada de áreas productivas y exploratorias, distribuidas estratégicamente entre el norte y el sur de Argentina.'}</span>
            <span className="lang-en">{fe['page.operaciones.lede'] || 'A diversified portfolio of producing assets with development and exploration upside, strategically distributed across central and southern Argentina.'}</span>
          </p>
        </div>
      </section>

      <section className="section-tight" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="container">
          <div className="kpi-grid">
            {[
              { labelEs: 'Hectáreas operadas', labelEn: 'Operated acreage',
                val: f['ops.kpi.acreage'] || '372k', unit: 'ha',
                metaEs: `${f['kpi.blocks.value'] || '11'} concesiones`, metaEn: `${f['kpi.blocks.value'] || '11'} concessions` },
              { labelEs: 'Pozos productores', labelEn: 'Producing wells',
                val: String(wells.activos), unitEs: 'activos', unitEn: 'active',
                metaEs: `+${wells.inyectores} inyectores en operación`,
                metaEn: `+${wells.inyectores} injectors in operation` },
              { labelEs: 'Producción promedio', labelEn: 'Average production',
                val: f['ops.kpi.production'] || '8,672', unit: 'boe/d',
                metaEs: f['ops.kpi.production.meta'] || 'Q1 2026 · neto',
                metaEn: fe['ops.kpi.production.meta'] || 'Q1 2026 · net' },
              { labelEs: 'Mix producción', labelEn: 'Production mix',
                val: f['ops.kpi.mix'] || '16/84', unitEs: 'gas / líquidos', unitEn: 'gas / liquids',
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
                <span className="lang-es">{blocks.length} bloques · 11 concesiones agrupadas</span>
                <span className="lang-en">{blocks.length} blocks · 11 grouped concessions</span>
              </p>
              <nav>
                <a href="#mapa" className="active"><span className="lang-es">Mapa general</span><span className="lang-en">Map overview</span></a>
                {explotacionBlocks.length > 0 && (
                  <span className="rail-section-label">
                    <span className="lang-es">Explotación</span>
                    <span className="lang-en">Production</span>
                  </span>
                )}
                {[...explotacionBlocks, ...otherBlocks].map(b => <a href={`#${b.slug}`} key={b.slug}>{b.titulo}</a>)}
                {exploracionBlocks.length > 0 && (
                  <span className="rail-section-label">
                    <span className="lang-es">Exploración</span>
                    <span className="lang-en">Exploration</span>
                  </span>
                )}
                {exploracionBlocks.map(b => <a href={`#${b.slug}`} key={b.slug}>{b.titulo}</a>)}
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

              {/* ── Explotación ─────────────────────────────────────── */}
              {[...explotacionBlocks, ...otherBlocks].length > 0 && (
                <div className="ops-section-header" id="explotacion">
                  <span className="eyebrow" style={{ color: 'var(--cp-green)' }}>
                    <span className="lang-es">Explotación</span>
                    <span className="lang-en">Production</span>
                  </span>
                  <h2 style={{ marginTop: 6 }}>
                    <span className="lang-es">Áreas productivas</span>
                    <span className="lang-en">Producing areas</span>
                  </h2>
                </div>
              )}

              {[...explotacionBlocks, ...otherBlocks].map((b) => {
                const comm = COMMODITY[b.commodity]
                const blockImg = f[`img.ops.${b.slug}`] || ''
                const blockMap = f[`img.ops.${b.slug}.map`] || ''
                return (
                  <div className="section-block" id={b.slug} key={b.slug}>
                    <span className="eyebrow">{b.eyebrow}</span>
                    <h2 style={{ marginTop: 8 }}>{b.titulo}</h2>
                    <p className="lede">
                      <span className="lang-es">{b.lede_es}</span>
                      <span className="lang-en">{b.lede_en}</span>
                    </p>

                    {/* Block media gallery — photo + map side by side when both exist */}
                    {(blockImg && blockMap) ? (
                      <div className="block-media-gallery">
                        <div className="block-media-item">
                          <Image
                            src={blockImg}
                            alt={f[`img.ops.${b.slug}.alt`] || b.titulo}
                            fill
                            sizes="(max-width: 700px) 100vw, 420px"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <figure className="block-media-item block-media-map">
                          <img
                            src={blockMap}
                            alt={f[`img.ops.${b.slug}.map.alt`] || `Mapa de ubicación · ${b.titulo}`}
                            loading="lazy"
                            decoding="async"
                          />
                          <figcaption>
                            <span className="lang-es">Mapa de ubicación</span>
                            <span className="lang-en">Location map</span>
                          </figcaption>
                        </figure>
                      </div>
                    ) : (
                      <>
                        {(blockImg || !blockMap) && <div className="block-photo">
                          {blockImg ? (
                            <Image
                              src={blockImg}
                              alt={f[`img.ops.${b.slug}.alt`] || b.titulo}
                              fill
                              sizes="(max-width: 900px) 100vw, 860px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="block-photo-placeholder">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                                <path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>
                                <span className="lang-es">Imagen pendiente · {b.titulo}</span>
                                <span className="lang-en">Pending image · {b.titulo}</span>
                              </span>
                            </div>
                          )}
                        </div>}
                        {blockMap && (
                          <figure style={{ margin: 'var(--s-4) 0 0' }}>
                            <img
                              src={blockMap}
                              alt={f[`img.ops.${b.slug}.map.alt`] || `Mapa de ubicación · ${b.titulo}`}
                              loading="lazy"
                              decoding="async"
                              style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid var(--rule)', display: 'block' }}
                            />
                            <figcaption style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                              <span className="lang-es">Mapa de ubicación</span>
                              <span className="lang-en">Location map</span>
                            </figcaption>
                          </figure>
                        )}
                      </>
                    )}

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

              {/* ── Exploración ─────────────────────────────────────── */}
              {exploracionBlocks.length > 0 && (
                <div className="ops-section-header" id="exploracion"
                  style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--s-8)', marginTop: 'var(--s-4)' }}
                >
                  <span className="eyebrow" style={{ color: 'var(--cp-bordeaux, #7a2a3a)' }}>
                    <span className="lang-es">Exploración</span>
                    <span className="lang-en">Exploration</span>
                  </span>
                  <h2 style={{ marginTop: 6 }}>
                    <span className="lang-es">Áreas exploratorias</span>
                    <span className="lang-en">Exploration areas</span>
                  </h2>
                </div>
              )}

              {exploracionBlocks.map((b) => {
                const comm = COMMODITY[b.commodity]
                const blockImg = f[`img.ops.${b.slug}`] || ''
                const blockMap = f[`img.ops.${b.slug}.map`] || ''
                return (
                  <div className="section-block" id={b.slug} key={b.slug}>
                    <span className="eyebrow">{b.eyebrow}</span>
                    <h2 style={{ marginTop: 8 }}>{b.titulo}</h2>
                    <p className="lede">
                      <span className="lang-es">{b.lede_es}</span>
                      <span className="lang-en">{b.lede_en}</span>
                    </p>

                    {(blockImg || !blockMap) && <div className="block-photo">
                      {blockImg ? (
                        <Image
                          src={blockImg}
                          alt={f[`img.ops.${b.slug}.alt`] || b.titulo}
                          fill
                          sizes="(max-width: 900px) 100vw, 860px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="block-photo-placeholder">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                            <path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>
                            <span className="lang-es">Imagen pendiente · {b.titulo}</span>
                            <span className="lang-en">Pending image · {b.titulo}</span>
                          </span>
                        </div>
                      )}
                    </div>}

                    {blockMap && (
                      <figure style={{ margin: 'var(--s-4) 0 0' }}>
                        <img
                          src={blockMap}
                          alt={f[`img.ops.${b.slug}.map.alt`] || `Mapa de ubicación · ${b.titulo}`}
                          loading="lazy"
                          decoding="async"
                          style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid var(--rule)', display: 'block' }}
                        />
                        <figcaption style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                          <span className="lang-es">Mapa de ubicación</span>
                          <span className="lang-en">Location map</span>
                        </figcaption>
                      </figure>
                    )}

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

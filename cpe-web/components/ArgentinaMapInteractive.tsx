'use client'

import { useState, type CSSProperties } from 'react'
import ArgentinaMap from './ArgentinaMap'

export type MapBlockData = {
  id: string
  title: string
  eyebrow: string
  commodity: 'oil' | 'gas' | 'mixed'
  stats: Array<[{ es: string; en: string } | string, string | { es: string; en: string }]>
}

const COMMODITY_LABEL: Record<MapBlockData['commodity'], { es: string; en: string; color: string }> = {
  oil:   { es: 'Petróleo',       en: 'Oil',       color: '#1F2566' },
  gas:   { es: 'Gas natural',    en: 'Natural gas', color: '#4a8a3a' },
  mixed: { es: 'Petróleo + Gas', en: 'Oil + Gas',  color: '#6CAE52' },
}

export default function ArgentinaMapInteractive({
  blocks,
  style,
}: {
  blocks: MapBlockData[]
  style?: CSSProperties
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeBlock = blocks.find(b => b.id === activeId) ?? null

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as Element).closest('[data-block]')
    const id = el?.getAttribute('data-block') ?? null
    setActiveId(prev => prev === id ? null : id)
  }

  const commodity = activeBlock ? COMMODITY_LABEL[activeBlock.commodity] : null

  return (
    <div>
      <style>{`
        .map-interactive [data-block] { cursor: pointer; }
        .map-interactive [data-block] ellipse { transition: opacity .15s, filter .15s; }
        .map-interactive [data-block]:hover ellipse { filter: brightness(1.15) !important; opacity: 1 !important; }
        .map-detail-panel { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-lg); padding: var(--s-6); margin-top: var(--s-4); animation: mapDetailIn .18s ease; }
        @keyframes mapDetailIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .map-detail-header { display: flex; justify-content: space-between; align-items: start; gap: 16px; margin-bottom: var(--s-4); }
        .map-detail-close { width: 28px; height: 28px; border-radius: var(--r-pill); border: 1px solid var(--rule); background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--fg-muted); flex-shrink: 0; }
        .map-detail-close:hover { border-color: var(--fg-muted); color: var(--fg); }
        .map-detail-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: var(--r-md); overflow: hidden; margin-top: var(--s-4); }
        .map-detail-stat { background: var(--surface); padding: 12px 16px; }
        .map-detail-stat-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-muted); font-weight: 600; margin-bottom: 4px; }
        .map-detail-stat-val { font-family: var(--font-mono); font-size: 15px; font-weight: 500; color: var(--fg); }
        .map-hint { font-size: 12px; color: var(--fg-muted); text-align: center; margin-top: var(--s-3); }
      `}</style>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 'var(--s-4)', fontSize: 12, color: 'var(--fg-soft)' }}>
        {(['oil', 'gas', 'mixed'] as const).map(t => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COMMODITY_LABEL[t].color, display: 'inline-block', flexShrink: 0 }}></span>
            <span className="lang-es">{COMMODITY_LABEL[t].es}</span>
            <span className="lang-en">{COMMODITY_LABEL[t].en}</span>
          </span>
        ))}
      </div>

      <div className="map-interactive" onClick={handleClick} style={style}>
        <ArgentinaMap />
      </div>

      <p className="map-hint">
        <span className="lang-es">Hacé clic en un bloque para ver detalles</span>
        <span className="lang-en">Click a block to view details</span>
      </p>

      {activeBlock && commodity && (
        <div className="map-detail-panel">
          <div className="map-detail-header">
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                <span style={{ color: commodity.color }}>{activeBlock.eyebrow}</span>
              </div>
              <h3 style={{ fontSize: 22, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', margin: 0 }}>
                {activeBlock.title}
              </h3>
              <span style={{
                display: 'inline-flex', marginTop: 8, alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                background: `${commodity.color}22`, color: commodity.color,
                padding: '3px 10px', borderRadius: 'var(--r-pill)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: commodity.color, display: 'inline-block' }}></span>
                <span className="lang-es">{commodity.es}</span>
                <span className="lang-en">{commodity.en}</span>
              </span>
            </div>
            <button
              className="map-detail-close"
              onClick={e => { e.stopPropagation(); setActiveId(null) }}
              aria-label="Cerrar"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="map-detail-stats">
            {activeBlock.stats.map(([label, val], i) => {
              const labelStr = typeof label === 'string' ? label : null
              const valStr = typeof val === 'string' ? val : null
              return (
                <div className="map-detail-stat" key={i}>
                  <div className="map-detail-stat-label">
                    {labelStr ?? (
                      <><span className="lang-es">{(label as { es: string }).es}</span><span className="lang-en">{(label as { en: string }).en}</span></>
                    )}
                  </div>
                  <div className="map-detail-stat-val">
                    {valStr ?? (
                      <><span className="lang-es">{(val as { es: string }).es}</span><span className="lang-en">{(val as { en: string }).en}</span></>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

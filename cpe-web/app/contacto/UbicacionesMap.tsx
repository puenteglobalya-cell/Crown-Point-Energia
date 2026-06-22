'use client'

import { useState } from 'react'

const LOCATIONS = [
  {
    id: 'sede',
    badge: 'Principal',
    name: 'Sede',
    address: 'Godoy Cruz 2769, Piso 4\nC1425FQK, Ciudad Autónoma\nde Buenos Aires, AR',
    lat: -34.5889,
    lon: -58.3974,
    zoom: 15,
    mapsQuery: 'Godoy+Cruz+2769+Buenos+Aires+Argentina',
  },
  {
    id: 'koluel',
    badge: null,
    name: 'Unidad de Gestión Golfo San Jorge (Koluel Kaike – Distrito IV)',
    address: 'Ruta Provincial 43, km. 87,6\nSanta Cruz, AR',
    lat: -45.814,
    lon: -67.717,
    zoom: 12,
    mapsQuery: 'Ruta+Provincial+43+km+87.6+Koluel+Kaike+Santa+Cruz+Argentina',
  },
  {
    id: 'piedra',
    badge: null,
    name: 'Unidad de Gestión Golfo San Jorge (Piedra Clavada)',
    address: 'Ruta Provincial 43, km. 102\nSanta Cruz, AR',
    lat: -46.008,
    lon: -67.790,
    zoom: 12,
    mapsQuery: 'Ruta+Provincial+43+km+102+Piedra+Clavada+Santa+Cruz+Argentina',
  },
  {
    id: 'tordillo',
    badge: null,
    name: 'Yacimiento El Tordillo',
    address: 'Ruta 26, km. 11 desvío El Tordillo\nComodoro Rivadavia, Chubut U9000, AR',
    lat: -45.795,
    lon: -67.544,
    zoom: 13,
    mapsQuery: 'Ruta+26+km+11+desvio+El+Tordillo+Comodoro+Rivadavia+Chubut+Argentina',
  },
] as const

function osmEmbedUrl(lat: number, lon: number, zoom: number) {
  const d = zoom <= 12 ? 0.4 : 0.015
  const bbox = `${lon - d}%2C${lat - d * 0.6}%2C${lon + d}%2C${lat + d * 0.6}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
}

export function UbicacionesMap() {
  const [active, setActive] = useState(0)
  const loc = LOCATIONS[active]

  return (
    <div className="ubicaciones-wrap">
      {/* List panel */}
      <div className="ubicaciones-list">
        <div className="ubicaciones-header">
          <span className="ubicaciones-title">
            <span className="lang-es">Ubicaciones ({LOCATIONS.length})</span>
            <span className="lang-en">Locations ({LOCATIONS.length})</span>
          </span>
          <a
            href="https://www.linkedin.com/company/crown-point-energia-sa"
            target="_blank"
            rel="noreferrer noopener"
            className="ubicaciones-linkedin"
            aria-label="LinkedIn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
              <circle cx="4" cy="4" r="2"/>
            </svg>
            LinkedIn
          </a>
        </div>

        <ul className="ubicaciones-ul">
          {LOCATIONS.map((l, i) => (
            <li key={l.id}>
              <button
                className={`ubicaciones-item${i === active ? ' ubicaciones-item--active' : ''}`}
                onClick={() => setActive(i)}
              >
                <div className="ubicaciones-item-inner">
                  {l.badge && (
                    <span className="ubicaciones-badge">{l.badge}</span>
                  )}
                  <strong className="ubicaciones-item-name">{l.name}</strong>
                  <span className="ubicaciones-item-addr">
                    {l.address.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < l.address.split('\n').length - 1 ? ', ' : ''}</span>
                    ))}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${l.mapsQuery}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="ubicaciones-directions"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="lang-es">Cómo llegar</span>
                    <span className="lang-en">Get directions</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Map panel */}
      <div className="ubicaciones-map">
        <iframe
          key={loc.id}
          src={osmEmbedUrl(loc.lat, loc.lon, loc.zoom)}
          title={loc.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ border: 0, width: '100%', height: '100%' }}
        />
      </div>

      <style>{`
        .ubicaciones-wrap {
          display: flex;
          border: 1px solid var(--rule);
          border-radius: var(--r-lg);
          overflow: hidden;
          min-height: 380px;
        }
        .ubicaciones-list {
          width: 300px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--rule);
          overflow-y: auto;
          background: var(--surface);
        }
        .ubicaciones-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 16px 18px 12px;
          border-bottom: 1px solid var(--rule);
        }
        .ubicaciones-title {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--fg);
        }
        .ubicaciones-linkedin {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: #0a66c2;
          text-decoration: none;
          padding: 4px 10px;
          border-radius: var(--r-sm, 6px);
          border: 1px solid rgba(10,102,194,.25);
          transition: background .15s;
          white-space: nowrap;
        }
        .ubicaciones-linkedin:hover {
          background: rgba(10,102,194,.08);
        }
        .ubicaciones-ul {
          list-style: none;
          margin: 0;
          padding: 0;
          flex: 1;
        }
        .ubicaciones-item {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          border-bottom: 1px solid var(--rule);
        }
        .ubicaciones-item:last-child { border-bottom: 0; }
        .ubicaciones-item-inner {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 14px 18px;
          border-left: 3px solid transparent;
          transition: background .12s, border-color .12s;
        }
        .ubicaciones-item:hover .ubicaciones-item-inner {
          background: var(--bg-alt, #f5f6fa);
        }
        .ubicaciones-item--active .ubicaciones-item-inner {
          border-left-color: var(--accent, #1F2566);
          background: var(--bg-alt, #f5f6fa);
        }
        .ubicaciones-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--fg-soft);
          background: var(--rule);
          border-radius: 4px;
          padding: 1px 6px;
          align-self: flex-start;
          margin-bottom: 2px;
        }
        .ubicaciones-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--fg);
          line-height: 1.45;
        }
        .ubicaciones-item-addr {
          font-size: 12px;
          color: var(--fg-soft);
          line-height: 1.5;
        }
        .ubicaciones-directions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent, #1F2566);
          text-decoration: none;
          align-self: flex-start;
        }
        .ubicaciones-directions:hover { text-decoration: underline; }
        .ubicaciones-map {
          flex: 1;
          min-height: 380px;
          background: #e8e8e8;
        }
        @media (max-width: 680px) {
          .ubicaciones-wrap { flex-direction: column; }
          .ubicaciones-list { width: 100%; border-right: none; border-bottom: 1px solid var(--rule); }
          .ubicaciones-map  { min-height: 260px; }
        }
      `}</style>
    </div>
  )
}

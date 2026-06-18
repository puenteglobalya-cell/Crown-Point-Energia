'use client'

import { useState } from 'react'

type SeRow = {
  id: string
  fecha_desde: string
  fecha_hasta: string
  scraped_at: string
  headers: string[]
  filas: Record<string, string>[]
  brent_ref: number | null
}

function isoToDisplay(iso: string) {
  // "2025-01-15" → "15/01/2025"
  if (!iso) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// DD/MM/AAAA expected by the API
function dateInputToApi(val: string) {
  // input[type=date] gives YYYY-MM-DD
  if (!val) return ''
  const [y, m, d] = val.split('-')
  return `${d}/${m}/${y}`
}

export default function ComercialClient({
  initialSe,
  isAdmin,
}: {
  initialSe: SeRow | null
  isAdmin: boolean
}) {
  const [se, setSe] = useState<SeRow | null>(initialSe)
  const [brentInput, setBrentInput] = useState(initialSe?.brent_ref?.toFixed(2) ?? '')

  // Admin sync form state
  const [syncDesde, setSyncDesde] = useState('')
  const [syncHasta, setSyncHasta] = useState('')
  const [syncBrent, setSyncBrent] = useState('')
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)

  // Identify the DDEE column (try common names from the SE website)
  const ddeeHeader = se?.headers.find(h =>
    /d\.?d\.?e\.?e/i.test(h) || /descuento/i.test(h)
  ) ?? null

  function parseDDEE(val: string): number | null {
    if (!val) return null
    const n = parseFloat(val.replace('%', '').replace(',', '.').trim())
    if (isNaN(n)) return null
    return n > 1 ? n / 100 : n
  }

  function calcPrecio(ddeeVal: string): string {
    const b = parseFloat(brentInput)
    if (isNaN(b)) return '—'
    const ddee = parseDDEE(ddeeVal)
    if (ddee === null) return '—'
    return ((b - 1) * (1 - ddee) / 0.97).toFixed(2)
  }

  async function handleSync() {
    if (!syncDesde || !syncHasta) {
      setSyncMsg('Completar fecha desde y hasta.')
      return
    }
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/admin/se/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaDesde: dateInputToApi(syncDesde),
          fechaHasta: dateInputToApi(syncHasta),
          brentRef: syncBrent ? parseFloat(syncBrent) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSyncMsg(`Error: ${data.error}`)
        setSyncing(false)
      } else {
        setSyncMsg(`OK — ${data.rows} filas importadas`)
        window.location.reload()
      }
    } catch {
      setSyncMsg('Error de red')
      setSyncing(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '7px 10px',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    background: 'var(--bg)',
    color: 'var(--fg)',
    outline: 'none',
  }

  return (
    <div>
      {/* ── Admin sync panel ── */}
      {isAdmin && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg)',
              borderBottom: showForm ? '1px solid var(--rule)' : 'none',
            }}
          >
            <span>Sincronizar datos SE</span>
            <span style={{ color: '#8e91b0', fontSize: 11 }}>{showForm ? '▲' : '▼'}</span>
          </button>

          {showForm && (
            <div style={{ padding: '16px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#8e91b0', fontWeight: 600 }}>Fecha desde</label>
                <input
                  type="date"
                  value={syncDesde}
                  onChange={e => setSyncDesde(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#8e91b0', fontWeight: 600 }}>Fecha hasta</label>
                <input
                  type="date"
                  value={syncHasta}
                  onChange={e => setSyncHasta(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#8e91b0', fontWeight: 600 }}>
                  Brent ref. (USD/bbl)
                  <span style={{ fontWeight: 400, marginLeft: 4 }}>opcional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ej: 82.50"
                  value={syncBrent}
                  onChange={e => setSyncBrent(e.target.value)}
                  style={{ ...inputStyle, width: 110 }}
                />
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{
                  padding: '7px 18px',
                  background: syncing ? 'var(--bg-alt)' : '#1F2566',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  opacity: syncing ? 0.7 : 1,
                  transition: 'opacity .15s',
                }}
              >
                {syncing ? 'Sincronizando…' : '↻ Sincronizar'}
              </button>
              {syncMsg && (
                <span style={{
                  fontSize: 12,
                  color: syncMsg.startsWith('Error') ? '#c0392b' : '#2C7A5B',
                  fontWeight: 600,
                }}>
                  {syncMsg}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── No data ── */}
      {!se ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#8e91b0', margin: 0 }}>
            No hay datos de referencia SE disponibles.
            {isAdmin && ' Usar el panel de sincronización para cargar datos.'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Meta strip */}
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ fontSize: 12, color: '#8e91b0' }}>
              <span>Período: </span>
              <strong style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                {isoToDisplay(se.fecha_desde)} – {isoToDisplay(se.fecha_hasta)}
              </strong>
              <span style={{ marginLeft: 16 }}>Actualizado: </span>
              <strong style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                {new Date(se.scraped_at).toLocaleDateString('es-AR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </strong>
              {se.brent_ref != null && (
                <span style={{ marginLeft: 16 }}>
                  Brent ref: <strong style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                    US$ {se.brent_ref.toFixed(2)}/bbl
                  </strong>
                </span>
              )}
            </div>

            {/* Live Brent input for formula */}
            {ddeeHeader && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#8e91b0' }}>Brent (USD/bbl):</span>
                <input
                  type="number"
                  step="0.01"
                  value={brentInput}
                  onChange={e => setBrentInput(e.target.value)}
                  placeholder="ej: 82.50"
                  style={{ ...inputStyle, width: 90, fontSize: 12 }}
                />
              </div>
            )}
          </div>

          {/* Formula chip */}
          {ddeeHeader && (
            <div style={{
              padding: '8px 18px',
              borderBottom: '1px solid var(--rule)',
              fontSize: 11,
              color: '#8e91b0',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-alt)',
            }}>
              Precio calc. = ((Brent − 1) × (1 − DDEE)) / 0.97
            </div>
          )}

          {/* Table */}
          {se.filas.length === 0 ? (
            <p style={{ padding: '20px 18px', fontSize: 13, color: '#8e91b0', margin: 0 }}>
              El scraping no devolvió filas de datos.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-alt)' }}>
                    {se.headers.map((h, i) => (
                      <th key={i} style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: 11,
                        color: '#8e91b0',
                        letterSpacing: '.04em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--rule)',
                      }}>
                        {h}
                      </th>
                    ))}
                    {ddeeHeader && (
                      <th style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 11,
                        color: '#1F2566',
                        letterSpacing: '.04em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--rule)',
                        background: 'rgba(31,37,102,.04)',
                      }}>
                        Precio calc.
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {se.filas.map((row, ri) => (
                    <tr
                      key={ri}
                      style={{ borderBottom: ri < se.filas.length - 1 ? '1px solid var(--rule)' : 'none' }}
                    >
                      {se.headers.map((h, ci) => (
                        <td key={ci} style={{
                          padding: '8px 12px',
                          color: 'var(--fg)',
                          fontFamily: h === se.headers[0] ? undefined : 'var(--font-mono)',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}>
                          {row[h] ?? '—'}
                        </td>
                      ))}
                      {ddeeHeader && (
                        <td style={{
                          padding: '8px 12px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#1F2566',
                          background: 'rgba(31,37,102,.03)',
                        }}>
                          {row[ddeeHeader] ? `US$ ${calcPrecio(row[ddeeHeader])}` : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

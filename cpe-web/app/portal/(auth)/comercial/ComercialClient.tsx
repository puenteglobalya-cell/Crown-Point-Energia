'use client'

import { useState, useMemo } from 'react'

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
  if (!iso) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function isoToMonthLabel(iso: string) {
  if (!iso) return iso
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

function dateInputToApi(val: string) {
  if (!val) return ''
  const [y, m, d] = val.split('-')
  return `${d}/${m}/${y}`
}

export default function ComercialClient({
  seList,
  isAdmin,
}: {
  seList: SeRow[]
  isAdmin: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(seList[0]?.id ?? null)
  const se = useMemo(() => seList.find(s => s.id === selectedId) ?? seList[0] ?? null, [seList, selectedId])

  const [brentInput, setBrentInput] = useState(seList[0]?.brent_ref?.toFixed(2) ?? '')
  const [soloAceites, setSoloAceites] = useState(true)

  // Sort state
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  // Admin sync form state — default to last 30 days
  const defaultHasta = new Date().toISOString().slice(0, 10)
  const defaultDesde = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)
  const [syncDesde, setSyncDesde] = useState(defaultDesde)
  const [syncHasta, setSyncHasta] = useState(defaultHasta)
  const [syncBrent, setSyncBrent] = useState('')
  const [syncing, setSyncing]     = useState(false)
  const [syncMsg, setSyncMsg]     = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)

  const syncRangeDays = syncDesde && syncHasta
    ? Math.round((new Date(syncHasta).getTime() - new Date(syncDesde).getTime()) / 86_400_000) + 1
    : 0
  const syncRangeError = syncRangeDays > 15 ? `El rango máximo es 15 días (seleccionaste ${syncRangeDays}).` : null

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

  function handleHeaderClick(h: string) {
    if (sortCol === h) {
      setSortDir(d => (d === 1 ? -1 : 1))
    } else {
      setSortCol(h)
      setSortDir(1)
    }
  }

  const filasVisible = useMemo(() => {
    if (!se) return []
    let rows = soloAceites
      ? se.filas.filter(row => Object.values(row).some(v => /aceites?\s+crudos/i.test(v)))
      : se.filas
    if (!sortCol) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      const an = parseFloat(av.replace(',', '.').replace('%', ''))
      const bn = parseFloat(bv.replace(',', '.').replace('%', ''))
      if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir
      return av.localeCompare(bv, 'es-AR') * sortDir
    })
  }, [se, soloAceites, sortCol, sortDir])

  function downloadCSV() {
    if (!se) return
    const cols = ddeeHeader ? [...se.headers, 'Precio calc.'] : se.headers
    const lines = [
      cols.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...filasVisible.map(row =>
        cols.map(h => {
          if (h === 'Precio calc.') {
            const v = ddeeHeader && row[ddeeHeader] ? calcPrecio(row[ddeeHeader]) : ''
            return v
          }
          return `"${(row[h] ?? '').replace(/"/g, '""')}"`
        }).join(',')
      ),
    ]
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `SE_Referencia_${se.fecha_desde}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSync() {
    if (!syncDesde || !syncHasta) {
      setSyncMsg('Completar fecha desde y hasta.')
      return
    }
    if (syncRangeError) {
      setSyncMsg(syncRangeError)
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

  const thBase: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: 11,
    color: '#8e91b0',
    letterSpacing: '.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--rule)',
    cursor: 'pointer',
    userSelect: 'none',
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
                <input type="date" value={syncDesde} onChange={e => setSyncDesde(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#8e91b0', fontWeight: 600 }}>Fecha hasta</label>
                <input type="date" value={syncHasta} onChange={e => setSyncHasta(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#8e91b0', fontWeight: 600 }}>
                  Brent ref. (USD/bbl)
                  <span style={{ fontWeight: 400, marginLeft: 4 }}>opcional</span>
                </label>
                <input
                  type="number" step="0.01" placeholder="ej: 82.50"
                  value={syncBrent} onChange={e => setSyncBrent(e.target.value)}
                  style={{ ...inputStyle, width: 110 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={handleSync} disabled={syncing || !!syncRangeError}
                  style={{
                    padding: '7px 18px',
                    background: (syncing || syncRangeError) ? 'var(--bg-alt)' : '#1F2566',
                    color: (syncing || syncRangeError) ? 'var(--fg-muted)' : '#fff',
                    border: '1px solid var(--rule)', borderRadius: 8,
                    fontSize: 13, fontWeight: 600,
                    cursor: (syncing || syncRangeError) ? 'not-allowed' : 'pointer',
                    opacity: (syncing || syncRangeError) ? 0.6 : 1, transition: 'opacity .15s',
                  }}
                >
                  {syncing ? 'Sincronizando…' : '↻ Sincronizar'}
                </button>
                <span style={{ fontSize: 10, color: syncRangeError ? '#c0392b' : '#8e91b0', fontWeight: syncRangeError ? 600 : 400 }}>
                  {syncRangeError ?? (syncRangeDays > 0 ? `${syncRangeDays} día${syncRangeDays !== 1 ? 's' : ''} · máx. 15` : 'máx. 15 días')}
                </span>
              </div>
              {syncMsg && (
                <span style={{ fontSize: 12, color: syncMsg.startsWith('Error') || syncMsg.startsWith('El rango') ? '#c0392b' : '#2C7A5B', fontWeight: 600 }}>
                  {syncMsg}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── No data ── */}
      {seList.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 12, padding: '32px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#8e91b0', margin: 0 }}>
            No hay datos de referencia SE disponibles.
            {isAdmin && ' Usar el panel de sincronización para cargar datos.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>

          {/* ── Period picker ── */}
          {seList.length > 1 && (
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--bg-alt)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8e91b0', textTransform: 'uppercase', letterSpacing: '.04em' }}>Período</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {seList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedId(s.id)
                      setBrentInput(s.brent_ref?.toFixed(2) ?? '')
                      setSortCol(null)
                    }}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 999, border: '1px solid',
                      cursor: 'pointer',
                      background: s.id === (se?.id) ? '#1F2566' : 'var(--surface)',
                      color: s.id === (se?.id) ? '#fff' : 'var(--fg-soft)',
                      borderColor: s.id === (se?.id) ? '#1F2566' : 'var(--rule)',
                      transition: 'all .15s',
                    }}
                  >
                    {isoToMonthLabel(s.fecha_desde)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Meta strip ── */}
          {se && (
            <div style={{
              padding: '12px 18px', borderBottom: '1px solid var(--rule)',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ fontSize: 12, color: '#8e91b0' }}>
                <span>Período: </span>
                <strong style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                  {isoToDisplay(se.fecha_desde)} – {isoToDisplay(se.fecha_hasta)}
                </strong>
                <span style={{ marginLeft: 16 }}>Actualizado: </span>
                <strong style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(se.scraped_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </strong>
                {se.brent_ref != null && (
                  <span style={{ marginLeft: 16 }}>
                    Brent ref: <strong style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                      US$ {se.brent_ref.toFixed(2)}/bbl
                    </strong>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* CSV export */}
                <button
                  onClick={downloadCSV}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 12px',
                    border: '1px solid var(--rule)', borderRadius: 6,
                    background: 'var(--surface)', color: 'var(--fg)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  ↓ Excel / CSV
                </button>

                {/* Live Brent input */}
                {ddeeHeader && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#8e91b0' }}>Brent (USD/bbl):</span>
                    <input
                      type="number" step="0.01" value={brentInput}
                      onChange={e => setBrentInput(e.target.value)}
                      placeholder="ej: 82.50"
                      style={{ ...inputStyle, width: 90, fontSize: 12 }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Formula chip ── */}
          {ddeeHeader && (
            <div style={{
              padding: '8px 18px', borderBottom: '1px solid var(--rule)',
              fontSize: 11, color: '#8e91b0', fontFamily: 'var(--font-mono)', background: 'var(--bg-alt)',
            }}>
              Precio calc. = ((Brent − 1) × (1 − DDEE)) / 0.97
            </div>
          )}

          {/* ── Table ── */}
          {!se || se.filas.length === 0 ? (
            <p style={{ padding: '20px 18px', fontSize: 13, color: '#8e91b0', margin: 0 }}>
              El scraping no devolvió filas de datos.
            </p>
          ) : (
            <div>
              {/* Filter + count bar */}
              <div style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--rule)', background: 'var(--bg-alt)', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSoloAceites(v => !v)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 12px',
                    borderRadius: 999, border: '1px solid', cursor: 'pointer',
                    background: soloAceites ? '#1F2566' : 'var(--surface)',
                    color: soloAceites ? '#fff' : 'var(--fg-soft)',
                    borderColor: soloAceites ? '#1F2566' : 'var(--rule)',
                    transition: 'all .15s',
                  }}
                >
                  Solo Aceites Crudos
                </button>
                <span style={{ fontSize: 11, color: '#8e91b0' }}>
                  {filasVisible.length} de {se.filas.length} filas
                </span>
                {sortCol && (
                  <button
                    onClick={() => setSortCol(null)}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--rule)', background: 'var(--surface)', color: '#8e91b0', cursor: 'pointer' }}
                  >
                    ✕ quitar orden
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-alt)' }}>
                      {se.headers.map((h, i) => (
                        <th
                          key={i}
                          onClick={() => handleHeaderClick(h)}
                          style={{
                            ...thBase,
                            color: sortCol === h ? '#1F2566' : '#8e91b0',
                          }}
                        >
                          {h}
                          {' '}
                          <span style={{ fontSize: 9, opacity: sortCol === h ? 1 : 0.3 }}>
                            {sortCol === h ? (sortDir === 1 ? '▲' : '▼') : '⇅'}
                          </span>
                        </th>
                      ))}
                      {ddeeHeader && (
                        <th style={{
                          ...thBase,
                          textAlign: 'right',
                          color: sortCol === '__precio' ? '#1F2566' : '#1F2566',
                          background: 'rgba(31,37,102,.04)',
                          cursor: 'default',
                        }}>
                          Precio calc.
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filasVisible.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{ borderBottom: ri < filasVisible.length - 1 ? '1px solid var(--rule)' : 'none' }}
                      >
                        {se.headers.map((h, ci) => (
                          <td key={ci} style={{
                            padding: '8px 12px',
                            color: 'var(--fg)',
                            fontFamily: ci === 0 ? undefined : 'var(--font-mono)',
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}>
                            {row[h] ?? '—'}
                          </td>
                        ))}
                        {ddeeHeader && (
                          <td style={{
                            padding: '8px 12px', textAlign: 'right',
                            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                            color: '#1F2566', background: 'rgba(31,37,102,.03)',
                          }}>
                            {row[ddeeHeader] ? `US$ ${calcPrecio(row[ddeeHeader])}` : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

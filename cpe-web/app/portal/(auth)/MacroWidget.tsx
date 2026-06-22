'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MacroPoint } from '@/app/api/macro/route'

type MacroData = {
  points: MacroPoint[]
  prevPoints?: MacroPoint[]
  hasHH: boolean
  hasBrent: boolean
  updatedAt: string
  prevUpdatedAt?: string
  source?: 'manual' | 'live'
}

// Brand color CSS vars — resolved to hex at runtime for Chart.js canvas API
const C_BRENT      = 'var(--cp-green-deep)'
const C_BRENT_FILL = 'var(--cp-green)'
const C_HH         = 'var(--cp-bordeaux)'
const C_HH_FILL    = 'var(--cp-bordeaux-fill)'

// Resolve a CSS var string like "var(--cp-foo)" to its computed hex value
function resolveCSSVar(varStr: string): string {
  if (typeof document === 'undefined') return varStr
  const m = varStr.match(/^var\((--[^)]+)\)$/)
  if (!m) return varStr
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || varStr
}

const WINTER_LABELS = ['Dic', 'Ene', 'Feb']
function isWinter(label: string) {
  return WINTER_LABELS.some(m => label.startsWith(m))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function winterBandPlugin(labels: string[]): any {
  return {
    id: 'winterBand',
    beforeDraw(chart: any) {  // eslint-disable-line @typescript-eslint/no-explicit-any
      const { ctx, chartArea, scales: { x } } = chart
      if (!x) return
      const winterIdx = labels.map((l, i) => isWinter(l) ? i : -1).filter(i => i >= 0)
      if (!winterIdx.length) return
      const step = x.getPixelForValue(1) - x.getPixelForValue(0)
      const half = step / 2
      const blueRgb = getComputedStyle(document.documentElement)
        .getPropertyValue('--cp-blue-rgb').trim() || '78, 126, 196'
      ctx.save()
      ctx.fillStyle = `rgba(${blueRgb},.07)`
      winterIdx.forEach((i: number) => {
        const x1 = x.getPixelForValue(i) - half
        ctx.fillRect(x1, chartArea.top, step, chartArea.bottom - chartArea.top)
      })
      if (winterIdx.length) {
        const mid = x.getPixelForValue(winterIdx[Math.floor(winterIdx.length / 2)])
        ctx.font = '600 9px var(--font-body,Inter,sans-serif)'
        ctx.fillStyle = `rgba(${blueRgb},.45)`
        ctx.textAlign = 'center'
        ctx.fillText('❄ invierno', mid, chartArea.top + 11)
      }
      ctx.restore()
    },
  }
}

function buildChartOptions(color: string, yLabel: string, decimals: number, showLegend = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: showLegend,
        labels: { font: { size: 10 }, usePointStyle: true, color: '#9490A8' },
      },
      tooltip: {
        backgroundColor: 'rgba(20,23,46,.93)',
        padding: 10,
        titleFont: { size: 11 },
        bodyFont:  { size: 12, family: 'var(--font-mono,monospace)' },
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `  ${ctx.parsed.y.toFixed(decimals)} ${yLabel}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,.04)' },
        ticks: { font: { size: 10 }, color: '#9490A8', maxRotation: 40 },
      },
      y: {
        grid: { color: 'rgba(0,0,0,.04)' },
        ticks: {
          font: { size: 10, family: 'var(--font-mono,monospace)' },
          color,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => `$${Number(v).toFixed(decimals === 2 ? 0 : 2)}`,
        },
      },
    },
  }
}

// ── Sub-component: single chart card ──────────────────────────────────────────
function MacroCard({
  eyebrow, title, points, valueKey, color, fillColor, yLabel, decimals,
  extraPlugins = [], note, prevPoints, prevDate,
}: {
  eyebrow: string
  title: string
  points: MacroPoint[]
  valueKey: 'hh' | 'brent'
  color: string
  fillColor: string
  yLabel: string
  decimals: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraPlugins?: any[]
  note?: React.ReactNode
  prevPoints?: MacroPoint[]
  prevDate?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inst = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current || !points.length) return
    import('chart.js/auto').then(({ default: Chart }) => {
      if (inst.current) { inst.current.destroy(); inst.current = null }

      // Resolve CSS vars to actual hex values for the canvas API
      const rc = resolveCSSVar(color)
      const rf = resolveCSSVar(fillColor)

      const labels   = points.map(p => p.label)
      const data     = points.map(p => p[valueKey] || null)
      const prevData = prevPoints?.map(p => p[valueKey] > 0 ? p[valueKey] : null) ?? []
      const hasPrev  = prevData.some(v => v != null)

      inst.current = new Chart(canvasRef.current!, {
        type: 'line',
        plugins: extraPlugins,
        data: {
          labels,
          datasets: [
            {
              label: 'Actual',
              data,
              borderColor: rf,
              backgroundColor: (ctx: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
                const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 185)
                g.addColorStop(0, rf + '28')
                g.addColorStop(1, rf + '04')
                return g
              },
              tension: 0.35,
              pointRadius: 3.5,
              pointHoverRadius: 5.5,
              pointBackgroundColor: rf,
              borderWidth: 2.5,
              fill: true,
            },
            ...(hasPrev ? [{
              label: prevDate ?? 'Anterior',
              data: prevData,
              borderColor: rf + '60',
              backgroundColor: 'transparent',
              borderDash: [5, 4],
              tension: 0.35,
              pointRadius: 0,
              borderWidth: 1.5,
              fill: false,
            }] : []),
          ],
        },
        options: buildChartOptions(rc, yLabel, decimals, hasPrev),
      })
    })
    return () => { if (inst.current) { inst.current.destroy(); inst.current = null } }
  }, [points, prevPoints, prevDate, valueKey, color, fillColor, yLabel, decimals, extraPlugins])

  const valid   = points.filter(p => p[valueKey] > 0)
  const m1      = valid[0]?.[valueKey] ?? 0
  const mN      = valid[valid.length - 1]?.[valueKey] ?? 0
  const diff    = mN - m1
  const m1Label = valid[0]?.label ?? ''
  const rc      = resolveCSSVar(color)

  return (
    <div className="macro-card">
      <div className="macro-card__eyebrow">{eyebrow}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: rc, letterSpacing: '-.01em' }}>
        {title}
      </div>
      <div className="macro-card__chart">
        <canvas ref={canvasRef} />
      </div>
      <div className="macro-card__footer">
        <div>
          <div className="macro-card__m1-label">M+1 ({m1Label})</div>
          <div className="macro-card__m1-value" style={{ color: rc }}>
            {m1.toFixed(decimals)}{' '}
            <span className="macro-card__m1-unit">{yLabel}</span>
          </div>
          <div className={`macro-card__delta ${diff >= 0 ? 'macro-card__delta--pos' : 'macro-card__delta--neg'}`}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(decimals)} vs M+12
          </div>
        </div>
        {note && <div className="macro-card__note">{note}</div>}
        <div className="macro-card__source">
          {valueKey === 'brent' ? 'Last price' : 'Prior Settle'}<br />
          {valueKey === 'brent' ? 'ICE.com' : 'CME Group'}
        </div>
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export function MacroWidget() {
  const [data, setData]       = useState<MacroData | null>(null)
  const [err,  setErr]        = useState(false)
  const [copied, setCopied]   = useState(false)
  const [showPrev, setShowPrev] = useState(false)

  useEffect(() => {
    fetch('/api/macro', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setErr(true))
  }, [])

  const handleExport = useCallback(() => {
    if (!data) return
    const valid = data.points.filter(p => p.brent > 0 || p.hh > 0)
    const rows = valid.map(p =>
      `<tr><td>${p.label}</td><td>${p.brent > 0 ? p.brent.toFixed(2) : '—'}</td><td>${p.hh > 0 ? p.hh.toFixed(3) : '—'}</td></tr>`
    ).join('')
    const stamp = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Macro CPE — ${stamp}</title>
<style>body{font-family:system-ui,sans-serif;padding:40px;color:#14172E}
h1{font-size:22px;margin-bottom:4px}p{color:#888;font-size:12px;margin-bottom:24px}
table{border-collapse:collapse;width:100%}
th{text-align:left;font-size:11px;padding:6px 12px;border-bottom:2px solid #ddd;color:#888}
td{padding:6px 12px;border-bottom:1px solid #eee}
.note{margin-top:16px;font-size:11px;padding:6px 12px;background:#EEF4FF;border-left:2px solid #4E7EC4}
@media print{body{padding:16px}}</style></head>
<body><h1>Macro — próximos 12 meses</h1>
<p>Crown Point Energía · ${stamp} · ICE Brent (Last) + Henry Hub (Prior Settle)</p>
<table><thead><tr><th>Mes</th><th>ICE Brent (USD/bbl)</th><th>Henry Hub (USD/MMBtu)</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="note">❄ Dic–Feb: precio de invierno — demanda estacional EEUU</p>
<script>setTimeout(()=>window.print(),400)<\/script></body></html>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = `macro-cpe-${new Date().toISOString().slice(0, 10)}.html`
    a.click()
  }, [data])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(window.location.origin + '/portal').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  if (err) return null

  const noData = data && !data.hasHH && !data.hasBrent
  const points = data?.points ?? []

  return (
    <section className="macro-section">
      {/* Header */}
      <div className="macro-header">
        <h2 className="macro-header__title">Macro — próximos 12 meses</h2>
        {data?.updatedAt && (
          <span className="macro-header__meta">
            {new Date(data.updatedAt).toLocaleDateString('es-AR')}
            {data.source === 'manual' ? ' · carga manual' : ' · 10–15 min delay'}
          </span>
        )}
        {data?.prevPoints?.some(p => p.hh > 0 || p.brent > 0) && (
          <button
            onClick={() => setShowPrev(v => !v)}
            className="btn"
            style={{ fontSize: 11, padding: '3px 10px', marginLeft: 4, color: showPrev ? 'var(--cp-positive,#2C7A5B)' : undefined }}
          >
            {showPrev ? '✓ ' : ''}vs anterior
          </button>
        )}
      </div>

      {/* Loading */}
      {!data && (
        <div className="macro-loading">
          <span className="macro-loading__text">Cargando precios de mercado…</span>
        </div>
      )}

      {/* No data fallback */}
      {noData && (
        <div className="macro-nodata">
          <p className="macro-nodata__text">
            No se pudieron obtener los precios de futuros en este momento.
          </p>
        </div>
      )}

      {/* Charts */}
      {data && (data.hasBrent || data.hasHH) && (
        <>
          <div className="macro-grid">
            {data.hasBrent && (
              <MacroCard
                eyebrow="ICE Futures Europe"
                title="ICE Brent Crude"
                points={points}
                valueKey="brent"
                color={C_BRENT}
                fillColor={C_BRENT_FILL}
                yLabel="USD/bbl"
                decimals={2}
                prevPoints={showPrev ? (data.prevPoints ?? []) : []}
                prevDate={showPrev && data.prevUpdatedAt
                  ? new Date(data.prevUpdatedAt).toLocaleDateString('es-AR')
                  : undefined}
              />
            )}
            {data.hasHH && (
              <MacroCard
                eyebrow="CME · NYMEX"
                title="Henry Hub Natural Gas"
                points={points}
                valueKey="hh"
                color={C_HH}
                fillColor={C_HH_FILL}
                yLabel="USD/MMBtu"
                decimals={3}
                extraPlugins={[winterBandPlugin(points.map(p => p.label))]}
                note={<>❄ Dic–Feb: precio de invierno<br />(demanda estacional EEUU)</>}
                prevPoints={showPrev ? (data.prevPoints ?? []) : []}
                prevDate={showPrev && data.prevUpdatedAt
                  ? new Date(data.prevUpdatedAt).toLocaleDateString('es-AR')
                  : undefined}
              />
            )}
          </div>

          {/* Export / share */}
          <div className="macro-actions">
            <button
              onClick={handleExport}
              className="btn"
              style={{ fontSize: 12, padding: '6px 16px' }}
            >
              ↓ Exportar
            </button>
            <button
              onClick={handleCopy}
              className="btn"
              style={{ fontSize: 12, padding: '6px 16px', color: copied ? 'var(--cp-positive)' : undefined }}
            >
              {copied ? '✓ Copiado' : '🔗 Copiar enlace'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

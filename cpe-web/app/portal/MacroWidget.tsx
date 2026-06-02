'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MacroPoint } from '@/app/api/macro/route'

type MacroData = {
  points: MacroPoint[]
  hasHH: boolean
  hasBrent: boolean
  updatedAt: string
  source?: 'manual' | 'live'
}

// Design tokens (brand colors)
const C_BRENT  = '#5C8700'   // cp-green-deep
const C_BRENT_FILL = '#82BC00'
const C_HH     = '#8B1A2A'   // bordeaux
const C_HH_FILL = '#A8253A'

// Months considered US winter season
const WINTER_LABELS = ['Dic', 'Ene', 'Feb']
function isWinter(label: string) {
  return WINTER_LABELS.some(m => label.startsWith(m))
}

// Chart.js winter-band plugin
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
      ctx.save()
      ctx.fillStyle = 'rgba(78,126,196,.07)'
      winterIdx.forEach((i: number) => {
        const x1 = x.getPixelForValue(i) - half
        ctx.fillRect(x1, chartArea.top, step, chartArea.bottom - chartArea.top)
      })
      if (winterIdx.length) {
        const mid = x.getPixelForValue(winterIdx[Math.floor(winterIdx.length / 2)])
        ctx.font = '600 9px var(--font-body,Inter,sans-serif)'
        ctx.fillStyle = 'rgba(78,126,196,.45)'
        ctx.textAlign = 'center'
        ctx.fillText('❄ invierno', mid, chartArea.top + 11)
      }
      ctx.restore()
    },
  }
}

function buildChartOptions(color: string, yLabel: string, decimals: number) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
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
  extraPlugins = [], note,
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
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inst = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current || !points.length) return
    import('chart.js/auto').then(({ default: Chart }) => {
      if (inst.current) { inst.current.destroy(); inst.current = null }
      const labels = points.map(p => p.label)
      const data   = points.map(p => p[valueKey] || null)

      inst.current = new Chart(canvasRef.current!, {
        type: 'line',
        plugins: extraPlugins,
        data: {
          labels,
          datasets: [{
            data,
            borderColor: fillColor,
            backgroundColor: (ctx: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 185)
              g.addColorStop(0, fillColor + '28')
              g.addColorStop(1, fillColor + '04')
              return g
            },
            tension: 0.35,
            pointRadius: 3.5,
            pointHoverRadius: 5.5,
            pointBackgroundColor: fillColor,
            borderWidth: 2.5,
            fill: true,
          }],
        },
        options: buildChartOptions(color, yLabel, decimals),
      })
    })
    return () => { if (inst.current) { inst.current.destroy(); inst.current = null } }
  }, [points, valueKey, color, fillColor, yLabel, decimals, extraPlugins])

  const valid = points.filter(p => p[valueKey] > 0)
  const m1    = valid[0]?.[valueKey] ?? 0
  const mN    = valid[valid.length - 1]?.[valueKey] ?? 0
  const diff  = mN - m1
  const m1Label = valid[0]?.label ?? ''

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '18px 18px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color, marginBottom: 0, letterSpacing: '-.01em' }}>
        {title}
      </div>
      <div style={{ height: 185, position: 'relative', margin: '12px 0 10px' }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--rule)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 3 }}>
            M+1 ({m1Label})
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color }}>
            {m1.toFixed(decimals)}{' '}
            <span style={{ fontSize: 11, fontWeight: 400, fontFamily: 'var(--font-body)' }}>{yLabel}</span>
          </div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 2, color: diff >= 0 ? 'var(--cp-positive,#2C7A5B)' : 'var(--cp-negative,#B33B2E)' }}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(decimals)} vs M+12
          </div>
        </div>
        {note && (
          <div style={{ fontSize: 10, color: 'var(--fg-soft)', padding: '4px 10px', background: '#EEF4FF', borderLeft: '2px solid #4E7EC4', borderRadius: '0 4px 4px 0', lineHeight: 1.4 }}>
            {note}
          </div>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right', lineHeight: 1.5 }}>
          {valueKey === 'brent' ? 'Last price' : 'Prior Settle'}<br />
          {valueKey === 'brent' ? 'ICE.com' : 'CME Group'}
        </div>
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export function MacroWidget() {
  const [data, setData] = useState<MacroData | null>(null)
  const [err,  setErr]  = useState(false)
  const [copied, setCopied] = useState(false)

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
    <section style={{ marginBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: '-.01em' }}>
          Macro — próximos 12 meses
        </h2>
        {data?.updatedAt && (
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(data.updatedAt).toLocaleDateString('es-AR')}
            {data.source === 'manual' ? ' · carga manual' : ' · 10–15 min delay'}
          </span>
        )}
      </div>

      {/* Loading */}
      {!data && (
        <div style={{ height: 200, background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>Cargando precios de mercado…</span>
        </div>
      )}

      {/* No data fallback */}
      {noData && (
        <div style={{ padding: '16px 18px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)' }}>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
            No se pudieron obtener los precios de futuros en este momento.
          </p>
        </div>
      )}

      {/* Charts */}
      {data && (data.hasBrent || data.hasHH) && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 10 }}>
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
              />
            )}
          </div>

          {/* Export / share */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <button
              onClick={handleExport}
              className="btn"
              style={{ fontSize: 12, padding: '6px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              ↓ Exportar
            </button>
            <button
              onClick={handleCopy}
              className="btn"
              style={{ fontSize: 12, padding: '6px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, color: copied ? 'var(--cp-positive)' : undefined }}
            >
              {copied ? '✓ Copiado' : '🔗 Copiar enlace'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

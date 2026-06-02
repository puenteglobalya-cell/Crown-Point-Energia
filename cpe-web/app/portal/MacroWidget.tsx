'use client'

import { useEffect, useRef, useState } from 'react'
import type { MacroPoint } from '@/app/api/macro/route'

type MacroData = {
  points: MacroPoint[]
  hasHH: boolean
  hasBrent: boolean
  updatedAt: string
}

export function MacroWidget() {
  const [data, setData] = useState<MacroData | null>(null)
  const [err, setErr]   = useState(false)
  const chartRef        = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInst       = useRef<any>(null)

  useEffect(() => {
    fetch('/api/macro', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setErr(true))
  }, [])

  useEffect(() => {
    if (!data || !chartRef.current) return
    if (!data.hasHH && !data.hasBrent) return

    import('chart.js/auto').then(({ default: Chart }) => {
      if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null }

      const labels = data.points.map(p => p.label)
      const datasets = []

      if (data.hasBrent) {
        datasets.push({
          label: 'Brent (USD/bbl)',
          data: data.points.map(p => p.brent || null),
          borderColor: '#1f2566',
          backgroundColor: 'rgba(31,37,102,.1)',
          tension: 0.3,
          pointRadius: 3,
          yAxisID: 'yBrent',
        })
      }

      if (data.hasHH) {
        datasets.push({
          label: 'Henry Hub (USD/MMBtu)',
          data: data.points.map(p => p.hh || null),
          borderColor: '#c47a1a',
          backgroundColor: 'rgba(196,122,26,.1)',
          tension: 0.3,
          pointRadius: 3,
          borderDash: [5, 3],
          yAxisID: 'yHH',
        })
      }

      const scales: Record<string, object> = {
        x: {
          grid: { color: 'rgba(0,0,0,.06)' },
          ticks: { font: { family: 'DM Sans, sans-serif', size: 11 }, color: '#888' },
        },
      }

      if (data.hasBrent) {
        scales['yBrent'] = {
          position: 'left',
          title: { display: true, text: 'Brent USD/bbl', font: { size: 10 }, color: '#1f2566' },
          grid: { color: 'rgba(0,0,0,.06)' },
          ticks: { font: { size: 11 }, color: '#1f2566' },
        }
      }

      if (data.hasHH) {
        scales['yHH'] = {
          position: data.hasBrent ? 'right' : 'left',
          title: { display: true, text: 'HH USD/MMBtu', font: { size: 10 }, color: '#c47a1a' },
          grid: { drawOnChartArea: !data.hasBrent },
          ticks: { font: { size: 11 }, color: '#c47a1a' },
        }
      }

      chartInst.current = new Chart(chartRef.current!, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'DM Sans, sans-serif', size: 12 }, boxWidth: 20, padding: 16 },
            },
            tooltip: {
              callbacks: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label: (ctx: any) => {
                  const v = ctx.parsed.y
                  const unit = ctx.dataset.label?.includes('Brent') ? 'USD/bbl' : 'USD/MMBtu'
                  return ` ${ctx.dataset.label?.split(' ')[0]}: ${v?.toFixed(2)} ${unit}`
                },
              },
            },
          },
          scales,
        },
      })
    })

    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null } }
  }, [data])

  if (err) return null  // silent if fetch fails

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
          Macro — próximos 12 meses
        </h2>
        {data?.updatedAt && (
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
            actualizado {new Date(data.updatedAt).toLocaleDateString('es-AR')}
          </span>
        )}
      </div>

      {!data ? (
        <div style={{ height: 200, background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>Cargando precios de mercado…</span>
        </div>
      ) : !data.hasHH && !data.hasBrent ? (
        <div style={{ padding: '20px 18px', background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)' }}>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
            No se pudieron obtener los precios de futuros. CME y ICE pueden requerir acceso desde red corporativa.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '20px 20px 16px' }}>
          <div style={{ height: 240 }}>
            <canvas ref={chartRef} />
          </div>
          {/* Summary row */}
          <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--rule)', flexWrap: 'wrap' }}>
            {data.hasBrent && (() => {
              const valid = data.points.filter(p => p.brent > 0)
              const first = valid[0]?.brent ?? 0
              const last  = valid[valid.length - 1]?.brent ?? 0
              const diff  = last - first
              return (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 2 }}>Brent M+1</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1f2566' }}>
                    ${first.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400 }}>USD/bbl</span>
                  </div>
                  <div style={{ fontSize: 11, color: diff >= 0 ? 'var(--cp-green-deep)' : 'var(--cp-negative)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)} vs M+12
                  </div>
                </div>
              )
            })()}
            {data.hasHH && (() => {
              const valid = data.points.filter(p => p.hh > 0)
              const first = valid[0]?.hh ?? 0
              const last  = valid[valid.length - 1]?.hh ?? 0
              const diff  = last - first
              return (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 2 }}>Henry Hub M+1</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#c47a1a' }}>
                    ${first.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400 }}>USD/MMBtu</span>
                  </div>
                  <div style={{ fontSize: 11, color: diff >= 0 ? 'var(--cp-green-deep)' : 'var(--cp-negative)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)} vs M+12
                  </div>
                </div>
              )
            })()}
            <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-muted)', alignSelf: 'flex-end', fontFamily: 'var(--font-mono)' }}>
              CME (prior settle) · ICE (last) · 15 min delay
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

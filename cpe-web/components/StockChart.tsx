'use client'

import { useEffect, useState } from 'react'

type HistoryPoint = { date: string; close: number }

type Quote = {
  ok: true
  price: number
  prevClose: number
  delta: number
  deltaP: number
  high52: number
  low52: number
  marketCap: number
  shares: number
  currency: string
  ts: number
  history: HistoryPoint[]
}

type State = { status: 'loading' | 'ok' | 'error'; data?: Quote }

const C = 'CA $'

function fmt(n: number, decimals = 3) {
  return `${C}${n.toFixed(decimals)}`
}

function fmtCap(n: number) {
  if (n >= 1e9) return `${C}${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${C}${(n / 1e6).toFixed(1)}M`
  return `${C}${n.toLocaleString()}`
}

function PriceLine({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) return null

  const W = 1200, H = 180, PX = 0, PY = 12
  const closes = history.map(p => p.close)
  const minV = Math.min(...closes)
  const maxV = Math.max(...closes)
  const range = maxV - minV || 0.001
  const innerH = H - PY * 2
  const innerW = W - PX * 2

  const toX = (i: number) => PX + (i / (history.length - 1)) * innerW
  const toY = (v: number) => PY + (1 - (v - minV) / range) * innerH

  const pts = history.map((p, i) => `${toX(i).toFixed(1)},${toY(p.close).toFixed(1)}`).join(' ')

  const first = history[0].close
  const last  = history[history.length - 1].close
  const isUp  = last >= first
  const color = isUp ? '#6CAE52' : '#C94A4A'

  const y52h = toY(Math.min(maxV, history[0].close > 0 ? maxV : minV))
  const y52l = toY(Math.max(minV, history[0].close > 0 ? minV : maxV))

  const yearLabels: { x: number; label: string }[] = []
  let lastYear = ''
  history.forEach((p, i) => {
    const y = p.date.slice(0, 4)
    if (y !== lastYear) {
      yearLabels.push({ x: toX(i), label: y })
      lastYear = y
    }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="chart-clip">
          <rect x={PX} y={PY} width={innerW} height={innerH + 1} />
        </clipPath>
      </defs>

      {/* Area fill */}
      <polygon
        clipPath="url(#chart-clip)"
        points={`${PX},${H} ${pts} ${W - PX},${H}`}
        fill="url(#cg)"
      />

      {/* Price line */}
      <polyline
        clipPath="url(#chart-clip)"
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Year labels */}
      {yearLabels.map(({ x, label }) => (
        <g key={label}>
          <line x1={x} y1={PY} x2={x} y2={H - 2} stroke="currentColor" strokeWidth="0.5"
            strokeDasharray="2 4" opacity="0.15" />
          <text x={x + 4} y={H + 2} fontSize="22" fill="currentColor" opacity="0.35"
            fontFamily="var(--font-mono)" letterSpacing="0.06em">
            {label}
          </text>
        </g>
      ))}

      {/* Current price dot */}
      <circle
        cx={toX(history.length - 1)}
        cy={toY(last)}
        r="5"
        fill={color}
      />
    </svg>
  )
}

export default function StockChart({ lang = 'es' }: { lang?: 'es' | 'en' }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    fetch('/api/stock/cwv')
      .then(r => r.json())
      .then((d: Quote | { ok: false }) => setState({ status: d.ok ? 'ok' : 'error', data: d.ok ? d : undefined }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  const loading = state.status === 'loading'
  const err     = state.status === 'error'
  const d       = state.data

  const isUp   = d ? d.delta >= 0 : true
  const deltaStr = d
    ? `${isUp ? '+' : ''}${d.delta.toFixed(3)} (${isUp ? '+' : ''}${d.deltaP.toFixed(2)}%)`
    : ''

  const fmtDate = d
    ? new Date(d.ts).toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-CA', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Toronto',
      })
    : ''

  return (
    <>
      <style>{`
        .sc-band { display: grid; grid-template-columns: 2fr repeat(4, 1fr); gap: 0;
          border: 1px solid var(--rule); border-radius: var(--r-lg); overflow: hidden;
          background: var(--surface); }
        .sc-cell { padding: 22px 24px; border-right: 1px solid var(--rule);
          display: flex; flex-direction: column; gap: 8px; }
        .sc-cell:last-child { border-right: 0; }
        .sc-cell > .sc-lbl { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--fg-muted); font-weight: 600; }
        .sc-cell strong { font-family: var(--font-mono); font-weight: 500; font-size: 20px; color: var(--fg); }
        .sc-main { gap: 6px; }
        .sc-ticker { color: var(--accent-deep); font-size: 11px; letter-spacing: 0.16em; }
        [data-theme="dark"] .sc-ticker { color: var(--cp-green); }
        .sc-price-row { display: flex; align-items: baseline; gap: 12px; }
        .sc-price { font-family: var(--font-mono); font-size: 36px; font-weight: 500; color: var(--fg); }
        .sc-delta { font-family: var(--font-mono); font-size: 14px; padding: 3px 10px;
          border-radius: var(--r-pill); }
        .sc-delta.up   { background: rgba(108,174,82,0.15); color: var(--cp-green-deep); }
        .sc-delta.down { background: rgba(201,74,74,0.12);  color: #C94A4A; }
        [data-theme="dark"] .sc-delta.up   { color: #8BD478; }
        [data-theme="dark"] .sc-delta.down { color: #F08080; }
        .sc-meta { color: var(--fg-muted) !important; font-size: 12px !important; font-weight: 400 !important;
          text-transform: none !important; letter-spacing: 0 !important; }
        .sc-skel { height: 24px; background: var(--rule); border-radius: 4px; animation: skpulse 1.4s ease infinite; }
        @keyframes skpulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .sc-chart-wrap { margin-top: var(--s-4); padding: 0; overflow: hidden;
          border: 1px solid var(--rule); border-radius: var(--r-lg); background: var(--surface); }
        .sc-chart-inner { padding: var(--s-5) var(--s-6) 24px; }
        .sc-chart-title { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--fg-muted); font-weight: 600; margin-bottom: var(--s-3); }
        @media (max-width: 900px) {
          .sc-band { grid-template-columns: 1fr 1fr; }
          .sc-cell { border-bottom: 1px solid var(--rule); }
          .sc-main { grid-column: 1 / -1; }
        }
      `}</style>

      {/* Quote band */}
      <div className="sc-band">
        <div className="sc-cell sc-main">
          <span className="sc-ticker">TSX.V: CWV</span>
          <div className="sc-price-row">
            {loading ? (
              <div className="sc-skel" style={{ width: 160, height: 40 }} />
            ) : err || !d ? (
              <span className="sc-price" style={{ fontSize: 24, color: 'var(--fg-muted)' }}>—</span>
            ) : (
              <>
                <span className="sc-price num">{fmt(d.price)}</span>
                <span className={`sc-delta num ${isUp ? 'up' : 'down'}`}>{deltaStr}</span>
              </>
            )}
          </div>
          <span className="sc-meta sc-lbl">
            {loading ? ' ' : err ? (lang === 'es' ? 'No disponible' : 'Unavailable')
              : lang === 'es'
                ? `Última actualización · ${fmtDate} · TSXV`
                : `Last updated · ${fmtDate} · TSXV`}
          </span>
        </div>
        <div className="sc-cell">
          <span className="sc-lbl">52w high</span>
          {loading ? <div className="sc-skel" style={{ width: 80 }} /> : <strong className="num">{d ? fmt(d.high52) : '—'}</strong>}
        </div>
        <div className="sc-cell">
          <span className="sc-lbl">52w low</span>
          {loading ? <div className="sc-skel" style={{ width: 80 }} /> : <strong className="num">{d ? fmt(d.low52) : '—'}</strong>}
        </div>
        <div className="sc-cell">
          <span className="sc-lbl">{lang === 'es' ? 'Cap. mercado' : 'Market cap'}</span>
          {loading ? <div className="sc-skel" style={{ width: 80 }} /> : <strong className="num">{d ? fmtCap(d.marketCap) : '—'}</strong>}
        </div>
        <div className="sc-cell">
          <span className="sc-lbl">{lang === 'es' ? 'Acciones' : 'Shares'}</span>
          {loading ? <div className="sc-skel" style={{ width: 80 }} /> : <strong className="num">{d ? `${(d.shares / 1e6).toFixed(1)}M` : '—'}</strong>}
        </div>
      </div>

      {/* Price history chart — hidden when there's no history to plot (e.g. CMS fallback) */}
      {loading && (
        <div className="sc-chart-wrap">
          <div className="sc-chart-inner">
            <div className="sc-chart-title">
              {lang === 'es' ? 'Historial de precio · CWV.V · 2 años' : 'Price history · CWV.V · 2 years'}
            </div>
            <div className="sc-skel" style={{ height: 120, width: '100%' }} />
          </div>
        </div>
      )}
      {!loading && !err && d && d.history.length > 0 && (
        <div className="sc-chart-wrap">
          <div className="sc-chart-inner">
            <div className="sc-chart-title">
              {lang === 'es' ? 'Historial de precio · CWV.V · 2 años' : 'Price history · CWV.V · 2 years'}
            </div>
            <PriceLine history={d.history} />
          </div>
          <div style={{ padding: '10px 24px', borderTop: '1px solid var(--rule)', fontSize: 11, color: 'var(--fg-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>
              {lang === 'es'
                ? 'Fuente: Yahoo Finance (datos diferidos). No constituye asesoramiento de inversión.'
                : 'Source: Yahoo Finance (delayed data). Not investment advice.'}
            </span>
            <span>{new Date(d.ts).toLocaleTimeString(lang === 'es' ? 'es-AR' : 'en-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' })} ET</span>
          </div>
        </div>
      )}
    </>
  )
}

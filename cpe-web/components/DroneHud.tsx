'use client'

import { useEffect, useState } from 'react'

type Props = { lang?: 'es' | 'en' }

function pad(n: number) { return String(n).padStart(2, '0') }

export function DroneHud({ lang = 'es' }: Props) {
  const [visible, setVisible] = useState(false)
  const [recOn, setRecOn]     = useState(true)
  const [ts, setTs]           = useState('')

  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) return
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) return
    function tick() {
      const d = new Date()
      setTs(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} UTC-3`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) return
    const id = setInterval(() => setRecOn(v => !v), 900)
    return () => clearInterval(id)
  }, [])

  const isEs = lang === 'es'

  return (
    <div
      className="drone-hud"
      style={{
        position: 'absolute', inset: 0, zIndex: 2,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1.2s ease',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="hud-top">
        {/* REC + time */}
        <div className="hud-cell hud-rec">
          <span className="hud-dot" style={{ opacity: recOn ? 1 : 0 }} />
          <span>REC</span>
          <span className="hud-sep">·</span>
          <span>{ts}</span>
        </div>

        {/* Center label */}
        <div className="hud-cell hud-center-top">
          <span>{isEs ? 'CUENCA GOLFO SAN JORGE' : 'SAN JORGE GULF BASIN'}</span>
          <span className="hud-sep">·</span>
          <span>{isEs ? 'PATAGONIA · ARG' : 'PATAGONIA · ARG'}</span>
        </div>

        {/* GPS + alt */}
        <div className="hud-cell hud-right">
          <span>45°51′20″S · 67°43′12″O</span>
          <span className="hud-sep">|</span>
          <span>ALT <strong>248 m</strong></span>
        </div>
      </div>

      {/* ── Corner brackets ─────────────────────────────────────── */}
      <div className="hud-corner hud-corner--tl" />
      <div className="hud-corner hud-corner--tr" />
      <div className="hud-corner hud-corner--bl" />
      <div className="hud-corner hud-corner--br" />

      {/* ── Right-side telemetry ─────────────────────────────────── */}
      <div className="hud-telem">
        <div className="hud-telem-row">
          <span className="hud-telem-key">HDG</span>
          <span className="hud-telem-val">218° SW</span>
        </div>
        <div className="hud-telem-row">
          <span className="hud-telem-key">GND</span>
          <span className="hud-telem-val">0.0 m/s</span>
        </div>
        <div className="hud-telem-row">
          <span className="hud-telem-key">VERT</span>
          <span className="hud-telem-val">−0.3 m/s</span>
        </div>
        <div className="hud-telem-row">
          <span className="hud-telem-key">BATT</span>
          <span className="hud-telem-val">87%</span>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────── */}
      <div className="hud-bottom">
        <div className="hud-cell">
          <span className="hud-area-dot" />
          <span>{isEs ? 'Yacimiento El Tordillo · Chubut' : 'El Tordillo Field · Chubut'}</span>
        </div>
        <div className="hud-cell">
          <span>{isEs ? 'Cuencas productoras:' : 'Producing basins:'}</span>
          <span className="hud-sep">·</span>
          <span>AUSTRAL · GSJ · NEUQUINA · CUYANA</span>
        </div>
        <div className="hud-cell">
          <span>TSXV: CWV</span>
          <span className="hud-sep">|</span>
          <span>Crown Point Energía</span>
        </div>
      </div>

      <style>{`
        .drone-hud * { box-sizing: border-box; }

        /* top / bottom bars */
        .hud-top, .hud-bottom {
          position: absolute;
          left: 0; right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: rgba(255,255,255,.72);
          gap: 12px;
        }
        .hud-top {
          top: 0;
          background: linear-gradient(180deg, rgba(0,0,0,.45) 0%, transparent 100%);
        }
        .hud-bottom {
          bottom: 0;
          background: linear-gradient(0deg, rgba(0,0,0,.5) 0%, transparent 100%);
        }
        .hud-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .hud-center-top {
          flex: 1;
          justify-content: center;
          font-weight: 600;
          color: rgba(255,255,255,.55);
          letter-spacing: .14em;
        }
        .hud-right { flex-shrink: 0; }
        .hud-sep { opacity: .4; }
        .hud-rec { color: rgba(255,255,255,.85); font-weight: 600; }
        .hud-dot {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
          transition: opacity .15s;
        }
        .hud-area-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--cp-green, #6CAE52);
          flex-shrink: 0;
        }
        .hud-telem {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }
        .hud-telem-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: rgba(255,255,255,.55);
        }
        .hud-telem-key {
          width: 36px;
          color: rgba(255,255,255,.35);
        }
        .hud-telem-val {
          color: rgba(255,255,255,.7);
          font-weight: 600;
        }

        /* corner brackets */
        .hud-corner {
          position: absolute;
          width: 22px; height: 22px;
          border-color: rgba(255,255,255,.45);
          border-style: solid;
        }
        .hud-corner--tl { top: 52px; left: 20px; border-width: 1.5px 0 0 1.5px; }
        .hud-corner--tr { top: 52px; right: 20px; border-width: 1.5px 1.5px 0 0; }
        .hud-corner--bl { bottom: 42px; left: 20px; border-width: 0 0 1.5px 1.5px; }
        .hud-corner--br { bottom: 42px; right: 20px; border-width: 0 1.5px 1.5px 0; }

        /* hide telem on small screens */
        @media (max-width: 640px) {
          .hud-telem { display: none; }
          .hud-center-top { display: none; }
          .hud-bottom { font-size: 9px; gap: 6px; }
          .hud-top { font-size: 9px; }
        }
        @media (max-width: 420px) {
          .hud-bottom > .hud-cell:not(:first-child) { display: none; }
        }
      `}</style>
    </div>
  )
}

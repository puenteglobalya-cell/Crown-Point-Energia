'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Block    = { slug: string; titulo: string; subtitulo: string; commodity: 'oil' | 'gas' | 'mixed'; wi?: string }
type Stats    = { pozos: string; inyectores: string; cuencas: string; ha: string; anios: string }
type Prod     = { val: string; unit: string; mix: string; periodo: string }
type Thesis   = { prodVal: string; prodUnit: string; prodDelta: string; resVal: string; resUnit: string; resDelta: string; ebVal: string; ebUnit: string; ebDelta: string }

export type InfografiaProps = { stats: Stats; production: Prod; blocks: Block[]; thesis: Thesis; date: string }

// ── Module catalogue ──────────────────────────────────────────────────────────

type ModuleDef = {
  id:    string
  label: string
  desc:  string
  icon:  string
  color: string
}

const MODULES: ModuleDef[] = [
  { id: 'headline',   label: 'Titular',                icon: '💬', color: '#6CAE52', desc: 'Frase institucional + bajada de 2 líneas' },
  { id: 'stats',      label: 'En números',             icon: '📊', color: '#1F2566', desc: '357 pozos · 83 inyectores · 3 cuencas · 372k ha · 25+ años' },
  { id: 'production', label: 'Producción',             icon: '⛽', color: '#3D5F9A', desc: 'boe/d neto Q1 2026 + mix gas/líquidos' },
  { id: 'blocks',     label: 'Bloques operativos',     icon: '🗺️', color: '#4a8a3a', desc: 'Grilla de los 5 bloques con commodity y WI' },
  { id: 'stock',      label: 'Cotización CWV.V',       icon: '📈', color: '#2E4878', desc: 'Precio live, delta, 52w high/low, cap de mercado' },
  { id: 'ratings',    label: 'Calificaciones FIX SCR', icon: '⭐', color: '#1F2566', desc: 'BBB(arg) emisor + A-(arg)/BBB(arg) por clase de ON' },
  { id: 'thesis',     label: 'Tesis de inversión',     icon: '💼', color: '#0d1230', desc: 'KPIs: producción, reservas, EBITDA, bloques activos' },
  { id: 'mix',        label: 'Mix de producción',      icon: '🔵', color: '#3D5F9A', desc: 'Barra visual gas vs. líquidos (54/46 %)' },
]

// ── Profile presets ───────────────────────────────────────────────────────────

const PROFILES = [
  {
    id: 'investor', label: 'Inversor institucional',
    desc: 'Focus en KPIs financieros, stock y ratings',
    icon: '🏦',
    modules: ['headline', 'stats', 'production', 'thesis', 'stock', 'ratings'],
  },
  {
    id: 'operations', label: 'Perfil operativo',
    desc: 'Activos, bloques y producción',
    icon: '⛽',
    modules: ['stats', 'production', 'mix', 'blocks'],
  },
  {
    id: 'press', label: 'Medios / Prensa',
    desc: 'Resumido: titular, números clave y bloques',
    icon: '📰',
    modules: ['headline', 'stats', 'production', 'blocks'],
  },
  {
    id: 'complete', label: 'Completo',
    desc: 'Todos los módulos disponibles',
    icon: '✨',
    modules: MODULES.map(m => m.id),
  },
]

const DEFAULT_MODULES = ['headline', 'stats', 'production', 'blocks', 'stock', 'ratings']

// ── Colors ────────────────────────────────────────────────────────────────────

const COMM_COLOR = { oil: '#1F2566', gas: '#4a8a3a', mixed: '#6CAE52' }
const COMM_LABEL = { oil: 'Petróleo', gas: 'Gas natural', mixed: 'Petróleo + Gas' }

// ── Stock hook ────────────────────────────────────────────────────────────────

type StockInfo = { price: string; delta: string; deltaP: string; high52: string; low52: string; cap: string; shares: string; isUp: boolean }

function useStock(): StockInfo | null {
  const [s, setS] = useState<StockInfo | null>(null)
  useEffect(() => {
    fetch('/api/stock/cwv').then(r => r.json()).then(d => {
      if (!d.ok) return
      const isUp = d.delta >= 0
      const fmtCAD = (n: number) => `CA $${n.toFixed(3)}`
      const fmtCap = (n: number) => n >= 1e9 ? `CA $${(n / 1e9).toFixed(2)}B` : `CA $${(n / 1e6).toFixed(1)}M`
      setS({
        price: fmtCAD(d.price), delta: `${isUp ? '+' : ''}${d.delta.toFixed(3)}`,
        deltaP: `${isUp ? '+' : ''}${d.deltaP.toFixed(2)}%`,
        high52: fmtCAD(d.high52), low52: fmtCAD(d.low52),
        cap: fmtCap(d.marketCap), shares: `${(d.shares / 1e6).toFixed(1)}M`, isUp,
      })
    }).catch(() => {})
  }, [])
  return s
}

// ── Ratings data ──────────────────────────────────────────────────────────────

const RATINGS = [
  { concepto: 'ON Clase VI Garantizadas — hasta USD 20 MM',  isin: 'AR0134464806', rating: 'A-(arg)'  },
  { concepto: 'ON Clase VII — hasta USD 10 MM',               isin: 'AR0370555119', rating: 'BBB(arg)' },
  { concepto: 'ON Clase IX Garantizadas — hasta USD 15 MM',   isin: 'AR0764757453', rating: 'A-(arg)'  },
]

// ── Download button ───────────────────────────────────────────────────────────

function DownloadBtn({ modules }: { modules: string[] }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function download() {
    setLoading(true); setErr('')
    try {
      const res = await fetch(`/api/infografia/png?m=${modules.join(',')}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `crown-point-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al generar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={download} disabled={loading} style={{
        background: loading ? '#3a6b28' : '#6CAE52', color: '#031636', border: 0, borderRadius: 8,
        padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', transition: 'background 0.15s',
      }}>
        {loading ? (
          <><SpinIcon />Generando PNG…</>
        ) : (
          <><DownloadIcon />Descargar PNG</>
        )}
      </button>
      {err && <div style={{ color: '#C94A4A', fontSize: 12, marginTop: 6 }}>{err}</div>}
      {loading && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>20–40 seg · Chromium procesando…</div>}
    </div>
  )
}

// ── Infografia preview ────────────────────────────────────────────────────────

function Infografia({ modules: active, stats, production, blocks, thesis, date, stock }: InfografiaProps & { modules: string[]; stock: StockInfo | null }) {
  const has = (id: string) => active.includes(id)
  const deltaColor = !stock || stock.isUp ? '#6CAE52' : '#C94A4A'
  const ratingColor = (r: string) => r.startsWith('A') ? '#6CAE52' : '#4a8a3a'
  const gasP   = parseInt((production.mix.match(/^(\d+)/) ?? ['54'])[1])
  const liqP   = 100 - gasP

  return (
    <div style={{ width: 1080, background: '#031636', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header — always */}
      <div style={{ background: '#0d1a4a', padding: '26px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #6CAE52' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="44" height="44" viewBox="0 0 48 48">
            <polygon points="24,2 46,44 2,44" fill="#6CAE52"/>
            <polygon points="24,13 40,44 8,44" fill="#031636" opacity="0.5"/>
          </svg>
          <div>
            <div style={{ fontWeight: 900, fontSize: 19, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1.1 }}>CROWN POINT ENERGÍA S.A.</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>Exploración &amp; Producción · Argentina</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 600, color: '#6CAE52', letterSpacing: '0.06em' }}>TSX.V: CWV</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.1em' }}>{date.toUpperCase()}</div>
        </div>
      </div>

      {/* Headline */}
      {has('headline') && (
        <div style={{ padding: '32px 48px 26px', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6CAE52', fontWeight: 700, marginBottom: 10 }}>PERFIL CORPORATIVO</div>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.04, color: '#fff' }}>
            Upstream argentino<br/>con alcance internacional.
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, lineHeight: 1.6, maxWidth: 600 }}>
            Con más de {stats.anios} años de operación ininterrumpida, Crown Point opera cinco bloques en tres cuencas históricamente productoras de Argentina.
          </div>
        </div>
      )}

      {/* Stats */}
      {has('stats') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          {[
            { val: stats.pozos,      label: 'Pozos\nproductivos' },
            { val: stats.inyectores, label: 'Pozos\ninyectores' },
            { val: stats.cuencas,    label: 'Cuencas\nproductoras' },
            { val: stats.ha,         label: 'Hectáreas\noperadas' },
            { val: stats.anios,      label: 'Años upstream\nargentino' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '24px 20px', borderRight: i < 4 ? '1px solid rgba(108,174,82,0.18)' : undefined }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#6CAE52', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Production */}
      {has('production') && (
        <div style={{ padding: '26px 48px', borderBottom: '1px solid rgba(108,174,82,0.22)', background: 'rgba(31,37,102,0.2)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 12 }}>PRODUCCIÓN {production.periodo}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 62, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>{production.val}</div>
            <div>
              <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', fontWeight: 300 }}>{production.unit}</div>
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 999, color: '#031636', background: '#6CAE52' }}>
                {production.mix}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mix visual */}
      {has('mix') && (
        <div style={{ padding: '22px 48px', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 14 }}>MIX DE PRODUCCIÓN</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ flex: 1, height: 28, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${gasP}%`, background: '#4a8a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{gasP}% Gas</div>
              <div style={{ width: `${liqP}%`, background: '#1F2566', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{liqP}% Líquidos</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', minWidth: 100 }}>Q1 2026 · neto</div>
          </div>
        </div>
      )}

      {/* Blocks */}
      {has('blocks') && (
        <div style={{ padding: '26px 48px', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 14 }}>6 BLOQUES EN 4 CUENCAS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {blocks.map((b, i) => (
              <div key={b.slug} style={{ background: 'rgba(31,37,102,0.55)', border: '1px solid rgba(108,174,82,0.22)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#6CAE52', fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>BLOQUE 0{i + 1}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 4 }}>{b.titulo}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>{b.subtitulo}</div>
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 9px', borderRadius: 999, color: '#fff', background: COMM_COLOR[b.commodity] }}>
                  {COMM_LABEL[b.commodity]}{b.wi ? ' · ' + b.wi : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thesis */}
      {has('thesis') && (
        <div style={{ padding: '26px 48px', borderBottom: '1px solid rgba(108,174,82,0.22)', background: 'rgba(15,27,56,0.4)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 14 }}>TESIS DE INVERSIÓN</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, border: '1px solid rgba(108,174,82,0.22)', borderRadius: 10, overflow: 'hidden' }}>
            {[
              { n: '01', label: 'Producción', val: thesis.prodVal, unit: thesis.prodUnit, delta: thesis.prodDelta },
              { n: '02', label: 'Reservas',   val: thesis.resVal,  unit: thesis.resUnit,  delta: thesis.resDelta  },
              { n: '03', label: 'EBITDA',     val: thesis.ebVal,   unit: thesis.ebUnit,   delta: thesis.ebDelta   },
              { n: '04', label: 'Bloques',    val: '6',            unit: 'en 4 cuencas',  delta: '372k ha'        },
            ].map((k, i) => (
              <div key={i} style={{ padding: '18px 20px', borderRight: i < 3 ? '1px solid rgba(108,174,82,0.18)' : undefined, background: 'rgba(31,37,102,0.3)' }}>
                <div style={{ fontSize: 9, color: '#6CAE52', fontWeight: 700, letterSpacing: '0.18em', marginBottom: 8 }}>{k.n}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{k.val}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>{k.unit}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6CAE52', marginTop: 4, fontWeight: 600 }}>{k.delta}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock + Ratings */}
      {(has('stock') || has('ratings')) && (
        <div style={{ display: 'grid', gridTemplateColumns: has('stock') && has('ratings') ? '1fr 1fr' : '1fr', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          {has('stock') && (
            <div style={{ padding: '26px 48px', borderRight: has('ratings') ? '1px solid rgba(108,174,82,0.22)' : undefined }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 14 }}>MERCADO DE CAPITALES · TSXV</div>
              <div style={{ fontFamily: 'monospace', fontSize: 44, fontWeight: 500, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{stock?.price ?? '…'}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: deltaColor, marginTop: 7 }}>
                {stock ? `${stock.delta} (${stock.deltaP}) al cierre` : 'Cargando cotización…'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
                {[
                  { label: 'Cap. de mercado', val: stock?.cap    ?? '—' },
                  { label: 'Acciones',        val: stock?.shares ?? '—' },
                  { label: 'Máx. 52 sem.',    val: stock?.high52 ?? '—' },
                  { label: 'Mín. 52 sem.',    val: stock?.low52  ?? '—' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 500, color: '#fff' }}>{m.val}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: '0.06em' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {has('ratings') && (
            <div style={{ padding: '26px 48px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 14 }}>CALIFICACIONES FIX SCR · MAY 2026</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(108,174,82,0.2)' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#031636', background: '#6CAE52', padding: '6px 16px', borderRadius: 7 }}>BBB(arg)</div>
                <div>
                  <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Largo Plazo · Emisor</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Perspectiva Estable · Confirma</div>
                </div>
              </div>
              {RATINGS.map(r => (
                <div key={r.isin} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#031636', background: ratingColor(r.rating), padding: '3px 9px', borderRadius: 5, flexShrink: 0, minWidth: 76, textAlign: 'center' }}>{r.rating}</div>
                  <div>
                    <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, marginBottom: 1 }}>{r.concepto}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{r.isin}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer — always */}
      <div style={{ padding: '16px 48px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6CAE52', letterSpacing: '0.04em' }}>crown-point-energia.vercel.app</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', maxWidth: 400, textAlign: 'right', lineHeight: 1.5 }}>
          Datos orientativos. No constituyen asesoramiento de inversión. Fuentes: CMS, Yahoo Finance, FIX SCR.
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12M8 11l4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
const SpinIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'igSpin 1s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="45 15" strokeLinecap="round"/></svg>

// ── Main export ───────────────────────────────────────────────────────────────

export default function InfografiaClient({ stats, production, blocks, thesis, date }: InfografiaProps) {
  const [active,   setActive]   = useState<string[]>(DEFAULT_MODULES)
  const [profile,  setProfile]  = useState<string | null>(null)
  const [scale,    setScale]    = useState(0.52)
  const stock = useStock()

  const has = useCallback((id: string) => active.includes(id), [active])

  function toggle(id: string) {
    setActive(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
    setProfile(null)
  }

  function applyProfile(p: typeof PROFILES[0]) {
    setActive(p.modules)
    setProfile(p.id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C16', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes igSpin { to { transform: rotate(360deg); } }
        .ig-mod-card { cursor: pointer; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.1); padding: 12px 14px; display: flex; align-items: flex-start; gap: 12px; transition: border-color 0.15s, background 0.15s; background: rgba(255,255,255,0.03); }
        .ig-mod-card:hover { border-color: rgba(108,174,82,0.4); background: rgba(108,174,82,0.06); }
        .ig-mod-card.on { border-color: #6CAE52; background: rgba(108,174,82,0.1); }
        .ig-toggle { width: 18px; height: 18px; border-radius: 4px; border: 2px solid rgba(255,255,255,0.25); flex-shrink: 0; display: grid; place-items: center; transition: background 0.12s, border-color 0.12s; margin-top: 1px; }
        .ig-mod-card.on .ig-toggle { background: #6CAE52; border-color: #6CAE52; }
        .ig-prof-btn { border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.12); padding: 10px 14px; cursor: pointer; background: rgba(255,255,255,0.04); color: #fff; font-family: inherit; text-align: left; transition: border-color 0.15s, background 0.15s; }
        .ig-prof-btn:hover { border-color: rgba(108,174,82,0.4); background: rgba(108,174,82,0.07); }
        .ig-prof-btn.active { border-color: #6CAE52; background: rgba(108,174,82,0.12); }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>Constructor de infografía</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
            {active.length} módulo{active.length !== 1 ? 's' : ''} seleccionado{active.length !== 1 ? 's' : ''}
            {profile ? ` · Perfil: ${PROFILES.find(p => p.id === profile)?.label}` : ' · Selección personalizada'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Zoom</span>
            {[0.36, 0.45, 0.52, 0.62].map(s => (
              <button key={s} onClick={() => setScale(s)} style={{
                background: scale === s ? 'rgba(108,174,82,0.25)' : 'rgba(255,255,255,0.06)',
                border: scale === s ? '1px solid #6CAE52' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 5, padding: '4px 9px', color: scale === s ? '#6CAE52' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
              }}>{Math.round(s * 100)}%</button>
            ))}
          </div>
          <DownloadBtn modules={active} />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel — module selector */}
        <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', padding: '24px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Profiles */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 12 }}>Perfiles rápidos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROFILES.map(p => (
                <button key={p.id} className={`ig-prof-btn${profile === p.id ? ' active' : ''}`} onClick={() => applyProfile(p)}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.icon} {p.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 12 }}>
              Módulos disponibles
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MODULES.map(m => {
                const on = has(m.id)
                return (
                  <div key={m.id} className={`ig-mod-card${on ? ' on' : ''}`} onClick={() => toggle(m.id)}>
                    <div className="ig-toggle">
                      {on && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#031636" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: on ? '#fff' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, lineHeight: 1.45 }}>{m.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reset */}
          <button onClick={() => { setActive(DEFAULT_MODULES); setProfile(null) }} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
            color: 'rgba(255,255,255,0.4)', padding: '9px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
          }}>
            Restablecer por defecto
          </button>
        </div>

        {/* Right panel — preview */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: '#0B0F1A' }}>
          <div style={{
            width: 1080 * scale, height: 'auto',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            // let the container shrink to show overflow
            marginBottom: `-${1080 * scale * 0.15}px`,  // approximate negative margin for scale
          }}>
            <div style={{ width: 1080, transformOrigin: 'top left', transform: `scale(${scale})` }}>
              <Infografia modules={active} stats={stats} production={production} blocks={blocks} thesis={thesis} date={date} stock={stock} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

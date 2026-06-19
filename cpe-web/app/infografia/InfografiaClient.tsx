'use client'

import { useEffect, useState } from 'react'

type Block = { slug: string; titulo: string; subtitulo: string; commodity: 'oil' | 'gas' | 'mixed'; wi?: string }
type Stats = { pozos: string; inyectores: string; cuencas: string; ha: string; anios: string }
type Production = { val: string; unit: string; mix: string; periodo: string }

const COMM_COLOR = { oil: '#1F2566', gas: '#4a8a3a', mixed: '#6CAE52' }
const COMM_LABEL = { oil: 'Petróleo', gas: 'Gas natural', mixed: 'Petróleo + Gas' }

type StockInfo = {
  price: string; delta: string; deltaP: string
  high52: string; low52: string; cap: string; shares: string; isUp: boolean
}

function useStock() {
  const [s, setS] = useState<StockInfo | null>(null)
  useEffect(() => {
    fetch('/api/stock/cwv').then(r => r.json()).then(d => {
      if (!d.ok) return
      const isUp = d.delta >= 0
      const fmtCAD = (n: number) => `CA $${n.toFixed(3)}`
      const fmtCap = (n: number) => n >= 1e9 ? `CA $${(n/1e9).toFixed(2)}B` : `CA $${(n/1e6).toFixed(1)}M`
      setS({
        price:  fmtCAD(d.price),
        delta:  `${isUp ? '+' : ''}${d.delta.toFixed(3)}`,
        deltaP: `${isUp ? '+' : ''}${d.deltaP.toFixed(2)}%`,
        high52: fmtCAD(d.high52),
        low52:  fmtCAD(d.low52),
        cap:    fmtCap(d.marketCap),
        shares: `${(d.shares/1e6).toFixed(1)}M`,
        isUp,
      })
    }).catch(() => {})
  }, [])
  return s
}

const RATINGS = [
  { concepto: 'ON Clase VI Garantizadas — hasta USD 20 MM',  isin: 'AR0134464806', rating: 'A-(arg)' },
  { concepto: 'ON Clase VII — hasta USD 10 MM',               isin: 'AR0370555119', rating: 'BBB(arg)' },
  { concepto: 'ON Clase IX Garantizadas — hasta USD 15 MM',   isin: 'AR0764757453', rating: 'A-(arg)' },
]

function DownloadBtn() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function download() {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/infografia/png')
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crown-point-infografia-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al generar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        onClick={download}
        disabled={loading}
        style={{
          background: '#6CAE52', color: '#031636', border: 0, borderRadius: 8,
          padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="45 15" strokeLinecap="round"/>
            </svg>
            Generando PNG con Chromium…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v12M8 11l4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Descargar PNG (1080px)
          </>
        )}
      </button>
      {err && <div style={{ color: '#C94A4A', fontSize: 13 }}>{err}</div>}
      {loading && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Puede tardar 20–40 segundos mientras Chromium genera el PNG…
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function InfografiaClient({
  stats, production, blocks, date,
}: {
  stats: Stats
  production: Production
  blocks: Block[]
  date: string
}) {
  const stock = useStock()
  const deltaColor = !stock || stock.isUp ? '#6CAE52' : '#C94A4A'
  const ratingColor = (r: string) => r.startsWith('A') ? '#6CAE52' : '#4a8a3a'

  return (
    <div style={{
      minHeight: '100vh', background: '#0B0F1A', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '32px 16px', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Toolbar */}
      <div style={{
        width: '100%', maxWidth: 1080, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: '-0.01em' }}>
            Infografía Crown Point
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            Previsualización · PNG final generado por Chromium
          </div>
        </div>
        <DownloadBtn />
      </div>

      {/* Infografia panel */}
      <div style={{
        width: 1080, background: '#031636', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ background: '#0d1a4a', padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #6CAE52' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <polygon points="24,2 46,44 2,44" fill="#6CAE52"/>
              <polygon points="24,13 40,44 8,44" fill="#031636" opacity="0.5"/>
            </svg>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1.1 }}>
                CROWN POINT ENERGÍA S.A.
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
                Exploración &amp; Producción · Argentina
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: '#6CAE52', letterSpacing: '0.06em' }}>TSX.V: CWV</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4, letterSpacing: '0.1em' }}>{date.toUpperCase()}</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ padding: '36px 48px 28px', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6CAE52', fontWeight: 700, marginBottom: 12 }}>
            PERFIL CORPORATIVO
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.02, color: '#fff' }}>
            Upstream argentino<br/>con alcance internacional.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 14, lineHeight: 1.6, maxWidth: 620 }}>
            Con más de {stats.anios} años de operación ininterrumpida, Crown Point opera seis bloques
            en cuatro cuencas históricamente productoras de Argentina.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          {[
            { val: stats.pozos, label: 'Pozos\nproductivos' },
            { val: stats.inyectores, label: 'Pozos\ninyectores' },
            { val: stats.cuencas, label: 'Cuencas\nproductoras' },
            { val: stats.ha, label: 'Hectáreas\noperadas' },
            { val: stats.anios, label: 'Años en upstream\nargentino' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '26px 22px', borderRight: i < 4 ? '1px solid rgba(108,174,82,0.18)' : undefined }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#6CAE52', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 7, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Production */}
        <div style={{ padding: '28px 48px', borderBottom: '1px solid rgba(108,174,82,0.22)', background: 'rgba(31,37,102,0.25)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 14 }}>
            PRODUCCIÓN {production.periodo}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 68, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>{production.val}</div>
            <div>
              <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>{production.unit}</div>
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 999, color: '#031636', background: '#6CAE52' }}>
                {production.mix}
              </span>
            </div>
          </div>
        </div>

        {/* Blocks */}
        <div style={{ padding: '28px 48px', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 16 }}>
            6 BLOQUES EN 4 CUENCAS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {blocks.map((b, i) => (
              <div key={b.slug} style={{ background: 'rgba(31,37,102,0.55)', border: '1px solid rgba(108,174,82,0.22)', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#6CAE52', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>BLOQUE 0{i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 4 }}>{b.titulo}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>{b.subtitulo}</div>
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, color: '#fff', background: COMM_COLOR[b.commodity] }}>
                  {COMM_LABEL[b.commodity]}{b.wi ? ' · ' + b.wi : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stock + Ratings */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: '28px 48px', borderRight: '1px solid rgba(108,174,82,0.22)', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 16 }}>MERCADO DE CAPITALES · TSXV</div>
            <div style={{ fontFamily: 'monospace', fontSize: 48, fontWeight: 500, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {stock?.price ?? '…'}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, color: deltaColor, marginTop: 8 }}>
              {stock ? `${stock.delta} (${stock.deltaP}) al cierre` : 'Cargando…'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 20 }}>
              {[
                { label: 'Cap. de mercado', val: stock?.cap    ?? '—' },
                { label: 'Acciones',        val: stock?.shares ?? '—' },
                { label: 'Máx. 52 sem.',    val: stock?.high52 ?? '—' },
                { label: 'Mín. 52 sem.',    val: stock?.low52  ?? '—' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 500, color: '#fff' }}>{m.val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3, letterSpacing: '0.06em' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '28px 48px', borderBottom: '1px solid rgba(108,174,82,0.22)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 16 }}>CALIFICACIONES FIX SCR · MAY 2026</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(108,174,82,0.2)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: '#031636', background: '#6CAE52', padding: '8px 18px', borderRadius: 8 }}>BBB(arg)</div>
              <div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Largo Plazo · Emisor</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Perspectiva Estable · Confirma</div>
              </div>
            </div>
            {RATINGS.map(r => (
              <div key={r.isin} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#031636', background: ratingColor(r.rating), padding: '4px 10px', borderRadius: 6, flexShrink: 0, minWidth: 80, textAlign: 'center' }}>{r.rating}</div>
                <div>
                  <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 2 }}>{r.concepto}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{r.isin}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '18px 48px', background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#6CAE52', letterSpacing: '0.04em' }}>crown-point-energia.vercel.app</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Relaciones con Inversores</div>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', maxWidth: 360, textAlign: 'right', lineHeight: 1.5 }}>
            Datos orientativos. No constituyen asesoramiento de inversión.<br/>Fuentes: CMS, Yahoo Finance, FIX SCR.
          </div>
        </div>
      </div>

      <div style={{ height: 48 }} />
    </div>
  )
}

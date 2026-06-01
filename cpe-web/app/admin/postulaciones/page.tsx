'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Application = {
  id: string; nombre: string; email: string; telefono: string
  linkedin: string; area: string; mensaje: string
  cv_path: string | null; cv_name: string | null; cv_size: number | null
  estado: string; notas: string; created_at: string
}

const ESTADO_COLORS: Record<string, { bg: string; fg: string }> = {
  nueva:      { bg: 'rgba(108,174,82,0.15)', fg: 'var(--cp-green-deep)' },
  revisada:   { bg: 'rgba(201,162,74,0.15)', fg: 'var(--cp-gold-deep)' },
  contactada: { bg: 'rgba(47,160,138,0.15)', fg: '#2FA08A' },
  descartada: { bg: 'var(--bg-alt)',          fg: 'var(--fg-muted)' },
}

const AREA_LABELS: Record<string, string> = {
  drilling: 'Perforación & completación',
  prodops: 'Producción & operaciones',
  geo: 'Geología & geofísica',
  finance: 'Finance & IR',
  hse: 'HSE & ESG',
  it: 'Tecnología & sistemas',
  other: 'Otro',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PostulacionesPage() {
  const [items, setItems] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/carreras')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sel = selected ? items.find(i => i.id === selected) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/admin" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>
            ← Panel CMS
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 4px' }}>
            Postulaciones
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
            CVs y postulaciones recibidas desde /carreras
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>No hay postulaciones todavía.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1.2fr' : '1fr', gap: 20 }}>
            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {items.map((item, i) => {
                const colors = ESTADO_COLORS[item.estado] ?? ESTADO_COLORS.nueva
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelected(item.id === selected ? null : item.id)}
                    style={{
                      padding: '14px 18px', cursor: 'pointer',
                      borderBottom: i < items.length - 1 ? '1px solid var(--rule)' : 'none',
                      background: item.id === selected ? 'var(--bg-alt)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{item.nombre}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: 'var(--r-pill)',
                        background: colors.bg, color: colors.fg,
                      }}>
                        {item.estado}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                      {AREA_LABELS[item.area] ?? item.area} · {fmtDate(item.created_at)}
                      {item.cv_path && ' · CV'}
                    </div>
                  </div>
                )
              })}
            </div>

            {sel && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>{sel.nombre}</h2>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 20px' }}>{fmtDate(sel.created_at)}</p>

                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                  <Row label="Email" val={sel.email} href={`mailto:${sel.email}`} />
                  {sel.telefono && <Row label="Teléfono" val={sel.telefono} href={`tel:${sel.telefono}`} />}
                  {sel.linkedin && <Row label="LinkedIn" val={sel.linkedin} href={sel.linkedin} />}
                  <Row label="Área" val={AREA_LABELS[sel.area] ?? sel.area} />
                </div>

                {sel.cv_path && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${sel.cv_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6"/>
                      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    {sel.cv_name ?? 'Descargar CV'}
                    {sel.cv_size ? ` (${fmtSize(sel.cv_size)})` : ''}
                  </a>
                )}

                <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Mensaje</div>
                  <p style={{ fontSize: 14, color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{sel.mensaje}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, val, href }: { label: string; val: string; href?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{val}</a>
      ) : (
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{val}</span>
      )}
    </div>
  )
}

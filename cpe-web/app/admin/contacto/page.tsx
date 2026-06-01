'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Submission = {
  id: string; tipo: string; nombre: string; organizacion: string
  email: string; telefono: string; mensaje: string
  estado: string; notas: string; created_at: string
}

const ESTADOS = ['nueva', 'respondida', 'archivada'] as const
const ESTADO_CONF: Record<string, { label: string; bg: string; fg: string }> = {
  nueva:     { label: 'Nueva',     bg: 'rgba(47,160,138,0.15)', fg: '#2FA08A' },
  respondida:{ label: 'Respondida',bg: 'rgba(108,174,82,0.15)', fg: 'var(--cp-green-deep)' },
  archivada: { label: 'Archivada', bg: 'var(--bg-alt)',          fg: 'var(--fg-muted)' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export default function ContactoAdminPage() {
  const [items, setItems] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('todas')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/contacto')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function update(id: string, patch: { estado?: string; notas?: string }) {
    const res = await fetch('/api/admin/contacto', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
      flash('Actualizado')
    }
  }

  async function remove(item: Submission) {
    if (!confirm(`¿Eliminar consulta de "${item.nombre}"?`)) return
    const res = await fetch('/api/admin/contacto', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== item.id))
      if (selected === item.id) setSelected(null)
      flash('Eliminada')
    }
  }

  const filtered = filter === 'todas' ? items : items.filter(i => i.estado === filter)
  const sel = selected ? items.find(i => i.id === selected) : null
  const nuevas = items.filter(i => i.estado === 'nueva').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/admin" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>← Panel CMS</Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                Consultas de contacto
              </h1>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
                Mensajes recibidos desde /contacto
                {nuevas > 0 && <span style={{ marginLeft: 8, background: '#2FA08A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>{nuevas} nuevas</span>}
              </p>
            </div>
            {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['todas', ...ESTADOS].map(e => (
            <button key={e} onClick={() => setFilter(e)} className="btn" style={{
              fontSize: 12, padding: '6px 14px',
              fontWeight: filter === e ? 700 : 400,
              background: filter === e ? (ESTADO_CONF[e]?.bg ?? 'var(--accent)') : undefined,
              color: filter === e ? (ESTADO_CONF[e]?.fg ?? '#fff') : undefined,
            }}>
              {e === 'todas' ? `Todas (${items.length})` : `${ESTADO_CONF[e]?.label} (${items.filter(i => i.estado === e).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14, fontStyle: 'italic' }}>No hay consultas.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1.3fr' : '1fr', gap: 20 }}>
            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)', maxHeight: '70vh', overflowY: 'auto' }}>
              {filtered.map((item, i) => {
                const ec = ESTADO_CONF[item.estado] ?? ESTADO_CONF.nueva
                return (
                  <div key={item.id} onClick={() => setSelected(item.id === selected ? null : item.id)} style={{
                    padding: '14px 18px', cursor: 'pointer',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--rule)' : 'none',
                    background: item.id === selected ? 'var(--bg-alt)' : 'transparent',
                    borderLeft: item.estado === 'nueva' ? '3px solid #2FA08A' : '3px solid transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{item.nombre}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 'var(--r-pill)', background: ec.bg, color: ec.fg }}>{ec.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                      {item.tipo} · {item.organizacion} · hace {daysSince(item.created_at) === 0 ? 'hoy' : `${daysSince(item.created_at)}d`}
                    </div>
                  </div>
                )
              })}
            </div>

            {sel && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: 0 }}>{sel.nombre}</h2>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>{sel.organizacion} · {fmtDate(sel.created_at)}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="btn" style={{ fontSize: 12, padding: '4px 10px' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                  {ESTADOS.map(e => {
                    const ec = ESTADO_CONF[e]
                    const active = sel.estado === e
                    return (
                      <button key={e} onClick={() => update(sel.id, { estado: e })} className="btn" style={{
                        flex: 1, fontSize: 11, padding: '8px 4px', fontWeight: active ? 700 : 400,
                        background: active ? ec.bg : undefined, color: active ? ec.fg : 'var(--fg-muted)',
                      }}>{ec.label}</button>
                    )
                  })}
                </div>

                <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                  <Row label="Tipo" val={sel.tipo} />
                  <Row label="Email" val={sel.email} href={`mailto:${sel.email}`} />
                  {sel.telefono && <Row label="Teléfono" val={sel.telefono} href={`tel:${sel.telefono}`} />}
                </div>

                <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Mensaje</div>
                  <p style={{ fontSize: 14, color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{sel.mensaje}</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Notas internas</div>
                  <textarea rows={3} defaultValue={sel.notas} placeholder="Agregar notas…"
                    onBlur={e => { if (e.target.value !== sel.notas) update(sel.id, { notas: e.target.value }) }}
                    style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontSize: 13 }} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`mailto:${sel.email}?subject=Re: ${sel.tipo} — Crown Point Energy`} className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px', textDecoration: 'none' }}>
                    Responder por email
                  </a>
                  <button onClick={() => remove(sel)} className="btn" style={{ fontSize: 12, padding: '8px 14px', color: 'var(--cp-negative)' }}>Eliminar</button>
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
      {href ? <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{val}</a>
        : <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{val}</span>}
    </div>
  )
}

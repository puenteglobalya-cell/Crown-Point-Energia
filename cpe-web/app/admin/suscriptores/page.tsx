'use client'

import { useCallback, useEffect, useState } from 'react'

type Subscriber = {
  id: string; nombre: string; email: string
  activo: boolean; created_at: string; updated_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SuscriptoresAdminPage() {
  const [items, setItems] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'activas' | 'inactivas'>('todas')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/suscriptores')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function toggle(id: string, activo: boolean) {
    const res = await fetch('/api/admin/suscriptores', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, activo }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, activo } : i))
      flash(activo ? 'Activado' : 'Desactivado')
    }
  }

  async function remove(item: Subscriber) {
    if (!confirm(`¿Eliminar suscriptor "${item.email}"?`)) return
    const res = await fetch('/api/admin/suscriptores', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== item.id))
      flash('Eliminado')
    }
  }

  const filtered = filter === 'todas' ? items : items.filter(i => filter === 'activas' ? i.activo : !i.activo)
  const activas = items.filter(i => i.activo).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                Suscriptores IR
              </h1>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
                Lista de correo — Relaciones con Inversores
                <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>{activas} activos</span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>&#10003; {msg}</span>}
              <a href={`/api/admin/suscriptores/export?filter=${filter}`} className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px', textDecoration: 'none' }}>
                Exportar Excel
              </a>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['todas', 'activas', 'inactivas'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="btn" style={{
              fontSize: 12, padding: '6px 14px',
              fontWeight: filter === f ? 700 : 400,
              background: filter === f ? 'var(--accent)' : undefined,
              color: filter === f ? '#fff' : undefined,
            }}>
              {f === 'todas' ? `Todas (${items.length})` : f === 'activas' ? `Activas (${activas})` : `Inactivas (${items.length - activas})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando&hellip;</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14, fontStyle: 'italic' }}>No hay suscriptores.</p>
        ) : (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 120px 100px 60px', padding: '10px 18px', borderBottom: '1px solid var(--rule)', background: 'var(--bg-alt)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Nombre</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Email</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Fecha</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', textAlign: 'center' }}>Estado</span>
              <span />
            </div>
            {filtered.map((item, i) => (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 1.4fr 120px 100px 60px', alignItems: 'center',
                padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--rule)' : 'none',
              }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{item.nombre || '—'}</span>
                <a href={`mailto:${item.email}`} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{item.email}</a>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{fmtDate(item.created_at).split(',')[0]}</span>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => toggle(item.id, !item.activo)} className="btn" style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)',
                    background: item.activo ? 'rgba(47,160,138,0.15)' : 'var(--bg-alt)',
                    color: item.activo ? '#2FA08A' : 'var(--fg-muted)',
                  }}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => remove(item)} className="btn" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--cp-negative)' }}>&times;</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

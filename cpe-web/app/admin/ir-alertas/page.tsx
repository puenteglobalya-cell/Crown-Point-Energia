'use client'

import { useState, useEffect } from 'react'

interface Recipient {
  id: string
  nombre: string
  email: string
  activo: boolean
  created_at: string
}

interface DeadlineInfo {
  quarter: string
  closeDate: Date
  deadline: Date
  daysElapsed: number
  daysLeft: number
  status: 'upcoming' | 'warning' | 'urgent' | 'overdue' | 'future'
}

function getQuarterDeadlines(): DeadlineInfo[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const quarters: Array<{ q: string; close: Date }> = []
  for (const year of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
    quarters.push(
      { q: 'Q1', close: new Date(year,  2, 31) },
      { q: 'Q2', close: new Date(year,  5, 30) },
      { q: 'Q3', close: new Date(year,  8, 30) },
      { q: 'Q4', close: new Date(year, 11, 31) },
    )
  }

  return quarters
    .map(({ q, close }) => {
      const deadline = new Date(close)
      deadline.setDate(deadline.getDate() + 80)
      const daysElapsed = Math.floor((today.getTime() - close.getTime()) / 86_400_000)
      const daysLeft    = 80 - daysElapsed
      let status: DeadlineInfo['status'] = 'future'
      if (daysElapsed < 0) status = 'future'
      else if (daysLeft > 20) status = 'upcoming'
      else if (daysLeft > 10) status = 'warning'
      else if (daysLeft > 0)  status = 'urgent'
      else status = 'overdue'
      return { quarter: `${q} ${close.getFullYear()}`, closeDate: close, deadline, daysElapsed, daysLeft, status }
    })
    .filter(d => d.daysElapsed >= -5 && d.daysElapsed <= 100) // show ±window
    .sort((a, b) => a.closeDate.getTime() - b.closeDate.getTime())
}

const STATUS_COLORS: Record<string, string> = {
  future:   'var(--fg-muted)',
  upcoming: 'var(--cp-green-deep, #1e6b3e)',
  warning:  '#b7680e',
  urgent:   '#c0392b',
  overdue:  '#c0392b',
}

const STATUS_BG: Record<string, string> = {
  future:   'var(--bg-alt)',
  upcoming: 'color-mix(in oklab, #1e6b3e 10%, var(--surface))',
  warning:  'color-mix(in oklab, #f39c12 10%, var(--surface))',
  urgent:   'color-mix(in oklab, #c0392b 10%, var(--surface))',
  overdue:  'color-mix(in oklab, #c0392b 14%, var(--surface))',
}

const STATUS_LABEL: Record<string, string> = {
  future:   'Próximo',
  upcoming: 'En curso',
  warning:  'Atención',
  urgent:   'Urgente',
  overdue:  'Vencido',
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function IrAlertasPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [nombre, setNombre]         = useState('')
  const [email, setEmail]           = useState('')
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null)

  const deadlines = getQuarterDeadlines()

  useEffect(() => {
    fetch('/api/admin/ir-alertas')
      .then(r => r.json())
      .then(d => { setRecipients(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/ir-alertas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setRecipients(prev => [...prev, json])
      setNombre(''); setEmail('')
      setMsg({ text: 'Destinatario agregado', ok: true })
    } catch (err) {
      setMsg({ text: (err as Error).message, ok: false })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(r: Recipient) {
    const next = !r.activo
    setRecipients(prev => prev.map(x => x.id === r.id ? { ...x, activo: next } : x))
    const res = await fetch(`/api/admin/ir-alertas/${r.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activo: next }),
    })
    if (!res.ok) {
      setRecipients(prev => prev.map(x => x.id === r.id ? { ...x, activo: r.activo } : x))
      setMsg({ text: 'Error al actualizar', ok: false })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este destinatario?')) return
    setRecipients(prev => prev.filter(r => r.id !== id))
    const res = await fetch(`/api/admin/ir-alertas/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const fresh = await fetch('/api/admin/ir-alertas')
      const data = await fresh.json()
      setRecipients(Array.isArray(data) ? data : [])
      setMsg({ text: 'Error al eliminar', ok: false })
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 4px' }}>Admin</p>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Alertas IR — Vencimientos y Notificaciones
      </h1>
      <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '0 0 32px' }}>
        Alertas automáticas de vencimientos de filing (días 60/70/80 post-cierre de trimestre) y lista de destinatarios que reciben notificación cuando se publica un documento relevante para inversores.
      </p>

      {/* Deadline calendar */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
          Calendario de vencimientos (80 días post-cierre)
        </div>
        <div style={{ padding: '8px 0' }}>
          {deadlines.map(d => (
            <div key={d.quarter} style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 130px 130px 90px',
              alignItems: 'center',
              gap: 12,
              padding: '10px 20px',
              borderBottom: '1px solid var(--rule)',
              background: STATUS_BG[d.status],
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                {d.quarter}
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Cierre: <strong>{fmtDate(d.closeDate)}</strong></span>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Límite: <strong>{fmtDate(d.deadline)}</strong></span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {d.daysElapsed >= 0 ? `${d.daysElapsed} días transcurridos` : `Cierra en ${-d.daysElapsed} días`}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[d.status] }}>
                {d.daysElapsed >= 0 && d.daysLeft > 0 ? `${d.daysLeft} días restantes` : d.daysLeft <= 0 && d.daysElapsed >= 0 ? '— sin tiempo' : '—'}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 'var(--r-pill)',
                color: STATUS_COLORS[d.status],
                background: 'color-mix(in oklab, currentColor 12%, var(--surface))',
              }}>
                {STATUS_LABEL[d.status]}
              </span>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px', fontSize: 11, color: 'var(--fg-muted)' }}>
          El cron envía alertas automáticas a <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-alt)', padding: '1px 5px', borderRadius: 3 }}>CMS_ADMIN_EMAILS</code> los días exactos 60, 70 y 80 post-cierre si no hay un reporte publicado para ese trimestre.
        </div>
      </div>

      {/* Recipient list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
            Lista de notificaciones de publicación
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            Estas casillas reciben un email cuando se publica un Estado Contable, Hecho Relevante u otro documento de interés para el inversor.
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</div>
        ) : recipients.length === 0 ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--fg-muted)' }}>Sin destinatarios aún.</div>
        ) : (
          <div>
            {recipients.map(r => (
              <div key={r.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px 60px 40px',
                alignItems: 'center',
                gap: 12,
                padding: '12px 20px',
                borderBottom: '1px solid var(--rule)',
                opacity: r.activo ? 1 : 0.5,
              }}>
                <div>
                  {r.nombre && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{r.nombre}</div>}
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{r.email}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  Desde {new Date(r.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <button
                  onClick={() => toggleActive(r)}
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: 'var(--r-pill)', border: '1px solid var(--rule)',
                    cursor: 'pointer',
                    background: r.activo ? 'color-mix(in oklab, var(--cp-green-deep,#1e6b3e) 10%, var(--surface))' : 'var(--bg-alt)',
                    color: r.activo ? 'var(--cp-green-deep,#1e6b3e)' : 'var(--fg-muted)',
                  }}
                >
                  {r.activo ? 'Activo' : 'Pausado'}
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 16, padding: '4px', lineHeight: 1 }}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <form onSubmit={handleAdd} style={{ padding: '16px 20px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Juan Pérez"
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', background: 'var(--bg-alt)', color: 'var(--fg)' }}
            />
          </div>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="juan@ejemplo.com"
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', background: 'var(--bg-alt)', color: 'var(--fg)' }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ padding: '9px 20px', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Agregando…' : 'Agregar'}
          </button>
        </form>
        {msg && (
          <div style={{ padding: '8px 20px 12px', fontSize: 12, color: msg.ok ? 'var(--cp-green-deep,#1e6b3e)' : 'var(--danger,#c0392b)' }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Help */}
      <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-lg)', padding: '16px 20px', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--fg)' }}>¿Qué dispara una notificación a esta lista?</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>Publicación de un Reporte Financiero (Estados Contables trimestrales/anuales)</li>
          <li>Publicación de un Comunicado marcado como "Hecho relevante"</li>
        </ul>
        <p style={{ margin: '10px 0 0' }}>
          Para documentos regulatorios, la notificación se activa al marcar el documento como publicado. El email incluye el título, descripción y el link directo al documento.
        </p>
      </div>

    </div>
  )
}

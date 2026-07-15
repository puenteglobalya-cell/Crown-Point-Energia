'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ConfirmDialog from '@/components/ConfirmDialog'

type ReporteItem = {
  id: string
  type_id: string | null
  titulo: string
  periodo: string
  estado: string
  file_name: string | null
  file_size: number | null
  created_at: string
}

type AccessRow = { type_id: string; role: string; can_view: boolean; can_upload: boolean }
type TypeRow   = { id: string; nombre: string }

const ROLES = ['viewer', 'uploader', 'admin'] as const
type Role = typeof ROLES[number]

const ROLE_LABELS: Record<Role, string> = { viewer: 'Lector', uploader: 'Cargador', admin: 'Admin' }

const TYPE_LABELS: Record<string, string> = {
  ingresos:   'Ingresos',
  accionista: 'Seguimiento',
  produccion: 'Producción',
  financiero: 'Financiero',
}
const TYPE_ICONS: Record<string, string> = {
  ingresos: '📊', accionista: '📋', produccion: '⛽', financiero: '💰',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtSize(b: number | null) {
  if (!b) return ''
  return b < 1_048_576 ? `${Math.round(b / 1024)} KB` : `${(b / 1_048_576).toFixed(1)} MB`
}

// ── Level helpers ─────────────────────────────────────────────
type Level = 'none' | 'view' | 'upload'
function toLevel(row: AccessRow | undefined): Level {
  if (!row || !row.can_view) return 'none'
  return row.can_upload ? 'upload' : 'view'
}
function fromLevel(level: Level) {
  return { can_view: level !== 'none', can_upload: level === 'upload' }
}

// ── Component ─────────────────────────────────────────────────
export default function ReportesAdminPage() {
  const [items, setItems]             = useState<ReporteItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterType, setFilterType]   = useState<string>('all')
  const [filterEstado, setFilterEstado] = useState<string>('all')
  const [msg, setMsg]                 = useState('')
  const [msgType, setMsgType]         = useState<'ok' | 'err' | 'info'>('info')
  const [regenIds, setRegenIds]       = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId]       = useState('')
  const [confirmPublish, setConfirmPublish] = useState<ReporteItem | null>(null)
  const [confirmRegen, setConfirmRegen]     = useState<ReporteItem | null>(null)
  const [publishing, setPublishing]         = useState(false)

  // Permissions matrix
  const [types, setTypes]       = useState<TypeRow[]>([])
  const [access, setAccess]     = useState<AccessRow[]>([])
  const [savingKey, setSavingKey] = useState('')

  const loadList = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/reportes')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  const loadAccess = useCallback(async () => {
    const res = await fetch('/api/admin/reportes/acceso')
    if (res.ok) {
      const { types: t, access: a } = await res.json()
      setTypes(t); setAccess(a)
    }
  }, [])

  useEffect(() => { loadList(); loadAccess() }, [loadList, loadAccess])

  async function toggleEstado(item: ReporteItem) {
    const nuevoEstado = item.estado === 'publicado' ? 'borrador' : 'publicado'
    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/reportes/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        setItems(prev => prev.map(r => r.id === item.id ? { ...r, estado: nuevoEstado } : r))
        flash(nuevoEstado === 'publicado' ? '✓ Publicado' : '↙ Vuelto a borrador', 'ok')
      } else {
        flash('✗ Error al cambiar estado', 'err')
      }
    } finally {
      setPublishing(false)
      setConfirmPublish(null)
    }
  }

  async function handleDelete(item: ReporteItem) {
    if (!confirm(`¿Eliminar "${item.titulo}"?`)) return
    const res = await fetch(`/api/admin/reportes/${item.id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(r => r.id !== item.id))
      flash('Eliminado')
    }
  }

  async function handleRegenerar(item: ReporteItem) {
    setRegenIds(prev => new Set(prev).add(item.id))
    flash('Regenerando…', 'info')
    try {
      const res = await fetch(`/api/admin/reportes/${item.id}/regenerar`, { method: 'POST' })
      if (res.ok) {
        flash('✓ HTML regenerado correctamente', 'ok')
      } else {
        const body = await res.json().catch(() => ({}))
        flash('✗ ' + (body.error ?? 'Error al regenerar'), 'err')
      }
    } finally {
      setRegenIds(prev => { const s = new Set(prev); s.delete(item.id); return s })
    }
  }

  async function handleCopy(id: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/api/admin/reportes/${id}`)
    setCopiedId(id); setTimeout(() => setCopiedId(''), 1800)
  }

  async function handleAccessChange(type_id: string, role: string, level: Level) {
    const key = `${type_id}:${role}`
    setSavingKey(key)
    const res = await fetch('/api/admin/reportes/acceso', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type_id, role, ...fromLevel(level) }),
    })
    if (res.ok) {
      setAccess(prev => {
        const next = prev.filter(r => !(r.type_id === type_id && r.role === role))
        next.push({ type_id, role, ...fromLevel(level) })
        return next
      })
      flash('Guardado')
    }
    setSavingKey('')
  }

  function flash(m: string, type: 'ok' | 'err' | 'info' = 'info') {
    setMsg(m); setMsgType(type)
    setTimeout(() => setMsg(''), type === 'ok' || type === 'err' ? 5000 : 2500)
  }

  // Filtered list
  const filtered = items.filter(it => {
    if (filterType !== 'all' && it.type_id !== filterType) return false
    if (filterEstado !== 'all' && it.estado !== filterEstado) return false
    return true
  })

  const allTypes = [...new Set(items.map(it => it.type_id).filter(Boolean))] as string[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
              Reportes
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>Gestión de todos los tipos de reportes</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href="/admin/reportes/comparar"
              className="btn"
              style={{ textDecoration: 'none', padding: '10px 18px', fontSize: 13 }}
            >
              ⇄ Comparar ingresos
            </Link>
            <Link
              href="/portal/subir"
              className="btn btn-primary"
              style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 13 }}
            >
              + Subir reporte
            </Link>
          </div>
        </div>

        {msg && (
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: msgType === 'ok' ? '#276749' : msgType === 'err' ? '#9B2C2C' : 'var(--fg-soft)',
            background: msgType === 'ok' ? '#F0FFF4' : msgType === 'err' ? '#FFF5F5' : 'var(--surface)',
            border: `1px solid ${msgType === 'ok' ? '#9AE6B4' : msgType === 'err' ? '#FEB2B2' : 'var(--rule)'}`,
            borderRadius: 'var(--r-sm)', padding: '10px 18px', marginBottom: 16,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,.07)',
          }}>
            {msg}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ fontSize: 13, padding: '7px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', background: 'var(--surface)', color: 'var(--fg)' }}
          >
            <option value="all">Todos los tipos</option>
            {allTypes.map(t => (
              <option key={t} value={t}>{TYPE_ICONS[t] ?? ''} {TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            style={{ fontSize: 13, padding: '7px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', background: 'var(--surface)', color: 'var(--fg)' }}
          >
            <option value="all">Todos los estados</option>
            <option value="publicado">Publicado</option>
            <option value="borrador">Borrador</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)', alignSelf: 'center' }}>
            {filtered.length} / {items.length}
          </span>
        </div>

        {/* Report list */}
        <section style={{ marginBottom: 48 }}>
          {loading ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Cargando…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Sin resultados.</p>
          ) : (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {filtered.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12, alignItems: 'center',
                    padding: '14px 18px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  {/* Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      {item.type_id && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
                          padding: '2px 7px', borderRadius: 'var(--r-pill)',
                          background: 'rgba(31,37,102,.08)', color: 'var(--accent)',
                        }}>
                          {TYPE_ICONS[item.type_id] ?? ''} {TYPE_LABELS[item.type_id] ?? item.type_id}
                        </span>
                      )}
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 'var(--r-pill)',
                        background: item.estado === 'publicado' ? 'rgba(108,174,82,.15)' : 'var(--bg-alt)',
                        color: item.estado === 'publicado' ? 'var(--cp-green-deep)' : 'var(--fg-muted)',
                      }}>
                        {item.estado}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{item.titulo}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.periodo} · {fmtDate(item.created_at)}
                      {item.file_size ? ` · ${fmtSize(item.file_size)}` : ''}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => item.estado === 'publicado' ? toggleEstado(item) : setConfirmPublish(item)}
                      style={{
                        fontSize: 11, padding: '5px 11px', cursor: 'pointer',
                        background: 'none',
                        border: `1px solid ${item.estado === 'publicado' ? 'var(--rule)' : 'var(--cp-green-deep, #2C7A5B)'}`,
                        borderRadius: 'var(--r-sm)',
                        color: item.estado === 'publicado' ? 'var(--fg-soft)' : 'var(--cp-green-deep, #2C7A5B)',
                        fontWeight: item.estado === 'publicado' ? 400 : 700,
                      }}
                      title={item.estado === 'publicado' ? 'Pasar a borrador' : 'Publicar'}
                    >
                      {item.estado === 'publicado' ? '↙ Borrador' : '↗ Publicar'}
                    </button>
                    <button
                      onClick={() => handleCopy(item.id)}
                      style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: copiedId === item.id ? 'var(--cp-green-deep)' : 'var(--fg-muted)' }}
                      title="Copiar enlace"
                    >
                      {copiedId === item.id ? '✓' : '🔗'}
                    </button>
                    {(!item.type_id || item.type_id === 'ingresos') && (
                      <a
                        href={`/api/admin/reportes/${item.id}/excel`}
                        className="btn"
                        style={{ fontSize: 11, padding: '5px 10px', textDecoration: 'none' }}
                        title="Descargar Excel"
                      >
                        ↓ XLS
                      </a>
                    )}
                    <a
                      href={`/api/admin/reportes/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '6px 14px', textDecoration: 'none' }}
                    >
                      Ver / PDF
                    </a>
                    <button
                      onClick={() => setConfirmRegen(item)}
                      disabled={regenIds.has(item.id)}
                      style={{
                        background: 'none', border: '1px solid var(--rule)',
                        borderRadius: 'var(--r-sm)', padding: '5px 10px',
                        cursor: regenIds.has(item.id) ? 'not-allowed' : 'pointer',
                        fontSize: 11, color: 'var(--fg-soft)',
                        display: 'flex', alignItems: 'center', gap: 4,
                        opacity: regenIds.has(item.id) ? 0.5 : 1,
                        minWidth: 80,
                      }}
                      title="Regenerar HTML desde datos guardados"
                    >
                      {regenIds.has(item.id) ? '⟳ Generando…' : '↺ Regen.'}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', padding: '5px 9px', cursor: 'pointer', fontSize: 12, color: 'var(--cp-negative, #C0392B)' }}
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Permission matrix */}
        {types.length > 0 && (
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Acceso por rol y tipo
            </h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 16px' }}>
              Define qué puede hacer cada perfil con cada tipo de reporte.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--rule)' }}>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-soft)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      Tipo de reporte
                    </th>
                    {ROLES.map(r => (
                      <th key={r} style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--fg-soft)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        {ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {types.map((t, ti) => (
                    <tr key={t.id} style={{ borderBottom: ti < types.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--fg)' }}>
                        <span style={{ marginRight: 6 }}>{TYPE_ICONS[t.id] ?? '📄'}</span>
                        {t.nombre}
                      </td>
                      {ROLES.map(role => {
                        const row = access.find(a => a.type_id === t.id && a.role === role)
                        const level = toLevel(row)
                        const key = `${t.id}:${role}`
                        const saving = savingKey === key
                        return (
                          <td key={role} style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <select
                              value={level}
                              disabled={saving}
                              onChange={e => handleAccessChange(t.id, role, e.target.value as Level)}
                              style={{
                                fontSize: 12, padding: '5px 10px',
                                border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)',
                                background: level === 'none' ? 'var(--bg-alt)' : level === 'upload' ? 'rgba(108,174,82,.1)' : 'rgba(31,37,102,.06)',
                                color: level === 'none' ? 'var(--fg-muted)' : 'var(--fg)',
                                cursor: 'pointer',
                                opacity: saving ? 0.5 : 1,
                              }}
                            >
                              <option value="none">— Sin acceso</option>
                              <option value="view">👁 Solo ver</option>
                              <option value="upload">✎ Ver y subir</option>
                            </select>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 10 }}>
              Los cambios aplican al siguiente login o recarga de sesión del usuario afectado.
            </p>
          </section>
        )}

      </div>

      <ConfirmDialog
        open={!!confirmPublish}
        title="Publicar reporte"
        message={`Publicar "${confirmPublish?.titulo}" enviará un email a los suscriptores IR y una notificación push a los usuarios del portal. Esta acción no se puede deshacer (los mensajes ya enviados no se pueden retirar).`}
        confirmLabel="Sí, publicar"
        tone="warning"
        busy={publishing}
        onConfirm={() => confirmPublish && toggleEstado(confirmPublish)}
        onCancel={() => setConfirmPublish(null)}
      />

      <ConfirmDialog
        open={!!confirmRegen}
        title="Regenerar HTML"
        message={`Se va a regenerar el HTML de "${confirmRegen?.titulo}" a partir de los datos guardados, sobrescribiendo el HTML actual. Si hubo ediciones manuales posteriores, se perderán.`}
        confirmLabel="Sí, regenerar"
        tone="warning"
        onConfirm={() => { if (confirmRegen) { handleRegenerar(confirmRegen); setConfirmRegen(null) } }}
        onCancel={() => setConfirmRegen(null)}
      />
    </div>
  )
}

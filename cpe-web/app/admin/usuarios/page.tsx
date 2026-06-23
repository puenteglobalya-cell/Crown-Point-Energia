'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PERMISSIONS, PERMISSION_KEYS, ADMIN_LOCKED } from '@/lib/permissions-config'

type UserWithRole = {
  id: string
  email: string
  role: string | null
  activo: boolean | null
  created_at: string
  last_sign_in_at: string | null
}

type BibGrupo = { id: number; slug: string; label: string; orden: number }
type BibUG    = { user_id: string; grupo_id: number }

type PermMatrix = Record<string, Record<string, boolean>>

const ROLES = ['viewer', 'uploader', 'admin', 'rrhh', 'accionista'] as const
const MATRIX_ROLES = ['viewer', 'uploader', 'admin', 'rrhh', 'accionista'] as const
const ROLE_LABELS: Record<string, string> = {
  viewer:     'Consulta',
  uploader:   'Carga',
  admin:      'Admin',
  rrhh:       'RRHH',
  accionista: 'Accionista',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Sin rol</span>
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 'var(--r-pill)',
      background: role === 'admin'
        ? 'rgba(108,174,82,0.15)'
        : role === 'uploader'
        ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
        : role === 'accionista'
        ? 'rgba(180,130,0,0.12)'
        : 'var(--bg-alt)',
      color: role === 'admin'
        ? 'var(--cp-green-deep)'
        : role === 'uploader'
        ? 'var(--accent)'
        : role === 'accionista'
        ? '#9a6f00'
        : 'var(--fg-muted)',
      border: '1px solid',
      borderColor: role === 'admin'
        ? 'rgba(108,174,82,0.3)'
        : role === 'uploader'
        ? 'color-mix(in oklab, var(--accent) 30%, transparent)'
        : role === 'accionista'
        ? 'rgba(180,130,0,0.3)'
        : 'var(--rule)',
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Biblioteca groups
  const [bibGrupos, setBibGrupos]       = useState<BibGrupo[]>([])
  const [usuarioGrupos, setUsuarioGrupos] = useState<BibUG[]>([])

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'uploader' | 'admin' | 'accionista'>('viewer')
  const [inviting, setInviting] = useState(false)

  // Permissions matrix
  const [matrix, setMatrix] = useState<PermMatrix | null>(null)
  const [matrixLoading, setMatrixLoading] = useState(true)

  // Provisional password modal
  const [pwdModal, setPwdModal] = useState<{ id: string; email: string } | null>(null)
  const [pwdInput, setPwdInput] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdCopied, setPwdCopied] = useState(false)

  function generatePassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  function openPwdModal(user: UserWithRole) {
    setPwdInput(generatePassword())
    setPwdCopied(false)
    setPwdModal({ id: user.id, email: user.email })
  }

  async function handleSetPassword() {
    if (!pwdModal) return
    setPwdSaving(true)
    const res = await fetch(`/api/admin/usuarios/${pwdModal.id}/set-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pwdInput }),
    })
    if (res.ok) {
      showFlash(`Contraseña provisional establecida para ${pwdModal.email}`)
      setPwdModal(null)
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
      showFlash(error ?? 'Error al establecer contraseña', 'err')
    }
    setPwdSaving(false)
  }

  // Acceso modal (accionista report access)
  const [accesoModal, setAccesoModal] = useState<{ userId: string; email: string } | null>(null)
  const [accesoReportes, setAccesoReportes] = useState<{id:string;titulo:string;periodo:string;type_id:string|null}[]>([])
  const [accesoSelected, setAccesoSelected] = useState<Set<string>>(new Set())
  const [accesoLoading, setAccesoLoading] = useState(false)
  const [accesoSaving, setAccesoSaving] = useState(false)

  function showFlash(msg: string, type: 'ok' | 'err' = 'ok') {
    setFlash({ msg, type })
    setTimeout(() => setFlash(null), 4000)
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios')
    if (res.ok) setUsers(await res.json())
    else showFlash('Error al cargar usuarios', 'err')
    setLoading(false)
  }, [])

  const loadMatrix = useCallback(async () => {
    setMatrixLoading(true)
    const res = await fetch('/api/admin/permisos')
    if (res.ok) setMatrix(await res.json())
    setMatrixLoading(false)
  }, [])

  const loadBibData = useCallback(async () => {
    const res = await fetch('/api/admin/biblioteca')
    if (res.ok) {
      const data = await res.json()
      setBibGrupos(data.grupos ?? [])
      setUsuarioGrupos(data.usuarioGrupos ?? [])
    }
  }, [])

  async function handleBibGrupoToggle(userId: string, grupoId: number, checked: boolean) {
    const current = usuarioGrupos.filter(ug => ug.user_id === userId).map(ug => ug.grupo_id)
    const next = checked ? [...current, grupoId] : current.filter(id => id !== grupoId)
    setUsuarioGrupos(prev => [
      ...prev.filter(ug => ug.user_id !== userId),
      ...next.map(grupo_id => ({ user_id: userId, grupo_id })),
    ])
    await fetch('/api/admin/biblioteca', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'set_usuario_grupos', user_id: userId, grupo_ids: next }),
    })
  }

  useEffect(() => { loadUsers(); loadMatrix(); loadBibData() }, [loadUsers, loadMatrix, loadBibData])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    if (res.ok) {
      showFlash(`Invitación enviada a ${inviteEmail}`)
      setInviteEmail('')
      setInviteRole('viewer')
      await loadUsers()
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Error desconocido' }))
      showFlash(error ?? 'Error al invitar', 'err')
    }
    setInviting(false)
  }

  async function handleRoleChange(user: UserWithRole, newRole: string) {
    const res = await fetch(`/api/admin/usuarios/${user.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      showFlash(`Rol de ${user.email} actualizado`)
    } else showFlash('Error al cambiar rol', 'err')
  }

  async function handleToggleActivo(user: UserWithRole) {
    const newActivo = !user.activo
    const res = await fetch(`/api/admin/usuarios/${user.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activo: newActivo }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, activo: newActivo } : u))
      showFlash(`Usuario ${newActivo ? 'activado' : 'desactivado'}`)
    } else showFlash('Error al cambiar estado', 'err')
  }

  async function handleResetPassword(user: UserWithRole) {
    if (!confirm(`¿Enviar email de restablecimiento de contraseña a "${user.email}"?`)) return
    const res = await fetch(`/api/admin/usuarios/${user.id}/reset`, { method: 'POST' })
    if (res.ok) showFlash(`Email de reset enviado a ${user.email}`)
    else showFlash('Error al enviar el reset', 'err')
  }

  async function handleDelete(user: UserWithRole) {
    if (!confirm(`¿Eliminar permanentemente al usuario "${user.email}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/usuarios/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id))
      showFlash(`Usuario ${user.email} eliminado`)
    } else showFlash('Error al eliminar usuario', 'err')
  }

  async function handlePermToggle(role: string, perm: string, enabled: boolean) {
    if (role === 'admin' && ADMIN_LOCKED.includes(perm as typeof ADMIN_LOCKED[number])) return
    setMatrix(prev => prev ? {
      ...prev,
      [role]: { ...prev[role], [perm]: enabled }
    } : prev)
    const res = await fetch('/api/admin/permisos', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role, permission: perm, enabled }),
    })
    if (!res.ok) {
      showFlash('Error al actualizar permiso', 'err')
      await loadMatrix()
    }
  }

  async function openAccesoModal(u: UserWithRole) {
    setAccesoModal({ userId: u.id, email: u.email })
    setAccesoLoading(true)
    try {
      const [reportesRes, accessRes] = await Promise.all([
        fetch('/api/admin/reportes').then(r => r.json()),
        fetch(`/api/admin/portal-acceso/${u.id}`).then(r => r.json()),
      ])
      const allReportes = (Array.isArray(reportesRes) ? reportesRes : reportesRes.reportes ?? []) as {id:string;titulo:string;periodo:string;type_id:string|null;estado:string}[]
      setAccesoReportes(allReportes.filter((r: {estado:string}) => r.estado === 'publicado'))
      setAccesoSelected(new Set(Array.isArray(accessRes) ? accessRes : []))
    } finally {
      setAccesoLoading(false)
    }
  }

  async function saveAcceso() {
    if (!accesoModal) return
    setAccesoSaving(true)
    try {
      const res = await fetch(`/api/admin/portal-acceso/${accesoModal.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporteIds: Array.from(accesoSelected) }),
      })
      if (res.ok) { showFlash('Acceso actualizado'); setAccesoModal(null) }
      else showFlash('Error al guardar', 'err')
    } finally {
      setAccesoSaving(false)
    }
  }

  const perms = PERMISSION_KEYS

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            Gestión de usuarios
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
            Invitá usuarios y gestioná sus roles de acceso al portal.
          </p>
        </div>

        {/* Flash message */}
        {flash && (
          <div style={{
            fontSize: 13, padding: '12px 16px', borderRadius: 'var(--r-md)', marginBottom: 20,
            background: flash.type === 'ok' ? 'rgba(108,174,82,0.1)' : 'rgba(179,59,46,0.08)',
            color: flash.type === 'ok' ? 'var(--cp-green-deep)' : 'var(--cp-negative)',
          }}>
            {flash.msg}
          </div>
        )}

        {/* Invite form */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 'var(--r-lg)', padding: '28px', marginBottom: 36,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Invitar usuario
          </h2>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-row" style={{ flex: 2, minWidth: 220, margin: 0 }}>
              <label>Email corporativo</label>
              <input
                type="email" required value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@empresa.com" autoComplete="off"
              />
            </div>
            <div className="form-row" style={{ flex: 1, minWidth: 140, margin: 0 }}>
              <label>Rol</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'viewer' | 'uploader' | 'admin' | 'accionista')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14 }}
              >
                <option value="viewer">Consulta (viewer)</option>
                <option value="uploader">Carga (uploader)</option>
                <option value="admin">Admin</option>
                <option value="accionista">Accionista</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting}
              style={{ padding: '10px 24px', opacity: inviting ? 0.7 : 1, alignSelf: 'flex-end' }}>
              {inviting ? 'Invitando…' : 'Invitar'}
            </button>
          </form>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '12px 0 0' }}>
            El usuario recibirá un email para establecer su contraseña y acceder al portal.
          </p>
        </div>

        {/* User list */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Usuarios registrados
          </h2>

          {loading ? (
            <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
          ) : users.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>No hay usuarios todavía.</p>
          ) : (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {users.map((user, i) => {
                const userGrupos = usuarioGrupos.filter(ug => ug.user_id === user.id).map(ug => ug.grupo_id)
                return (
                  <div
                    key={user.id}
                    style={{
                      borderBottom: i < users.length - 1 ? '1px solid var(--rule)' : 'none',
                      opacity: user.activo === false ? 0.6 : 1,
                    }}
                  >
                    {/* Top row: controls */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto auto auto auto auto',
                      gap: 10,
                      alignItems: 'center',
                      padding: '14px 18px 10px',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                          {user.email}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                          Creado: {fmtDate(user.created_at)}
                          {user.last_sign_in_at ? ` · Último acceso: ${fmtDate(user.last_sign_in_at)}` : ''}
                        </div>
                      </div>

                      <RoleBadge role={user.role} />

                      <select
                        value={user.role ?? ''}
                        onChange={e => handleRoleChange(user, e.target.value)}
                        style={{ fontSize: 12, padding: '5px 8px', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer' }}
                      >
                        <option value="" disabled>Cambiar rol</option>
                        <option value="viewer">Consulta</option>
                        <option value="uploader">Carga</option>
                        <option value="admin">Admin</option>
                        <option value="rrhh">RRHH</option>
                        <option value="accionista">Accionista</option>
                      </select>

                      {user.role === 'accionista' && (
                        <button className="btn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => openAccesoModal(user)}>
                          Acceso →
                        </button>
                      )}

                      <div
                        title={user.activo ? 'Clic para desactivar' : 'Clic para activar'}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: user.activo ? 'var(--accent)' : 'var(--rule)',
                          position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                        }}
                        onClick={() => handleToggleActivo(user)}
                      >
                        <div style={{
                          position: 'absolute', top: 2, left: user.activo ? 17 : 2,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                        }} />
                      </div>

                      <button
                        onClick={() => openPwdModal(user)}
                        className="btn"
                        title="Establecer contraseña provisional sin email"
                        style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        Clave provisional
                      </button>

                      <button
                        onClick={() => handleResetPassword(user)}
                        className="btn"
                        title="Enviar email de restablecimiento de contraseña"
                        style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        Reset email
                      </button>

                      <button
                        onClick={() => handleDelete(user)}
                        className="btn"
                        style={{ fontSize: 12, padding: '6px 12px', color: 'var(--cp-negative)' }}
                      >
                        Eliminar
                      </button>
                    </div>

                    {/* Bottom row: biblioteca sectors */}
                    <div style={{
                      padding: '8px 18px 12px',
                      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                      borderTop: '1px dashed var(--rule)',
                      background: 'var(--bg-alt)',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-muted)', flexShrink: 0 }}>
                        Biblioteca
                      </span>
                      {bibGrupos.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>—</span>
                      ) : bibGrupos.map(g => {
                        const checked = userGrupos.includes(g.id)
                        return (
                          <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => handleBibGrupoToggle(user.id, g.id, e.target.checked)}
                            />
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                              background: checked ? 'rgba(130,188,0,0.14)' : 'var(--rule)',
                              color: checked ? 'var(--cp-green)' : 'var(--fg-muted)',
                            }}>
                              {g.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Permissions matrix */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            Permisos por rol
          </h2>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '0 0 16px' }}>
            Configurá qué puede hacer cada rol. Los cambios se aplican de inmediato.
          </p>

          {matrixLoading || !matrix ? (
            <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `1fr repeat(${MATRIX_ROLES.length}, 110px)`,
                gap: 0,
                background: 'var(--bg-alt)',
                borderBottom: '1px solid var(--rule)',
                padding: '10px 18px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Permiso
                </div>
                {MATRIX_ROLES.map(role => (
                  <div key={role} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
                    <RoleBadge role={role} />
                  </div>
                ))}
              </div>

              {/* Permission rows */}
              {perms.map((perm, pi) => (
                <div
                  key={perm}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `1fr repeat(${MATRIX_ROLES.length}, 110px)`,
                    gap: 0,
                    padding: '13px 18px',
                    borderBottom: pi < perms.length - 1 ? '1px solid var(--rule)' : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                    {PERMISSIONS[perm as keyof typeof PERMISSIONS]}
                  </div>
                  {MATRIX_ROLES.map(role => {
                    const locked = role === 'admin' && ADMIN_LOCKED.includes(perm)
                    const enabled = matrix[role]?.[perm] ?? false
                    return (
                      <div key={role} style={{ display: 'flex', justifyContent: 'center' }}>
                        <div
                          title={locked ? 'Siempre activo para admin' : enabled ? 'Clic para desactivar' : 'Clic para activar'}
                          onClick={() => !locked && handlePermToggle(role, perm, !enabled)}
                          style={{
                            width: 36, height: 20, borderRadius: 10,
                            background: enabled ? 'var(--accent)' : 'var(--rule)',
                            position: 'relative',
                            cursor: locked ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s',
                            opacity: locked ? 0.7 : 1,
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: 2, left: enabled ? 17 : 2,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#fff', transition: 'left 0.2s',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Contraseña provisional modal */}
      {pwdModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setPwdModal(null) }}
        >
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '32px 28px', width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Contraseña provisional
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 22px', fontFamily: 'var(--font-mono)' }}>
              {pwdModal.email}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-soft)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Contraseña
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={pwdInput}
                  onChange={e => setPwdInput(e.target.value)}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 14, padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--fg)' }}
                />
                <button
                  className="btn"
                  onClick={() => setPwdInput(generatePassword())}
                  style={{ fontSize: 12, padding: '6px 10px', whiteSpace: 'nowrap' }}
                  title="Generar nueva contraseña"
                >
                  ↺ Nueva
                </button>
                <button
                  className="btn"
                  onClick={() => { navigator.clipboard.writeText(pwdInput); setPwdCopied(true); setTimeout(() => setPwdCopied(false), 2000) }}
                  style={{ fontSize: 12, padding: '6px 10px', color: pwdCopied ? 'var(--cp-green)' : undefined }}
                >
                  {pwdCopied ? '✓' : 'Copiar'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
                Mínimo 8 caracteres. Copiá la contraseña antes de confirmar y compartila con el usuario.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn" style={{ padding: '9px 18px' }} onClick={() => setPwdModal(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '9px 20px', minWidth: 120, opacity: pwdSaving ? 0.7 : 1 }}
                onClick={handleSetPassword}
                disabled={pwdSaving || pwdInput.length < 8}
              >
                {pwdSaving ? 'Guardando…' : 'Establecer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acceso modal */}
      {accesoModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}
          onClick={e => { if (e.target === e.currentTarget) setAccesoModal(null) }}>
          <div style={{ background:'var(--bg)', borderRadius:'var(--r-lg)', padding:28, width:'100%', maxWidth:560, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, margin:'0 0 4px', letterSpacing:'-0.01em' }}>
              Acceso al portal
            </h2>
            <p style={{ fontSize:12, color:'var(--fg-muted)', margin:'0 0 16px' }}>
              {accesoModal.email} — seleccioná los reportes visibles
            </p>
            {accesoLoading ? (
              <p style={{ fontSize:13, color:'var(--fg-muted)' }}>Cargando…</p>
            ) : accesoReportes.length === 0 ? (
              <p style={{ fontSize:13, color:'var(--fg-muted)' }}>No hay reportes publicados.</p>
            ) : (
              <div style={{ flex:1, overflowY:'auto', display:'grid', gap:6, marginBottom:20 }}>
                {accesoReportes.map(r => (
                  <label key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface)', border:`1px solid ${accesoSelected.has(r.id) ? 'var(--accent)' : 'var(--rule)'}`, borderRadius:'var(--r-md)', cursor:'pointer' }}>
                    <input type="checkbox" checked={accesoSelected.has(r.id)} onChange={() => setAccesoSelected(prev => { const s=new Set(prev); s.has(r.id)?s.delete(r.id):s.add(r.id); return s })} style={{ accentColor:'var(--accent)', width:15, height:15 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)' }}>{r.titulo}</div>
                      <div style={{ fontSize:11, color:'var(--fg-muted)', fontFamily:'var(--font-mono)' }}>{r.periodo}{r.type_id ? ` · ${r.type_id}` : ''}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn" style={{ padding:'9px 18px' }} onClick={() => setAccesoModal(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ padding:'9px 20px', minWidth:120 }} onClick={saveAcceso} disabled={accesoSaving || accesoLoading}>
                {accesoSaving ? 'Guardando…' : 'Guardar acceso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

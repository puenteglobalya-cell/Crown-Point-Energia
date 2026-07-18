'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminPageHeader } from '@/components/AdminPageHeader'

// ── Types ──────────────────────────────────────────────────────────────────────
type User = {
  id: string; email: string; role: string | null; activo: boolean | null
  created_at: string; last_sign_in_at: string | null
  dni: string; nombre: string; apellido: string
  ubicacion: string; sector: string; telefono: string; notas: string
}
type BibGrupo = { id: number; slug: string; label: string; orden: number }

const ROLES = ['viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas', 'compliance'] as const
const ROLE_LABELS: Record<string, string> = {
  viewer: 'Consulta', uploader: 'Carga', admin: 'Admin', rrhh: 'RRHH', accionista: 'Accionista', finanzas: 'Finanzas', compliance: 'Compliance',
}
const ROLE_COLOR: Record<string, { bg: string; fg: string }> = {
  admin:      { bg: 'rgba(108,174,82,.15)',  fg: '#3a7d2a' },
  uploader:   { bg: 'rgba(31,37,102,.1)',    fg: '#1F2566' },
  accionista: { bg: 'rgba(180,130,0,.12)',   fg: '#9a6f00' },
  rrhh:       { bg: 'rgba(201,80,40,.1)',    fg: '#b03010' },
  finanzas:   { bg: 'rgba(47,160,138,.15)',  fg: '#2FA08A' },
  compliance: { bg: 'rgba(179,59,46,.12)',   fg: '#b33b2e' },
  viewer:     { bg: 'var(--bg-alt)',          fg: 'var(--fg-muted)' },
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'hoy'
  if (diff < 7) return `hace ${diff}d`
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function initials(u: User) {
  if (u.nombre || u.apellido) return `${u.apellido.charAt(0)}${u.nombre.charAt(0)}`.toUpperCase()
  return u.email.slice(0, 2).toUpperCase()
}

function displayName(u: User) {
  if (u.nombre || u.apellido) return `${u.apellido}${u.apellido && u.nombre ? ', ' : ''}${u.nombre}`.trim()
  return u.email
}

// ── Badge ──────────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontStyle: 'italic' }}>—</span>
  const c = ROLE_COLOR[role] ?? ROLE_COLOR.viewer
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 'var(--r-pill)', background: c.bg, color: c.fg,
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

// ── Edit drawer ────────────────────────────────────────────────────────────────
function EditDrawer({
  user, bibGrupos, usuarioGrupos, onClose, onSaved, flash,
}: {
  user: User
  bibGrupos: BibGrupo[]
  usuarioGrupos: Record<string, Set<number>>
  onClose: () => void
  onSaved: (updated: Partial<User>) => void
  flash: (msg: string, type?: 'ok' | 'err') => void
}) {
  const [tab, setTab]     = useState<'perfil' | 'acceso' | 'biblioteca'>('perfil')
  const [saving, setSaving] = useState(false)

  // Profile state
  const [dni,      setDni]      = useState(user.dni)
  const [nombre,   setNombre]   = useState(user.nombre)
  const [apellido, setApellido] = useState(user.apellido)
  const [ubicacion,setUbicacion]= useState(user.ubicacion)
  const [sector,   setSector]   = useState(user.sector)
  const [telefono, setTelefono] = useState(user.telefono)
  const [notas,    setNotas]    = useState(user.notas)

  // Access state
  const [role,   setRole]   = useState(user.role ?? 'viewer')
  const [activo, setActivo] = useState(user.activo !== false)

  // Biblioteca state
  const [bibSet, setBibSet] = useState<Set<number>>(usuarioGrupos[user.id] ?? new Set())

  async function savePerfil() {
    setSaving(true)
    const res = await fetch(`/api/admin/usuarios/${user.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dni, nombre, apellido, ubicacion, sector, telefono, notas }),
    })
    setSaving(false)
    if (res.ok) { flash('Perfil guardado'); onSaved({ dni, nombre, apellido, ubicacion, sector, telefono, notas }) }
    else flash('Error al guardar', 'err')
  }

  async function saveAcceso() {
    setSaving(true)
    const res = await fetch(`/api/admin/usuarios/${user.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role, activo }),
    })
    setSaving(false)
    if (res.ok) { flash('Acceso actualizado'); onSaved({ role, activo }) }
    else flash('Error al guardar', 'err')
  }

  async function toggleBib(grupoId: number, checked: boolean) {
    const res = await fetch('/api/admin/biblioteca', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: checked ? 'add_user_grupo' : 'remove_user_grupo', userId: user.id, grupoId }),
    })
    if (!res.ok) { flash('Error al actualizar biblioteca', 'err'); return }
    setBibSet(prev => { const s = new Set(prev); checked ? s.add(grupoId) : s.delete(grupoId); return s })
  }

  async function resetPassword() {
    if (!confirm('¿Enviar email de reseteo de contraseña?')) return
    const res = await fetch(`/api/admin/usuarios/${user.id}/reset`, { method: 'POST' })
    res.ok ? flash('Email enviado') : flash('Error', 'err')
  }

  async function deleteUser() {
    if (!confirm(`¿Eliminar permanentemente a ${user.email}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/usuarios/${user.id}`, { method: 'DELETE' })
    if (res.ok) { flash('Usuario eliminado'); onSaved({ id: '__deleted__' }); onClose() }
    else flash('Error al eliminar', 'err')
  }

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0', fontSize: 12, fontWeight: active ? 700 : 400,
    background: 'none', border: 'none', borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
    color: active ? 'var(--accent)' : 'var(--fg-muted)', cursor: 'pointer', transition: 'all .12s',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{
        width: 420, background: 'var(--surface)', boxShadow: '-4px 0 32px rgba(0,0,0,.18)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>{initials(user)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName(user)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--rule)', margin: '0 -2px' }}>
            {(['perfil', 'acceso', 'biblioteca'] as const).map(t => (
              <button key={t} style={TAB_STYLE(tab === t)} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <Field label="DNI" value={dni} onChange={setDni} placeholder="12345678" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Apellido" value={apellido} onChange={setApellido} />
              <Field label="Nombre" value={nombre} onChange={setNombre} />
            </div>
            <Field label="Ubicación" value={ubicacion} onChange={setUbicacion} placeholder="Buenos Aires, Santa Cruz…" />
            <Field label="Sector" value={sector} onChange={setSector} placeholder="Operaciones, Finanzas…" />
            <Field label="Teléfono" value={telefono} onChange={setTelefono} placeholder="+54 11 …" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>Notas</label>
              <textarea rows={3} value={notas} onChange={e => setNotas(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 13 }}
                placeholder="Observaciones internas…" />
            </div>
            <button className="btn btn-primary" onClick={savePerfil} disabled={saving} style={{ padding: '10px', marginTop: 4 }}>
              {saving ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </div>
        )}

        {/* Tab: Acceso */}
        {tab === 'acceso' && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>Rol del sistema</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ROLES.map(r => {
                  const c = ROLE_COLOR[r]
                  const sel = role === r
                  return (
                    <button key={r} onClick={() => setRole(r)} style={{
                      padding: '9px 12px', fontSize: 12, fontWeight: sel ? 700 : 400,
                      borderRadius: 8, border: `2px solid ${sel ? c.fg : 'var(--rule)'}`,
                      background: sel ? c.bg : 'var(--bg-alt)', color: sel ? c.fg : 'var(--fg-muted)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .1s',
                    }}>
                      {ROLE_LABELS[r]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-alt)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Acceso activo</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Desactivar bloquea el login sin eliminar el usuario</div>
              </div>
              <button onClick={() => setActivo(v => !v)} style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: activo ? 'var(--cp-green)' : 'var(--rule)', transition: 'background .2s', position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: activo ? 22 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>
            </div>

            <button className="btn btn-primary" onClick={saveAcceso} disabled={saving} style={{ padding: '10px' }}>
              {saving ? 'Guardando…' : 'Guardar acceso'}
            </button>

            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>
                Acciones peligrosas
              </div>
              <button className="btn" onClick={resetPassword} style={{ fontSize: 12, padding: '9px', textAlign: 'left' }}>
                Enviar reseteo de contraseña
              </button>
              <button className="btn" onClick={deleteUser} style={{ fontSize: 12, padding: '9px', textAlign: 'left', color: 'var(--cp-negative,#b33b2e)' }}>
                Eliminar usuario permanentemente
              </button>
            </div>
          </div>
        )}

        {/* Tab: Biblioteca */}
        {tab === 'biblioteca' && (
          <div style={{ padding: '20px 24px', flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 16px' }}>
              Los cambios se guardan inmediatamente al marcar o desmarcar.
            </p>
            {bibGrupos.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic' }}>Sin grupos configurados.</p>
              : bibGrupos.map(g => (
                <label key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                }}>
                  <input type="checkbox" checked={bibSet.has(g.id)} onChange={e => toggleBib(g.id, e.target.checked)}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{g.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>{g.slug}</span>
                  </div>
                </label>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
    </div>
  )
}

// ── Invite form ────────────────────────────────────────────────────────────────
function InviteForm({ onInvited }: { onInvited: (u: User) => void }) {
  const [email, setEmail] = useState('')
  const [role,  setRole]  = useState('viewer')
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(''); setInviteLink(''); setCopied(false)
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    })
    setBusy(false)
    if (res.ok) {
      const data = await res.json()
      onInvited({ ...data, created_at: new Date().toISOString(), last_sign_in_at: null,
        dni: '', nombre: '', apellido: '', ubicacion: '', sector: '', telefono: '', notas: '' })
      setEmail('')
      if (data.inviteLink) setInviteLink(data.inviteLink)
    } else {
      const j = await res.json()
      setErr(j.error ?? 'Error al invitar')
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com"
          type="email" required style={{ fontSize: 13, flex: '1 1 220px' }} />
        <select value={role} onChange={e => setRole(e.target.value)} style={{ fontSize: 13 }}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ fontSize: 13, padding: '8px 18px' }}>
          {busy ? 'Invitando…' : 'Invitar'}
        </button>
        {err && <span style={{ fontSize: 12, color: 'var(--cp-negative)', alignSelf: 'center' }}>{err}</span>}
      </form>
      {inviteLink && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-soft)' }}>
          <span>Se envió un email de invitación. Si preferís compartirlo vos directamente:</span>
          <button
            type="button"
            onClick={copyLink}
            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', border: '1px solid var(--rule)', borderRadius: 6, background: copied ? 'var(--cp-green-deep, #2C7A5B)' : 'var(--surface)', color: copied ? '#fff' : 'var(--fg)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {copied ? '✓ Copiado' : '🔗 Copiar enlace de acceso'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const [users,     setUsers]     = useState<User[]>([])
  const [bibGrupos, setBibGrupos] = useState<BibGrupo[]>([])
  const [bibUG,     setBibUG]     = useState<Record<string, Set<number>>>({})
  const [loading,   setLoading]   = useState(true)
  const [flash,     setFlash]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [editUser,  setEditUser]  = useState<User | null>(null)
  const [showInvite,setShowInvite]= useState(false)

  // Filters & sort
  const [search,   setSearch]   = useState('')
  const [fRole,    setFRole]    = useState('')
  const [fStatus,  setFStatus]  = useState('')
  const [fSector,  setFSector]  = useState('')
  const [sortBy,   setSortBy]   = useState<'dni' | 'nombre' | 'last_login' | 'created_at'>('dni')

  const searchRef = useRef<HTMLInputElement>(null)

  function showFlash(msg: string, type: 'ok' | 'err' = 'ok') {
    setFlash({ msg, type }); setTimeout(() => setFlash(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [uRes, bRes] = await Promise.all([
      fetch('/api/admin/usuarios'),
      fetch('/api/admin/biblioteca'),
    ])
    if (uRes.ok) setUsers(await uRes.json())
    if (bRes.ok) {
      const bd = await bRes.json()
      setBibGrupos(bd.grupos ?? [])
      const map: Record<string, Set<number>> = {}
      for (const ug of bd.usuarioGrupos ?? []) {
        if (!map[ug.user_id]) map[ug.user_id] = new Set()
        map[ug.user_id].add(ug.grupo_id)
      }
      setBibUG(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Unique sectors and ubicaciones for filter dropdowns
  const sectors   = useMemo(() => [...new Set(users.map(u => u.sector).filter(Boolean))].sort(), [users])

  // Filtered + sorted list
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = users.filter(u => {
      if (q && ![u.email, u.nombre, u.apellido, u.dni, u.sector, u.ubicacion]
        .join(' ').toLowerCase().includes(q)) return false
      if (fRole   && u.role   !== fRole)   return false
      if (fSector && u.sector !== fSector) return false
      if (fStatus === 'activo'  && u.activo === false) return false
      if (fStatus === 'baneado' && u.activo !== false) return false
      if (fStatus === 'sin-rol' && u.role)  return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'dni') {
        if (a.dni && !b.dni) return -1
        if (!a.dni && b.dni) return 1
        if (a.dni && b.dni) return a.dni.localeCompare(b.dni, undefined, { numeric: true })
        return displayName(a).localeCompare(displayName(b))
      }
      if (sortBy === 'nombre') return displayName(a).localeCompare(displayName(b))
      if (sortBy === 'last_login') return (b.last_sign_in_at ?? '').localeCompare(a.last_sign_in_at ?? '')
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
    return list
  }, [users, search, fRole, fSector, fStatus, sortBy])

  async function quickBan(u: User) {
    const newActivo = u.activo !== true
    if (!newActivo && !confirm(`¿Banear a ${u.email}? Se lo desconectará de su sesión actual.`)) return
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activo: newActivo }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, activo: newActivo } : x))
      showFlash(newActivo ? 'Acceso habilitado' : 'Usuario baneado')
    }
  }

  async function quickDelete(u: User) {
    if (!confirm(`¿Eliminar a ${u.email}? Esta acción es permanente.`)) return
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(x => x.id !== u.id))
      showFlash('Usuario eliminado')
    }
  }

  function onSaved(updated: Partial<User>) {
    if (!editUser) return
    if (updated.id === '__deleted__') {
      setUsers(prev => prev.filter(x => x.id !== editUser.id))
      setEditUser(null)
      return
    }
    const merged = { ...editUser, ...updated }
    setUsers(prev => prev.map(u => u.id === editUser.id ? merged : u))
    setEditUser(merged)
  }

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault(); searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const banCounts = useMemo(() => ({ baneados: users.filter(u => u.activo === false).length }), [users])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '36px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Flash */}
        {flash && (
          <div style={{
            position: 'fixed', top: 20, right: 24, zIndex: 500,
            background: flash.type === 'ok' ? 'var(--cp-green-deep,#2C7A5B)' : 'var(--cp-negative,#b33b2e)',
            color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,.2)',
          }}>
            {flash.msg}
          </div>
        )}

        <AdminPageHeader
          title="Usuarios"
          subtitle={loading ? '…' : `${users.length} total${banCounts.baneados > 0 ? ` · ${banCounts.baneados} baneados` : ''}`}
          right={
            <button className="btn btn-primary" onClick={() => setShowInvite(v => !v)} style={{ fontSize: 13, padding: '9px 20px', flexShrink: 0 }}>
              {showInvite ? '× Cancelar' : '+ Invitar'}
            </button>
          }
        />

        {/* Invite form */}
        {showInvite && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 10 }}>Invitar nuevo usuario</div>
            <InviteForm onInvited={u => { setUsers(p => [...p, u]); setShowInvite(false); showFlash('Invitación enviada') }} />
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--fg-muted)' }}>🔍</span>
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por DNI, nombre, email… ( / )"
              style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 30, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFRole('')}
              style={{
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, border: '1px solid',
                cursor: 'pointer', background: !fRole ? '#1F2566' : 'var(--surface)',
                color: !fRole ? '#fff' : 'var(--fg-soft)', borderColor: !fRole ? '#1F2566' : 'var(--rule)',
              }}
            >
              Todos
            </button>
            {ROLES.map(r => {
              const active = fRole === r
              return (
                <button
                  key={r}
                  onClick={() => setFRole(active ? '' : r)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, border: '1px solid',
                    cursor: 'pointer', background: active ? '#1F2566' : 'var(--surface)',
                    color: active ? '#fff' : 'var(--fg-soft)', borderColor: active ? '#1F2566' : 'var(--rule)',
                  }}
                >
                  {ROLE_LABELS[r]}
                </button>
              )
            })}
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ fontSize: 12, padding: '7px 10px' }}>
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="baneado">Baneados</option>
            <option value="sin-rol">Sin rol</option>
          </select>
          {sectors.length > 0 && (
            <select value={fSector} onChange={e => setFSector(e.target.value)} style={{ fontSize: 12, padding: '7px 10px' }}>
              <option value="">Todos los sectores</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ fontSize: 12, padding: '7px 10px' }}>
            <option value="dni">Ordenar por DNI</option>
            <option value="nombre">Ordenar por nombre</option>
            <option value="last_login">Último acceso</option>
            <option value="created_at">Fecha alta</option>
          </select>
          {(search || fRole || fStatus || fSector) && (
            <button className="btn" onClick={() => { setSearch(''); setFRole(''); setFStatus(''); setFSector('') }}
              style={{ fontSize: 12, padding: '7px 12px', color: 'var(--fg-muted)' }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Result count when filtering */}
        {(search || fRole || fStatus || fSector) && !loading && (
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 10px' }}>
            {filtered.length} de {users.length} usuarios
          </p>
        )}

        {/* Table */}
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', padding: '40px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Cargando usuarios…</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--fg-muted)', padding: '48px 0', textAlign: 'center', fontStyle: 'italic' }}>Sin resultados.</p>
        ) : (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
            {/* Table head */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 100px 1fr 110px 140px 80px 100px 96px',
              padding: '9px 12px', gap: 8, background: 'var(--bg-alt)',
              borderBottom: '1px solid var(--rule)', alignItems: 'center',
            }}>
              {['#', 'DNI', 'Nombre / Email', 'Rol', 'Sector · Ubicación', 'Estado', 'Último acceso', ''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((u, i) => {
              const isBanned = u.activo === false
              return (
                <div key={u.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 100px 1fr 110px 140px 80px 100px 96px',
                  padding: '9px 12px', gap: 8, alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--rule)' : 'none',
                  background: isBanned ? 'rgba(179,59,46,.04)' : 'transparent',
                  opacity: isBanned ? 0.7 : 1,
                  transition: 'background .1s',
                }}>
                  {/* # */}
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{i + 1}</span>

                  {/* DNI */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: u.dni ? 600 : 400, color: u.dni ? 'var(--fg)' : 'var(--fg-muted)' }}>
                    {u.dni || '—'}
                  </span>

                  {/* Nombre / Email */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(u.nombre || u.apellido) ? displayName(u) : u.email}
                    </div>
                    {(u.nombre || u.apellido) && (
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    )}
                  </div>

                  {/* Rol */}
                  <div><RoleBadge role={u.role} /></div>

                  {/* Sector · Ubicación */}
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[u.sector, u.ubicacion].filter(Boolean).join(' · ') || '—'}
                  </div>

                  {/* Estado */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
                    padding: '2px 7px', borderRadius: 'var(--r-pill)',
                    background: isBanned ? 'rgba(179,59,46,.12)' : u.activo === null ? 'var(--bg-alt)' : 'rgba(47,160,138,.12)',
                    color: isBanned ? 'var(--cp-negative,#b33b2e)' : u.activo === null ? 'var(--fg-muted)' : '#2a7a5a',
                  }}>
                    {isBanned ? 'Baneado' : u.activo === null ? 'Pendiente' : 'Activo'}
                  </span>

                  {/* Último acceso */}
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                    {fmtDate(u.last_sign_in_at)}
                  </span>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <ActionBtn title="Editar" onClick={() => setEditUser(u)}>✎</ActionBtn>
                    <ActionBtn title={isBanned ? 'Habilitar' : 'Banear'} onClick={() => quickBan(u)}
                      color={isBanned ? '#2a7a5a' : undefined}>
                      {isBanned ? '✓' : '⊘'}
                    </ActionBtn>
                    <ActionBtn title="Eliminar" onClick={() => quickDelete(u)} color="var(--cp-negative,#b33b2e)">✕</ActionBtn>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Edit drawer */}
      {editUser && (
        <EditDrawer
          user={editUser}
          bibGrupos={bibGrupos}
          usuarioGrupos={bibUG}
          onClose={() => setEditUser(null)}
          onSaved={onSaved}
          flash={showFlash}
        />
      )}
    </div>
  )
}

function ActionBtn({ children, onClick, title, color }: {
  children: React.ReactNode; onClick: () => void; title: string; color?: string
}) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 26, height: 26, border: '1px solid var(--rule)', borderRadius: 6,
      background: 'var(--bg-alt)', cursor: 'pointer', fontSize: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color ?? 'var(--fg-soft)', transition: 'background .1s, color .1s',
    }}
      onMouseOver={e => (e.currentTarget.style.background = 'var(--surface)')}
      onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-alt)')}
    >
      {children}
    </button>
  )
}

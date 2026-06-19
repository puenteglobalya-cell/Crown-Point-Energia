'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ─── Types ─────────────────────────────────────────────────────────────────

type Grupo    = { id: number; slug: string; label: string; orden: number }
type Carpeta  = { id: number; nombre: string; descripcion: string; orden: number; activa: boolean }
type Doc      = { id: string; carpeta_id: number; nombre: string; path: string; size_bytes: number | null; mime_type: string | null; vigente: boolean; created_at: string }
type CG       = { carpeta_id: number; grupo_id: number }
type UG       = { user_id: string; grupo_id: number }
type Usuario  = { id: string; email: string; created_at: string }

type Data = {
  grupos: Grupo[]
  carpetas: Carpeta[]
  carpetaGrupos: CG[]
  documentos: Doc[]
  usuarios: Usuario[]
  usuarioGrupos: UG[]
}

const MIME_MAP: Record<string, string> = {
  pdf:  'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc:  'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt:  'application/vnd.ms-powerpoint',
  zip:  'application/zip',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
}

// ─── API helper ─────────────────────────────────────────────────────────────

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/admin/biblioteca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error desconocido')
  }
  return res.json()
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'carpetas' | 'documentos' | 'usuarios'

const TAB_LABELS: Record<Tab, string> = {
  carpetas:  'Carpetas',
  documentos: 'Documentos',
  usuarios:  'Usuarios',
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AdminBiblioteca() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('carpetas')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/biblioteca')
      if (!res.ok) throw new Error('Error cargando datos')
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState />
  if (error) return <p style={{ padding: 32, color: 'red' }}>{error}</p>
  if (!data) return null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <Link href="/admin/usuarios" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>Usuarios</Link>
          <Link href="/admin/documentos" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>Documentos</Link>
          <Link href="/admin/comunicados" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>Comunicados</Link>
          <Link href="/admin/reportes" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>Reportes</Link>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Link href="/biblioteca" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--cp-green)', textDecoration: 'none' }}>Ver Biblioteca →</Link>
          </span>
        </div>
        <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cp-green)', fontWeight: 700 }}>Admin</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, marginBottom: 0 }}>Biblioteca</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--rule)', marginBottom: 32 }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--cp-green)' : '2px solid transparent',
            color: tab === t ? 'var(--fg)' : 'var(--fg-muted)', marginBottom: -1,
          }}>
            {TAB_LABELS[t]}
            {t === 'carpetas' && <span style={badge}>{data.carpetas.filter(c => c.activa).length}</span>}
            {t === 'documentos' && <span style={badge}>{data.documentos.length}</span>}
            {t === 'usuarios' && <span style={badge}>{data.usuarios.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'carpetas'  && <CarpetasTab data={data} reload={load} />}
      {tab === 'documentos' && <DocumentosTab data={data} reload={load} />}
      {tab === 'usuarios'  && <UsuariosTab data={data} reload={load} />}
    </div>
  )
}

// ─── Carpetas tab ─────────────────────────────────────────────────────────

function CarpetasTab({ data, reload }: { data: Data; reload: () => void }) {
  const [newNombre, setNewNombre] = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editDesc, setEditDesc]     = useState('')

  async function createCarpeta(e: React.FormEvent) {
    e.preventDefault()
    if (!newNombre.trim()) return
    setSaving(true)
    try {
      await api('create_carpeta', { nombre: newNombre.trim(), descripcion: newDesc.trim() })
      setNewNombre('')
      setNewDesc('')
      reload()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  async function saveEdit(id: number) {
    await api('update_carpeta', { id, nombre: editNombre.trim(), descripcion: editDesc.trim() })
    setEditId(null)
    reload()
  }

  async function toggleActiva(c: Carpeta) {
    await api('update_carpeta', { id: c.id, activa: !c.activa })
    reload()
  }

  async function deleteCarpeta(id: number) {
    if (!confirm('¿Eliminar carpeta y todos sus documentos?')) return
    await api('delete_carpeta', { id })
    reload()
  }

  async function setGrupos(carpeta_id: number, grupo_ids: number[]) {
    await api('set_carpeta_grupos', { carpeta_id, grupo_ids })
    reload()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
      {/* List */}
      <div>
        <div style={{ display: 'grid', gap: 12 }}>
          {data.carpetas.map(c => {
            const grupos = data.carpetaGrupos.filter(cg => cg.carpeta_id === c.id).map(cg => cg.grupo_id)
            const isEditing = editId === c.id
            return (
              <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden', opacity: c.activa ? 1 : 0.55 }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isEditing ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                        style={inputSm} placeholder="Nombre" />
                      <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                        style={inputSm} placeholder="Descripción (opcional)" />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => saveEdit(c.id)} style={btnPrimary}>Guardar</button>
                        <button onClick={() => setEditId(null)} style={btnGhost}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{c.nombre}</p>
                        {c.descripcion && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{c.descripcion}</p>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {grupos.length === 0
                            ? <span style={{ ...chip, color: 'var(--fg-muted)', background: 'var(--rule)' }}>Sin grupos</span>
                            : grupos.map(gid => {
                                const g = data.grupos.find(x => x.id === gid)
                                return g ? <span key={gid} style={{ ...chip, background: 'rgba(130,188,0,0.14)', color: 'var(--cp-green)' }}>{g.label}</span> : null
                              })
                          }
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => { setEditId(c.id); setEditNombre(c.nombre); setEditDesc(c.descripcion) }} style={btnGhost} title="Editar">✎</button>
                        <button onClick={() => toggleActiva(c)} style={btnGhost} title={c.activa ? 'Desactivar' : 'Activar'}>
                          {c.activa ? '●' : '○'}
                        </button>
                        <button onClick={() => deleteCarpeta(c.id)} style={{ ...btnGhost, color: '#e53' }} title="Eliminar">✕</button>
                      </div>
                    </>
                  )}
                </div>

                {/* Group visibility */}
                {!isEditing && (
                  <div style={{ padding: '10px 18px', borderTop: '1px solid var(--rule)', background: 'var(--bg-alt)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', alignSelf: 'center', marginRight: 2 }}>Acceso:</span>
                    {data.grupos.map(g => {
                      const checked = grupos.includes(g.id)
                      return (
                        <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked ? grupos.filter(x => x !== g.id) : [...grupos, g.id]
                              setGrupos(c.id, next)
                            }}
                          />
                          {g.label}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {data.carpetas.length === 0 && (
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Sin carpetas todavía.</p>
          )}
        </div>
      </div>

      {/* New carpeta form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: 24, position: 'sticky', top: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Nueva carpeta</h3>
        <form onSubmit={createCarpeta} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input value={newNombre} onChange={e => setNewNombre(e.target.value)} style={inputFull} placeholder="ej: Legajo impositivo 2025" required />
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} style={inputFull} placeholder="Opcional" />
          </div>
          <button type="submit" disabled={saving || !newNombre.trim()} style={btnPrimary}>
            {saving ? 'Creando…' : 'Crear carpeta'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Documentos tab ───────────────────────────────────────────────────────

function DocumentosTab({ data, reload }: { data: Data; reload: () => void }) {
  const [carpetaId, setCarpetaId] = useState<number | null>(data.carpetas[0]?.id ?? null)
  const [uploading, setUploading] = useState(false)
  const [nombre, setNombre]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  const docs = data.documentos.filter(d => d.carpeta_id === carpetaId)
    .sort((a, b) => {
      if (a.vigente && !b.vigente) return -1
      if (!a.vigente && b.vigente) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !carpetaId) return
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() ?? '').toLowerCase()
      const contentType = MIME_MAP[ext] ?? 'application/octet-stream'
      const ts = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${carpetaId}/${ts}-${safeName}`

      const { error: storageErr } = await supabase.storage
        .from('biblioteca')
        .upload(path, file, { upsert: false, contentType })
      if (storageErr) throw new Error(storageErr.message)

      await api('create_doc', {
        carpeta_id: carpetaId,
        nombre: nombre.trim() || file.name,
        path,
        size_bytes: file.size,
        mime_type: contentType,
      })

      setNombre('')
      if (fileRef.current) fileRef.current.value = ''
      reload()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error al subir') }
    finally { setUploading(false) }
  }

  async function setVigente(doc: Doc) {
    await api('set_vigente', { doc_id: doc.id, carpeta_id: doc.carpeta_id })
    reload()
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await api('delete_doc', { doc_id: doc.id, path: doc.path })
    reload()
  }

  function fmtSize(b: number | null) {
    if (!b) return ''
    if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`
    return `${Math.round(b / 1024)} KB`
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
      {/* Doc list */}
      <div>
        {/* Carpeta selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {data.carpetas.filter(c => c.activa).map(c => (
            <button key={c.id} onClick={() => setCarpetaId(c.id)} style={{
              padding: '6px 14px', fontSize: 13, fontWeight: 600,
              borderRadius: 'var(--r-md)', cursor: 'pointer',
              border: carpetaId === c.id ? '1.5px solid var(--cp-green)' : '1.5px solid var(--rule)',
              background: carpetaId === c.id ? 'rgba(130,188,0,0.1)' : 'var(--surface)',
              color: carpetaId === c.id ? 'var(--cp-green)' : 'var(--fg)',
            }}>
              {c.nombre}
            </button>
          ))}
        </div>

        {docs.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Sin archivos en esta carpeta.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {docs.map(doc => (
              <div key={doc.id} style={{
                background: doc.vigente ? 'rgba(130,188,0,0.04)' : 'var(--surface)',
                border: `1px solid ${doc.vigente ? 'rgba(130,188,0,0.4)' : 'var(--rule)'}`,
                borderRadius: 'var(--r-md)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              } as React.CSSProperties}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{doc.nombre}</p>
                    {doc.vigente && (
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cp-green)', fontWeight: 700, background: 'rgba(130,188,0,0.14)', borderRadius: 4, padding: '2px 6px' }}>
                        Vigente
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '3px 0 0' }}>
                    {new Date(doc.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {doc.size_bytes ? ` · ${fmtSize(doc.size_bytes)}` : ''}
                    {doc.mime_type ? ` · ${doc.mime_type.split('/')[1]}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!doc.vigente && (
                    <button onClick={() => setVigente(doc)} style={btnGhost} title="Marcar como vigente">
                      ★
                    </button>
                  )}
                  <button onClick={() => deleteDoc(doc)} style={{ ...btnGhost, color: '#e53' }} title="Eliminar">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: 24, position: 'sticky', top: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Subir archivo</h3>
        <form onSubmit={upload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Carpeta</label>
            <select value={carpetaId ?? ''} onChange={e => setCarpetaId(Number(e.target.value))} style={inputFull}>
              {data.carpetas.filter(c => c.activa).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Nombre para mostrar</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputFull} placeholder="(usa nombre del archivo si se deja vacío)" />
          </div>
          <div>
            <label style={labelStyle}>Archivo *</label>
            <input ref={fileRef} type="file" required style={{ ...inputFull, padding: '6px 8px', cursor: 'pointer' }}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.zip,.png,.jpg,.jpeg" />
          </div>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>El archivo más reciente marcado como ★ vigente es el que ven los usuarios.</p>
          <button type="submit" disabled={uploading || !carpetaId} style={btnPrimary}>
            {uploading ? 'Subiendo…' : 'Subir'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Usuarios tab ─────────────────────────────────────────────────────────

function UsuariosTab({ data, reload }: { data: Data; reload: () => void }) {
  const [search, setSearch] = useState('')

  const filtered = data.usuarios.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function setGrupos(user_id: string, grupo_ids: number[]) {
    await api('set_usuario_grupos', { user_id, grupo_ids })
    reload()
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputFull, maxWidth: 320 }}
          placeholder="Buscar por email…"
        />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map(u => {
          const grupos = data.usuarioGrupos.filter(ug => ug.user_id === u.id).map(ug => ug.grupo_id)
          return (
            <div key={u.id} style={{
              background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 'var(--r-md)', padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: 200, flex: '0 0 auto' }}>
                <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{u.email}</p>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
                  Desde {new Date(u.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1 }}>
                {data.grupos.map(g => {
                  const checked = grupos.includes(g.id)
                  return (
                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked ? grupos.filter(x => x !== g.id) : [...grupos, g.id]
                          setGrupos(u.id, next)
                        }}
                      />
                      {g.label}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Sin usuarios{search ? ' que coincidan' : ''}.</p>
        )}
      </div>
    </div>
  )
}

// ─── Loading ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px', textAlign: 'center', color: 'var(--fg-muted)' }}>
      Cargando biblioteca…
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────

const badge: React.CSSProperties = {
  marginLeft: 6, fontSize: 11, fontWeight: 700, background: 'var(--rule)',
  borderRadius: 99, padding: '1px 7px', color: 'var(--fg-muted)',
}
const chip: React.CSSProperties = {
  display: 'inline-block', fontSize: 11, borderRadius: 4,
  padding: '2px 7px', fontWeight: 600,
}
const inputFull: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', color: 'var(--fg)', boxSizing: 'border-box',
}
const inputSm: React.CSSProperties = {
  width: '100%', padding: '6px 8px', fontSize: 13,
  border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)',
  background: 'var(--bg)', color: 'var(--fg)', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-soft)', marginBottom: 5,
}
const btnPrimary: React.CSSProperties = {
  padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  background: 'var(--cp-green)', color: '#fff', border: 'none',
  borderRadius: 'var(--r-md)', width: '100%',
}
const btnGhost: React.CSSProperties = {
  padding: '5px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  background: 'var(--rule)', color: 'var(--fg)', border: 'none',
  borderRadius: 'var(--r-sm)',
}

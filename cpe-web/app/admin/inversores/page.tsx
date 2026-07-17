'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Doc = {
  id: string; titulo: string; descripcion: string; categoria: string
  file_name: string | null; file_size: number | null; created_at: string
}

type Contact = {
  id: string; nombre: string; email: string; telefono: string
  tipo: string; tenencia_estimada: string; interes_on: boolean
  notas: string; created_at: string; updated_at: string
}

type Tab = 'documentos' | 'contactos'

const CATEGORIA_LABELS: Record<string, string> = {
  directorio: 'Directorio',
  cap_table: 'Cap table',
  legal: 'Legal',
  otro: 'Otro',
}

const TIPO_LABELS: Record<string, string> = {
  accionista_actual: 'Accionista actual',
  prospecto: 'Prospecto',
  institucional: 'Institucional',
  individual: 'Individual',
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function InversoresAdminPage() {
  const [tab, setTab] = useState<Tab>('documentos')
  const [docs, setDocs] = useState<Doc[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const [uploadForm, setUploadForm] = useState({ titulo: '', descripcion: '', categoria: 'otro' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [showNewContact, setShowNewContact] = useState(false)
  const [newContact, setNewContact] = useState({ nombre: '', email: '', telefono: '', tipo: 'prospecto', tenencia_estimada: '', interes_on: false, notas: '' })
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterOn, setFilterOn] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')

  const loadDocs = useCallback(async () => {
    const res = await fetch('/api/admin/investor-documents')
    if (res.ok) setDocs(await res.json())
  }, [])
  const loadContacts = useCallback(async () => {
    const res = await fetch('/api/admin/investor-contacts')
    if (res.ok) setContacts(await res.json())
  }, [])

  useEffect(() => {
    Promise.all([loadDocs(), loadContacts()]).then(() => setLoading(false))
  }, [loadDocs, loadContacts])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function uploadDoc() {
    if (!uploadForm.titulo.trim() || !uploadFile) {
      flash('Falta título o archivo')
      return
    }
    setUploading(true)
    const fd = new FormData()
    fd.append('titulo', uploadForm.titulo)
    fd.append('descripcion', uploadForm.descripcion)
    fd.append('categoria', uploadForm.categoria)
    fd.append('file', uploadFile)
    const res = await fetch('/api/admin/investor-documents', { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) {
      await loadDocs()
      setUploadForm({ titulo: '', descripcion: '', categoria: 'otro' })
      setUploadFile(null)
      flash('Documento subido')
    } else {
      const d = await res.json().catch(() => ({}))
      flash(d.error ?? 'Error al subir')
    }
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.titulo}" (${CATEGORIA_LABELS[doc.categoria] ?? doc.categoria})?\n\nDeja de verse para los accionistas inmediatamente. Esta acción es irreversible.`)) return
    const res = await fetch('/api/admin/investor-documents', {
      method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: doc.id }),
    })
    if (res.ok) { setDocs(prev => prev.filter(d => d.id !== doc.id)); flash('Eliminado') }
  }

  async function addContact() {
    if (!newContact.nombre.trim()) return
    const res = await fetch('/api/admin/investor-contacts', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(newContact),
    })
    if (res.ok) {
      const created = await res.json()
      setContacts(prev => [created, ...prev])
      setNewContact({ nombre: '', email: '', telefono: '', tipo: 'prospecto', tenencia_estimada: '', interes_on: false, notas: '' })
      setShowNewContact(false)
      flash('Contacto agregado')
    }
  }

  async function updateContact(id: string, patch: Partial<Contact>) {
    const res = await fetch('/api/admin/investor-contacts', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...patch }),
    })
    if (res.ok) {
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
      flash('Actualizado')
    }
  }

  async function deleteContact(c: Contact) {
    const detalle = `${TIPO_LABELS[c.tipo] ?? c.tipo}${c.interes_on ? ' · candidato ON' : ''}`
    if (!confirm(`¿Eliminar el contacto de "${c.nombre}" (${detalle})? Esta acción es irreversible.`)) return
    const res = await fetch('/api/admin/investor-contacts', {
      method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: c.id }),
    })
    if (res.ok) { setContacts(prev => prev.filter(x => x.id !== c.id)); flash('Eliminado') }
  }

  const filteredContacts = contacts
    .filter(c => filterTipo === 'todos' || c.tipo === filterTipo)
    .filter(c => !filterOn || c.interes_on)
    .filter(c => !dateFrom || c.created_at.slice(0, 10) >= dateFrom)
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Inversores</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>Documentos internos de IR y registro de contactos</p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 0' }}>
              Todo lo de este panel es <strong>privado</strong> — nada se ve en la web pública. Para EE.FF., MD&amp;A,
              AGM u otros documentos que sí deben ser públicos, usá{' '}
              <Link href="/admin/ir-docs" style={{ color: 'var(--accent)' }}>Documentos IR — públicos</Link>.
            </p>
          </div>
          {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {([['documentos', 'Documentos IR'], ['contactos', 'Registro de inversores']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className="btn" style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              background: tab === key ? 'var(--accent)' : undefined,
              color: tab === key ? '#fff' : undefined,
              borderColor: tab === key ? 'var(--accent)' : undefined,
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : tab === 'documentos' ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 16 }}>
              Solo visibles para el rol <strong>accionista</strong> y administradores en el portal — no aparecen en la web pública.
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--r-md)', padding: 20, marginBottom: 20, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-row" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12 }}>Título</label>
                  <input type="text" value={uploadForm.titulo} onChange={e => setUploadForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Acta de Directorio — Julio 2026" />
                </div>
                <div className="form-row" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12 }}>Categoría</label>
                  <select value={uploadForm.categoria} onChange={e => setUploadForm(p => ({ ...p, categoria: e.target.value }))}>
                    {Object.entries(CATEGORIA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ margin: 0 }}>
                <label style={{ fontSize: 12 }}>Descripción (opcional)</label>
                <input type="text" value={uploadForm.descripcion} onChange={e => setUploadForm(p => ({ ...p, descripcion: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="file" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
                <button className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 13, opacity: uploading ? 0.6 : 1 }} disabled={uploading} onClick={uploadDoc}>
                  {uploading ? 'Subiendo…' : 'Subir documento'}
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {docs.length === 0 ? (
                <p style={{ padding: 20, color: 'var(--fg-muted)', fontSize: 14 }}>No hay documentos cargados.</p>
              ) : docs.map((doc, i) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < docs.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{doc.titulo}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                      {CATEGORIA_LABELS[doc.categoria] ?? doc.categoria} · {fmtDate(doc.created_at)} · {fmtSize(doc.file_size)}
                    </div>
                  </div>
                  <a href={`/api/investor-documents/${doc.id}/download`} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>Descargar</a>
                  <button onClick={() => deleteDoc(doc)} className="btn" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--cp-negative)' }}>Eliminar</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 16 }}>
              Registro interno de inversores actuales y prospectos — para futuras colocaciones (ej. Obligaciones Negociables). No visible fuera de este panel.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                placeholder="Buscar por nombre o email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: 12, padding: '7px 10px', minWidth: 200 }}
              />
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ fontSize: 12, padding: '7px 10px' }}>
                <option value="todos">Todos los tipos</option>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                Alta desde
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={filterOn} onChange={e => setFilterOn(e.target.checked)} />
                Solo interesados en ON
              </label>
              <a
                href={`/api/admin/investor-contacts/export?tipo=${filterTipo}&on=${filterOn ? '1' : '0'}`}
                className="btn"
                style={{ fontSize: 12, padding: '8px 16px', textDecoration: 'none', marginLeft: 'auto' }}
              >
                Exportar Excel
              </a>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => setShowNewContact(true)}>
                + Nuevo contacto
              </button>
            </div>

            {showNewContact && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--r-md)', padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input type="text" placeholder="Nombre" value={newContact.nombre} onChange={e => setNewContact(p => ({ ...p, nombre: e.target.value }))} />
                  <select value={newContact.tipo} onChange={e => setNewContact(p => ({ ...p, tipo: e.target.value }))}>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="email" placeholder="Email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
                  <input type="text" placeholder="Teléfono" value={newContact.telefono} onChange={e => setNewContact(p => ({ ...p, telefono: e.target.value }))} />
                  <input type="text" placeholder="Tenencia estimada (ej: 1.2M acciones)" value={newContact.tenencia_estimada} onChange={e => setNewContact(p => ({ ...p, tenencia_estimada: e.target.value }))} />
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={newContact.interes_on} onChange={e => setNewContact(p => ({ ...p, interes_on: e.target.checked }))} />
                    Candidato para colocación de ON
                  </label>
                </div>
                <textarea rows={2} placeholder="Notas" value={newContact.notas} onChange={e => setNewContact(p => ({ ...p, notas: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={addContact}>Guardar</button>
                  <button className="btn" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setShowNewContact(false)}>Cancelar</button>
                </div>
              </div>
            )}

            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {filteredContacts.length === 0 ? (
                <p style={{ padding: 20, color: 'var(--fg-muted)', fontSize: 14 }}>No hay contactos que coincidan con el filtro.</p>
              ) : filteredContacts.map((c, i) => (
                <div key={c.id} style={{ padding: '14px 18px', borderBottom: i < filteredContacts.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{c.nombre}</span>
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 8 }}>{TIPO_LABELS[c.tipo] ?? c.tipo}</span>
                      {c.interes_on && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 'var(--r-pill)', background: 'rgba(108,174,82,0.15)', color: 'var(--cp-green-deep)', marginLeft: 8 }}>ON</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => updateContact(c.id, { interes_on: !c.interes_on })}
                      >
                        {c.interes_on ? 'Quitar de ON' : 'Marcar para ON'}
                      </button>
                      <button onClick={() => deleteContact(c)} className="btn" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--cp-negative)' }}>Eliminar</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {c.email && <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a>}
                    {c.telefono && <span>{c.telefono}</span>}
                    {c.tenencia_estimada && <span>Tenencia: {c.tenencia_estimada}</span>}
                  </div>
                  {c.notas && <p style={{ fontSize: 12, color: 'var(--fg-soft)', margin: '6px 0 0' }}>{c.notas}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

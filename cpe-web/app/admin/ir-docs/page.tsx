'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/AdminPageHeader'

type IrDoc = {
  id: string
  categoria: string
  entidad: string
  fecha: string | null
  periodo: string
  tipo: string
  titulo_es: string
  titulo_en: string
  url: string
  publicado: boolean
  created_at: string
}

const CATEGORIAS = [
  { value: 'financiero', label: 'EE.FF. / MD&A' },
  { value: 'agm',        label: 'AGM / Asamblea' },
  { value: 'estma',      label: 'ESTMA' },
  { value: 'gobierno',   label: 'Gobierno corporativo' },
  { value: 'on',         label: 'Obligaciones Negociables' },
  { value: 'otro',       label: 'Otro' },
]

const ENTIDADES = ['CPI', 'CPESA']
const TIPOS_FINANCIERO = ['FS', 'MDA', 'EEFF', 'PDF']

const EMPTY_FORM = {
  categoria: 'financiero',
  entidad: 'CPI',
  fecha: '',
  periodo: '',
  tipo: 'FS',
  titulo_es: '',
  titulo_en: '',
  url: '',
  publicado: true,
}

function getYear(d: IrDoc) {
  return d.fecha ? d.fecha.slice(0, 4) : d.periodo.match(/\b(20\d{2})\b/)?.[1] ?? '—'
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export default function IrDocsAdminPage() {
  const [docs, setDocs] = useState<IrDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [entidadFilter, setEntidadFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/cms/ir-docs')
    const body = await res.json()
    if (res.ok) setDocs(body)
    else flash(body.error ?? 'No se pudieron cargar los documentos', true)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function flash(m: string, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo_es.trim() || !form.url.trim()) {
      flash('Título ES y URL son obligatorios', true); return
    }
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const endpoint = editingId ? `/api/cms/ir-docs/${editingId}` : '/api/cms/ir-docs'
      const res = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          fecha: form.fecha || null,
          titulo_en: form.titulo_en || form.titulo_es,
        }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error') }
      flash(editingId ? 'Actualizado' : 'Creado')
      setShowForm(false)
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
      await load()
    } catch (e) {
      flash((e as Error).message, true)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublicado(doc: IrDoc) {
    const res = await fetch(`/api/cms/ir-docs/${doc.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicado: !doc.publicado }),
    })
    if (res.ok) setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, publicado: !d.publicado } : d))
  }

  async function handleDelete(doc: IrDoc) {
    if (!confirm(`¿Eliminar "${doc.titulo_es}"?`)) return
    const res = await fetch(`/api/cms/ir-docs/${doc.id}`, { method: 'DELETE' })
    if (res.ok) { setDocs(prev => prev.filter(d => d.id !== doc.id)); flash('Eliminado') }
    else flash('Error al eliminar', true)
  }

  function startEdit(doc: IrDoc) {
    setEditingId(doc.id)
    setForm({
      categoria: doc.categoria,
      entidad: doc.entidad,
      fecha: doc.fecha ?? '',
      periodo: doc.periodo,
      tipo: doc.tipo,
      titulo_es: doc.titulo_es,
      titulo_en: doc.titulo_en,
      url: doc.url,
      publicado: doc.publicado,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
  }

  const q = search.toLowerCase()
  const filtered = docs.filter(d => {
    if (catFilter !== 'all' && d.categoria !== catFilter) return false
    if (entidadFilter !== 'all' && d.entidad !== entidadFilter) return false
    if (q && !d.titulo_es.toLowerCase().includes(q) && !d.titulo_en.toLowerCase().includes(q) && !d.periodo.toLowerCase().includes(q)) return false
    return true
  })

  const byCategoria = CATEGORIAS.map(c => ({
    ...c,
    items: filtered.filter(d => d.categoria === c.value),
  })).filter(c => c.items.length > 0 || catFilter === c.value)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--rule)',
    borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)',
    fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--fg-muted)', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <AdminPageHeader
          title="IR Documents"
          subtitle={`${docs.length} documentos · EE.FF., MD&A, AGM, ESTMA, Gobierno corporativo`}
          note={
            <>
              Estos documentos son <strong>públicos</strong> (se ven en /inversores sin login). Para materiales
              privados solo para accionistas, usá{' '}
              <Link href="/admin/inversores" style={{ color: 'var(--accent)' }}>Inversores — privado</Link>.
            </>
          }
          right={
            <>
              {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
              {err && <span style={{ fontSize: 12, color: 'var(--cp-negative)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✗ {err}</span>}
              <button
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '9px 18px' }}
                onClick={() => { setShowForm(s => !s); setEditingId(null); setForm({ ...EMPTY_FORM }) }}
              >
                {showForm && !editingId ? '✕ Cancelar' : '+ Agregar documento'}
              </button>
            </>
          }
        />

        {/* Form */}
        {showForm && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '24px 28px', marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
              {editingId ? 'Editar documento' : 'Agregar documento'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Categoría *</label>
                  <select style={inputStyle} value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Entidad</label>
                  <select style={inputStyle} value={form.entidad} onChange={e => setForm(p => ({ ...p, entidad: e.target.value }))}>
                    {ENTIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" style={inputStyle} value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <input type="text" style={inputStyle} value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} placeholder="FS, MDA, PDF…" list="tipos-list" />
                  <datalist id="tipos-list">{TIPOS_FINANCIERO.map(t => <option key={t} value={t} />)}</datalist>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Período</label>
                <input type="text" style={inputStyle} value={form.periodo} onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))} placeholder="Dec 31, 2025 · Q4 2025 · Annual 2025" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Título (español) *</label>
                  <input type="text" required style={inputStyle} value={form.titulo_es} onChange={e => setForm(p => ({ ...p, titulo_es: e.target.value }))} placeholder="EE.FF. Anuales 2025" />
                </div>
                <div>
                  <label style={labelStyle}>Title (English)</label>
                  <input type="text" style={inputStyle} value={form.titulo_en} onChange={e => setForm(p => ({ ...p, titulo_en: e.target.value }))} placeholder="Annual Financial Statements 2025" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>URL del documento *</label>
                <input type="url" required style={inputStyle} value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://…" />
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div
                    style={{ width: 44, height: 24, borderRadius: 12, background: form.publicado ? 'var(--accent)' : 'var(--rule)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => setForm(p => ({ ...p, publicado: !p.publicado }))}
                  >
                    <div style={{ position: 'absolute', top: 3, left: form.publicado ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize: 14, color: form.publicado ? 'var(--fg)' : 'var(--fg-muted)' }}>
                    {form.publicado ? 'Publicado' : 'Oculto'}
                  </span>
                </label>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                  <button type="button" className="btn" onClick={cancelForm} style={{ fontSize: 13 }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <input
              type="search"
              placeholder="Buscar…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }}
            />
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.6"/><path d="m18 18-4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'inherit', fontSize: 13 }}
          >
            <option value="all">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={entidadFilter}
            onChange={e => setEntidadFilter(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'inherit', fontSize: 13 }}
          >
            <option value="all">Todas las entidades</option>
            {ENTIDADES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{filtered.length} documentos</span>
        </div>

        {/* Document list */}
        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : (
          <div style={{ display: 'grid', gap: 28 }}>
            {byCategoria.map(grupo => (
              grupo.items.length > 0 && (
                <div key={grupo.value}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
                    {grupo.label} <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>({grupo.items.length})</span>
                  </h3>
                  <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
                    {grupo.items.map((doc, i) => (
                      <div
                        key={doc.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '70px 1fr auto auto auto auto',
                          gap: 12,
                          alignItems: 'center',
                          padding: '13px 16px',
                          borderBottom: i < grupo.items.length - 1 ? '1px solid var(--rule)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--r-pill)', background: 'var(--rule)', color: 'var(--fg-muted)', letterSpacing: '0.07em', textAlign: 'center' }}>
                            {doc.entidad}
                          </span>
                          {doc.tipo && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--r-pill)', background: 'rgba(31,37,102,0.08)', color: 'var(--accent)', letterSpacing: '0.06em', textAlign: 'center' }}>
                              {doc.tipo}
                            </span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{doc.titulo_es}</div>
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                            {doc.periodo}{doc.fecha ? ` · ${doc.fecha}` : ''} · <span style={{ color: 'var(--fg-muted)' }}>{getYear(doc)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                            {truncate(doc.url, 60)}
                          </div>
                        </div>

                        {/* Visibility toggle */}
                        <div
                          title={doc.publicado ? 'Publicado — clic para ocultar' : 'Oculto — clic para publicar'}
                          style={{ width: 36, height: 20, borderRadius: 10, background: doc.publicado ? 'var(--accent)' : 'var(--rule)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                          onClick={() => togglePublicado(doc)}
                        >
                          <div style={{ position: 'absolute', top: 2, left: doc.publicado ? 17 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>

                        {/* Ver */}
                        <a href={doc.url} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Ver
                        </a>

                        {/* Edit */}
                        <button onClick={() => startEdit(doc)} className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>
                          Editar
                        </button>

                        {/* Delete */}
                        <button onClick={() => handleDelete(doc)} className="btn" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--cp-negative)' }}>
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
            {filtered.length === 0 && !loading && (
              <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>No hay documentos que coincidan con los filtros.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

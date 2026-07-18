'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { AdminPageHeader } from '@/components/AdminPageHeader'

type Comunicado = {
  id: string
  fecha: string
  titulo_es: string
  titulo_en: string
  resumen_es: string
  resumen_en: string
  url: string
  storage_path: string
  file_name: string
  tipo: string
  publicado: boolean
  created_at: string
}

const TIPOS = [
  { value: 'general',    label: 'General' },
  { value: 'resultados', label: 'Resultados financieros' },
  { value: 'operaciones',label: 'Operaciones' },
  { value: 'mercados',   label: 'Mercados de capital' },
  { value: 'esg',        label: 'ESG / Sostenibilidad' },
  { value: 'gobierno',   label: 'Gobierno corporativo' },
]

type FormState = {
  fecha: string
  titulo_es: string
  titulo_en: string
  resumen_es: string
  resumen_en: string
  url: string
  tipo: string
  publicado: boolean
}

const EMPTY_FORM: FormState = {
  fecha: new Date().toISOString().slice(0, 10),
  titulo_es: '', titulo_en: '', resumen_es: '', resumen_en: '',
  url: '', tipo: 'general', publicado: true,
}

function fmtFecha(iso: string) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getYear(iso: string) { return iso ? iso.slice(0, 4) : '—' }

export default function ComunicadosAdminPage() {
  const [items, setItems] = useState<Comunicado[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    const res = await fetch('/api/cms/comunicados')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function flash(m: string, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  }

  function startEdit(item: Comunicado) {
    setEditingId(item.id)
    setForm({
      fecha: item.fecha,
      titulo_es: item.titulo_es,
      titulo_en: item.titulo_en,
      resumen_es: item.resumen_es,
      resumen_en: item.resumen_en,
      url: item.url,
      tipo: item.tipo,
      publicado: item.publicado,
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo_es.trim()) { flash('Ingresá un título en español', true); return }

    setUploading(true)
    setErr('')

    try {
      let storagePath = ''
      let fileName = ''
      let finalUrl = form.url

      const file = fileRef.current?.files?.[0]
      if (file) {
        const supabase = createSupabaseBrowserClient()
        const path = `comunicados/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: storageErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: false })
        if (storageErr) throw new Error(storageErr.message)

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        storagePath = path
        fileName = file.name
        finalUrl = publicUrl
      }

      const payload = {
        fecha: form.fecha,
        titulo_es: form.titulo_es.trim(),
        titulo_en: form.titulo_en.trim() || form.titulo_es.trim(),
        resumen_es: form.resumen_es.trim(),
        resumen_en: form.resumen_en.trim(),
        url: finalUrl,
        tipo: form.tipo,
        publicado: form.publicado,
        ...(storagePath && { storage_path: storagePath, file_name: fileName }),
      }

      const url = editingId ? `/api/cms/comunicados/${editingId}` : '/api/cms/comunicados'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')

      flash(editingId ? 'Comunicado actualizado' : 'Comunicado guardado')
      setEditingId(null)
      setForm(EMPTY_FORM)
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (e) {
      flash((e as Error).message, true)
    } finally {
      setUploading(false)
    }
  }

  async function togglePublicado(item: Comunicado) {
    const res = await fetch(`/api/cms/comunicados/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicado: !item.publicado }),
    })
    if (res.ok) {
      setItems(prev => prev.map(c => c.id === item.id ? { ...c, publicado: !c.publicado } : c))
    } else {
      flash('Error al actualizar', true)
    }
  }

  async function handleDelete(item: Comunicado) {
    if (!confirm(`¿Eliminar "${item.titulo_es}"?`)) return
    const res = await fetch(`/api/cms/comunicados/${item.id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(c => c.id !== item.id))
      flash('Eliminado')
      if (editingId === item.id) cancelEdit()
    } else {
      flash('Error al eliminar', true)
    }
  }

  const years = Array.from(new Set(items.map(c => getYear(c.fecha)))).sort((a, b) => +b - +a)
  const q = search.toLowerCase()
  const filtered = items
    .filter(c => yearFilter === 'all' || getYear(c.fecha) === yearFilter)
    .filter(c => !q || c.titulo_es.toLowerCase().includes(q) || c.titulo_en.toLowerCase().includes(q))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <AdminPageHeader
          title="Comunicados de prensa"
          subtitle="Press releases · noticias de la empresa"
          right={msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
        />

        {/* Form */}
        <div ref={formRef} style={{ background: 'var(--surface)', border: `1px solid ${editingId ? 'var(--accent)' : 'var(--rule)'}`, borderRadius: 'var(--r-lg)', padding: '28px 28px 24px', marginBottom: 36, transition: 'border-color 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
              {editingId ? 'Editando comunicado' : 'Agregar comunicado'}
            </h2>
            {editingId && (
              <button onClick={cancelEdit} className="btn" style={{ fontSize: 12, padding: '6px 14px' }}>
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,160px) 1fr 1fr', gap: 16 }}>
              <div className="form-row">
                <label>Fecha *</label>
                <input type="date" required value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Estado</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6, cursor: 'pointer' }}>
                  <div
                    style={{ width: 44, height: 24, borderRadius: 12, background: form.publicado ? 'var(--accent)' : 'var(--rule)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}
                    onClick={() => setForm(p => ({ ...p, publicado: !p.publicado }))}
                  >
                    <div style={{ position: 'absolute', top: 3, left: form.publicado ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize: 14, color: form.publicado ? 'var(--fg)' : 'var(--fg-muted)' }}>
                    {form.publicado ? 'Visible' : 'Borrador'}
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-row">
                <label>Título (español) *</label>
                <input type="text" required value={form.titulo_es} onChange={e => setForm(p => ({ ...p, titulo_es: e.target.value }))} placeholder="Crown Point anuncia…" />
              </div>
              <div className="form-row">
                <label>Title (English)</label>
                <input type="text" value={form.titulo_en} onChange={e => setForm(p => ({ ...p, titulo_en: e.target.value }))} placeholder="Crown Point announces…" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-row">
                <label>Resumen (español)</label>
                <textarea rows={2} value={form.resumen_es} onChange={e => setForm(p => ({ ...p, resumen_es: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-row">
                <label>Summary (English)</label>
                <textarea rows={2} value={form.resumen_en} onChange={e => setForm(p => ({ ...p, resumen_en: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-row">
                <label>URL externa (o subí un archivo abajo)</label>
                <input type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="form-row">
                <label>Archivo PDF {editingId ? '(nuevo archivo reemplaza el actual)' : '(opcional)'}</label>
                <input type="file" ref={fileRef} accept=".pdf" />
              </div>
            </div>

            {err && (
              <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)' }}>
                {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ justifyContent: 'center', padding: '13px 24px', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Guardando…' : editingId ? 'Actualizar comunicado' : 'Guardar comunicado'}
            </button>
          </form>
        </div>

        {/* Year filter + list */}
        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>No hay comunicados todavía.</p>
        ) : (
          <div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input
                type="search"
                placeholder="Buscar comunicados…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'inherit', fontSize: 14 }}
              />
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.6"/><path d="m18 18-4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
              {['all', ...years].map(y => (
                <button
                  key={y}
                  onClick={() => setYearFilter(y)}
                  style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, background: yearFilter === y ? 'var(--accent)' : 'var(--surface)', color: yearFilter === y ? '#fff' : 'var(--fg-soft)', border: '1px solid var(--rule)', borderRadius: 'var(--r-pill)', cursor: 'pointer' }}
                >
                  {y === 'all' ? 'Todos' : y}
                </button>
              ))}
            </div>

            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {filtered.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '110px 1fr auto auto auto auto',
                    gap: 8, alignItems: 'center', padding: '12px 16px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--rule)' : 'none',
                    background: editingId === item.id ? 'color-mix(in oklab, var(--accent) 6%, var(--surface))' : undefined,
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4 }}>
                    {fmtFecha(item.fecha)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo_es}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {TIPOS.find(t => t.value === item.tipo)?.label}
                    </div>
                  </div>

                  <div
                    title={item.publicado ? 'Visible — clic para ocultar' : 'Borrador — clic para publicar'}
                    style={{ width: 36, height: 20, borderRadius: 10, background: item.publicado ? 'var(--accent)' : 'var(--rule)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                    onClick={() => togglePublicado(item)}
                  >
                    <div style={{ position: 'absolute', top: 2, left: item.publicado ? 17 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>

                  <button onClick={() => startEdit(item)} className="btn" style={{ fontSize: 12, padding: '5px 10px' }}>
                    Editar
                  </button>

                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 12, padding: '5px 10px', textDecoration: 'none' }}>
                      Ver
                    </a>
                  )}
                  <button onClick={() => handleDelete(item)} className="btn" style={{ fontSize: 12, padding: '5px 10px', color: 'var(--cp-negative)' }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

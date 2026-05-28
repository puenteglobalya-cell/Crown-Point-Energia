'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

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

function fmtFecha(iso: string) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getYear(iso: string) {
  return iso ? iso.slice(0, 4) : '—'
}

export default function ComunicadosAdminPage() {
  const [items, setItems] = useState<Comunicado[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')

  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    titulo_es: '',
    titulo_en: '',
    resumen_es: '',
    resumen_en: '',
    url: '',
    tipo: 'general',
    publicado: true,
  })

  async function load() {
    const res = await fetch('/api/cms/comunicados')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function flash(m: string, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else { setMsg(m); setTimeout(() => setMsg(''), 3000) }
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

      const res = await fetch('/api/cms/comunicados', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fecha: form.fecha,
          titulo_es: form.titulo_es.trim(),
          titulo_en: form.titulo_en.trim() || form.titulo_es.trim(),
          resumen_es: form.resumen_es.trim(),
          resumen_en: form.resumen_en.trim(),
          url: finalUrl,
          storage_path: storagePath,
          file_name: fileName,
          tipo: form.tipo,
          publicado: form.publicado,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')

      flash('Comunicado guardado')
      setForm(p => ({
        ...p,
        titulo_es: '', titulo_en: '', resumen_es: '', resumen_en: '', url: '',
        fecha: new Date().toISOString().slice(0, 10),
      }))
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
    if (res.ok) setItems(prev => prev.map(c => c.id === item.id ? { ...c, publicado: !c.publicado } : c))
  }

  async function handleDelete(item: Comunicado) {
    if (!confirm(`¿Eliminar "${item.titulo_es}"?`)) return
    const res = await fetch(`/api/cms/comunicados/${item.id}`, { method: 'DELETE' })
    if (res.ok) { setItems(prev => prev.filter(c => c.id !== item.id)); flash('Eliminado') }
    else flash('Error al eliminar', true)
  }

  const years = Array.from(new Set(items.map(c => getYear(c.fecha)))).sort((a, b) => +b - +a)
  const filtered = yearFilter === 'all' ? items : items.filter(c => getYear(c.fecha) === yearFilter)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ marginBottom: 6 }}>
              <Link href="/admin" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>
                ← Panel CMS
              </Link>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
              Comunicados de prensa
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
              Press releases · noticias de la empresa
            </p>
          </div>
          {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
        </div>

        {/* Form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px 28px 24px', marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Agregar comunicado
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: 16 }}>
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
                <label>Publicado</label>
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
                <label>URL externa (o dejá vacío para subir archivo)</label>
                <input type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="form-row">
                <label>Archivo PDF (opcional)</label>
                <input type="file" ref={fileRef} accept=".pdf" />
              </div>
            </div>

            {err && (
              <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)' }}>
                {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ justifyContent: 'center', padding: '13px 24px', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Guardando…' : 'Guardar comunicado'}
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
            {/* Year tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
              <button
                onClick={() => setYearFilter('all')}
                style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, background: yearFilter === 'all' ? 'var(--accent)' : 'var(--surface)', color: yearFilter === 'all' ? '#fff' : 'var(--fg-soft)', border: '1px solid var(--rule)', borderRadius: 'var(--r-pill)', cursor: 'pointer' }}
              >
                Todos
              </button>
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setYearFilter(y)}
                  style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, background: yearFilter === y ? 'var(--accent)' : 'var(--surface)', color: yearFilter === y ? '#fff' : 'var(--fg-soft)', border: '1px solid var(--rule)', borderRadius: 'var(--r-pill)', cursor: 'pointer' }}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* List */}
            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {filtered.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr auto auto auto',
                    gap: 12, alignItems: 'center', padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)' }}>
                    {fmtFecha(item.fecha)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{item.titulo_es}</div>
                    {item.resumen_es && (
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60ch' }}>{item.resumen_es}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {TIPOS.find(t => t.value === item.tipo)?.label}
                    </div>
                  </div>

                  {/* Visibility toggle */}
                  <div
                    title={item.publicado ? 'Visible — clic para ocultar' : 'Borrador — clic para publicar'}
                    style={{ width: 36, height: 20, borderRadius: 10, background: item.publicado ? 'var(--accent)' : 'var(--rule)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                    onClick={() => togglePublicado(item)}
                  >
                    <div style={{ position: 'absolute', top: 2, left: item.publicado ? 17 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>

                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}>
                      Ver
                    </a>
                  )}
                  <button onClick={() => handleDelete(item)} className="btn" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--cp-negative)' }}>
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

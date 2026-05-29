'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Documento = {
  id: string
  titulo_es: string
  titulo_en: string
  tipo: string
  periodo: string
  storage_path: string
  file_name: string
  file_size: number | null
  publico: boolean
  created_at: string
}

const TIPOS = [
  { value: 'financiero',    label: 'EE.FF. / MD&A' },
  { value: 'on',            label: 'Obligaciones Negociables' },
  { value: 'gobierno',      label: 'Gobierno corporativo' },
  { value: 'produccion',    label: 'Reporte de producción' },
  { value: 'presentacion',  label: 'Presentación corporativa' },
  { value: 'otro',          label: 'Otro' },
]

function fileNameToTitle(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')        // remove extension
    .replace(/[-_]+/g, ' ')         // dashes/underscores → spaces
    .replace(/\b\w/g, c => c.toUpperCase()) // title case
    .trim()
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')

  // Form state
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    titulo_es: '',
    titulo_en: '',
    tipo: 'financiero',
    periodo: '',
    publico: true,
  })

  async function loadDocs() {
    const res = await fetch('/api/cms/docs')
    if (res.ok) setDocs(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadDocs() }, [])

  function flash(m: string, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(p => ({
      ...p,
      titulo_es: p.titulo_es.trim() ? p.titulo_es : fileNameToTitle(file.name),
      titulo_en: p.titulo_en.trim() ? p.titulo_en : fileNameToTitle(file.name),
    }))
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { flash('Seleccioná un archivo', true); return }
    if (!form.titulo_es.trim()) { flash('Ingresá un título en español', true); return }

    setUploading(true)
    setErr('')

    try {
      const supabase = createSupabaseBrowserClient()

      // Upload file to Supabase Storage
      const path = `${form.tipo}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const MIME_MAP: Record<string, string> = {
        pdf: 'application/pdf',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
      }
      const fileExt = (file.name.split('.').pop() ?? '').toLowerCase()
      const contentType = MIME_MAP[fileExt] ?? 'application/octet-stream'

      const { error: storageErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: false, contentType })

      if (storageErr) throw new Error(storageErr.message)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(path)

      // Save metadata
      const res = await fetch('/api/cms/docs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          titulo_es: form.titulo_es.trim(),
          titulo_en: form.titulo_en.trim() || form.titulo_es.trim(),
          tipo: form.tipo,
          periodo: form.periodo.trim(),
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          publico: form.publico,
        }),
      })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Error al guardar')
      }

      flash('Documento subido')
      setForm({ titulo_es: '', titulo_en: '', tipo: 'financiero', periodo: '', publico: true })
      if (fileRef.current) fileRef.current.value = ''
      await loadDocs()
    } catch (e) {
      flash((e as Error).message, true)
    } finally {
      setUploading(false)
    }
  }

  async function togglePublico(doc: Documento) {
    const res = await fetch(`/api/cms/docs/${doc.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publico: !doc.publico }),
    })
    if (res.ok) {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, publico: !d.publico } : d))
    }
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.titulo_es}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/cms/docs/${doc.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== doc.id))
      flash('Documento eliminado')
    } else {
      flash('Error al eliminar', true)
    }
  }

  function getPublicUrl(storagePath: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    return `${supabaseUrl}/storage/v1/object/public/documents/${storagePath}`
  }

  const q = search.toLowerCase()
  const filteredDocs = q
    ? docs.filter(d => d.titulo_es.toLowerCase().includes(q) || d.titulo_en.toLowerCase().includes(q) || d.periodo.toLowerCase().includes(q))
    : docs

  const byTipo = TIPOS.map(t => ({
    ...t,
    items: filteredDocs.filter(d => d.tipo === t.value),
  })).filter(t => t.items.length > 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <Link href="/admin" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>
                ← Panel CMS
              </Link>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
              Documentos
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
              Balances, reportes, presentaciones y documentos legales · PDF / Excel / PowerPoint / Word
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
          </div>
        </div>

        {/* Upload form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px 28px 24px', marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Subir documento
          </h2>
          <form onSubmit={handleUpload} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-row">
                <label>Título (español) *</label>
                <input
                  type="text"
                  required
                  value={form.titulo_es}
                  onChange={e => setForm(p => ({ ...p, titulo_es: e.target.value }))}
                  placeholder="EE.FF. Q1 2026"
                />
              </div>
              <div className="form-row">
                <label>Title (English)</label>
                <input
                  type="text"
                  value={form.titulo_en}
                  onChange={e => setForm(p => ({ ...p, titulo_en: e.target.value }))}
                  placeholder="Q1 2026 Financial Statements"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="form-row">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Período / fecha</label>
                <input
                  type="text"
                  value={form.periodo}
                  onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))}
                  placeholder="Q1 2026 · 15 abr 2026"
                />
              </div>
              <div className="form-row">
                <label>Visibilidad</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: 6 }}>
                  <div
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: form.publico ? 'var(--accent)' : 'var(--rule)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      cursor: 'pointer',
                    }}
                    onClick={() => setForm(p => ({ ...p, publico: !p.publico }))}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: form.publico ? 22 : 3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: 14, color: form.publico ? 'var(--fg)' : 'var(--fg-muted)' }}>
                    {form.publico ? 'Público' : 'Privado'}
                  </span>
                </label>
              </div>
            </div>

            <div className="form-row">
              <label>Archivo</label>
              <input
                type="file"
                ref={fileRef}
                accept=".pdf,.xls,.xlsx,.ppt,.pptx,.doc,.docx,.png,.jpg"
                required
                onChange={handleFileChange}
              />
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                PDF · Excel · PowerPoint · Word · Imagen
              </span>
            </div>

            {err && (
              <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)' }}>
                {err}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
              style={{ justifyContent: 'center', padding: '13px 24px', opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? 'Subiendo…' : 'Subir documento'}
            </button>
          </form>
        </div>

        {/* Search */}
        {docs.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              type="search"
              placeholder="Buscar documentos…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'inherit', fontSize: 14 }}
            />
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.6"/><path d="m18 18-4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : docs.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>No hay documentos todavía. Subí el primero arriba.</p>
        ) : (
          <div style={{ display: 'grid', gap: 28 }}>
            {byTipo.map(grupo => (
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
                        gridTemplateColumns: '1fr auto auto auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: '14px 20px',
                        borderBottom: i < grupo.items.length - 1 ? '1px solid var(--rule)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>
                          {doc.titulo_es}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                          {doc.periodo && <>{doc.periodo} · </>}
                          {doc.file_name}
                          {doc.file_size && <> · {fmtSize(doc.file_size)}</>}
                        </div>
                      </div>

                      {/* Visibility toggle */}
                      <div
                        title={doc.publico ? 'Visible en el sitio — clic para privatizar' : 'Privado — clic para publicar'}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: doc.publico ? 'var(--accent)' : 'var(--rule)',
                          position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                        }}
                        onClick={() => togglePublico(doc)}
                      >
                        <div style={{
                          position: 'absolute', top: 2, left: doc.publico ? 17 : 2,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                        }} />
                      </div>

                      {/* Download link */}
                      <a
                        href={getPublicUrl(doc.storage_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn"
                        style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}
                      >
                        Ver
                      </a>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(doc)}
                        className="btn"
                        style={{ fontSize: 12, padding: '6px 12px', color: 'var(--cp-negative)' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

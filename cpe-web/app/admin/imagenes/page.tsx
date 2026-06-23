'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type SiteImage = {
  name: string
  id: string
  created_at: string
  metadata: { size: number; mimetype: string } | null
}

const SECTIONS = [
  { value: 'hero', label: 'Hero / portada' },
  { value: 'operaciones', label: 'Operaciones' },
  { value: 'esg', label: 'ESG / Sostenibilidad' },
  { value: 'acerca', label: 'Acerca de' },
  { value: 'general', label: 'General' },
]

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-images/${path}`
}

export default function ImagenesPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<SiteImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [section, setSection] = useState('hero')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function loadImages() {
    const supabase = createSupabaseBrowserClient()
    const all: SiteImage[] = []

    // List each section subfolder — Supabase Storage list() is not recursive
    await Promise.all(SECTIONS.map(async s => {
      const { data } = await supabase.storage.from('site-images').list(s.value, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (data) {
        all.push(
          ...data.filter(f => f.id).map(f => ({ ...f, name: `${s.value}/${f.name}` })) as SiteImage[]
        )
      }
    }))

    // Also capture any root-level files (uncategorized uploads)
    const { data: rootFiles } = await supabase.storage.from('site-images').list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (rootFiles) {
      all.push(...rootFiles.filter(f => f.id) as SiteImage[])
    }

    setImages(all.sort((a, b) => (b.created_at > a.created_at ? 1 : -1)))
    setLoading(false)
  }

  useEffect(() => { loadImages() }, [])

  function flash(m: string, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setErr('')
    try {
      const supabase = createSupabaseBrowserClient()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const slug = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase()
        .slice(0, 60)
      const path = `${section}/${Date.now()}-${slug}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('site-images')
        .upload(path, file, { upsert: false })
      if (storageErr) throw new Error(storageErr.message)
      flash('Imagen subida')
      if (fileRef.current) fileRef.current.value = ''
      await loadImages()
    } catch (e) {
      flash((e as Error).message, true)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(img: SiteImage) {
    if (!confirm(`¿Eliminar "${img.name}"?`)) return
    const supabase = createSupabaseBrowserClient()
    await supabase.storage.from('site-images').remove([img.name])
    setImages(prev => prev.filter(i => i.id !== img.id))
    flash('Eliminada')
  }

  function copyUrl(path: string) {
    const url = publicUrl(path)
    navigator.clipboard.writeText(url)
    setCopied(path)
    setTimeout(() => setCopied(null), 2000)
  }

  const bySection = SECTIONS.map(s => ({
    ...s,
    items: images.filter(i => i.name.startsWith(s.value + '/')),
  })).filter(s => s.items.length > 0)

  const uncategorized = images.filter(i => !SECTIONS.some(s => i.name.startsWith(s.value + '/')))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
              Imágenes del sitio
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
              Fotos de portada y heroes · JPG / PNG / WebP · máx. 10 MB
            </p>
          </div>
          {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
        </div>

        {/* Upload form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '24px 28px', marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 18px', letterSpacing: '-0.01em' }}>
            Subir imagen
          </h2>
          <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end' }}>
            <div className="form-row" style={{ margin: 0 }}>
              <label>Sección</label>
              <select value={section} onChange={e => setSection(e.target.value)}>
                {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-row" style={{ margin: 0 }}>
              <label>Archivo</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                required
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setPreview(URL.createObjectURL(f))
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
              style={{ padding: '10px 20px', opacity: uploading ? 0.7 : 1, whiteSpace: 'nowrap' }}
            >
              {uploading ? 'Subiendo…' : 'Subir'}
            </button>
          </form>
          {err && (
            <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginTop: 12 }}>
              {err}
            </div>
          )}
          {preview && (
            <div style={{ marginTop: 14 }}>
              <img src={preview} alt="preview" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        {/* Image grid */}
        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : images.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>No hay imágenes todavía. Subí la primera.</p>
        ) : (
          <div style={{ display: 'grid', gap: 28 }}>
            {[...bySection, ...(uncategorized.length > 0 ? [{ value: 'otros', label: 'Sin categoría', items: uncategorized }] : [])].map(grupo => (
              <div key={grupo.value}>
                <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
                  {grupo.label} <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>({grupo.items.length})</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  {grupo.items.map(img => (
                    <div key={img.id} style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
                      <div style={{ aspectRatio: '16/9', background: 'var(--bg-alt)', overflow: 'hidden' }}>
                        <img
                          src={publicUrl(img.name)}
                          alt={img.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {img.name.split('/').pop()}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                          {fmtSize(img.metadata?.size)}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => copyUrl(img.name)}
                            className="btn"
                            style={{
                              flex: 1, fontSize: 11, padding: '5px 8px',
                              color: copied === img.name ? 'var(--cp-green)' : undefined,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {copied === img.name ? '✓ Copiada' : 'Copiar URL'}
                          </button>
                          <button
                            onClick={() => handleDelete(img)}
                            className="btn"
                            style={{ fontSize: 11, padding: '5px 8px', color: 'var(--cp-negative)' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
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

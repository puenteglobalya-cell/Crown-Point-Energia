'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Image from 'next/image'

type Block = {
  slug: string
  titulo: string
  eyebrow: string
}

const BLOCKS: Block[] = [
  { slug: 'ppc',      titulo: 'Puesto Pozo Cercado Oriental', eyebrow: 'Bloque 01 · Mendoza' },
  { slug: 'chanares', titulo: 'Chañares Herrados',            eyebrow: 'Bloque 02 · Mendoza' },
  { slug: 'cerro',    titulo: 'Cerro de Los Leones',          eyebrow: 'Bloque 03 · Mendoza' },
  { slug: 'tordillo', titulo: 'El Tordillo · La Tapera · P. Quiroga', eyebrow: 'Bloque 04 · Chubut' },
  { slug: 'piedra',   titulo: 'Piedra Clavada – Koluel Kaike', eyebrow: 'Bloque 05 · Santa Cruz' },
  { slug: 'tdf',      titulo: 'Río Cullen · Las Violetas · La Angostura', eyebrow: 'Bloque 06 · Tierra del Fuego' },
]

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-images/${path}`
}

function BlockCard({ block }: { block: Block }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [dragging, setDragging] = useState(false)

  async function loadCurrentImg() {
    const sb = createSupabaseBrowserClient()
    const { data } = await sb.from('cms_fields').select('value_es').eq('key', `img.ops.${block.slug}`).maybeSingle()
    setCurrentUrl(data?.value_es ?? '')
  }

  useEffect(() => { loadCurrentImg() }, [block.slug])

  function flash(m: string, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) { flash('Solo imágenes', true); return }
    setUploading(true); setErr('')
    try {
      const sb = createSupabaseBrowserClient()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const slug2 = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40)
      const path = `operaciones/${block.slug}/${Date.now()}-${slug2}.${ext}`

      const { error: uploadErr } = await sb.storage.from('site-images').upload(path, file, { upsert: false })
      if (uploadErr) throw new Error(uploadErr.message)

      const url = publicUrl(path)

      const { error: cmsErr } = await sb.from('cms_fields').upsert(
        { key: `img.ops.${block.slug}`, value_es: url, value_en: url },
        { onConflict: 'key' }
      )
      if (cmsErr) throw new Error(cmsErr.message)

      setCurrentUrl(url)
      flash('Foto actualizada')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : String(e), true)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function clearPhoto() {
    if (!confirm('¿Eliminar foto de este bloque?')) return
    const sb = createSupabaseBrowserClient()
    await sb.from('cms_fields').upsert(
      { key: `img.ops.${block.slug}`, value_es: '', value_en: '' },
      { onConflict: 'key' }
    )
    setCurrentUrl('')
    flash('Foto eliminada')
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Photo area */}
      <div
        style={{
          position: 'relative', aspectRatio: '16/7', background: 'var(--bg-alt)',
          border: dragging ? '2px dashed var(--accent)' : '2px dashed transparent',
          cursor: 'pointer', transition: 'border-color 0.15s',
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) uploadFile(f)
        }}
      >
        {currentUrl ? (
          <Image src={currentUrl} alt={block.titulo} fill style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--fg-muted)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 12 }}>Clic o arrastrá para subir</span>
          </div>
        )}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13,
          }}>
            Subiendo…
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }} />
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)', fontWeight: 600 }}>{block.eyebrow}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{block.titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            CMS: <code>img.ops.{block.slug}</code>
          </div>
        </div>

        {(msg || err) && (
          <div style={{ fontSize: 12, color: err ? '#C94A4A' : 'var(--cp-green-deep)', fontWeight: 600 }}>
            {msg || err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              flex: 1, padding: '8px 0', background: 'var(--accent)', color: '#fff',
              border: 0, borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {currentUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {currentUrl && (
            <button
              onClick={clearPhoto}
              style={{
                padding: '8px 14px', background: 'transparent', color: 'var(--fg-muted)',
                border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13,
              }}
            >
              Quitar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BloquesFotosPage() {
  return (
    <div style={{ padding: '40px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Fotos de bloques operativos
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', margin: 0 }}>
          Subí una foto por bloque. Se guarda en Supabase Storage y se actualiza el campo CMS automáticamente.
          Clic en el área de la imagen o arrastrá el archivo.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {BLOCKS.map(b => <BlockCard key={b.slug} block={b} />)}
      </div>
    </div>
  )
}

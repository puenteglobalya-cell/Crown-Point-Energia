'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Image from 'next/image'
import { AdminPageHeader } from '@/components/AdminPageHeader'

type Block = {
  slug: string
  titulo: string
  eyebrow: string
}

type Photo = { id: string; url: string; orden: number }

const MAX_PHOTOS = 5

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
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [dragging, setDragging] = useState(false)

  async function loadPhotos() {
    const sb = createSupabaseBrowserClient()
    const { data } = await sb
      .from('operations_block_photos')
      .select('id, url, orden')
      .eq('block_slug', block.slug)
      .order('orden')
    setPhotos(data ?? [])
  }

  useEffect(() => { loadPhotos() }, [block.slug])

  function flash(m: string, isErr = false) {
    if (isErr) { setErr(m); setTimeout(() => setErr(''), 4000) }
    else { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  }

  async function uploadFiles(files: File[]) {
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) { flash(`Máximo ${MAX_PHOTOS} fotos por concesión`, true); return }
    const toUpload = files.filter(f => f.type.startsWith('image/')).slice(0, room)
    if (toUpload.length === 0) { flash('Solo imágenes', true); return }

    setUploading(true); setErr('')
    try {
      const sb = createSupabaseBrowserClient()
      let nextOrden = photos.length ? Math.max(...photos.map(p => p.orden)) + 1 : 0

      for (const file of toUpload) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const slug2 = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40)
        const path = `operaciones/${block.slug}/${Date.now()}-${slug2}.${ext}`

        const { error: uploadErr } = await sb.storage.from('site-images').upload(path, file, { upsert: false })
        if (uploadErr) throw new Error(uploadErr.message)

        const { error: insertErr } = await sb.from('operations_block_photos').insert({
          block_slug: block.slug, url: publicUrl(path), orden: nextOrden++,
        })
        if (insertErr) throw new Error(insertErr.message)
      }

      await loadPhotos()
      flash(toUpload.length > 1 ? `${toUpload.length} fotos subidas` : 'Foto subida')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : String(e), true)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removePhoto(id: string) {
    if (!confirm('¿Eliminar esta foto?')) return
    const sb = createSupabaseBrowserClient()
    await sb.from('operations_block_photos').delete().eq('id', id)
    setPhotos(prev => prev.filter(p => p.id !== id))
    flash('Foto eliminada')
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = photos.findIndex(p => p.id === id)
    const swapIdx = idx + dir
    if (idx < 0 || swapIdx < 0 || swapIdx >= photos.length) return
    const reordered = [...photos]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    setPhotos(reordered)

    const sb = createSupabaseBrowserClient()
    await Promise.all(reordered.map((p, i) => sb.from('operations_block_photos').update({ orden: i }).eq('id', p.id)))
    setPhotos(reordered.map((p, i) => ({ ...p, orden: i })))
  }

  const atLimit = photos.length >= MAX_PHOTOS

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Dropzone */}
      <div
        style={{
          position: 'relative', aspectRatio: '16/7', background: 'var(--bg-alt)',
          border: dragging ? '2px dashed var(--accent)' : '2px dashed transparent',
          cursor: atLimit ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s',
        }}
        onClick={() => !atLimit && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!atLimit) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false)
          if (atLimit) return
          uploadFiles(Array.from(e.dataTransfer.files))
        }}
      >
        {photos[0] ? (
          <Image src={photos[0].url} alt={block.titulo} fill style={{ objectFit: 'cover' }} />
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
        {photos.length > 0 && (
          <span style={{
            position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 100,
            background: 'rgba(15,20,35,0.6)', color: '#fff', fontSize: 11, fontWeight: 600,
          }}>
            {photos.length}/{MAX_PHOTOS}
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) uploadFiles(fs) }} />
      </div>

      {/* Thumbnail strip — reorder & delete */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0', flexWrap: 'wrap' }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ position: 'relative', width: 56, height: 42, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--rule)' }}>
              <Image src={p.url} alt={`Foto ${i + 1}`} fill style={{ objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex',
                alignItems: 'flex-end', justifyContent: 'space-between', padding: 2,
              }}>
                <button onClick={() => move(p.id, -1)} disabled={i === 0} title="Mover antes"
                  style={{ fontSize: 9, lineHeight: 1, padding: '1px 3px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: 3, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1 }}>‹</button>
                <button onClick={() => removePhoto(p.id)} title="Eliminar"
                  style={{ fontSize: 9, lineHeight: 1, padding: '1px 3px', background: 'rgba(180,40,40,0.85)', color: '#fff', border: 0, borderRadius: 3, cursor: 'pointer' }}>✕</button>
                <button onClick={() => move(p.id, 1)} disabled={i === photos.length - 1} title="Mover después"
                  style={{ fontSize: 9, lineHeight: 1, padding: '1px 3px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: 3, cursor: i === photos.length - 1 ? 'default' : 'pointer', opacity: i === photos.length - 1 ? 0.3 : 1 }}>›</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div style={{ padding: '12px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-muted)', fontWeight: 600 }}>{block.eyebrow}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{block.titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
            La primera foto es la que se ve en el sitio si no hay carrusel activo. Con 2 o más, se muestra como carrusel.
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
            disabled={uploading || atLimit}
            style={{
              flex: 1, padding: '8px 0', background: atLimit ? 'var(--rule)' : 'var(--accent)', color: atLimit ? 'var(--fg-muted)' : '#fff',
              border: 0, borderRadius: 'var(--r-md)', cursor: atLimit ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {atLimit ? `Máximo ${MAX_PHOTOS} alcanzado` : 'Agregar foto(s)'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BloquesFotosPage() {
  return (
    <div style={{ padding: '40px 32px', maxWidth: 1200 }}>
      <AdminPageHeader
        title="Fotos de bloques operativos"
        subtitle={`Subí hasta ${MAX_PHOTOS} fotos por concesión. Se guardan en Supabase Storage y se muestran como carrusel en /operaciones cuando hay más de una.`}
        note="Clic en el área de la imagen o arrastrá el archivo (podés seleccionar varios a la vez). Usá las flechitas de cada miniatura para reordenar."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {BLOCKS.map(b => <BlockCard key={b.slug} block={b} />)}
      </div>
    </div>
  )
}

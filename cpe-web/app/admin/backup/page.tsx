'use client'

import { useState } from 'react'

type BackupItem = {
  key: string
  label: string
  description: string
  included: boolean
}

const ITEMS: BackupItem[] = [
  { key: 'cms_settings',    label: 'Configuración CMS',      description: 'Tema, idioma, dirección, modo mantenimiento', included: true },
  { key: 'cms_fields',      label: 'Campos del sitio',        description: 'Cotización, KPIs, textos editables', included: true },
  { key: 'cms_sections',    label: 'Secciones del sitio',     description: 'Visibilidad de cada sección pública', included: true },
  { key: 'reportes',        label: 'Metadatos de reportes',   description: 'Título, período, tipo y estado (sin HTML ni archivos)', included: true },
  { key: 'user_roles',      label: 'Roles de usuarios',       description: 'Asignaciones de rol y estado activo', included: true },
  { key: 'role_permissions',label: 'Permisos',                description: 'Matriz de permisos por rol', included: true },
  { key: 'storage',         label: 'Archivos (Storage)',      description: 'Imágenes y PDFs — descargar desde Supabase → Storage', included: false },
  { key: 'auth',            label: 'Contraseñas de usuarios', description: 'No exportables — los usuarios deberían resetear al migrar', included: false },
]

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false)
  const [lastDownload, setLastDownload] = useState<string | null>(null)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) throw new Error('Error al generar backup')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `cpe-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setLastDownload(new Date().toLocaleString('es-AR'))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 4px' }}>
        Admin
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Backup
      </h1>
      <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '0 0 36px' }}>
        Exportá la configuración y metadatos del sitio en un archivo JSON portable.
        Se envía un recordatorio automático por email todos los lunes a las 9 AM.
      </p>

      {/* Download card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px 28px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
              Backup completo — JSON
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              CMS · Reportes · Roles · Permisos
              {lastDownload && (
                <span style={{ marginLeft: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  ✓ Última descarga: {lastDownload}
                </span>
              )}
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={downloading}
            style={{ padding: '11px 24px', opacity: downloading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, whiteSpace: 'nowrap' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? 'Generando…' : 'Descargar backup'}
          </button>
        </div>
      </div>

      {/* What's included */}
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 12px' }}>
        Qué incluye
      </h2>
      <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 32 }}>
        {ITEMS.map((item, i) => (
          <div key={item.key} style={{
            display: 'grid', gridTemplateColumns: '20px 1fr',
            gap: 14, padding: '13px 18px', alignItems: 'center',
            borderBottom: i < ITEMS.length - 1 ? '1px solid var(--rule)' : 'none',
            background: item.included ? 'var(--surface)' : 'var(--bg-alt)',
            opacity: item.included ? 1 : 0.65,
          }}>
            <span style={{ fontSize: 14 }}>{item.included ? '✓' : '✕'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Storage note */}
      <div style={{ fontSize: 13, color: 'var(--fg-soft)', background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '14px 18px', lineHeight: 1.6 }}>
        <strong>Para un backup completo:</strong> los archivos de Storage (imágenes y PDFs) hay que descargarlos por separado desde{' '}
        <strong>Supabase → Storage</strong> bucket por bucket, o con la CLI:<br />
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, display: 'inline-block', marginTop: 8, background: 'var(--bg)', padding: '4px 10px', borderRadius: 4 }}>
          supabase storage download --bucket site-images ./backup-images
        </code>
      </div>

    </div>
  )
}

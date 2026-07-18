'use client'

import { useEffect, useState } from 'react'
import { BACKUP_TABLES, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/backup-tables'
import { AdminPageHeader } from '@/components/AdminPageHeader'

const LAST_BACKUP_KEY = 'cpe-admin-last-backup'

function fmtBytes(b: number) {
  return b < 1_048_576 ? `${Math.round(b / 1024)} KB` : `${(b / 1_048_576).toFixed(1)} MB`
}

const byCategory = CATEGORY_ORDER.map(cat => ({
  cat,
  label: CATEGORY_LABELS[cat],
  tables: BACKUP_TABLES.filter(t => t.category === cat),
}))

const totalIncluded = BACKUP_TABLES.filter(t => t.included && t.table !== 'storage').length

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false)
  const [lastDownload, setLastDownload] = useState<string | null>(null)
  const [lastSize, setLastSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_BACKUP_KEY) ?? 'null')
      if (saved?.at) { setLastDownload(saved.at); setLastSize(saved.size ?? null) }
    } catch { /* ignore */ }
  }, [])

  async function handleDownload() {
    setDownloading(true)
    setError(null)
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
      const at = new Date().toLocaleString('es-AR')
      setLastDownload(at)
      setLastSize(blob.size)
      localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify({ at, size: blob.size }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 24px' }}>

      <AdminPageHeader
        title="Backup"
        subtitle="Exportá todos los datos del sistema en un archivo JSON local."
        note={
          <>
            Para agregar tablas nuevas al backup, editá{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-alt)', padding: '1px 6px', borderRadius: 4 }}>
              lib/backup-tables.ts
            </code>.
            Se envía un recordatorio automático por email todos los lunes a las 9 AM.
          </>
        }
      />

      {/* Download card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '24px 28px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
              Backup completo — JSON
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              {totalIncluded} tablas · CMS · Contenido · Roles · Reportes · Biblioteca · Contactos
            </div>
            {lastDownload && (
              <div style={{ marginTop: 6, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                ✓ Último backup exitoso: {lastDownload}{lastSize != null ? ` · ${fmtBytes(lastSize)}` : ''}
              </div>
            )}
            {!lastDownload && (
              <div style={{ marginTop: 6, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                Sin backups registrados desde este navegador todavía.
              </div>
            )}
            {error && (
              <div style={{ marginTop: 6, color: 'var(--cp-negative, #C0392B)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                ✗ {error}
              </div>
            )}
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
            {downloading ? 'Generando…' : 'Ejecutar backup manual ahora'}
          </button>
        </div>
      </div>

      {/* Table registry by category */}
      <div style={{ display: 'grid', gap: 24 }}>
        {byCategory.map(({ cat, label, tables }) => (
          <div key={cat}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: cat === 'no-incluido' ? 'var(--fg-muted)'
                  : cat === 'cms' ? '#1F2566'
                  : cat === 'acceso' ? '#6cae52'
                  : cat === 'contenido' ? '#3D5F9A'
                  : cat === 'reportes' ? '#E07B30'
                  : cat === 'biblioteca' ? '#9a6f00'
                  : '#6B5EA8',
              }} />
              <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: 0 }}>
                {label}
              </h2>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                ({tables.filter(t => t.included).length}/{tables.length})
              </span>
            </div>

            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              {tables.map((t, i) => (
                <div key={t.table} style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 1fr',
                  gap: 12, padding: '11px 16px',
                  alignItems: 'start',
                  borderBottom: i < tables.length - 1 ? '1px solid var(--rule)' : 'none',
                  background: t.included ? 'var(--surface)' : 'var(--bg-alt)',
                  opacity: t.included ? 1 : 0.6,
                }}>
                  <span style={{ fontSize: 13, color: t.included ? 'var(--cp-green-deep)' : 'var(--fg-muted)', paddingTop: 1 }}>
                    {t.included ? '✓' : '✕'}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t.label}</span>
                      <code style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', background: 'var(--bg-alt)', padding: '1px 6px', borderRadius: 3 }}>
                        {t.table}
                      </code>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{t.description}</div>
                    {t.notes && (
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, fontStyle: 'italic' }}>ℹ {t.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

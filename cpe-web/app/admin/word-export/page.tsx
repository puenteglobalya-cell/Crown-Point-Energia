'use client'

import { useState } from 'react'

export default function WordExportPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/word-export', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `cpe-contenidos-${new Date().toISOString().slice(0, 10)}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const SECTIONS = [
    { num: '1', label: 'Inicio (Home)',                         items: 'Hero, KPIs, Operaciones, Statement' },
    { num: '2', label: 'Acerca de (About)',                     items: 'Hero, Misión, Visión, Estrategia, Ventajas' },
    { num: '3', label: 'Operaciones',                           items: 'Hero, Cuencas productoras' },
    { num: '4', label: 'Inversores (IR)',                       items: 'Hero, ¿Por qué Crown Point?' },
    { num: '5', label: 'ESG & Responsabilidad corporativa',     items: 'Hero, Pilares' },
    { num: '6', label: 'Comercial',                             items: 'Hero' },
    { num: '7', label: 'Contacto',                              items: 'Datos, Transfer Agent' },
    { num: '8', label: 'Legal',                                 items: 'Términos, Privacidad & Cookies' },
  ]

  return (
    <div style={{ maxWidth: 720 }}>
      <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
        Documentación
      </span>
      <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>
        Exportar contenidos Word
      </h1>
      <p style={{ fontSize: 14, color: 'var(--fg-soft)', marginBottom: 'var(--s-8)', maxWidth: 580 }}>
        Genera un archivo <strong>.docx</strong> con todo el contenido bilingüe del sitio organizado por sección, con campos amarillos para agregar comentarios y correcciones.
      </p>

      {/* Sections preview */}
      <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 'var(--s-8)' }}>
        {SECTIONS.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '12px 20px', borderTop: i > 0 ? '1px solid var(--rule)' : 'none', background: 'var(--surface)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', width: 20, flexShrink: 0 }}>{s.num}</span>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{s.label}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 10 }}>{s.items}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Download button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handleDownload}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 24px', borderRadius: 'var(--r-pill)',
            background: loading ? 'var(--bg-alt)' : 'var(--cp-navy)',
            color: loading ? 'var(--fg-muted)' : '#fff',
            border: '1px solid var(--rule)',
            fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Generando…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar Word (.docx)
            </>
          )}
        </button>

        {error && (
          <span style={{ fontSize: 13, color: 'var(--cp-red, #e53)' }}>Error: {error}</span>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 'var(--s-5)' }}>
        El contenido dinámico (KPIs, bloques de operaciones, equipo) se toma del CMS y Supabase al momento de generar el archivo.
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

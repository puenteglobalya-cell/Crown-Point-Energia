'use client'

import { useState } from 'react'

type Documento = {
  id: string
  titulo_es: string
  titulo_en: string
  tipo: string
  periodo: string
  storage_path: string
  file_name: string
  file_size: number | null
}

function docExt(fileName: string) {
  const ext = fileName.split('.').pop()?.toUpperCase() ?? 'PDF'
  return ['XLS', 'XLSX'].includes(ext) ? 'XLS' : ext
}

function publicUrl(path: string, supabaseUrl: string) {
  return `${supabaseUrl}/storage/v1/object/public/documents/${path}`
}

function getYear(doc: Documento): string {
  const periodoMatch = doc.periodo.match(/\b(20\d{2})\b/)
  return periodoMatch ? periodoMatch[1] : ''
}

export default function InversoresDocsTabs({
  docs,
  tipo,
  supabaseUrl,
}: {
  docs: Documento[]
  tipo: string
  supabaseUrl: string
}) {
  const filtered = docs.filter(d => d.tipo === tipo)

  const years = Array.from(new Set(filtered.map(getYear).filter(Boolean))).sort((a, b) => +b - +a)
  const [activeYear, setActiveYear] = useState<string>(years[0] ?? 'all')

  if (filtered.length === 0) {
    return (
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
        <span className="lang-es">Próximamente.</span>
        <span className="lang-en">Coming soon.</span>
      </p>
    )
  }

  const shown = years.length > 1 && activeYear !== 'all'
    ? filtered.filter(d => getYear(d) === activeYear)
    : filtered

  return (
    <>
      {years.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--s-4)', flexWrap: 'wrap' }}>
          {years.map(y => (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              style={{
                padding: '5px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: activeYear === y ? 'var(--fg)' : 'transparent',
                color: activeYear === y ? 'var(--bg)' : 'var(--fg-soft)',
                border: '1px solid var(--rule)', borderRadius: 'var(--r-pill)',
                transition: 'all var(--t-fast)',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}
      <ul className="doc-list">
        {shown.map(d => (
          <li className="doc-item" key={d.id}>
            <div className="doc-icon">{docExt(d.file_name)}</div>
            <div className="doc-title">
              <span className="lang-es">{d.titulo_es}</span>
              <span className="lang-en">{d.titulo_en}</span>
            </div>
            <div className="doc-meta">{d.periodo}</div>
            <a className="doc-action" href={publicUrl(d.storage_path, supabaseUrl)} target="_blank" rel="noreferrer">
              <span className="lang-es">Descargar</span>
              <span className="lang-en">Download</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

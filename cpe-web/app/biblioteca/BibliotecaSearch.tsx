'use client'

import { useState } from 'react'
import DocActions from './DocActions'

type Doc = {
  id: string
  nombre: string
  path: string
  size_bytes: number | null
  mime_type: string | null
  vigente: boolean
  created_at: string
  signedUrl: string
}

type Carpeta = {
  id: number
  nombre: string
  descripcion: string
  orden: number
  bib_documentos: Doc[]
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes >= 1048576) return ` · ${(bytes / 1048576).toFixed(1)} MB`
  return ` · ${Math.round(bytes / 1024)} KB`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function BibliotecaSearch({ carpetas, initialQuery = '' }: { carpetas: Carpeta[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)

  const q = query.trim().toLowerCase()
  const filtered = q
    ? carpetas.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.descripcion?.toLowerCase().includes(q) ||
        c.bib_documentos.some(d => d.nombre.toLowerCase().includes(q))
      )
    : carpetas

  return (
    <>
      <div style={{ marginBottom: 24, position: 'relative' }}>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
          <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar carpeta o documento…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 16px 11px 40px',
            border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
            background: 'var(--surface)', color: 'var(--fg)', fontSize: 14,
            outline: 'none',
          }}
        />
        {q && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--fg-muted)' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--fg-muted)' }}>
          <p style={{ fontSize: 15, margin: '0 0 4px' }}>Sin resultados para &ldquo;{query}&rdquo;</p>
          <p style={{ fontSize: 13, margin: 0 }}>Probá con otro término de búsqueda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {filtered.map(carpeta => {
            const vigente = carpeta.bib_documentos.find(d => d.vigente)
            const history = carpeta.bib_documentos.filter(d => !d.vigente)
            return (
              <div key={carpeta.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--cp-green)', flexShrink: 0 }}>
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0 }}>{carpeta.nombre}</h2>
                    {carpeta.descripcion && (
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{carpeta.descripcion}</p>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {carpeta.bib_documentos.length} archivo{carpeta.bib_documentos.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {vigente ? (
                  <div style={{
                    padding: '16px 24px',
                    background: 'rgba(130,188,0,0.05)',
                    borderBottom: history.length > 0 ? '1px solid var(--rule)' : undefined,
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        display: 'inline-block', marginBottom: 6,
                        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--cp-green)', fontWeight: 700,
                        background: 'rgba(130,188,0,0.14)', borderRadius: 4, padding: '2px 7px',
                      }}>Vigente</span>
                      <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{vigente.nombre}</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '3px 0 0' }}>
                        {fmtDate(vigente.created_at)}{fmtSize(vigente.size_bytes)}
                      </p>
                    </div>
                    {vigente.signedUrl && (
                      <DocActions
                        docName={vigente.nombre}
                        docPath={vigente.path}
                        signedUrl={vigente.signedUrl}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '16px 24px', color: 'var(--fg-muted)', fontSize: 14 }}>
                    Sin documento vigente
                  </div>
                )}

                {history.length > 0 && (
                  <details>
                    <summary style={{
                      padding: '10px 24px', fontSize: 13, color: 'var(--fg-soft)',
                      cursor: 'pointer', userSelect: 'none',
                    }}>
                      {history.length} versión{history.length !== 1 ? 'es' : ''} anterior{history.length !== 1 ? 'es' : ''}
                    </summary>
                    {history.map(doc => (
                      <div key={doc.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 24px', borderTop: '1px solid var(--rule)',
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, margin: 0, color: 'var(--fg-soft)' }}>{doc.nombre}</p>
                          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
                            {fmtDate(doc.created_at)}{fmtSize(doc.size_bytes)}
                          </p>
                        </div>
                        {doc.signedUrl && (
                          <DocActions
                            docName={doc.nombre}
                            docPath={doc.path}
                            signedUrl={doc.signedUrl}
                          />
                        )}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

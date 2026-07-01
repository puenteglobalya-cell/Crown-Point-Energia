'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Client-side error boundary — log for diagnostics (no PII in the message shown to the user)
    console.error('[app error]', error?.digest ?? error?.message)
  }, [error])

  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 460 }}>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cp-green, #6CAE52)' }}>
          Error
        </div>
        <h1 style={{ fontSize: 32, letterSpacing: '-0.02em', margin: '12px 0 10px', color: 'var(--fg, #16203B)' }}>
          <span className="lang-es">Algo salió mal</span>
          <span className="lang-en">Something went wrong</span>
        </h1>
        <p style={{ color: 'var(--fg-muted, #6B7280)', fontSize: 16, lineHeight: 1.6, margin: '0 0 28px' }}>
          <span className="lang-es">Tuvimos un problema al cargar esta sección. Podés reintentar o volver al inicio.</span>
          <span className="lang-en">We had trouble loading this section. You can retry or go back home.</span>
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} className="btn btn-primary">
            <span className="lang-es">Reintentar</span><span className="lang-en">Retry</span>
          </button>
          <Link href="/" className="btn btn-secondary">
            <span className="lang-es">Ir al inicio</span><span className="lang-en">Go home</span>
          </Link>
        </div>
      </div>
    </main>
  )
}

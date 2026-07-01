import Link from 'next/link'

export const metadata = { title: 'Página no encontrada | Crown Point Energy', robots: { index: false } }

export default function NotFound() {
  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 440 }}>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--cp-green, #6CAE52)' }}>
          Error 404
        </div>
        <h1 style={{ fontSize: 34, letterSpacing: '-0.02em', margin: '12px 0 10px', color: 'var(--fg, #16203B)' }}>
          <span className="lang-es">No encontramos esta página</span>
          <span className="lang-en">We couldn&apos;t find this page</span>
        </h1>
        <p style={{ color: 'var(--fg-muted, #6B7280)', fontSize: 16, lineHeight: 1.6, margin: '0 0 28px' }}>
          <span className="lang-es">El enlace puede haber cambiado o el contenido ya no está disponible.</span>
          <span className="lang-en">The link may have changed or the content is no longer available.</span>
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            <span className="lang-es">Ir al inicio</span><span className="lang-en">Go home</span>
          </Link>
          <Link href="/inversores" className="btn btn-secondary">
            <span className="lang-es">Inversores</span><span className="lang-en">Investors</span>
          </Link>
        </div>
      </div>
    </main>
  )
}

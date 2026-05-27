export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
      gap: 24,
      textAlign: 'center',
    }}>
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', opacity: 0.6 }}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          Sitio en mantenimiento
        </h1>
        <p style={{ fontSize: 16, color: 'var(--fg-soft)', maxWidth: '44ch', margin: '0 auto', lineHeight: 1.7 }}>
          Estamos trabajando en mejoras. Volvé en unos minutos.
        </p>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 8 }}>
          Site under maintenance — we&apos;ll be back shortly.
        </p>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Crown Point Energy Inc. · TSXV: CWV
      </div>
    </div>
  )
}

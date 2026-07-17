export function AdminPageHeader({
  title, subtitle, note, right,
}: {
  title: string
  subtitle?: string
  note?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>{subtitle}</p>}
        {note && <div style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 0' }}>{note}</div>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{right}</div>}
    </div>
  )
}

export function AdminSkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '14px 18px', borderBottom: i < rows - 1 ? '1px solid var(--rule)' : 'none' }}>
          <div className="admin-skel" style={{ width: `${45 + (i % 3) * 15}%`, height: 14, marginBottom: 6 }} />
          <div className="admin-skel" style={{ width: `${25 + (i % 2) * 10}%`, height: 10 }} />
        </div>
      ))}
      <style>{`
        .admin-skel { background: var(--rule); border-radius: 4px; animation: admin-skel-pulse 1.4s ease infinite; }
        @keyframes admin-skel-pulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
      `}</style>
    </div>
  )
}

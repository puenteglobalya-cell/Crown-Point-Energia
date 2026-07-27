'use client'

type Application = {
  id: string; area: string; estado: string; created_at: string; score?: number | null
}

const AREA_LABELS: Record<string, string> = {
  drilling: 'Perforación & completación',
  prodops: 'Producción & operaciones',
  geo: 'Geología & geofísica',
  finance: 'Finance & IR',
  hse: 'HSE & ESG',
  it: 'Tecnología & sistemas',
  other: 'Otro',
}

const ESTADO_BAR: Record<string, { label: string; color: string }> = {
  nueva:      { label: 'Nueva',      color: '#2FA08A' },
  revisada:   { label: 'Revisada',   color: 'var(--cp-gold-deep)' },
  contactada: { label: 'Contactada', color: 'var(--cp-green-deep)' },
  descartada: { label: 'Descartada', color: 'var(--fg-muted)' },
}

function weekKey(iso: string) {
  const d = new Date(iso)
  // Monday-anchored week start
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtWeek(d: Date) {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export function RrhhDashboard({ apps }: { apps: Application[] }) {
  if (apps.length === 0) {
    return <p style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Todavía no hay postulaciones para mostrar estadísticas.</p>
  }

  // ── By area ──────────────────────────────────────────────
  const byArea = Object.entries(
    apps.reduce<Record<string, number>>((acc, a) => {
      acc[a.area] = (acc[a.area] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])
  const maxArea = Math.max(...byArea.map(([, n]) => n))

  // ── By estado (single stacked bar) ──────────────────────
  const estadoOrder = ['nueva', 'revisada', 'contactada', 'descartada']
  const byEstado = estadoOrder.map(e => ({
    key: e,
    n: apps.filter(a => a.estado === e).length,
  }))

  // ── Last 8 weeks trend ───────────────────────────────────
  const now = new Date()
  const weeks: Date[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(weekKey(d.toISOString()))
  }
  const weekCounts = weeks.map(w => ({
    week: w,
    n: apps.filter(a => weekKey(a.created_at).getTime() === w.getTime()).length,
  }))
  const maxWeek = Math.max(1, ...weekCounts.map(w => w.n))

  // ── Score IA promedio ────────────────────────────────────
  const scored = apps.filter(a => typeof a.score === 'number')
  const avgScore = scored.length > 0
    ? (scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length).toFixed(1)
    : null

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: avgScore ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 16 }}>

        {/* Por área */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '18px 20px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px', color: 'var(--fg)' }}>Postulaciones por área</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {byArea.map(([area, n]) => (
              <div key={area}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-soft)', marginBottom: 4 }}>
                  <span>{AREA_LABELS[area] ?? area}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{n}</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-alt)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(n / maxArea) * 100}%`,
                    background: 'var(--accent)', borderRadius: 'var(--r-pill)',
                    minWidth: 6,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por estado */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '18px 20px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px', color: 'var(--fg)' }}>Estado del proceso</h3>
          <div style={{ display: 'flex', height: 14, borderRadius: 'var(--r-pill)', overflow: 'hidden', gap: 2, marginBottom: 14 }}>
            {byEstado.filter(e => e.n > 0).map(e => (
              <div
                key={e.key}
                title={`${ESTADO_BAR[e.key].label}: ${e.n}`}
                style={{ flex: e.n, background: ESTADO_BAR[e.key].color, minWidth: 4 }}
              />
            ))}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {byEstado.map(e => (
              <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: ESTADO_BAR[e.key].color, flexShrink: 0 }} />
                <span style={{ color: 'var(--fg-soft)', flex: 1 }}>{ESTADO_BAR[e.key].label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{e.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score IA promedio */}
        {avgScore && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px', color: 'var(--fg)' }}>Score IA promedio</h3>
            <div>
              <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{avgScore}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 4 }}>{scored.length} de {apps.length} postulaciones analizadas</div>
            </div>
          </div>
        )}
      </div>

      {/* Trend por semana */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '18px 20px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 16px', color: 'var(--fg)' }}>Postulaciones recibidas — últimas 8 semanas</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
          {weekCounts.map(({ week, n }) => (
            <div key={week.toISOString()} title={`${n} postulaciones — semana del ${fmtWeek(week)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div style={{
                  width: '100%', minHeight: n > 0 ? 4 : 0,
                  height: `${(n / maxWeek) * 100}%`,
                  background: 'var(--accent)', borderRadius: '4px 4px 0 0',
                }} />
              </div>
              <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{n}</span>
              <span style={{ fontSize: 9.5, color: 'var(--fg-muted)' }}>{fmtWeek(week)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

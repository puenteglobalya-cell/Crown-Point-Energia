import Link from 'next/link'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { Sparkline } from './Sparkline'

export const dynamic = 'force-dynamic'

const WEEKS = 8
const WEEK_MS = 7 * 86_400_000

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  const db = createSupabaseServerAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db.from(table).select('id', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count } = await q
  return count ?? 0
}

// Bucket rows' created_at into the last WEEKS weekly counts (oldest → newest).
async function weeklyTrend(table: string): Promise<number[]> {
  const db = createSupabaseServerAdminClient()
  const since = new Date(Date.now() - WEEKS * WEEK_MS).toISOString()
  const { data } = await db.from(table).select('created_at').gte('created_at', since)
  const buckets = new Array(WEEKS).fill(0)
  const now = Date.now()
  for (const row of data ?? []) {
    const t = new Date((row as { created_at: string }).created_at).getTime()
    if (Number.isNaN(t)) continue
    const idx = WEEKS - 1 - Math.floor((now - t) / WEEK_MS)
    if (idx >= 0 && idx < WEEKS) buckets[idx]++
  }
  return buckets
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function AdminInicioPage() {
  await requireAdminUser()
  const db = createSupabaseServerAdminClient()

  const [
    appsNuevas, appsTotal, contactoNuevas, contactoTotal, subsActivos, reportesPub, posicionesAbiertas,
    recentApps, recentContacto, recentReportes,
    trendApps, trendContacto, trendSubs,
  ] = await Promise.all([
    count('job_applications_view', q => q.eq('estado', 'nueva')),
    count('job_applications_view'),
    count('contact_submissions', q => q.eq('estado', 'nueva')),
    count('contact_submissions'),
    count('ir_subscribers', q => q.eq('activo', true)),
    count('reportes', q => q.eq('estado', 'publicado')),
    count('open_positions', q => q.eq('activo', true)),
    db.from('job_applications_view').select('id,nombre,area,estado,score,created_at').order('created_at', { ascending: false }).limit(5),
    db.from('contact_submissions').select('id,nombre,tipo,estado,created_at').order('created_at', { ascending: false }).limit(5),
    db.from('reportes').select('id,titulo,periodo,estado,created_at').order('created_at', { ascending: false }).limit(5),
    weeklyTrend('job_applications_view'),
    weeklyTrend('contact_submissions'),
    weeklyTrend('ir_subscribers'),
  ])

  const trends = [
    { label: 'Postulaciones', data: trendApps, href: '/admin/rrhh', stroke: '#2FA08A' },
    { label: 'Consultas de contacto', data: trendContacto, href: '/admin/contacto', stroke: '#C9A24A' },
    { label: 'Altas de suscriptores IR', data: trendSubs, href: '/admin/suscriptores', stroke: '#6CAE52' },
  ]

  const stats = [
    { label: 'Postulaciones nuevas', value: appsNuevas, sub: `${appsTotal} en total`, href: '/admin/rrhh', accent: '#2FA08A' },
    { label: 'Consultas nuevas', value: contactoNuevas, sub: `${contactoTotal} en total`, href: '/admin/contacto', accent: '#C9A24A' },
    { label: 'Suscriptores IR', value: subsActivos, sub: 'activos', href: '/admin/suscriptores', accent: '#6CAE52' },
    { label: 'Reportes publicados', value: reportesPub, sub: 'en el portal', href: '/admin/reportes', accent: '#1F2566' },
    { label: 'Búsquedas abiertas', value: posicionesAbiertas, sub: 'RRHH', href: '/admin/rrhh', accent: '#4E7EC4' },
  ]

  const card: React.CSSProperties = { border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--surface)', padding: 18 }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--fg)', margin: '0 0 4px' }}>Inicio</h1>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: '0 0 24px' }}>Resumen operativo de la intranet.</p>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {stats.map(s => (
          <Link key={s.label} href={s.href} style={{ ...card, textDecoration: 'none', borderTop: `3px solid ${s.accent}`, display: 'block' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-soft)', marginTop: 8 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* Weekly trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 26 }}>
        {trends.map(t => {
          const total = t.data.reduce((a, b) => a + b, 0)
          return (
            <Link key={t.label} href={t.href} style={{ ...card, textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-soft)' }}>{t.label}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>{total} en {WEEKS} sem.</span>
              </div>
              <Sparkline data={t.data} stroke={t.stroke} fill={`color-mix(in oklab, ${t.stroke} 14%, transparent)`} />
            </Link>
          )
        })}
      </div>

      {/* Recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 26 }}>
        <RecentList
          title="Últimas postulaciones" href="/admin/rrhh"
          rows={(recentApps.data ?? []).map((a: any) => ({ id: a.id, main: a.nombre, meta: `${a.area ?? ''} · ${fmtDate(a.created_at)}`, tag: a.estado, score: a.score }))}
        />
        <RecentList
          title="Últimas consultas" href="/admin/contacto"
          rows={(recentContacto.data ?? []).map((c: any) => ({ id: c.id, main: c.nombre, meta: `${c.tipo ?? 'consulta'} · ${fmtDate(c.created_at)}`, tag: c.estado }))}
        />
        <RecentList
          title="Últimos reportes" href="/admin/reportes"
          rows={(recentReportes.data ?? []).map((r: any) => ({ id: r.id, main: r.titulo, meta: `${r.periodo ?? ''} · ${fmtDate(r.created_at)}`, tag: r.estado }))}
        />
      </div>
    </div>
  )
}

function RecentList({ title, href, rows }: { title: string; href: string; rows: Array<{ id: string; main: string; meta: string; tag?: string; score?: number | null }> }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--rule)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{title}</h2>
        <Link href={href} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Ver todo →</Link>
      </div>
      {rows.length === 0 ? (
        <p style={{ padding: '16px 18px', fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic', margin: 0 }}>Sin registros.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((r, i) => (
            <li key={r.id} style={{ padding: '11px 18px', borderTop: i > 0 ? '1px solid var(--rule-soft, #EFF2F6)' : 'none', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.main || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>{r.meta}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {typeof r.score === 'number' && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-deep, #16204A)', fontVariantNumeric: 'tabular-nums' }}>{r.score}</span>}
                {r.tag && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)', border: '1px solid var(--rule)', borderRadius: 999, padding: '2px 8px' }}>{r.tag}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

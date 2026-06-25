import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdminUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Entry = {
  id: string
  user_email: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const SECTIONS: { key: string; label: string; types: string[] }[] = [
  { key: 'all',        label: 'Todos',        types: [] },
  { key: 'reporte',    label: 'Reportes',     types: ['reporte'] },
  { key: 'contacto',   label: 'Contacto',     types: ['contacto'] },
  { key: 'suscriptor', label: 'Suscriptores', types: ['suscriptor'] },
  { key: 'postulacion',label: 'Postulaciones',types: ['postulacion'] },
  { key: 'posicion',   label: 'Búsquedas',    types: ['posicion'] },
  { key: 'user',       label: 'Usuarios',     types: ['user'] },
  { key: 'macro',      label: 'Crons',        types: ['macro'] },
]

const ACTION_LABELS: Record<string, string> = {
  upload_report:         'Subió reporte',
  update_report:         'Cambió estado reporte',
  delete_report:         'Eliminó reporte',
  update_contact:        'Actualizó consulta',
  delete_contact:        'Eliminó consulta',
  activate_subscriber:   'Activó suscriptor',
  deactivate_subscriber: 'Desactivó suscriptor',
  delete_subscriber:     'Eliminó suscriptor',
  update_postulacion:    'Actualizó postulación',
  delete_postulacion:    'Eliminó postulación',
  create_posicion:       'Creó posición',
  update_posicion:       'Actualizó posición',
  delete_posicion:       'Eliminó posición',
  create_user:           'Creó usuario',
  update_user:           'Actualizó usuario',
  delete_user:           'Eliminó usuario',
  reset_password:        'Reseteo contraseña',
  cron_macro_ok:         'Cron macro — OK',
  cron_macro_error:      'Cron macro — error',
  cron_filing_ok:        'Cron filing — sin alertas',
  cron_filing_alerta:    'Cron filing — alerta enviada',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function metaSummary(entry: Entry): string {
  const m = entry.metadata
  if (!m) return ''
  if (m.estado) return `→ ${m.estado}`
  if (m.titulo) return String(m.titulo)
  if (m.area) return String(m.area)
  if (m.nombre) return String(m.nombre)
  return ''
}

const SECTION_COLORS: Record<string, { bg: string; fg: string }> = {
  reporte:    { bg: 'rgba(31,37,102,.12)',   fg: '#1F2566' },
  contacto:   { bg: 'rgba(47,160,138,.15)',  fg: '#2FA08A' },
  suscriptor: { bg: 'rgba(108,174,82,.15)',  fg: '#5a9e2f' },
  postulacion:{ bg: 'rgba(202,162,74,.18)',  fg: '#9a7020' },
  posicion:   { bg: 'rgba(202,162,74,.10)',  fg: '#9a7020' },
  user:       { bg: 'rgba(179,59,46,.12)',   fg: '#b33b2e' },
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { section?: string; days?: string }
}) {
  const user = await requireAdminUser()
  if (!user) redirect('/admin/login')

  const section = searchParams.section ?? 'all'
  const days = parseInt(searchParams.days ?? '30', 10)

  const db = createSupabaseServerAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let q = db
    .from('activity_log')
    .select('id, user_email, action, resource_type, resource_id, metadata, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)

  const sec = SECTIONS.find(s => s.key === section)
  if (sec && sec.types.length > 0) {
    q = q.in('resource_type', sec.types)
  }

  const { data } = await q
  const entries: Entry[] = (data ?? []) as Entry[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
              Log de actividad
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
              Registro de acciones por sección · Solo visible para administradores
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Section tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {SECTIONS.map(s => (
              <Link
                key={s.key}
                href={`/admin/logs?section=${s.key}&days=${days}`}
                style={{
                  fontSize: 12, padding: '6px 14px', borderRadius: 'var(--r-md)', textDecoration: 'none',
                  fontWeight: section === s.key ? 700 : 400,
                  background: section === s.key ? 'var(--accent)' : 'var(--surface)',
                  color: section === s.key ? '#fff' : 'var(--fg-soft)',
                  border: '1px solid var(--rule)',
                }}
              >
                {s.label}
              </Link>
            ))}
          </div>

          {/* Day range */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {[7, 30, 90, 180].map(d => (
              <Link
                key={d}
                href={`/admin/logs?section=${section}&days=${d}`}
                style={{
                  fontSize: 11, padding: '5px 12px', borderRadius: 'var(--r-md)', textDecoration: 'none',
                  fontWeight: days === d ? 700 : 400,
                  background: days === d ? 'var(--bg-alt)' : 'var(--surface)',
                  color: days === d ? 'var(--fg)' : 'var(--fg-muted)',
                  border: '1px solid var(--rule)',
                }}
              >
                {d}d
              </Link>
            ))}
          </div>
        </div>

        {/* Count */}
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
          {entries.length} {entries.length === 500 ? '(máx. 500)' : 'entradas'}
        </p>

        {/* Table */}
        {entries.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '48px', textAlign: 'center' }}>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: 0 }}>Sin actividad en este período.</p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 120px 160px', padding: '10px 16px', background: 'var(--bg-alt)', borderBottom: '1px solid var(--rule)', gap: 12 }}>
              {['Fecha', 'Acción', 'Sección', 'Usuario'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{h}</span>
              ))}
            </div>
            {entries.map((e, i) => {
              const sc = SECTION_COLORS[e.resource_type ?? ''] ?? { bg: 'var(--bg-alt)', fg: 'var(--fg-muted)' }
              const meta = metaSummary(e)
              return (
                <div
                  key={e.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '150px 1fr 120px 160px',
                    padding: '11px 16px', gap: 12, alignItems: 'center',
                    borderBottom: i < entries.length - 1 ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {fmtDate(e.created_at)}
                  </span>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                    {meta && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{meta}</span>
                    )}
                    {e.resource_id && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>
                        #{e.resource_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 'var(--r-pill)',
                    background: sc.bg, color: sc.fg, width: 'fit-content',
                  }}>
                    {e.resource_type ?? '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.user_email ?? 'sistema'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

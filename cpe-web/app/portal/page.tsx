import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole, canUpload, isAdminRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { CopyLinkBtn } from './ReporteActions'

type ReporteItem = {
  id: string
  titulo: string
  periodo: string
  estado: string
  file_name: string | null
  file_size: number | null
  created_at: string
}

type ActivityEntry = {
  id: string
  user_email: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function PortalPage() {
  const { user, role, permissions } = await getCurrentUserAndRole()

  if (!user || !role?.activo) {
    redirect('/portal/login')
  }

  const db = createSupabaseServerAdminClient()

  // Fetch reports based on permissions
  let reportQuery = db
    .from('reportes')
    .select('id, titulo, periodo, estado, file_name, file_size, created_at')
    .order('created_at', { ascending: false })

  if (!permissions.has('view_drafts')) {
    reportQuery = reportQuery.eq('estado', 'publicado')
  }

  const { data: reportes } = await reportQuery
  const items: ReporteItem[] = reportes ?? []

  // Activity log for admins
  let activityLog: ActivityEntry[] = []
  if (isAdminRole(permissions)) {
    const { data } = await db
      .from('activity_log')
      .select('id, user_email, action, resource_type, resource_id, metadata, created_at')
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(200)
    activityLog = (data ?? []) as ActivityEntry[]
  }

  const userCanUpload = canUpload(permissions)
  const userIsAdmin = isAdminRole(permissions)

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            Portal de reportes
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
            Bienvenido, {user.email}
          </p>
        </div>
        {userCanUpload && (
          <Link
            href="/portal/subir"
            className="btn btn-primary"
            style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 14 }}
          >
            Subir reporte
          </Link>
        )}
      </div>

      {/* Reports list */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
          Reportes de ingresos
          {!permissions.has('view_drafts') && (
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--fg-muted)', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
              — solo publicados
            </span>
          )}
        </h2>

        {items.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            borderRadius: 'var(--r-lg)', padding: '48px 32px', textAlign: 'center',
          }}>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: 0 }}>
              No hay reportes disponibles.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--r-lg)',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                    {item.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                    {item.periodo} · {fmtDate(item.created_at)}
                    {item.file_size ? ` · ${fmtSize(item.file_size)}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Estado badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 'var(--r-pill)',
                    background: item.estado === 'publicado' ? 'rgba(108,174,82,0.15)' : 'var(--bg-alt)',
                    color: item.estado === 'publicado' ? 'var(--cp-green-deep)' : 'var(--fg-muted)',
                  }}>
                    {item.estado}
                  </span>

                  <CopyLinkBtn id={item.id} />

                  <a
                    href={`/api/admin/reportes/${item.id}/excel`}
                    className="btn"
                    style={{ fontSize: 12, padding: '7px 14px', textDecoration: 'none' }}
                    title="Descargar Excel"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 5 }}>
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Excel
                  </a>

                  <a
                    href={`/api/admin/reportes/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}
                  >
                    Ver / PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity log — admin only */}
      {userIsAdmin && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            Actividad reciente
          </h2>

          {activityLog.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Sin actividad registrada.</p>
          ) : (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {activityLog.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: i < activityLog.length - 1 ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                      {entry.action}
                    </span>
                    {entry.resource_type && (
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 8 }}>
                        {entry.resource_type}
                        {entry.resource_id ? ` #${entry.resource_id.slice(0, 8)}` : ''}
                      </span>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                      {entry.user_email ?? 'sistema'}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {fmtDate(entry.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

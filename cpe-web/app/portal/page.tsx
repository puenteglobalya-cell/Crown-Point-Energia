import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole, canUpload, isAdminRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { ReportesLista } from './ReportesLista'

export default async function PortalPage() {
  const { user, role, permissions } = await getCurrentUserAndRole()

  if (!user || !role?.activo) {
    redirect('/portal/login')
  }

  const db = createSupabaseServerAdminClient()

  let reportQuery = db
    .from('reportes')
    .select('id, type_id, titulo, periodo, estado, file_name, file_size, created_at')
    .order('created_at', { ascending: false })

  if (!permissions.has('view_drafts')) {
    reportQuery = reportQuery.eq('estado', 'publicado')
  }

  const { data: reportes } = await reportQuery
  const items = (reportes ?? []) as Parameters<typeof ReportesLista>[0]['items']

  const userCanUpload = canUpload(permissions)
  const userIsAdmin   = isAdminRole(permissions)

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
          Reportes
          {!permissions.has('view_drafts') && (
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--fg-muted)', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
              — solo publicados
            </span>
          )}
        </h2>
        <ReportesLista items={items} userCanUpload={userCanUpload} />
      </section>

      {userIsAdmin && (
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Link href="/admin/logs" style={{ fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'none' }}>
            Ver log de actividad →
          </Link>
        </div>
      )}
    </div>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole, canUpload, isAdminRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { ReportesLista } from './ReportesLista'
import { MacroWidget } from './MacroWidget'

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

  // Apply type-level access control (admin email bypasses)
  const { data: reportes } = await reportQuery
  let items = (reportes ?? []) as Parameters<typeof ReportesLista>[0]['items']

  // Accionista: only explicitly granted reports
  if (role?.role === 'accionista') {
    const { data: access } = await db
      .from('portal_report_access')
      .select('reporte_id')
      .eq('user_id', user.id)
    const granted = new Set((access ?? []).map((r: { reporte_id: string }) => r.reporte_id))
    items = items.filter(it => granted.has(it.id))
  } else if (role?.role && role.role !== 'admin') {
    // Filter by report_type_access for non-admin, non-accionista roles
    const { data: typeAccess } = await db
      .from('report_type_access')
      .select('type_id')
      .eq('role', role.role)
      .eq('can_view', true)
    if (typeAccess) {
      const visible = new Set(typeAccess.map(r => r.type_id))
      items = items.filter(it => !it.type_id || visible.has(it.type_id))
    }
  }

  // Hide internal price-data uploads from the reports list
  items = items.filter(it => !['henry_hub', 'ice_brent'].includes(it.type_id ?? ''))

  const userCanUpload = canUpload(permissions)
  const userIsAdmin   = isAdminRole(permissions)
  const isAccionista  = role?.role === 'accionista'

  let investorDocs: { id: string; titulo: string; descripcion: string; categoria: string; file_name: string | null; created_at: string }[] = []
  if (isAccionista || userIsAdmin) {
    const { data } = await db
      .from('investor_documents')
      .select('id, titulo, descripcion, categoria, file_name, created_at')
      .order('created_at', { ascending: false })
    investorDocs = data ?? []
  }

  return (
    <div className="portal-page">

      {/* Page header */}
      <div className="portal-header">
        <div>
          <h1 className="portal-header__title">Portal de reportes</h1>
          <p className="portal-header__subtitle">Bienvenido, {user.email}</p>
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

      {/* Macro forward curve */}
      <MacroWidget />

      {/* Reports list */}
      <section className="portal-section">
        <h2 className="portal-section__title">
          Reportes
          {!permissions.has('view_drafts') && (
            <span className="portal-section__badge">— solo publicados</span>
          )}
        </h2>
        <ReportesLista items={items} userCanUpload={userCanUpload} isAccionista={isAccionista} />
      </section>

      {(isAccionista || userIsAdmin) && investorDocs.length > 0 && (
        <section className="portal-section">
          <h2 className="portal-section__title">Documentos IR</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {investorDocs.map(doc => {
              const isNew = Date.now() - new Date(doc.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
              return (
              <a
                key={doc.id}
                href={`/api/investor-documents/${doc.id}/download`}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
                  textDecoration: 'none', color: 'var(--fg)', background: 'var(--surface)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--accent)' }}>
                  <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {doc.titulo}
                    {isNew && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 'var(--r-pill)',
                        background: 'rgba(108,174,82,0.15)', color: 'var(--cp-green-deep)',
                      }}>Nuevo</span>
                    )}
                  </div>
                  {doc.descripcion && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{doc.descripcion}</div>}
                </div>
              </a>
              )
            })}
          </div>
        </section>
      )}

      {(userIsAdmin || userCanUpload) && (
        <section className="portal-section">
          <h2 className="portal-section__title">Herramientas</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/infografia"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 'var(--r-md)',
                border: '1px solid var(--rule)', background: 'var(--surface)',
                color: 'var(--fg)', textDecoration: 'none', fontSize: 14, fontWeight: 500,
              }}
            >
              <span>🖼️</span> Constructor de infografía PNG
            </Link>
          </div>
        </section>
      )}

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

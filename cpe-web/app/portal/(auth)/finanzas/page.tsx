import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { ReportesLista, type ReporteItem } from '../ReportesLista'
import { FINANZAS_REPORT_TYPES } from '@/lib/permissions-config'

export default async function PortalFinanzasPage() {
  const { user, role } = await getCurrentUserAndRole()

  if (!user || !role?.activo) {
    redirect('/portal/login')
  }

  const db = createSupabaseServerAdminClient()
  const { data: reportes } = await db
    .from('reportes')
    .select('id, type_id, titulo, periodo, estado, file_name, file_size, created_at')
    .in('type_id', FINANZAS_REPORT_TYPES as unknown as string[])
    .order('created_at', { ascending: false })

  const items = (reportes ?? []) as ReporteItem[]

  return (
    <div className="portal-page">
      <div className="portal-header">
        <div>
          <h1 className="portal-header__title">Finanzas</h1>
          <p className="portal-header__subtitle">
            Bienvenido, {user.email} — solo Reporte Financiero y Facturación
          </p>
        </div>
        <Link
          href="/portal/finanzas/subir"
          className="btn btn-primary"
          style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 14 }}
        >
          Subir reporte
        </Link>
      </div>

      <section className="portal-section">
        <h2 className="portal-section__title">Reportes</h2>
        <ReportesLista items={items} userCanUpload={true} isAccionista={false} />
      </section>
    </div>
  )
}

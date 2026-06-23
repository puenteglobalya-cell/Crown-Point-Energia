import { redirect } from 'next/navigation'
import { getCurrentUserAndRole, canUpload } from '@/lib/roles'
import PortalNav from '@/components/PortalNav'
import PwaInstallBanner from '@/components/PwaInstallBanner'
import SessionGuard from '@/components/SessionGuard'
import '@/styles/portal.css'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, role, permissions } = await getCurrentUserAndRole()

  if (!user || !role?.activo) {
    redirect('/portal/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PortalNav
        email={user.email ?? ''}
        role={role.role}
        canUpload={canUpload(permissions)}
        canViewReports={permissions.has('view_reports')}
        canViewDashboard={permissions.has('view_dashboard')}
        canViewComercial={permissions.has('view_comercial')}
      />
      <main className="portal-main">
        {children}
      </main>
      <PwaInstallBanner />
      <SessionGuard />
    </div>
  )
}

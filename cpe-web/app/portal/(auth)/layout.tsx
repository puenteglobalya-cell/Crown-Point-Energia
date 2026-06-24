import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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

  const cookieStore = cookies()
  const themeCookie = cookieStore.get('cpe_theme')?.value
  const theme = (themeCookie === 'dark' || themeCookie === 'light') ? themeCookie : 'light'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PortalNav
        email={user.email ?? ''}
        role={role.role}
        canUpload={canUpload(permissions)}
        canViewReports={permissions.has('view_reports')}
        canViewDashboard={permissions.has('view_dashboard')}
        canViewComercial={permissions.has('view_comercial')}
        theme={theme}
      />
      <main className="portal-main">
        {children}
      </main>
      <PwaInstallBanner />
      <SessionGuard />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getCurrentUserAndRole, canUpload } from '@/lib/roles'
import PortalNav from '@/components/PortalNav'
import PwaInstallBanner from '@/components/PwaInstallBanner'
import SessionGuard from '@/components/SessionGuard'
import '@/styles/portal.css'

// Public sub-routes that must NOT trigger the auth redirect
const PUBLIC_PORTAL_PATHS = ['/portal/login', '/portal/reset-password']

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get('x-pathname') ?? ''

  // Serve login / reset-password without the authenticated shell
  if (PUBLIC_PORTAL_PATHS.some(p => pathname.startsWith(p))) {
    return <>{children}</>
  }

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
      />
      <main className="portal-main">
        {children}
      </main>
      <PwaInstallBanner />
      <SessionGuard />
    </div>
  )
}

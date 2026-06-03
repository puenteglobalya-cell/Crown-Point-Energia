import { redirect } from 'next/navigation'
import { getCurrentUserAndRole, canUpload } from '@/lib/roles'
import PortalNav from '@/components/PortalNav'
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
      />
      <main className="portal-main">
        {children}
      </main>
    </div>
  )
}

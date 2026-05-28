import { redirect } from 'next/navigation'
import { getCurrentUserAndRole, canUpload } from '@/lib/roles'
import PortalNav from '@/components/PortalNav'

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
      <main style={{ padding: '40px 24px' }}>
        {children}
      </main>
    </div>
  )
}

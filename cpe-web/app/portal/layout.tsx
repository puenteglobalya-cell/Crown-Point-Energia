import { redirect } from 'next/navigation'
import { getCurrentUserAndRole, canUpload as canUploadRole } from '@/lib/roles'
import PortalNav from '@/components/PortalNav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentUserAndRole()

  if (!user || !role?.activo) {
    redirect('/portal/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PortalNav
        email={user.email ?? ''}
        role={role.role}
        canUpload={canUploadRole(role.role)}
      />
      <main style={{ padding: '40px 24px' }}>
        {children}
      </main>
    </div>
  )
}

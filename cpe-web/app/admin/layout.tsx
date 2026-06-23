import { AdminShell } from '@/components/AdminShell'
import { getCurrentUserAndRole } from '@/lib/roles'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentUserAndRole()
  return (
    <AdminShell userEmail={user?.email ?? ''} userRole={role?.role ?? 'admin'}>
      {children}
    </AdminShell>
  )
}

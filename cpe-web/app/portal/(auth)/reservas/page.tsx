import { redirect } from 'next/navigation'
import { getCurrentUserAndRole } from '@/lib/roles'
import ReservasClient from './ReservasClient'

export const dynamic = 'force-dynamic'

export default async function ReservasPage() {
  const { permissions } = await getCurrentUserAndRole()
  if (!permissions.has('view_reservas')) redirect('/portal')

  return <ReservasClient />
}

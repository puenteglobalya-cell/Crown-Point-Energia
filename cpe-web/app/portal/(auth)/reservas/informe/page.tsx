import { redirect } from 'next/navigation'
import { getCurrentUserAndRole } from '@/lib/roles'
import InformeClient from './InformeClient'

export const dynamic = 'force-dynamic'

export default async function InformePage() {
  const { permissions } = await getCurrentUserAndRole()
  if (!permissions.has('view_reservas')) redirect('/portal')

  return <InformeClient />
}

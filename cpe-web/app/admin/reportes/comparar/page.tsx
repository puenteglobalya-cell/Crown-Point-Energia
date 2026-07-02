import { redirect } from 'next/navigation'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAnyActiveUser } from '@/lib/admin-auth'
import type { DatosIngresos } from '@/lib/parsers/ingresos'
import { CompararClient, type ReporteConDatos } from './CompararClient'

export const dynamic = 'force-dynamic'

export default async function CompararReportesPage() {
  const auth = await requireAnyActiveUser()
  if (!auth) redirect('/admin/login')
  const db = createSupabaseServerAdminClient()

  const { data } = await db
    .from('reportes')
    .select('id, titulo, periodo, estado, datos')
    .eq('type_id', 'ingresos')
    .order('periodo', { ascending: false })

  const reportes: ReporteConDatos[] = (data ?? [])
    .filter((r) => r.datos && typeof r.datos === 'object')
    .map((r) => ({
      id: r.id as string,
      titulo: r.titulo as string,
      periodo: r.periodo as string,
      estado: r.estado as string,
      datos: r.datos as DatosIngresos,
    }))

  return <CompararClient reportes={reportes} />
}

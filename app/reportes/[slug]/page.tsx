import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ReporteMayo2026 from '@/components/reportes/mayo-2026'
import ReporteAbril2026 from '@/components/reportes/abril-2026'

// Mapa de slug → componente
// Agregar nuevos reportes acá
const reporteMap: Record<string, React.ComponentType> = {
  'mayo-2026':  ReporteMayo2026,
  'abril-2026': ReporteAbril2026,
}

interface Props {
  params: { slug: string }
}

export default async function ReportePage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const Reporte = reporteMap[params.slug]
  if (!Reporte) notFound()

  return <Reporte />
}

export function generateStaticParams() {
  return Object.keys(reporteMap).map(slug => ({ slug }))
}

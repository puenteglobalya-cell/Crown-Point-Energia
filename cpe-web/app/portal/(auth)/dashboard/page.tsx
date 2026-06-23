import { redirect } from 'next/navigation'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'
import type { DatosIngresos } from '@/lib/parsers/ingresos'
import { getCurrentUserAndRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { permissions } = await getCurrentUserAndRole()
  if (!permissions.has('view_dashboard')) redirect('/portal')

  const db = createSupabaseServerAdminClient()

  const [ingresosRes, recientesRes] = await Promise.all([
    db.from('reportes')
      .select('id, datos')
      .eq('type_id', 'ingresos')
      .eq('estado', 'publicado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    db.from('reportes')
      .select('id, type_id, titulo, periodo, created_at')
      .eq('estado', 'publicado')
      .not('type_id', 'in', '(henry_hub,ice_brent)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <DashboardClient
      latest={(ingresosRes.data?.datos ?? null) as DatosIngresos | null}
      latestId={ingresosRes.data?.id ?? null}
      recientes={recientesRes.data ?? []}
    />
  )
}

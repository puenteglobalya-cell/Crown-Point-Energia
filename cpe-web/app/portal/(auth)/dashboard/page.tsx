import { redirect } from 'next/navigation'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import DashboardClient from './DashboardClient'
import MapSection from '@/app/operaciones/MapSection'
import type { DatosIngresos } from '@/lib/parsers/ingresos'
import { getCurrentUserAndRole } from '@/lib/roles'
import { fetchOperationsBlocks } from '@/lib/content-fetch'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { permissions } = await getCurrentUserAndRole()
  if (!permissions.has('view_dashboard')) redirect('/portal')

  const db = createSupabaseServerAdminClient()

  const [ingresosRes, recientesRes, allBlocks] = await Promise.all([
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

    fetchOperationsBlocks(),
  ])

  const mapBlocks = allBlocks.map(b => ({
    id: b.slug,
    title: b.titulo,
    eyebrow: b.eyebrow,
    commodity: b.commodity,
    stats: b.map_stats.map(stat => [
      { es: stat.label_es, en: stat.label_en },
      stat.val,
    ] as [{ es: string; en: string }, string]),
  }))

  return (
    <>
      <DashboardClient
        latest={(ingresosRes.data?.datos ?? null) as DatosIngresos | null}
        latestId={ingresosRes.data?.id ?? null}
        recientes={recientesRes.data ?? []}
      />
      <div style={{ padding: '0 20px 40px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: '0 0 2px' }}>
            Mapa de operaciones
          </p>
          <p style={{ fontSize: 11, color: '#8e91b0', margin: '0 0 12px' }}>
            bloques activos · Crown Point Energy
          </p>
        </div>
        <MapSection blocks={mapBlocks} />
      </div>
    </>
  )
}

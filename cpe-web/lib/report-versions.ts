import { createSupabaseServerAdminClient } from '@/lib/supabase'

/** Snapshot a report's current state before it gets overwritten, so it can be restored later. */
export async function snapshotReportVersion(reporteId: string, createdBy: string | null) {
  const db = createSupabaseServerAdminClient()
  const { data: current } = await db
    .from('reportes')
    .select('titulo, periodo, datos, html, estado')
    .eq('id', reporteId)
    .single()
  if (!current) return
  await db.from('reporte_versiones').insert({
    reporte_id: reporteId,
    titulo: current.titulo,
    periodo: current.periodo,
    datos: current.datos,
    html: current.html,
    estado: current.estado,
    created_by: createdBy,
  })
}

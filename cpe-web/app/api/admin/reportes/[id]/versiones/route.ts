import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { snapshotReportVersion } from '@/lib/report-versions'
import { logActivity } from '@/lib/roles'
import { dbError } from '@/lib/api-error'

// GET — list version history for a report (most recent first)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('reporte_versiones')
    .select('id, titulo, periodo, estado, created_at, created_by')
    .eq('reporte_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST — restore a prior version (snapshots the current state first, so this is itself undoable)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { versionId } = await req.json()
  if (!versionId) return NextResponse.json({ error: 'Falta versionId' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data: version, error: versionError } = await db
    .from('reporte_versiones')
    .select('titulo, periodo, datos, html, estado')
    .eq('id', versionId)
    .eq('reporte_id', id)
    .single()

  if (versionError || !version) return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })

  await snapshotReportVersion(id, user.email ?? null)

  const { error: updateError } = await db
    .from('reportes')
    .update({
      titulo: version.titulo,
      periodo: version.periodo,
      datos: version.datos,
      html: version.html,
      estado: version.estado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) return dbError(updateError)

  await logActivity({
    userId: user.id,
    userEmail: user.email ?? null,
    action: 'restore_report_version',
    resourceType: 'reporte',
    resourceId: id,
    metadata: { versionId },
  })

  return NextResponse.json({ ok: true })
}

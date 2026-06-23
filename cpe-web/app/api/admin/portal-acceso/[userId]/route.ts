import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { getCurrentUserAndRole } from '@/lib/roles'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

async function requireAdmin() {
  const { role } = await getCurrentUserAndRole()
  return role?.role === 'admin' && role.activo
}

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createSupabaseServerAdminClient()
  const { data } = await db.from('portal_report_access').select('reporte_id').eq('user_id', params.userId)
  return NextResponse.json((data ?? []).map((r: { reporte_id: string }) => r.reporte_id))
}

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { reporteIds } = await req.json() as { reporteIds: string[] }
  if (!Array.isArray(reporteIds)) return NextResponse.json({ error: 'reporteIds must be array' }, { status: 400 })
  const db = createSupabaseServerAdminClient()
  await db.from('portal_report_access').delete().eq('user_id', params.userId)
  if (reporteIds.length > 0) {
    const rows = reporteIds.map(rid => ({ user_id: params.userId, reporte_id: rid }))
    const { error } = await db.from('portal_report_access').insert(rows)
    if (error) return dbError(error)
  }
  return NextResponse.json({ ok: true })
}

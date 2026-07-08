import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildXlsxResponse, type XlsxCol } from '@/lib/xlsx-export'

export const dynamic = 'force-dynamic'

const SECTION_TYPES: Record<string, string[]> = {
  reporte: ['reporte'], contacto: ['contacto'], suscriptor: ['suscriptor'],
  postulacion: ['postulacion'], posicion: ['posicion'], user: ['user'], macro: ['macro'],
}

type Row = {
  created_at: string | null; user_email: string | null; action: string | null
  resource_type: string | null; resource_id: string | null; metadata: Record<string, unknown> | null
}

export async function GET(req: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const section = req.nextUrl.searchParams.get('section') ?? 'all'
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10) || 30))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const db = createSupabaseServerAdminClient()
  let q = db.from('activity_log')
    .select('created_at, user_email, action, resource_type, resource_id, metadata')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000)

  const types = SECTION_TYPES[section]
  if (types) q = q.in('resource_type', types)

  const { data } = await q
  const rows = (data ?? []) as Row[]

  const columns: XlsxCol<Row>[] = [
    { header: 'Fecha', width: 20, type: 'date', get: r => r.created_at },
    { header: 'Usuario', width: 30, type: 'text', get: r => r.user_email ?? 'sistema' },
    { header: 'Acción', width: 24, type: 'text', get: r => r.action },
    { header: 'Sección', width: 16, type: 'text', get: r => r.resource_type },
    { header: 'ID recurso', width: 20, type: 'text', get: r => r.resource_id },
    { header: 'Detalle', width: 50, type: 'text', get: r => (r.metadata ? JSON.stringify(r.metadata) : '') },
  ]

  const today = new Date().toISOString().slice(0, 10)
  return buildXlsxResponse({
    sheetName: 'Actividad',
    columns,
    rows,
    filename: `logs-${section}-${days}d-${today}.xlsx`,
  })
}

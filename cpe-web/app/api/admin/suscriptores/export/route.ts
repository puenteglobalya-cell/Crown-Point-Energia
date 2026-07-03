import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildXlsxResponse, type XlsxCol } from '@/lib/xlsx-export'

export const dynamic = 'force-dynamic'

type Row = { nombre: string | null; email: string | null; activo: boolean; created_at: string | null }

export async function GET(req: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Optional ?filter=activas|inactivas|todas (defaults to todas)
  const filter = req.nextUrl.searchParams.get('filter') ?? 'todas'

  const db = createSupabaseServerAdminClient()
  let q = db.from('ir_subscribers').select('nombre, email, activo, created_at').order('created_at', { ascending: false })
  if (filter === 'activas') q = q.eq('activo', true)
  else if (filter === 'inactivas') q = q.eq('activo', false)

  const { data } = await q
  const rows = (data ?? []) as Row[]

  const columns: XlsxCol<Row>[] = [
    { header: 'Nombre', width: 28, type: 'text', get: r => r.nombre },
    { header: 'Email', width: 32, type: 'text', get: r => r.email },
    { header: 'Estado', width: 12, type: 'text', get: r => (r.activo ? 'activo' : 'inactivo') },
    { header: 'Fecha de alta', width: 20, type: 'date', get: r => r.created_at },
  ]

  const today = new Date().toISOString().slice(0, 10)
  return buildXlsxResponse({
    sheetName: 'Suscriptores IR',
    columns,
    rows,
    filename: `suscriptores-ir-${filter}-${today}.xlsx`,
  })
}

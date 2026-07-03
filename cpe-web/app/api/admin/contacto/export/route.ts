import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildXlsxResponse, type XlsxCol } from '@/lib/xlsx-export'

export const dynamic = 'force-dynamic'

type Row = {
  created_at: string | null; tipo: string | null; nombre: string | null
  organizacion: string | null; email: string | null; telefono: string | null
  estado: string | null; mensaje: string | null; notas: string | null
}

export async function GET(req: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Optional ?estado=nueva|respondida|archivada (defaults to todas)
  const estado = req.nextUrl.searchParams.get('estado') ?? 'todas'

  const db = createSupabaseServerAdminClient()
  let q = db.from('contact_submissions')
    .select('created_at, tipo, nombre, organizacion, email, telefono, estado, mensaje, notas')
    .order('created_at', { ascending: false })
  if (['nueva', 'respondida', 'archivada'].includes(estado)) q = q.eq('estado', estado)

  const { data } = await q
  const rows = (data ?? []) as Row[]

  const columns: XlsxCol<Row>[] = [
    { header: 'Fecha', width: 20, type: 'date', get: r => r.created_at },
    { header: 'Tipo', width: 22, type: 'text', get: r => r.tipo },
    { header: 'Nombre', width: 24, type: 'text', get: r => r.nombre },
    { header: 'Organización', width: 24, type: 'text', get: r => r.organizacion },
    { header: 'Email', width: 30, type: 'text', get: r => r.email },
    { header: 'Teléfono', width: 18, type: 'text', get: r => r.telefono },
    { header: 'Estado', width: 14, type: 'text', get: r => r.estado },
    { header: 'Mensaje', width: 60, type: 'text', get: r => r.mensaje },
    { header: 'Notas internas', width: 40, type: 'text', get: r => r.notas },
  ]

  const today = new Date().toISOString().slice(0, 10)
  return buildXlsxResponse({
    sheetName: 'Consultas',
    columns,
    rows,
    filename: `contacto-${estado}-${today}.xlsx`,
  })
}

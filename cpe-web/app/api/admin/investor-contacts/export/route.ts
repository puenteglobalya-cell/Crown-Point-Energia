import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { buildXlsxResponse, type XlsxCol } from '@/lib/xlsx-export'

export const dynamic = 'force-dynamic'

type Row = {
  nombre: string; email: string; telefono: string; tipo: string
  tenencia_estimada: string; interes_on: boolean; notas: string; created_at: string
}

const TIPO_LABELS: Record<string, string> = {
  accionista_actual: 'Accionista actual',
  prospecto: 'Prospecto',
  institucional: 'Institucional',
  individual: 'Individual',
}

export async function GET(req: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const onlyOn = req.nextUrl.searchParams.get('on') === '1'
  const tipo = req.nextUrl.searchParams.get('tipo') ?? 'todos'

  const db = createSupabaseServerAdminClient()
  let q = db.from('investor_contacts')
    .select('nombre, email, telefono, tipo, tenencia_estimada, interes_on, notas, created_at')
    .order('created_at', { ascending: false })
  if (onlyOn) q = q.eq('interes_on', true)
  if (tipo !== 'todos') q = q.eq('tipo', tipo)

  const { data } = await q
  const rows = (data ?? []) as Row[]

  const columns: XlsxCol<Row>[] = [
    { header: 'Nombre', width: 26, type: 'text', get: r => r.nombre },
    { header: 'Email', width: 30, type: 'text', get: r => r.email },
    { header: 'Teléfono', width: 18, type: 'text', get: r => r.telefono },
    { header: 'Tipo', width: 18, type: 'text', get: r => TIPO_LABELS[r.tipo] ?? r.tipo },
    { header: 'Tenencia estimada', width: 20, type: 'text', get: r => r.tenencia_estimada },
    { header: 'Candidato ON', width: 14, type: 'text', get: r => r.interes_on ? 'Sí' : 'No' },
    { header: 'Notas', width: 40, type: 'text', get: r => r.notas },
    { header: 'Alta', width: 20, type: 'date', get: r => r.created_at },
  ]

  const today = new Date().toISOString().slice(0, 10)
  return buildXlsxResponse({
    sheetName: 'Inversores',
    columns,
    rows,
    filename: `inversores-${onlyOn ? 'candidatos-on' : 'todos'}-${today}.xlsx`,
  })
}

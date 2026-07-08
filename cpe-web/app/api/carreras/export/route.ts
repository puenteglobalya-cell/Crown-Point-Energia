import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireHrUser } from '@/lib/admin-auth'
import { buildXlsxResponse, type XlsxCol } from '@/lib/xlsx-export'

export const dynamic = 'force-dynamic'

type Datos = Record<string, string | null | undefined>
type Row = {
  created_at: string | null; nombre: string | null; email: string | null
  telefono: string | null; linkedin: string | null; area: string | null
  estado: string | null; score: number | null; cv_name: string | null
  mensaje: string | null; notas: string | null; ai_summary: string | null
  datos: Datos | null
}

const d = (r: Row, k: string) => (r.datos && typeof r.datos === 'object' ? r.datos[k] ?? '' : '')

export async function GET(req: NextRequest) {
  const user = await requireHrUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const estado = req.nextUrl.searchParams.get('estado') ?? 'todas'
  const area = req.nextUrl.searchParams.get('area') ?? 'todas'

  const db = createSupabaseServerAdminClient()
  let q = db.from('job_applications')
    .select('created_at, nombre, email, telefono, linkedin, area, estado, score, cv_name, mensaje, notas, ai_summary, datos')
    .order('created_at', { ascending: false })
  if (['nueva', 'revisada', 'contactada', 'descartada'].includes(estado)) q = q.eq('estado', estado)
  if (area !== 'todas') q = q.eq('area', area)

  const { data } = await q
  const rows = (data ?? []) as Row[]

  const columns: XlsxCol<Row>[] = [
    { header: 'Fecha', width: 20, type: 'date', get: r => r.created_at },
    { header: 'Nombre', width: 24, type: 'text', get: r => r.nombre },
    { header: 'Email', width: 30, type: 'text', get: r => r.email },
    { header: 'Teléfono', width: 18, type: 'text', get: r => r.telefono },
    { header: 'LinkedIn', width: 30, type: 'text', get: r => r.linkedin },
    { header: 'Área', width: 22, type: 'text', get: r => r.area },
    { header: 'Estado', width: 14, type: 'text', get: r => r.estado },
    { header: 'Score IA', width: 10, type: 'number', get: r => r.score },
    { header: 'Nivel estudios', width: 20, type: 'text', get: r => d(r, 'nivel_estudios') },
    { header: 'Carrera', width: 24, type: 'text', get: r => d(r, 'carrera') },
    { header: 'Años exp.', width: 12, type: 'text', get: r => d(r, 'anios_experiencia') },
    { header: 'Años sector O&G', width: 16, type: 'text', get: r => d(r, 'anios_sector') },
    { header: 'Disponibilidad', width: 18, type: 'text', get: r => d(r, 'disponibilidad') },
    { header: 'Relocación', width: 14, type: 'text', get: r => d(r, 'relocacion') },
    { header: 'Inglés', width: 14, type: 'text', get: r => d(r, 'ingles_nivel') },
    { header: 'Otros idiomas', width: 18, type: 'text', get: r => d(r, 'otros_idiomas') },
    { header: 'Pretensión', width: 16, type: 'text', get: r => d(r, 'pretension') },
    { header: 'CV', width: 26, type: 'text', get: r => r.cv_name },
    { header: 'Mensaje', width: 50, type: 'text', get: r => r.mensaje },
    { header: 'Resumen IA', width: 50, type: 'text', get: r => r.ai_summary },
    { header: 'Notas internas', width: 40, type: 'text', get: r => r.notas },
  ]

  const today = new Date().toISOString().slice(0, 10)
  return buildXlsxResponse({
    sheetName: 'Postulaciones',
    columns,
    rows,
    filename: `postulaciones-${estado}-${area === 'todas' ? 'todas' : 'area'}-${today}.xlsx`,
  })
}

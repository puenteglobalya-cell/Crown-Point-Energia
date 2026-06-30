import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { generarReporteHTML } from '@/lib/generador/htmlReport'
import { generarReporteAccionistaHTML } from '@/lib/generador/htmlReportAccionista'
import { generarReporteFacturacionHTML } from '@/lib/generador/htmlReportFacturacion'
import { generarReporteGenericoHTML } from '@/lib/generador/htmlReportGenerico'
import type { DatosIngresos } from '@/lib/parsers/ingresos'
import type { DatosAccionista } from '@/lib/parsers/accionista'
import type { DatosFacturacion } from '@/lib/parsers/facturacion'
import type { DatosGenerico } from '@/lib/parsers/generico'

const REGENERABLE = ['ingresos', 'accionista', 'facturacion', 'produccion', 'financiero']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const db = createSupabaseServerAdminClient()

  const { data: reporte, error } = await db
    .from('reportes')
    .select('type_id, datos, manual_data')
    .eq('id', id)
    .single()

  if (error || !reporte) {
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  }

  const { type_id, datos } = reporte

  if (!type_id || !REGENERABLE.includes(type_id)) {
    return NextResponse.json(
      { error: `Tipo "${type_id}" no se puede regenerar (solo: ${REGENERABLE.join(', ')})` },
      { status: 400 }
    )
  }

  let html: string

  try {
    switch (type_id) {
      case 'ingresos':
        html = generarReporteHTML(datos as DatosIngresos)
        break
      case 'accionista':
        html = generarReporteAccionistaHTML(datos as DatosAccionista)
        break
      case 'facturacion':
        html = generarReporteFacturacionHTML(datos as DatosFacturacion)
        break
      case 'produccion':
      case 'financiero':
        html = generarReporteGenericoHTML(datos as DatosGenerico)
        break
      default:
        return NextResponse.json({ error: 'Tipo no soportado' }, { status: 400 })
    }
  } catch (genError) {
    console.error('[regenerar]', genError)
    return NextResponse.json({ error: 'Error al generar HTML' }, { status: 500 })
  }

  const { error: updateError } = await db
    .from('reportes')
    .update({ html, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

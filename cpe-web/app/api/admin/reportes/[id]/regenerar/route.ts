import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { generarReporteHTML } from '@/lib/generador/htmlReport'
import { generarReporteAccionistaHTML } from '@/lib/generador/htmlReportAccionista'
import { generarReporteFacturacionHTML } from '@/lib/generador/htmlReportFacturacion'
import { generarReporteGenericoHTML } from '@/lib/generador/htmlReportGenerico'
import type { DatosIngresos } from '@/lib/parsers/ingresos'
import type { MacroSnapshot } from '@/lib/generador/htmlReport'
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

  let macro: MacroSnapshot | undefined
  if (type_id === 'ingresos') {
    try {
      const { data: rows } = await db
        .from('macro_uploads')
        .select('tipo, datos, created_at')
        .order('created_at', { ascending: false })
        .limit(4)
      if (rows?.length) {
        const hhRow = rows.find(r => r.tipo === 'henry_hub')
        const brRow = rows.find(r => r.tipo === 'ice_brent')
        if (hhRow?.datos || brRow?.datos) {
          const hhPts = (hhRow?.datos as any)?.points ?? []
          const brPts = (brRow?.datos as any)?.points ?? []
          const labels = [...new Set([...hhPts.map((p: any) => p.label), ...brPts.map((p: any) => p.label)])]
          const hhMap = new Map(hhPts.map((p: any) => [p.label, p.value]))
          const brMap = new Map(brPts.map((p: any) => [p.label, p.value]))
          const points = labels.map(l => ({ label: l as string, hh: (hhMap.get(l) ?? 0) as number, brent: (brMap.get(l) ?? 0) as number }))
          const updatedAt = [hhRow?.created_at, brRow?.created_at].filter(Boolean).sort().reverse()[0] ?? new Date().toISOString()
          macro = { points, hasHH: points.some(p => p.hh > 0), hasBrent: points.some(p => p.brent > 0), updatedAt }
        }
      }
    } catch { /* macro unavailable — regenerate without it */ }
  }

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
        html = generarReporteHTML(datos as DatosIngresos, macro)
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

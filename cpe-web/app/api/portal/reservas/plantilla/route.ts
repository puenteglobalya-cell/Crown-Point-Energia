import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo } from '@/lib/reservas/engine'
import { construirPlantillaExcel } from '@/lib/reservas/plantillaExcel'
import { ENTITIES } from '@/app/portal/(auth)/reservas/entityConfig'

export const dynamic = 'force-dynamic'

// ─── Plantilla de Excel para el pegado masivo de una tabla ───────────────
// Arma el archivo desde entityConfig.ts, así que nunca se desactualiza
// respecto al formulario: si se agrega un campo a una entidad, la plantilla
// lo trae solo, sin tocar este archivo.
export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tabla = req.nextUrl.searchParams.get('tabla')
  const cfg = ENTITIES.find(e => e.tabla === tabla)
  if (!cfg) return NextResponse.json({ error: `Tabla inválida: ${tabla}` }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  try {
    // Sólo se traen las tablas de referencia que esta entidad necesita para
    // resolver sus campos "optionsFrom" — no el resto de la carga.
    const tablasRef = [...new Set(cfg.fields.map(f => f.optionsFrom).filter(Boolean))] as string[]
    const resultados = await Promise.all(
      tablasRef.map(t => traerTodo<any>(() => db.from(t).select('id, nombre').order('id')).catch(() => [] as any[])),
    )
    const opciones: Record<string, { id: unknown; nombre?: unknown }[]> = {}
    tablasRef.forEach((t, i) => { opciones[t] = resultados[i] })

    const buffer = await construirPlantillaExcel(cfg, opciones)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="plantilla_${cfg.tabla}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo } from '@/lib/reservas/engine'
import { construirPlantillaMasiva } from '@/lib/reservas/plantillaMasiva'
import { ENTITIES } from '@/app/portal/(auth)/reservas/entityConfig'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()

  try {
    const tablasRef = [...new Set(ENTITIES.flatMap(e => e.fields.map(f => f.optionsFrom).filter(Boolean)))] as string[]
    const resultados = await Promise.all(
      tablasRef.map(t => traerTodo<any>(() => db.from(t).select('id, nombre').order('id')).catch(() => [] as any[])),
    )
    const opciones: Record<string, { id: unknown; nombre?: unknown }[]> = {}
    tablasRef.forEach((t, i) => { opciones[t] = resultados[i] })

    const buffer = await construirPlantillaMasiva(opciones)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla_completa_cpe.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

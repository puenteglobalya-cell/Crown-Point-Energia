import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo } from '@/lib/reservas/engine'

// El cash flow mensual de un escenario real son decenas de miles de filas
// (pozos × meses). Antes se devolvían todas de una y el navegador tenía que
// renderizar la tabla completa. La vista mensual ahora se pagina del lado del
// servidor; las vistas anuales son chicas y van completas (paginando la
// lectura, porque PostgREST corta en 1000 filas por defecto).
const PAGINA_MENSUAL = 500

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioIdRaw = req.nextUrl.searchParams.get('escenario_id')
  const escenarioId = Number(escenarioIdRaw)
  if (!escenarioIdRaw || !Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'Falta escenario_id o es inválido' }, { status: 400 })
  }
  const vista = req.nextUrl.searchParams.get('vista') ?? 'mensual'

  const db = createSupabaseServerAdminClient()

  try {
    if (vista === 'anual') {
      const rows = await traerTodo<any>(() => db
        .from('resultados_escenario_anual').select('*')
        .eq('escenario_id', escenarioId).order('anio').order('id'))
      return NextResponse.json(rows)
    }

    if (vista === 'depletion') {
      const rows = await traerTodo<any>(() => db
        .from('reservas_depletion_anual').select('*')
        .eq('escenario_id', escenarioId).order('anio').order('id'))
      return NextResponse.json(rows)
    }

    const pagina = Math.max(0, Number(req.nextUrl.searchParams.get('pagina') ?? 0) || 0)
    const desde = pagina * PAGINA_MENSUAL
    const { data, error, count } = await db
      .from('cashflow_mensual')
      .select('*', { count: 'exact' })
      .eq('escenario_id', escenarioId)
      .order('fecha').order('pozo_id')
      .range(desde, desde + PAGINA_MENSUAL - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const total = count ?? 0
    return NextResponse.json({
      filas: data ?? [],
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / PAGINA_MENSUAL)),
      por_pagina: PAGINA_MENSUAL,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

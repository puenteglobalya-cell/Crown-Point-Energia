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

    if (vista === 'fdc') {
      // Capital de desarrollo futuro: NI 51-101 pide informar los costos de
      // desarrollo futuro por año. Sale del CAPEX que el motor ya imputó, así
      // que respeta el cronograma de la campaña; no hay que cargar nada nuevo.
      // "Futuro" es desde la fecha efectiva (por defecto hoy): lo ya gastado
      // no es capital futuro.
      const desde = req.nextUrl.searchParams.get('desde') ?? new Date().toISOString().slice(0, 10)
      const filas = await traerTodo<any>(() => db
        .from('cashflow_mensual').select('fecha, capex_usd, participacion_pct')
        .eq('escenario_id', escenarioId).gt('capex_usd', 0).order('id'))

      const porAnio = new Map<number, { bruto: number; neto: number }>()
      for (const f of filas) {
        if (String(f.fecha) < desde) continue
        const anio = Number(String(f.fecha).slice(0, 4))
        const acc = porAnio.get(anio) ?? { bruto: 0, neto: 0 }
        acc.bruto += Number(f.capex_usd)
        acc.neto += Number(f.capex_usd) * Number(f.participacion_pct ?? 1)
        porAnio.set(anio, acc)
      }

      const anios = [...porAnio.entries()].sort((a, b) => a[0] - b[0])
        .map(([anio, v]) => ({ anio, capex_bruto_usd: v.bruto, capex_neto_usd: v.neto }))

      return NextResponse.json({
        desde,
        anios,
        total_bruto_usd: anios.reduce((s, a) => s + a.capex_bruto_usd, 0),
        total_neto_usd: anios.reduce((s, a) => s + a.capex_neto_usd, 0),
        // Lo ya incurrido antes de la fecha efectiva, para poder distinguirlo
        // del capital que todavía falta comprometer.
        ya_incurrido_neto_usd: filas
          .filter(f => String(f.fecha) < desde)
          .reduce((s, f) => s + Number(f.capex_usd) * Number(f.participacion_pct ?? 1), 0),
      })
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

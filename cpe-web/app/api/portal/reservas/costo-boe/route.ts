import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo } from '@/lib/reservas/engine'

const MCF_POR_BOE = 6

// ─── Costo integral por barril, primeros 5 años ──────────────────────────
// Chequeo de razonabilidad: el fijo por pozo y el fijo de concesión se
// cargan por separado (uno por pozo activo, el otro prorrateado entre
// todos) — este endpoint los junta con el variable y los divide por la
// producción neta real del escenario, para poder mirar de un vistazo si el
// costo por boe que termina impactando es razonable, sin tener que abrir el
// cashflow mensual fila por fila. Ponderado por participación en numerador
// y denominador por igual, nunca mezclando neto con bruto.
export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  if (!Number.isFinite(escenarioId)) return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  try {
    const filas = await traerTodo<any>(() => db.from('cashflow_mensual')
      .select('fecha, opex_fijo_usd, opex_variable_usd, opex_fijo_pozo_usd, bbl_petroleo, mcf_gas, participacion_pct')
      .eq('escenario_id', escenarioId).order('fecha'))

    if (filas.length === 0) {
      return NextResponse.json({ error: 'El escenario no tiene resultados. Corré el cálculo primero.' }, { status: 400 })
    }

    // Se ancla a años CALENDARIO desde 2026, no desde la fecha en que arranca
    // la data del escenario (ver el mismo comentario en tablero-anual).
    const ANIO_ANCLA = 2026
    const porAnio = new Map<number, { opex_fijo: number; opex_variable: number; opex_fijo_pozo: number; boe: number }>()

    for (const f of filas) {
      const anio = Number(String(f.fecha).slice(0, 4))
      const anioRelativo = anio - ANIO_ANCLA
      if (anioRelativo < 0 || anioRelativo >= 5) continue
      const part = Number(f.participacion_pct ?? 1)
      const fila = porAnio.get(anio) ?? { opex_fijo: 0, opex_variable: 0, opex_fijo_pozo: 0, boe: 0 }
      fila.opex_fijo += Number(f.opex_fijo_usd) * part
      fila.opex_variable += Number(f.opex_variable_usd) * part
      fila.opex_fijo_pozo += Number(f.opex_fijo_pozo_usd) * part
      fila.boe += (Number(f.bbl_petroleo) + Number(f.mcf_gas) / MCF_POR_BOE) * part
      porAnio.set(anio, fila)
    }

    const anios = [...porAnio.entries()].sort((a, b) => a[0] - b[0]).map(([anio, v]) => ({
      anio,
      boe: v.boe,
      opex_fijo_usd_boe: v.boe > 0 ? v.opex_fijo / v.boe : null,
      opex_variable_usd_boe: v.boe > 0 ? v.opex_variable / v.boe : null,
      opex_fijo_pozo_usd_boe: v.boe > 0 ? v.opex_fijo_pozo / v.boe : null,
      costo_total_usd_boe: v.boe > 0 ? (v.opex_fijo + v.opex_variable + v.opex_fijo_pozo) / v.boe : null,
    }))

    return NextResponse.json({ anio_base: ANIO_ANCLA, anios })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

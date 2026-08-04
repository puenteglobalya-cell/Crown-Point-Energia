import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo } from '@/lib/reservas/engine'

// Compara todos los escenarios ya calculados: NPV (de escenario_metricas,
// neto a CPE) vs. CAPEX total neto a CPE (sumado de cashflow_mensual y
// ponderado por participación — la columna capex_usd está al 100%). Ambos
// ejes se leen de lo que ya está cargado/calculado — no hay nada
// hardcodeado por escenario.
export async function GET() {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()

  // Lecturas paginadas: cashflow_mensual son decenas de miles de filas y un
  // select pelado devolvía solo las primeras 1000, así que el CAPEX total de
  // cada escenario salía subestimado (y con él, el eje X del Pareto).
  let escenarios: any[], metricas: any[], cashflows: any[]
  try {
    [escenarios, metricas, cashflows] = await Promise.all([
      traerTodo<any>(() => db.from('escenarios').select('id, nombre, es_base').order('id')),
      traerTodo<any>(() => db.from('escenario_metricas').select('*').order('id')),
      traerTodo<any>(() => db.from('cashflow_mensual').select('escenario_id, capex_usd, participacion_pct').order('id')),
    ])
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  // capex_usd está al 100% (bruto del proyecto) — hay que netear por
  // participación para que el eje de CAPEX quede en la misma unidad que el
  // VAN (que ya viene neto a CPE desde escenario_metricas). Sin esto, dos
  // escenarios con el mismo VAN a CPE pero distinta participación mostraban
  // "CAPEX total" muy distinto sin que fuera lo que CPE realmente puso, y la
  // frontera de Pareto podía marcar como eficiente al escenario equivocado.
  const capexPorEscenario = new Map<number, number>()
  for (const cf of cashflows) {
    const capexNeto = cf.capex_usd * (cf.participacion_pct ?? 1)
    capexPorEscenario.set(cf.escenario_id, (capexPorEscenario.get(cf.escenario_id) ?? 0) + capexNeto)
  }

  const puntos = escenarios.map(esc => {
    // Si hay más de una corrida de métricas (distintas tasas/horizontes)
    // para el mismo escenario, usamos la más reciente (mayor id).
    const metricasEsc = metricas.filter(m => m.escenario_id === esc.id).sort((a, b) => b.id - a.id)
    const metrica = metricasEsc[0] ?? null
    return {
      escenario_id: esc.id,
      nombre: esc.nombre,
      es_base: esc.es_base,
      capex_total_usd: capexPorEscenario.get(esc.id) ?? 0,
      npv_usd: metrica?.npv_usd ?? null,
      irr_pct: metrica?.irr_pct ?? null,
      payback_anios: metrica?.payback_anios ?? null,
      tasa_descuento: metrica?.tasa_descuento ?? null,
    }
  }).filter(p => p.npv_usd !== null)

  // Frontera de Pareto: un escenario domina a otro si tiene NPV >= y CAPEX <=
  // (con al menos una desigualdad estricta). Marcamos los no-dominados.
  const eficientes = puntos.map(p => {
    const dominado = puntos.some(o =>
      o.escenario_id !== p.escenario_id &&
      o.npv_usd! >= p.npv_usd! && o.capex_total_usd <= p.capex_total_usd &&
      (o.npv_usd! > p.npv_usd! || o.capex_total_usd < p.capex_total_usd)
    )
    return { ...p, es_eficiente: !dominado }
  })

  return NextResponse.json(eficientes)
}

import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'

// Compara todos los escenarios ya calculados: NPV (de escenario_metricas)
// vs. CAPEX total (sumado de cashflow_mensual). Ambos ejes se leen de lo
// que ya está cargado/calculado — no hay nada hardcodeado por escenario.
export async function GET() {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()

  const [escenariosRes, metricasRes, cashflowRes] = await Promise.all([
    db.from('escenarios').select('id, nombre, es_base'),
    db.from('escenario_metricas').select('*'),
    db.from('cashflow_mensual').select('escenario_id, capex_usd'),
  ])
  const err = [escenariosRes, metricasRes, cashflowRes].find(r => r.error)
  if (err?.error) return NextResponse.json({ error: err.error.message }, { status: 500 })

  const escenarios = escenariosRes.data ?? []
  const metricas = metricasRes.data ?? []
  const cashflows = cashflowRes.data ?? []

  const capexPorEscenario = new Map<number, number>()
  for (const cf of cashflows) {
    capexPorEscenario.set(cf.escenario_id, (capexPorEscenario.get(cf.escenario_id) ?? 0) + cf.capex_usd)
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

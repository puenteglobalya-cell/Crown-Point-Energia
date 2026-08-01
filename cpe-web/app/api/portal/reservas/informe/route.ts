import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo, calcularNpvPorTasa } from '@/lib/reservas/engine'

// Arma en una sola llamada todo lo que necesita el informe final: KPIs,
// perfil de producción, flujo acumulado, tabla anual y depleción. Es de sólo
// lectura — no recalcula el escenario, muestra lo último que se calculó.
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  if (!Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  try {
    const [escRes, anual, depletion, metricas, yacimientos, cashflow, npvPorTasa] = await Promise.all([
      db.from('escenarios').select('*').eq('id', escenarioId).single(),
      traerTodo<any>(() => db.from('resultados_escenario_anual').select('*').eq('escenario_id', escenarioId).order('anio').order('id')),
      traerTodo<any>(() => db.from('reservas_depletion_anual').select('*').eq('escenario_id', escenarioId).order('anio').order('id')),
      traerTodo<any>(() => db.from('escenario_metricas').select('*').eq('escenario_id', escenarioId).order('id')),
      traerTodo<any>(() => db.from('yacimientos').select('id, nombre').order('id')),
      traerTodo<any>(() => db.from('cashflow_mensual')
        .select('fecha, cash_flow_neto_usd, capex_usd, participacion_pct, bbl_petroleo, mcf_gas')
        .eq('escenario_id', escenarioId).order('fecha')),
      calcularNpvPorTasa(escenarioId),
    ])

    if (cashflow.length === 0) {
      return NextResponse.json({ error: 'El escenario no tiene resultados. Corré el cálculo antes de generar el informe.' }, { status: 400 })
    }

    let proyecto: any = null
    if (escRes.data?.proyecto_id != null) {
      const { data } = await db.from('proyectos').select('nombre, tipo').eq('id', escRes.data.proyecto_id).single()
      proyecto = data
    }

    // Flujo neto anual y acumulado (neto a CPE), para el gráfico de payback
    const porAnio = new Map<number, number>()
    for (const cf of cashflow) {
      const a = Number(String(cf.fecha).slice(0, 4))
      porAnio.set(a, (porAnio.get(a) ?? 0) + Number(cf.cash_flow_neto_usd))
    }
    let acum = 0
    const flujoAnual = [...porAnio.entries()].sort((a, b) => a[0] - b[0]).map(([anio, neto]) => {
      acum += neto
      return { anio, neto_usd: neto, acumulado_usd: acum }
    })

    const capexTotal = cashflow.reduce((s, c) => s + Number(c.capex_usd) * Number(c.participacion_pct ?? 1), 0)
    const consolidado = anual.filter(a => a.yacimiento_id == null)
    const nombreYac = new Map<number, string>(yacimientos.map(y => [y.id, y.nombre]))

    // La métrica vigente: la corrida más reciente de este escenario
    const metrica = [...metricas].sort((a, b) => b.id - a.id)[0] ?? null

    const eurBbl = consolidado.reduce((s, a) => s + Number(a.produccion_petroleo_bbl), 0)
    const eurMcf = consolidado.reduce((s, a) => s + Number(a.produccion_gas_mcf), 0)
    const ebitdaTotal = consolidado.reduce((s, a) => s + Number(a.ebitda_usd), 0)
    const boeTotal = eurBbl + eurMcf / 6

    return NextResponse.json({
      escenario: { id: escenarioId, nombre: escRes.data?.nombre ?? `Escenario ${escenarioId}`, descripcion: escRes.data?.descripcion ?? null },
      proyecto,
      generado: new Date().toISOString(),
      metrica,
      npv_por_tasa: npvPorTasa,
      kpis: {
        capex_total_usd: capexTotal,
        eur_bbl: eurBbl,
        eur_mcf: eurMcf,
        eur_boe: boeTotal,
        ebitda_total_usd: ebitdaTotal,
        netback_usd_boe: boeTotal > 0 ? ebitdaTotal / boeTotal : null,
        cash_flow_total_usd: cashflow.reduce((s, c) => s + Number(c.cash_flow_neto_usd), 0),
        primer_anio: flujoAnual[0]?.anio ?? null,
        ultimo_anio: flujoAnual[flujoAnual.length - 1]?.anio ?? null,
      },
      flujo_anual: flujoAnual,
      anual: anual.map(a => ({ ...a, yacimiento: a.yacimiento_id == null ? 'Consolidado' : (nombreYac.get(a.yacimiento_id) ?? `#${a.yacimiento_id}`) })),
      depletion: depletion.map(d => ({ ...d, yacimiento: nombreYac.get(d.yacimiento_id) ?? `#${d.yacimiento_id}` })),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

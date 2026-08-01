import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo, calcularNPV, irrAnual, TASAS_NI_51_101 } from '@/lib/reservas/engine'

// ─── Economía incremental (caso "wedge") ─────────────────────────────────
// El valor de una intervención no es el VAN del escenario que la incluye: es
// la DIFERENCIA contra no hacerla. Es exactamente la pregunta del workover —
// no se decide cuánto vale el pozo, se decide si el WO paga.
//
// Val Nav lo llama base / wedge / total: el caso base, el incremento sobre él,
// y la suma. Se adopta esa nomenclatura porque quien venga de esas
// herramientas la reconoce.
//
// Los dos escenarios tienen que estar calculados. Se restan mes a mes y se
// valúa la diferencia, con la MISMA fecha base para los dos: si cada uno se
// descontara a su propio primer flujo, el incremento no significaría nada.

export const maxDuration = 120

const MCF_POR_BOE = 6

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const idTotal = Number(req.nextUrl.searchParams.get('escenario_id'))
  const idBase = Number(req.nextUrl.searchParams.get('base_id'))
  const tasa = Number(req.nextUrl.searchParams.get('tasa') ?? 0.10)

  if (!Number.isFinite(idTotal) || !Number.isFinite(idBase)) {
    return NextResponse.json({ error: 'Faltan escenario_id (el caso con la intervención) y base_id (el caso sin ella)' }, { status: 400 })
  }
  if (idTotal === idBase) {
    return NextResponse.json({ error: 'Los dos escenarios son el mismo: el incremento sería cero.' }, { status: 400 })
  }
  if (!Number.isFinite(tasa) || tasa <= -1 || tasa > 10) {
    return NextResponse.json({ error: 'tasa inválida' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  try {
    const [escenarios, filas] = await Promise.all([
      traerTodo<any>(() => db.from('escenarios').select('id, nombre').in('id', [idTotal, idBase]).order('id')),
      traerTodo<any>(() => db.from('cashflow_mensual')
        .select('escenario_id, fecha, cash_flow_neto_usd, capex_usd, participacion_pct, bbl_petroleo, mcf_gas, ingreso_bruto_usd')
        .in('escenario_id', [idTotal, idBase]).order('fecha')),
    ])

    const nombre = new Map<number, string>(escenarios.map(e => [e.id, e.nombre]))
    const deTotal = filas.filter(f => f.escenario_id === idTotal)
    const deBase = filas.filter(f => f.escenario_id === idBase)

    const faltan = [
      deTotal.length === 0 ? `"${nombre.get(idTotal) ?? idTotal}"` : null,
      deBase.length === 0 ? `"${nombre.get(idBase) ?? idBase}"` : null,
    ].filter(Boolean)
    if (faltan.length > 0) {
      return NextResponse.json({ error: `Falta correr el cálculo de ${faltan.join(' y ')}.` }, { status: 400 })
    }

    // Fecha base común a los dos, para que la resta tenga sentido.
    const fechaBase = filas.reduce((a, f) => (String(f.fecha) < a ? String(f.fecha) : a), String(filas[0].fecha))

    const mensual = (rows: any[]) => {
      const m = new Map<string, number>()
      for (const r of rows) m.set(String(r.fecha), (m.get(String(r.fecha)) ?? 0) + Number(r.cash_flow_neto_usd))
      return m
    }
    const mTotal = mensual(deTotal), mBase = mensual(deBase)
    const meses = [...new Set([...mTotal.keys(), ...mBase.keys()])].sort()

    // El wedge: mes a mes, lo que agrega el caso con la intervención.
    const wedge = meses.map(fecha => ({
      fecha,
      cash_flow_neto_usd: (mTotal.get(fecha) ?? 0) - (mBase.get(fecha) ?? 0),
    }))

    const mesesEntre = (a: string, b: string) => {
      const x = new Date(a.slice(0, 7) + '-01T00:00:00Z'), y = new Date(b.slice(0, 7) + '-01T00:00:00Z')
      return (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + (y.getUTCMonth() - x.getUTCMonth())
    }
    const porAnio = new Map<number, number>()
    for (const f of wedge) {
      const i = Math.floor(mesesEntre(fechaBase, f.fecha) / 12)
      porAnio.set(i, (porAnio.get(i) ?? 0) + f.cash_flow_neto_usd)
    }
    const serie = Array.from({ length: Math.max(0, ...porAnio.keys()) + 1 }, (_, i) => porAnio.get(i) ?? 0)

    let acum = 0, payback: number | null = null
    for (let i = 0; i < serie.length; i++) {
      const previo = acum
      acum += serie[i]
      if (acum >= 0) { payback = i + (serie[i] !== 0 ? Math.min(1, Math.max(0, -previo / serie[i])) : 0); break }
    }

    const agregado = (rows: any[]) => {
      const w = (r: any) => Number(r.participacion_pct ?? 1)
      const bbl = rows.reduce((s, r) => s + Number(r.bbl_petroleo) * w(r), 0)
      const mcf = rows.reduce((s, r) => s + Number(r.mcf_gas) * w(r), 0)
      return {
        npv_usd: calcularNPV(rows.map(r => ({ fecha: String(r.fecha), cash_flow_neto_usd: Number(r.cash_flow_neto_usd) })), tasa, fechaBase),
        capex_usd: rows.reduce((s, r) => s + Number(r.capex_usd) * w(r), 0),
        ingresos_usd: rows.reduce((s, r) => s + Number(r.ingreso_bruto_usd) * w(r), 0),
        eur_boe: bbl + mcf / MCF_POR_BOE,
      }
    }
    const aTotal = agregado(deTotal), aBase = agregado(deBase)
    const irr = irrAnual(serie)

    return NextResponse.json({
      base: { id: idBase, nombre: nombre.get(idBase) ?? `#${idBase}`, ...aBase },
      total: { id: idTotal, nombre: nombre.get(idTotal) ?? `#${idTotal}`, ...aTotal },
      wedge: {
        npv_usd: aTotal.npv_usd - aBase.npv_usd,
        capex_usd: aTotal.capex_usd - aBase.capex_usd,
        ingresos_usd: aTotal.ingresos_usd - aBase.ingresos_usd,
        eur_boe: aTotal.eur_boe - aBase.eur_boe,
        // TIR y payback DEL INCREMENTO: sobre el flujo diferencial, que es lo
        // que responde si la intervención paga por sí sola.
        irr_pct: irr === null ? null : irr * 100,
        payback_anios: payback,
        npv_por_tasa: TASAS_NI_51_101.map(t => ({ tasa: t, npv_usd: calcularNPV(wedge, t, fechaBase) })),
      },
      fecha_base_descuento: fechaBase,
      tasa_descuento: tasa,
      flujo_anual: serie.map((neto, i) => ({ anio: Number(fechaBase.slice(0, 4)) + i, neto_usd: neto })),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

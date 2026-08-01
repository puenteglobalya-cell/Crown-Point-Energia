import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo, calcularNPV, TASAS_NI_51_101 } from '@/lib/reservas/engine'

// ─── Consolidado por proyecto ────────────────────────────────────────────
// El consolidado de la empresa es, por definición del cliente, la SUMA de los
// proyectos. Para cada proyecto se toma su escenario base ya calculado, se le
// suman los costos de nivel proyecto (el precio de compra del área, un bono de
// firma, un compromiso exploratorio) y se valúa.
//
// Los costos de proyecto son lo que decide un negocio nuevo: un área puede
// tener un VAN operativo excelente y aun así no cerrar al precio que piden.
// Por eso se informan las dos cosas — VAN antes y después del costo de entrada.
//
// Todos los proyectos se descuentan a la MISMA fecha base, si no la suma no
// tiene sentido.

export const maxDuration = 120

type Flujo = { fecha: string; monto: number }

function npvA(flujos: Flujo[], tasa: number, base: string) {
  return calcularNPV(
    flujos.map(f => ({ fecha: f.fecha, cash_flow_neto_usd: f.monto })),
    tasa, base,
  )
}

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tasa = Number(req.nextUrl.searchParams.get('tasa') ?? 0.10)
  if (!Number.isFinite(tasa) || tasa <= -1 || tasa > 10) {
    return NextResponse.json({ error: 'tasa inválida' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  try {
    const [proyectos, escenarios, costos] = await Promise.all([
      traerTodo<any>(() => db.from('proyectos').select('*').order('id')),
      traerTodo<any>(() => db.from('escenarios').select('*').order('id')),
      traerTodo<any>(() => db.from('costos_proyecto').select('*').order('id')),
    ])

    if (proyectos.length === 0) {
      return NextResponse.json({
        proyectos: [], total: null,
        aviso: 'No hay proyectos cargados. Creá uno en "Cargar datos → Proyecto" y asignale escenarios.',
      })
    }

    const incluidos = proyectos.filter(p => p.incluir_en_consolidado)

    // Escenario base de cada proyecto
    const baseDe = new Map<number, any>()
    for (const p of incluidos) {
      const delProyecto = escenarios.filter(e => e.proyecto_id === p.id)
      baseDe.set(p.id, delProyecto.find(e => e.es_base) ?? delProyecto[0] ?? null)
    }

    const escenarioIds = [...baseDe.values()].filter(Boolean).map(e => e.id)
    // Un solo barrido de cashflow para todos los escenarios base.
    const cashflows = escenarioIds.length === 0 ? [] : await traerTodo<any>(() => db
      .from('cashflow_mensual')
      .select('escenario_id, fecha, cash_flow_neto_usd, capex_usd, participacion_pct, ingreso_bruto_usd')
      .in('escenario_id', escenarioIds)
      .order('id'))

    const porEscenario = new Map<number, any[]>()
    for (const cf of cashflows) {
      const arr = porEscenario.get(cf.escenario_id) ?? []
      arr.push(cf)
      porEscenario.set(cf.escenario_id, arr)
    }

    // Fecha base común: el primer mes de flujo de todo el conjunto, o el primer
    // costo de proyecto si es anterior (una compra de área suele pagarse antes
    // de que el activo produzca).
    const fechas = [
      ...cashflows.map(c => String(c.fecha)),
      ...costos.map(c => String(c.fecha)),
    ].sort()
    const fechaBase = fechas[0] ?? new Date().toISOString().slice(0, 10)

    const detalle = incluidos.map(p => {
      const esc = baseDe.get(p.id)
      const filas = esc ? (porEscenario.get(esc.id) ?? []) : []

      // Flujo operativo neto a CPE, tal cual lo calculó el motor
      const operativo: Flujo[] = filas.map(f => ({ fecha: String(f.fecha), monto: Number(f.cash_flow_neto_usd) }))

      // Costos de nivel proyecto: los del proyecto sin escenario, más los del
      // escenario base específicamente.
      const delProyecto = costos.filter(c =>
        c.proyecto_id === p.id && (c.escenario_id == null || (esc && c.escenario_id === esc.id)))

      const entrada: Flujo[] = delProyecto.map(c => {
        // Si el monto está al 100%, se netea con la participación vigente en
        // esa fecha dentro del escenario; si no, es lo que paga CPE.
        let monto = Number(c.monto_usd)
        if (c.aplicar_participacion) {
          const cercana = filas
            .filter(f => String(f.fecha) <= String(c.fecha))
            .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0]
            ?? filas[0]
          monto = monto * Number(cercana?.participacion_pct ?? 1)
        }
        return { fecha: String(c.fecha), monto: -Math.abs(monto) }
      })

      const npvOperativo = npvA(operativo, tasa, fechaBase)
      const npvEntrada = npvA(entrada, tasa, fechaBase)
      const capexOperativo = filas.reduce((s, f) => s + Number(f.capex_usd) * Number(f.participacion_pct ?? 1), 0)
      const costoEntrada = entrada.reduce((s, f) => s + f.monto, 0)

      return {
        proyecto_id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        escenario: esc ? { id: esc.id, nombre: esc.nombre } : null,
        sin_resultados: !esc || filas.length === 0,
        meses: filas.length,
        npv_operativo_usd: npvOperativo,
        npv_costos_entrada_usd: npvEntrada,
        npv_total_usd: npvOperativo + npvEntrada,
        capex_desarrollo_usd: capexOperativo,
        costo_entrada_usd: costoEntrada,
        ingresos_totales_usd: filas.reduce((s, f) => s + Number(f.ingreso_bruto_usd) * Number(f.participacion_pct ?? 1), 0),
        costos: delProyecto.map(c => ({
          concepto: c.concepto, tipo: c.tipo, fecha: String(c.fecha),
          monto_usd: Number(c.monto_usd), aplicar_participacion: c.aplicar_participacion,
        })),
        flujos: [...operativo, ...entrada],
      }
    })

    // Total: la suma de todos los flujos, valuada a las cinco tasas de NI 51-101
    const todos: Flujo[] = detalle.flatMap(d => d.flujos)
    const total = {
      proyectos: detalle.length,
      con_resultados: detalle.filter(d => !d.sin_resultados).length,
      fecha_base_descuento: fechaBase,
      npv_operativo_usd: detalle.reduce((s, d) => s + d.npv_operativo_usd, 0),
      npv_costos_entrada_usd: detalle.reduce((s, d) => s + d.npv_costos_entrada_usd, 0),
      npv_total_usd: detalle.reduce((s, d) => s + d.npv_total_usd, 0),
      capex_desarrollo_usd: detalle.reduce((s, d) => s + d.capex_desarrollo_usd, 0),
      costo_entrada_usd: detalle.reduce((s, d) => s + d.costo_entrada_usd, 0),
      npv_por_tasa: TASAS_NI_51_101.map(t => ({ tasa: t, npv_usd: npvA(todos, t, fechaBase) })),
    }

    return NextResponse.json({
      tasa_descuento: tasa,
      fecha_base_descuento: fechaBase,
      proyectos: detalle.map(({ flujos, ...resto }) => resto),
      total,
      excluidos: proyectos.filter(p => !p.incluir_en_consolidado).map(p => p.nombre),
      aviso: null,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

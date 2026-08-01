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

function mesMas(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 7) + '-01T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

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
    const [proyectos, escenarios, costos, corporativos, deuda, ganancias] = await Promise.all([
      traerTodo<any>(() => db.from('proyectos').select('*').order('id')),
      traerTodo<any>(() => db.from('escenarios').select('*').order('id')),
      traerTodo<any>(() => db.from('costos_proyecto').select('*').order('id')),
      // Tablas opcionales: si la migración no corrió, el consolidado sigue
      // siendo suma de proyectos en lugar de romperse.
      traerTodo<any>(() => db.from('costos_corporativos').select('*').order('id')).catch(() => [] as any[]),
      traerTodo<any>(() => db.from('deuda_notas').select('*').order('id')).catch(() => [] as any[]),
      traerTodo<any>(() => db.from('parametros_impuesto_ganancias').select('*').eq('nivel', 'consolidado').order('id')).catch(() => [] as any[]),
    ])

    const alicuota = Number(ganancias[ganancias.length - 1]?.alicuota ?? 0.35)

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

      const entrada: Flujo[] = []
      const escudos: Flujo[] = []
      for (const c of delProyecto) {
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
        monto = Math.abs(monto)
        entrada.push({ fecha: String(c.fecha), monto: -monto })

        // Escudo fiscal: si el desembolso se amortiza contra ganancias, cada
        // cuota de amortización ahorra impuesto a la alícuota vigente. En una
        // compra de área grande no es menor, y antes se ignoraba: el costo se
        // trataba como salida de caja pura.
        const meses = Number(c.amortizable_meses ?? 0)
        if (meses > 0) {
          const ahorroMensual = (monto / meses) * alicuota
          for (let k = 0; k < meses; k++) escudos.push({ fecha: mesMas(String(c.fecha), k), monto: ahorroMensual })
        }
      }

      const npvOperativo = npvA(operativo, tasa, fechaBase)
      const npvEntrada = npvA(entrada, tasa, fechaBase)
      const npvEscudo = npvA(escudos, tasa, fechaBase)
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
        npv_escudo_fiscal_usd: npvEscudo,
        npv_total_usd: npvOperativo + npvEntrada + npvEscudo,
        capex_desarrollo_usd: capexOperativo,
        costo_entrada_usd: costoEntrada,
        ingresos_totales_usd: filas.reduce((s, f) => s + Number(f.ingreso_bruto_usd) * Number(f.participacion_pct ?? 1), 0),
        costos: delProyecto.map(c => ({
          concepto: c.concepto, tipo: c.tipo, fecha: String(c.fecha),
          monto_usd: Number(c.monto_usd), aplicar_participacion: c.aplicar_participacion,
        })),
        flujos: [...operativo, ...entrada, ...escudos],
      }
    })

    // ─── Capa corporativa ───
    // G&A de estructura e intereses de deuda no pertenecen a ningún proyecto.
    // La suma de proyectos menos esta capa es el valor de empresa.
    const ultimoMes = [...cashflows.map(c => String(c.fecha))].sort().pop() ?? fechaBase

    const gastosCorp: Flujo[] = []
    for (const c of corporativos) {
      const hasta = c.fecha_hasta ? String(c.fecha_hasta) : ultimoMes
      const neto = Number(c.monto_usd_mes) * (c.deducible ? (1 - alicuota) : 1)
      for (let k = 0; k <= 600; k++) {
        const f = mesMas(String(c.fecha_desde), k)
        if (f > hasta) break
        gastosCorp.push({ fecha: f, monto: -neto })
      }
    }

    // Intereses derivados de deuda_notas: saldo x tasa / 12, desde la fecha de
    // corte hasta el vencimiento. No se cargan a mano para que no queden
    // desactualizados respecto del saldo.
    const intereses: Flujo[] = []
    for (const d of deuda) {
      const saldo = Number(d.saldo_usd_mm ?? 0) * 1e6
      const tasaAnual = Number(d.tasa_interes_pct ?? 0) / 100
      if (!(saldo > 0) || !(tasaAnual > 0)) continue
      const hasta = d.fecha_vencimiento ? String(d.fecha_vencimiento) : ultimoMes
      const mensual = (saldo * tasaAnual / 12) * (1 - alicuota)
      for (let k = 0; k <= 600; k++) {
        const f = mesMas(String(d.fecha_corte), k)
        if (f > hasta) break
        intereses.push({ fecha: f, monto: -mensual })
      }
    }

    const npvCorp = npvA(gastosCorp, tasa, fechaBase)
    const npvIntereses = npvA(intereses, tasa, fechaBase)

    // Total: la suma de todos los flujos, valuada a las cinco tasas de NI 51-101
    const todos: Flujo[] = [...detalle.flatMap(d => d.flujos), ...gastosCorp, ...intereses]
    const total = {
      proyectos: detalle.length,
      con_resultados: detalle.filter(d => !d.sin_resultados).length,
      fecha_base_descuento: fechaBase,
      npv_operativo_usd: detalle.reduce((s, d) => s + d.npv_operativo_usd, 0),
      npv_costos_entrada_usd: detalle.reduce((s, d) => s + d.npv_costos_entrada_usd, 0),
      npv_escudo_fiscal_usd: detalle.reduce((s, d) => s + d.npv_escudo_fiscal_usd, 0),
      npv_proyectos_usd: detalle.reduce((s, d) => s + d.npv_total_usd, 0),
      npv_g_and_a_usd: npvCorp,
      npv_intereses_deuda_usd: npvIntereses,
      // Valor de empresa: la suma de los proyectos menos la capa corporativa.
      npv_total_usd: detalle.reduce((s, d) => s + d.npv_total_usd, 0) + npvCorp + npvIntereses,
      capex_desarrollo_usd: detalle.reduce((s, d) => s + d.capex_desarrollo_usd, 0),
      costo_entrada_usd: detalle.reduce((s, d) => s + d.costo_entrada_usd, 0),
      npv_por_tasa: TASAS_NI_51_101.map(t => ({ tasa: t, npv_usd: npvA(todos, t, fechaBase) })),
    }

    return NextResponse.json({
      tasa_descuento: tasa,
      fecha_base_descuento: fechaBase,
      proyectos: detalle.map(({ flujos, ...resto }) => resto),
      total,
      alicuota_ganancias: alicuota,
      capa_corporativa: {
        conceptos: corporativos.map((c: any) => ({ concepto: c.concepto, tipo: c.tipo, monto_usd_mes: Number(c.monto_usd_mes), deducible: c.deducible })),
        series_deuda: deuda.filter((d: any) => Number(d.saldo_usd_mm) > 0).map((d: any) => ({
          serie: d.serie, saldo_usd: Number(d.saldo_usd_mm) * 1e6, tasa_pct: Number(d.tasa_interes_pct ?? 0),
        })),
      },
      excluidos: proyectos.filter(p => !p.incluir_en_consolidado).map(p => p.nombre),
      aviso: null,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

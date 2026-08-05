import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { cargarContexto, calcularEscenario, calcularNPV, irrAnual, HORIZONTE_MESES_MAX } from '@/lib/reservas/engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MCF_POR_BOE = 6

// ─── Razonabilidad de actividad por pozo tipo ────────────────────────────
// Corre el motor real (mismos precios, regalías, OPEX del escenario) contra
// UN pozo virtual aislado por cada pozo tipo de drilling/workover/pulling
// (no "básico" -- ese es el agregado de campo, no una actividad a evaluar),
// igual que hace vida-economica, pero devuelve además precio de venta
// tomado, volumen de los primeros 5 años, costo por boe y VAN/TIR/repago --
// para poder mirar de un vistazo si la actividad parametrizada así tiene
// sentido económico, sin tener que abrir el cashflow mes a mes.
export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  const tasa = Number(req.nextUrl.searchParams.get('tasa') ?? 0.10)
  const fecha = req.nextUrl.searchParams.get('fecha') ?? new Date().toISOString().slice(0, 10)
  if (!Number.isFinite(escenarioId)) return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  try {
    const { data: pozosTipo, error: e1 } = await db
      .from('pozos_tipo')
      .select('id, nombre, categoria, yacimiento_id')
      .neq('categoria', 'basico')
      .order('nombre')
    if (e1) throw new Error(e1.message)

    const { data: concesiones, error: e2 } = await db
      .from('concesiones').select('id, yacimiento_id').order('id')
    if (e2) throw new Error(e2.message)
    const concesionPorYacimiento = new Map<number, number>()
    for (const c of concesiones ?? []) {
      if (!concesionPorYacimiento.has(c.yacimiento_id)) concesionPorYacimiento.set(c.yacimiento_id, c.id)
    }

    const { data: curvas, error: e3 } = await db
      .from('curvas_produccion').select('pozo_tipo_id')
    if (e3) throw new Error(e3.message)
    const conCurva = new Set((curvas ?? []).map(c => c.pozo_tipo_id))

    const ctxReal = await cargarContexto(escenarioId)

    const actividades = [] as any[]
    for (const pt of pozosTipo ?? []) {
      const concesionId = concesionPorYacimiento.get(pt.yacimiento_id)
      if (!concesionId) continue
      if (!conCurva.has(pt.id)) {
        actividades.push({ pozo_tipo_id: pt.id, nombre: pt.nombre, categoria: pt.categoria, sin_curva: true })
        continue
      }

      const ctxAislado = {
        ...ctxReal,
        pozos: [] as any[],
        intervencionesRaw: [{
          id: -1, pozo_id: null, concesion_id: concesionId, tipo: 'perforacion',
          fecha, capex_usd: 0, vida_util_meses: null, pozo_tipo_id: pt.id,
          fecha_inicio_perforacion: null,
        }] as any[],
      }
      const resultado = await calcularEscenario(escenarioId, HORIZONTE_MESES_MAX, { contexto: ctxAislado, persistir: false })
      const filas = resultado.filas as unknown as any[]
      if (filas.length === 0) {
        actividades.push({ pozo_tipo_id: pt.id, nombre: pt.nombre, categoria: pt.categoria, sin_produccion: true })
        continue
      }

      const fechaBase = filas[0].fecha
      const flujos = filas.map(f => ({ fecha: String(f.fecha), cash_flow_neto_usd: Number(f.cash_flow_neto_usd) }))
      const serie: number[] = []
      for (const f of filas) {
        const idx = Math.floor((new Date(String(f.fecha).slice(0, 7) + '-01T00:00:00Z').getTime() -
          new Date(String(fechaBase).slice(0, 7) + '-01T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24 * 30.4368) / 12)
        serie[idx] = (serie[idx] ?? 0) + Number(f.cash_flow_neto_usd)
      }
      for (let i = 0; i < serie.length; i++) serie[i] = serie[i] ?? 0

      let acum = 0, payback: number | null = null
      for (let i = 0; i < serie.length; i++) {
        const previo = acum
        acum += serie[i]
        if (acum >= 0) { payback = i + (serie[i] !== 0 ? Math.min(1, Math.max(0, -previo / serie[i])) : 0); break }
      }

      const primeros5 = filas.slice(0, 60)
      const bblPrimeros5 = primeros5.reduce((s, f) => s + Number(f.bbl_petroleo), 0)
      const volumenPorAnio = Array.from({ length: 5 }, (_, y) =>
        primeros5.slice(y * 12, y * 12 + 12).reduce((s, f) => s + Number(f.bbl_petroleo), 0))

      const bbl = filas.reduce((s, f) => s + Number(f.bbl_petroleo), 0)
      const mcf = filas.reduce((s, f) => s + Number(f.mcf_gas), 0)
      const boe = bbl + mcf / MCF_POR_BOE
      const ingresos = filas.reduce((s, f) => s + Number(f.ingreso_bruto_usd), 0)
      const opex = filas.reduce((s, f) => s + Number(f.opex_fijo_usd) + Number(f.opex_variable_usd) + Number(f.opex_fijo_pozo_usd), 0)
      const capex = filas.reduce((s, f) => s + Number(f.capex_usd), 0)
      const precioPromedio = bbl > 0 ? ingresos / bbl : null
      const costoBoe = boe > 0 ? opex / boe : null
      const cortado = resultado.diagnosticos.some((d: any) => d.tipo === 'corte_limite_economico')

      actividades.push({
        pozo_tipo_id: pt.id,
        nombre: pt.nombre,
        categoria: pt.categoria,
        precio_venta_usd_bbl: precioPromedio,
        volumen_bbl_primeros_5_anios: volumenPorAnio,
        volumen_bbl_5_anios_total: bblPrimeros5,
        costo_usd_boe: costoBoe,
        capex_usd: capex,
        npv_usd: calcularNPV(flujos, tasa, fechaBase),
        irr_pct: (() => { const r = irrAnual(serie); return r === null ? null : r * 100 })(),
        payback_anios: payback,
        cortado_por_limite: cortado,
        meses_vida: filas.length,
      })
    }

    const { data: intervenciones, error: e4 } = await db
      .from('intervenciones').select('tipo, fecha, capex_usd')
      .or(`escenario_id.eq.${escenarioId},escenario_id.is.null`)
    if (e4) throw new Error(e4.message)

    const porAnio = new Map<number, { anio: number; perforacion: number; workover: number; pulling: number; facilities: number; capex_usd: number }>()
    for (const iv of intervenciones ?? []) {
      const anio = Number(String(iv.fecha).slice(0, 4))
      const fila = porAnio.get(anio) ?? { anio, perforacion: 0, workover: 0, pulling: 0, facilities: 0, capex_usd: 0 }
      fila[iv.tipo as 'perforacion' | 'workover' | 'pulling' | 'facilities'] += 1
      fila.capex_usd += Number(iv.capex_usd)
      porAnio.set(anio, fila)
    }
    const resumenAnual = [...porAnio.values()].sort((a, b) => a.anio - b.anio)

    return NextResponse.json({ tasa_descuento: tasa, fecha_evaluada: fecha, actividades, resumen_anual: resumenAnual })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

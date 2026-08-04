import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

// Reparte un OPEX fijo consolidado (una sola cifra para toda la operación,
// sin apertura por concesión) entre las concesiones existentes, con un mix
// ponderado de cantidad de pozos activos y producción de petróleo del año 1
// de cada yacimiento — pesoPozos = 1 es 100% por pozos, 0 es 100% por
// producción, 0.5 es mitad y mitad. La concesión tiene que existir de antes,
// con el mismo nombre que el yacimiento.
type ItemReparto = { yacimiento: string; pozos: number }

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { montoTotal, fechaDesde, concepto, reparto: repartoIn, pesoPozos = 0.5 } = await req.json() as {
    montoTotal: number; fechaDesde: string; concepto?: string; reparto: ItemReparto[]; pesoPozos?: number
  }
  if (!Number.isFinite(montoTotal) || montoTotal <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  if (!fechaDesde) return NextResponse.json({ error: 'Falta la fecha' }, { status: 400 })
  if (!Array.isArray(repartoIn) || repartoIn.length === 0) return NextResponse.json({ error: 'Falta la cantidad de pozos por yacimiento' }, { status: 400 })

  const totalPozos = repartoIn.reduce((s, r) => s + (Number(r.pozos) || 0), 0)
  if (totalPozos === 0) return NextResponse.json({ error: 'La cantidad de pozos no puede ser toda cero' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const [{ data: concesiones }, { data: yacimientos }, { data: pozosTipo }, { data: curvas }] = await Promise.all([
    db.from('concesiones').select('id, nombre'),
    db.from('yacimientos').select('id, nombre'),
    db.from('pozos_tipo').select('id, yacimiento_id'),
    db.from('curvas_produccion').select('pozo_tipo_id, mes_offset, bbl_petroleo').not('pozo_tipo_id', 'is', null).lt('mes_offset', 12),
  ])

  const bblAnio1PorYacimiento = new Map<number, number>()
  for (const c of curvas ?? []) {
    const pt = (pozosTipo ?? []).find(p => p.id === c.pozo_tipo_id)
    if (!pt?.yacimiento_id) continue
    bblAnio1PorYacimiento.set(pt.yacimiento_id, (bblAnio1PorYacimiento.get(pt.yacimiento_id) ?? 0) + Number(c.bbl_petroleo ?? 0))
  }
  const bblPorNombre = new Map<string, number>()
  for (const [yacId, bbl] of bblAnio1PorYacimiento) {
    const yac = (yacimientos ?? []).find(y => y.id === yacId)
    if (yac) bblPorNombre.set(yac.nombre, bbl)
  }
  const totalBbl = [...bblPorNombre.values()].reduce((a, b) => a + b, 0)
  const hayProduccion = totalBbl > 0 && repartoIn.every(r => bblPorNombre.has(r.yacimiento))
  const peso = hayProduccion ? Math.min(1, Math.max(0, pesoPozos)) : 1

  const reparto: { yacimiento: string; pozos: number; bbl: number; pct: number; monto: number }[] = []
  const errores: string[] = []

  for (const item of repartoIn) {
    const pozos = Number(item.pozos) || 0
    if (pozos === 0) continue
    const conc = (concesiones ?? []).find(c => c.nombre === item.yacimiento)
    if (!conc) { errores.push(`No existe la concesión "${item.yacimiento}" — cargala primero`); continue }

    const pctPozos = pozos / totalPozos
    const bbl = bblPorNombre.get(item.yacimiento) ?? 0
    const pctProduccion = hayProduccion ? bbl / totalBbl : pctPozos
    const pct = peso * pctPozos + (1 - peso) * pctProduccion
    const monto = Math.round(montoTotal * pct)
    reparto.push({ yacimiento: item.yacimiento, pozos, bbl, pct, monto })

    const { data: existente } = await db.from('opex_fijo').select('id').eq('concesion_id', conc.id).eq('fecha_desde', fechaDesde).maybeSingle()
    if (existente) continue
    const { error } = await db.from('opex_fijo').insert({
      concesion_id: conc.id, fecha_desde: fechaDesde, monto_usd_mes: monto,
      concepto: concepto || `Prorrateado ${Math.round(peso * 100)}% pozos / ${Math.round((1 - peso) * 100)}% producción desde OPEX consolidado`,
    })
    if (error) errores.push(`${item.yacimiento}: ${error.message}`)
  }

  if (!hayProduccion) errores.push('Faltan curvas de producción para algún yacimiento — se repartió 100% por cantidad de pozos.')

  return NextResponse.json({ ok: true, reparto, errores, pesoUsado: peso })
}

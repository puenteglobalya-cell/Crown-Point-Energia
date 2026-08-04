import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

// Reparte un OPEX fijo consolidado (una sola cifra para toda la operación,
// sin apertura por concesión) entre las concesiones existentes, proporcional
// a la cantidad de pozos activos que el usuario indica para cada yacimiento
// — la concesión tiene que existir de antes, con el mismo nombre que el
// yacimiento.
type ItemReparto = { yacimiento: string; pozos: number }

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { montoTotal, fechaDesde, concepto, reparto: repartoIn } = await req.json() as {
    montoTotal: number; fechaDesde: string; concepto?: string; reparto: ItemReparto[]
  }
  if (!Number.isFinite(montoTotal) || montoTotal <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  if (!fechaDesde) return NextResponse.json({ error: 'Falta la fecha' }, { status: 400 })
  if (!Array.isArray(repartoIn) || repartoIn.length === 0) return NextResponse.json({ error: 'Falta la cantidad de pozos por yacimiento' }, { status: 400 })

  const totalPozos = repartoIn.reduce((s, r) => s + (Number(r.pozos) || 0), 0)
  if (totalPozos === 0) return NextResponse.json({ error: 'La cantidad de pozos no puede ser toda cero' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data: concesiones } = await db.from('concesiones').select('id, nombre')

  const reparto: { yacimiento: string; pozos: number; pct: number; monto: number }[] = []
  const errores: string[] = []

  for (const item of repartoIn) {
    const pozos = Number(item.pozos) || 0
    if (pozos === 0) continue
    const conc = (concesiones ?? []).find(c => c.nombre === item.yacimiento)
    if (!conc) { errores.push(`No existe la concesión "${item.yacimiento}" — cargala primero`); continue }
    const pct = pozos / totalPozos
    const monto = Math.round(montoTotal * pct)
    reparto.push({ yacimiento: item.yacimiento, pozos, pct, monto })

    const { data: existente } = await db.from('opex_fijo').select('id').eq('concesion_id', conc.id).eq('fecha_desde', fechaDesde).maybeSingle()
    if (existente) continue
    const { error } = await db.from('opex_fijo').insert({
      concesion_id: conc.id, fecha_desde: fechaDesde, monto_usd_mes: monto,
      concepto: concepto || 'Prorrateado por cantidad de pozos desde OPEX consolidado',
    })
    if (error) errores.push(`${item.yacimiento}: ${error.message}`)
  }

  return NextResponse.json({ ok: true, reparto, errores })
}

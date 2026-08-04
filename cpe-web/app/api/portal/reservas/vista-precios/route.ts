import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'

export const dynamic = 'force-dynamic'

// Vista de sólo lectura: mes a mes, cómo se llega del precio de referencia
// (Brent/Henry Hub) al precio neto — para poder mirar la planilla y decir
// "esto está bien" en vez de tener que confiar en campos sueltos. Usa la
// misma fórmula que el motor (lib/reservas/engine.ts precioEn), pero acá se
// recalcula standalone porque esto es sólo una previsualización, no corre
// contra un escenario ni un pozo.
type Fila = { mes: string; referencia: number; descuentoFijo: number; ddePct: number; divisor: number; extra: number; precioNeto: number }

function ddePctEn(f: any, referencia: number): number {
  if (f.aplicar_dde === false) return 0
  if (f.dde_brent_min != null && f.dde_brent_max != null) {
    if (referencia <= f.dde_brent_min) return f.dde_pct_min ?? 0
    if (referencia >= f.dde_brent_max) return f.dde_pct_max ?? 0
    return (f.dde_pct_min ?? 0) + ((f.dde_pct_max ?? 0) - (f.dde_pct_min ?? 0))
      * (referencia - f.dde_brent_min) / (f.dde_brent_max - f.dde_brent_min)
  }
  return f.dde_pct ?? 0
}

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const priceDeckId = Number(req.nextUrl.searchParams.get('price_deck_id'))
  if (!Number.isFinite(priceDeckId)) return NextResponse.json({ error: 'price_deck_id inválido' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const [{ data: puntos }, { data: formulas }, { data: deck }] = await Promise.all([
    db.from('price_deck_puntos').select('*').eq('price_deck_id', priceDeckId).order('anio'),
    db.from('formulas_precio').select('*'),
    db.from('price_decks').select('*').eq('id', priceDeckId).maybeSingle(),
  ])

  const resultado: Record<'petroleo' | 'gas', Fila[]> = { petroleo: [], gas: [] }
  const refPorProducto = { petroleo: 'brent', gas: 'henry_hub' } as const

  for (const producto of ['petroleo', 'gas'] as const) {
    const referencia = refPorProducto[producto]
    const puntosRef = (puntos ?? []).filter(p => p.referencia === referencia).sort((a, b) => (Number(a.anio) * 12 + Number(a.mes ?? 1)) - (Number(b.anio) * 12 + Number(b.mes ?? 1)))
    if (puntosRef.length === 0) continue
    const formula = (formulas ?? []).find(f => f.producto === producto)
    if (!formula) continue

    for (const p of puntosRef) {
      const mesNum = p.mes ?? 1
      const referenciaUsd = Number(p.precio_usd)
      const descuentoFijo = formula.descuento_fijo_usd ?? 0
      const ddePct = ddePctEn(formula, referenciaUsd)
      const divisor = formula.divisor || 1
      const extra = formula.descuento_adicional_usd ?? 0
      const precioNeto = ((referenciaUsd + descuentoFijo) * (1 - ddePct / 100)) / divisor + extra
      resultado[producto].push({
        mes: `${p.anio}-${String(mesNum).padStart(2, '0')}`,
        referencia: referenciaUsd, descuentoFijo, ddePct, divisor, extra, precioNeto,
      })
    }
  }

  return NextResponse.json({ deck: deck?.nombre ?? null, escalacion_anual: deck?.escalacion_anual ?? 0, ...resultado })
}

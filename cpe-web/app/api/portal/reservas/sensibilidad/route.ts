import { NextRequest, NextResponse } from 'next/server'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'
import { cargarContexto, calcularEscenario, calcularNPV, type Multiplicadores } from '@/lib/reservas/engine'

// ─── Sensibilidad (tornado) ──────────────────────────────────────────────
// Mueve una variable por vez hacia arriba y hacia abajo, corre el motor con
// cada valor y mide el impacto en el VAN. Ordenado por magnitud es el tornado
// clásico: muestra de un vistazo qué supuesto conviene afinar y cuál da igual.
//
// El contexto se carga una sola vez y las corridas no escriben nada. La tasa
// de descuento se trata aparte porque no pasa por el motor: no cambia el
// flujo, cambia cómo se descuenta.

export const maxDuration = 300

const VARIABLES: { clave: keyof Multiplicadores; etiqueta: string }[] = [
  { clave: 'precioPetroleo', etiqueta: 'Precio del petróleo' },
  { clave: 'precioGas', etiqueta: 'Precio del gas' },
  { clave: 'produccion', etiqueta: 'Producción' },
  { clave: 'opex', etiqueta: 'OPEX' },
  { clave: 'capex', etiqueta: 'CAPEX' },
]

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const escenarioId = Number(body.escenario_id)
  const tasa = Number(body.tasa_anual ?? 0.10)
  const variacion = Number(body.variacion ?? 0.20)
  const horizonteAnios = Number(body.horizonte_anios ?? 20)

  if (!Number.isFinite(escenarioId)) return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  if (!Number.isFinite(variacion) || variacion <= 0 || variacion >= 1) {
    return NextResponse.json({ error: 'La variación tiene que estar entre 0 y 1 (ej. 0.20 = ±20%)' }, { status: 400 })
  }
  if (!Number.isFinite(tasa) || tasa <= -1 || tasa > 10) {
    return NextResponse.json({ error: 'tasa_anual inválida' }, { status: 400 })
  }

  try {
    const contexto = await cargarContexto(escenarioId)
    const horizonte = Math.round(horizonteAnios * 12)

    // Fecha base fija: la del caso base. Todas las variantes se descuentan
    // contra la misma fecha, si no el tornado compararía peras con manzanas.
    const base = await calcularEscenario(escenarioId, horizonte, { contexto, persistir: false })
    const flujosBase = base.cashflow as unknown as { fecha: string; cash_flow_neto_usd: number }[]
    if (flujosBase.length === 0) {
      return NextResponse.json({ error: 'El escenario no produce flujo. Corré la validación previa para ver qué falta.' }, { status: 400 })
    }
    const fechaBase = flujosBase[0].fecha
    const npvBase = calcularNPV(flujosBase, tasa, fechaBase)

    async function npvCon(m: Multiplicadores) {
      const r = await calcularEscenario(escenarioId, horizonte, { contexto, persistir: false, multiplicadores: m })
      return calcularNPV(r.cashflow as unknown as { fecha: string; cash_flow_neto_usd: number }[], tasa, fechaBase)
    }

    const barras: { variable: string; npv_abajo: number; npv_arriba: number; amplitud: number; nota?: string }[] = []

    for (const v of VARIABLES) {
      const abajo = await npvCon({ [v.clave]: 1 - variacion })
      const arriba = await npvCon({ [v.clave]: 1 + variacion })
      barras.push({
        variable: v.etiqueta,
        npv_abajo: abajo,
        npv_arriba: arriba,
        amplitud: Math.abs(arriba - abajo),
      })
    }

    // La tasa de descuento no altera el flujo, sólo el descuento: se calcula
    // sobre el mismo caso base en lugar de volver a correr el motor.
    const tasaAbajo = Math.max(tasa * (1 - variacion), 0)
    const tasaArriba = tasa * (1 + variacion)
    barras.push({
      variable: 'Tasa de descuento',
      npv_abajo: calcularNPV(flujosBase, tasaArriba, fechaBase), // más tasa = menos VAN
      npv_arriba: calcularNPV(flujosBase, tasaAbajo, fechaBase),
      amplitud: Math.abs(calcularNPV(flujosBase, tasaAbajo, fechaBase) - calcularNPV(flujosBase, tasaArriba, fechaBase)),
      nota: `${(tasaAbajo * 100).toFixed(1)}% – ${(tasaArriba * 100).toFixed(1)}%`,
    })

    barras.sort((a, b) => b.amplitud - a.amplitud)

    return NextResponse.json({
      escenario_id: escenarioId,
      tasa_descuento: tasa,
      variacion,
      fecha_base_descuento: fechaBase,
      npv_base_usd: npvBase,
      barras,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

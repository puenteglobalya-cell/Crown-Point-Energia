import { NextRequest, NextResponse } from 'next/server'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'
import { cargarContexto, calcularEscenario, HORIZONTE_MESES_MAX } from '@/lib/reservas/engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Vida económica de UN pozo tipo aislado: corre el motor real (mismos
// precios, regalías, OPEX y participación del escenario elegido) contra un
// solo pozo virtual con esa curva y sin pozo real ni CAPEX, para encontrar
// en qué mes lo corta el límite económico (2 meses seguidos de flujo
// operativo negativo) — el "primer corte" que define hasta cuándo tiene
// sentido mostrar esa curva en la grilla de cronograma.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { escenarioId, pozoTipoId, concesionId, fecha } = await req.json() as {
    escenarioId: number; pozoTipoId: number; concesionId: number; fecha: string
  }
  if (!Number.isFinite(escenarioId) || !Number.isFinite(pozoTipoId) || !Number.isFinite(concesionId) || !fecha) {
    return NextResponse.json({ error: 'Faltan escenarioId, pozoTipoId, concesionId o fecha' }, { status: 400 })
  }

  try {
    const ctxReal = await cargarContexto(escenarioId)
    const ctxAislado = {
      ...ctxReal,
      pozos: [] as any[],
      intervencionesRaw: [{
        id: -1, pozo_id: null, concesion_id: concesionId, tipo: 'perforacion',
        fecha, capex_usd: 0, vida_util_meses: null, pozo_tipo_id: pozoTipoId,
        fecha_inicio_perforacion: null,
      }] as any[],
    }
    const resultado = await calcularEscenario(escenarioId, HORIZONTE_MESES_MAX, { contexto: ctxAislado, persistir: false })
    const cortado = resultado.diagnosticos.some((d: any) => d.tipo === 'corte_limite_economico')
    return NextResponse.json({ meses: resultado.filas, cortado })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

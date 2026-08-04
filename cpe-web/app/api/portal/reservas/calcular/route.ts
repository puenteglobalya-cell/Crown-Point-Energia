import { NextRequest, NextResponse } from 'next/server'
import { requireReservasAccess } from '@/lib/reservas/access'
import {
  calcularEscenario, calcularAgregadosAnuales, calcularMetricasEscenario, calcularDepletionReservas,
  calcularNpvPorTasa, cargarContexto, hashContexto, adquirirLockEscenario, liberarLockEscenario, HORIZONTE_MESES_MAX,
} from '@/lib/reservas/engine'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const escenarioId = Number(body.escenario_id)
  const tasaAnual = Number(body.tasa_anual ?? 0.10)
  const horizonteAniosCrudo = Number(body.horizonte_anios ?? 999) // 999 = full-life por convención
  if (!Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  }
  if (!Number.isFinite(tasaAnual) || tasaAnual <= -1 || tasaAnual > 10) {
    return NextResponse.json({ error: 'tasa_anual inválida (esperado un decimal, ej. 0.10 = 10%)' }, { status: 400 })
  }
  if (!Number.isFinite(horizonteAniosCrudo) || horizonteAniosCrudo <= 0) {
    return NextResponse.json({ error: 'horizonte_anios inválido' }, { status: 400 })
  }
  // El motor nunca corre más de HORIZONTE_MESES_MAX meses (calcularEscenario
  // ya lo clampea) — "999 = full-life" es sólo una convención de la UI para
  // decir "todo lo que dé la curva", no un pedido real de correr 999 años.
  // Sin este clamp, escenario_metricas.horizonte_anios quedaba con el valor
  // crudo (ej. 999 o cualquier número que se mande) mientras la corrida real
  // cubría como mucho 20 — un dato engañoso en un registro pensado para
  // auditarse contra NI 51-101.
  const horizonteAnios = Math.min(horizonteAniosCrudo, HORIZONTE_MESES_MAX / 12)

  const db = createSupabaseServerAdminClient()
  // El pipeline completo (4 escrituras seguidas, ninguna transaccional) se
  // protege de punta a punta — no cada función suelta, porque dos clicks de
  // "Calcular" en pestañas distintas pueden intercalarse en cualquiera de
  // las 4 tablas, no solo en la primera.
  try {
    await adquirirLockEscenario(db, escenarioId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 })
  }
  try {
    // El horizonte elegido ahora recorta de verdad la corrida del motor; antes
    // se guardaba en las métricas pero el motor siempre iba a 240 meses.
    // Se carga el contexto una vez: sirve para el cálculo y para sellar la
    // corrida con la huella de los datos con los que se corrió.
    const contexto = await cargarContexto(escenarioId)
    const hashInputs = hashContexto(contexto)

    const resumen = await calcularEscenario(escenarioId, Math.round(horizonteAnios * 12), { contexto })
    const agregados = await calcularAgregadosAnuales(escenarioId)
    const metricas = await calcularMetricasEscenario(escenarioId, tasaAnual, horizonteAnios, {
      hashInputs, calculadoPor: auth.user?.email ?? undefined,
    })
    const depletion = await calcularDepletionReservas(escenarioId)
    // Tabla de VAN a 0/5/10/15/20%, antes y después de impuestos — el formato
    // que pide el Form 51-101F1 de NI 51-101.
    const npvPorTasa = await calcularNpvPorTasa(escenarioId)

    return NextResponse.json({ ...resumen, ...agregados, ...metricas, ...depletion, npv_por_tasa: npvPorTasa })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  } finally {
    await liberarLockEscenario(db, escenarioId)
  }
}

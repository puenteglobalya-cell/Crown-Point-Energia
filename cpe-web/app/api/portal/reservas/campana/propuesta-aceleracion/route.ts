import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'
import { traerTodo, cargarContexto, calcularEscenario, calcularNPV, type ContextoEscenario } from '@/lib/reservas/engine'
import { programarCampana, type PozoAProgramar } from '@/lib/reservas/cronograma'

// ─── Propuesta de aceleración de campaña ──────────────────────────────────
// El barrido de fechas (campana/barrido) contesta "¿qué mes de arranque da
// mejor VAN?". Esto contesta la pregunta de al lado, en el idioma que la
// pide el cliente: "si adelanto la campaña tantos meses, ¿cuánto CAPEX
// adicional necesito ANTES de que entre a producir, y en cuánto tiempo lo
// recupero en ingresos?" — comparando mes a mes el escenario actual contra
// el acelerado, no solo el VAN final de cada uno.
//
// Tope de equipos: con los días de perforación/terminación/movilización
// típicos de esta campaña, no entran más de 2 pozos por mes ni en el mejor
// caso — se clampea acá en vez de dejar que se pida cualquier cosa.

export const maxDuration = 120
const MAX_EQUIPOS = 2

function mesMas(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 7) + '-01T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const campanaId = Number(body.campana_id)
  const mesesAdelanto = Number(body.meses_adelanto ?? 3)
  const equiposSolicitados = Number(body.equipos ?? 2)
  const tasaAnual = Number(body.tasa_anual ?? 0.10)
  const horizonteAnios = Number(body.horizonte_anios ?? 20)

  if (!Number.isFinite(campanaId)) return NextResponse.json({ error: 'campana_id inválido' }, { status: 400 })
  if (!Number.isFinite(mesesAdelanto) || mesesAdelanto < 1) return NextResponse.json({ error: 'meses_adelanto tiene que ser al menos 1' }, { status: 400 })
  const equipos = Math.max(1, Math.min(MAX_EQUIPOS, Math.round(equiposSolicitados) || 1))

  const db = createSupabaseServerAdminClient()

  try {
    const { data: campana, error: errCampana } = await db.from('campanas').select('*').eq('id', campanaId).single()
    if (errCampana) throw new Error(errCampana.message)
    const escenarioId = campana.escenario_id
    if (escenarioId == null) throw new Error('La campaña no tiene escenario asignado.')

    const intervCampana = await traerTodo<any>(() => db
      .from('intervenciones').select('*').eq('campana_id', campanaId).order('orden').order('id'))
    if (intervCampana.length === 0) throw new Error('La campaña no tiene intervenciones asignadas.')

    const pozosRef = await traerTodo<any>(() => db.from('pozos').select('id, nombre').order('id'))
    const nombrePozo = new Map<number, string>(pozosRef.map(p => [p.id, p.nombre]))
    const aProgramar: PozoAProgramar[] = intervCampana.map((i, idx) => ({
      intervencionId: i.id,
      etiqueta: i.pozo_id != null ? (nombrePozo.get(i.pozo_id) ?? `Pozo #${i.pozo_id}`) : `${i.tipo ?? 'intervención'} #${i.id}`,
      orden: i.orden ?? idx + 1,
      diasPerforacion: i.dias_perforacion,
      diasTerminacion: i.dias_terminacion,
    }))

    const contexto = await cargarContexto(escenarioId)
    const horizonteMeses = Math.round(horizonteAnios * 12)

    async function correr(fechaInicio: string, equiposPerforacion: number) {
      const cronograma = programarCampana({
        fechaInicio,
        equiposPerforacion,
        equiposTerminacion: campana.equipos_terminacion,
        diasPerforacion: campana.dias_perforacion,
        diasTerminacion: campana.dias_terminacion,
        diasMovilizacion: campana.dias_movilizacion,
      }, aProgramar)
      const porInterv = new Map(cronograma.map(p => [p.intervencionId, p]))

      const nuevaAlta = new Map<number, string>()
      for (const i of intervCampana) {
        const p = porInterv.get(i.id)
        if (p && i.pozo_id != null && i.tipo === 'perforacion') nuevaAlta.set(i.pozo_id, p.primeraProduccion)
      }

      const ctxCandidato: ContextoEscenario = {
        ...contexto,
        intervencionesRaw: contexto.intervencionesRaw.map(i => {
          const p = porInterv.get(i.id)
          return p ? { ...i, fecha: p.primeraProduccion, fecha_inicio_perforacion: p.inicioPerforacion } : i
        }),
        pozos: contexto.pozos.map(pz => nuevaAlta.has(pz.id) ? { ...pz, fecha_alta: nuevaAlta.get(pz.id) } : pz),
      }

      const { cashflow } = await calcularEscenario(escenarioId, horizonteMeses, { contexto: ctxCandidato, persistir: false })
      return { cronograma, cashflow: cashflow as unknown as { fecha: string; ingreso_bruto_usd: number; capex_usd: number; cash_flow_neto_usd: number }[] }
    }

    const fechaBaseActual = String(campana.fecha_inicio)
    const fechaAcelerada = mesMas(fechaBaseActual, -mesesAdelanto)

    const [base, acelerado] = await Promise.all([
      correr(fechaBaseActual, campana.equipos_perforacion),
      correr(fechaAcelerada, equipos),
    ])

    // Se descuentan las dos corridas a la misma fecha (la más temprana) para
    // que la comparación de VAN no premie artificialmente a la que arranca
    // después por tener menos meses de descuento.
    const fechaDescuento = fechaAcelerada < fechaBaseActual ? fechaAcelerada : fechaBaseActual
    const npvBase = calcularNPV(base.cashflow, tasaAnual, fechaDescuento)
    const npvAcelerado = calcularNPV(acelerado.cashflow, tasaAnual, fechaDescuento)

    // Serie mensual acumulada de cada corrida, alineada por fecha calendario.
    function acumularPorMes(cashflow: typeof base.cashflow) {
      const porMes = new Map<string, { ingreso: number; capex: number; neto: number }>()
      for (const f of cashflow) {
        const mes = String(f.fecha).slice(0, 7)
        const acc = porMes.get(mes) ?? { ingreso: 0, capex: 0, neto: 0 }
        acc.ingreso += Number(f.ingreso_bruto_usd ?? 0)
        acc.capex += Number(f.capex_usd ?? 0)
        acc.neto += Number(f.cash_flow_neto_usd ?? 0)
        porMes.set(mes, acc)
      }
      return porMes
    }
    const baseM = acumularPorMes(base.cashflow)
    const accM = acumularPorMes(acelerado.cashflow)
    const meses = [...new Set([...baseM.keys(), ...accM.keys()])].sort()

    let cumBaseCapex = 0, cumAccCapex = 0, cumBaseIngreso = 0, cumAccIngreso = 0, cumBaseNeto = 0, cumAccNeto = 0
    let picoCapexAdicional = 0
    let mesRepago: string | null = null
    const serie: { mes: string; capex_adicional_acum_usd: number; ingreso_adicional_acum_usd: number; neto_adicional_acum_usd: number }[] = []
    for (const mes of meses) {
      cumBaseCapex += baseM.get(mes)?.capex ?? 0
      cumAccCapex += accM.get(mes)?.capex ?? 0
      cumBaseIngreso += baseM.get(mes)?.ingreso ?? 0
      cumAccIngreso += accM.get(mes)?.ingreso ?? 0
      cumBaseNeto += baseM.get(mes)?.neto ?? 0
      cumAccNeto += accM.get(mes)?.neto ?? 0

      const capexAdicional = cumAccCapex - cumBaseCapex
      const ingresoAdicional = cumAccIngreso - cumBaseIngreso
      const netoAdicional = cumAccNeto - cumBaseNeto
      if (capexAdicional > picoCapexAdicional) picoCapexAdicional = capexAdicional
      if (mesRepago === null && netoAdicional >= 0 && mes > fechaAcelerada.slice(0, 7)) mesRepago = mes

      serie.push({ mes, capex_adicional_acum_usd: capexAdicional, ingreso_adicional_acum_usd: ingresoAdicional, neto_adicional_acum_usd: netoAdicional })
    }

    const mesesHastaRepago = mesRepago
      ? (Number(mesRepago.slice(0, 4)) - Number(fechaAcelerada.slice(0, 4))) * 12 + (Number(mesRepago.slice(5, 7)) - Number(fechaAcelerada.slice(5, 7)))
      : null

    return NextResponse.json({
      campana: { id: campana.id, nombre: campana.nombre },
      meses_adelanto: mesesAdelanto,
      equipos_usados: equipos,
      equipos_tope: MAX_EQUIPOS,
      fecha_actual: fechaBaseActual,
      fecha_acelerada: fechaAcelerada,
      capex_adicional_pico_usd: picoCapexAdicional,
      ingreso_adicional_a_horizonte_usd: cumAccIngreso - cumBaseIngreso,
      mes_repago: mesRepago,
      meses_hasta_repago: mesesHastaRepago,
      npv_base_usd: npvBase,
      npv_acelerado_usd: npvAcelerado,
      npv_delta_usd: npvAcelerado - npvBase,
      serie,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

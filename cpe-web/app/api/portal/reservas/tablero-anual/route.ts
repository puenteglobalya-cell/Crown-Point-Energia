import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo } from '@/lib/reservas/engine'

const MCF_POR_BOE = 6
const ANIOS_TABLERO = 6

// ─── Tablero de razonabilidad: una fila por variable, una columna por año
// ──────────────────────────────────────────────────────────────────────────
// Los primeros 5-6 años son los que más pesan en el VAN de cualquier cash
// flow de largo plazo -- este endpoint junta en un solo golpe de vista el
// precio, el costo por boe, la regalía, la amortización, la participación
// y el CAPEX de cada uno, para poder chequear si son razonables ANTES de
// confiar en el resultado consolidado a 20 años.
export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  if (!Number.isFinite(escenarioId)) return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  try {
    const filas = await traerTodo<any>(() => db.from('cashflow_mensual')
      .select('fecha, ingreso_bruto_usd, regalias_usd, opex_fijo_usd, opex_variable_usd, opex_fijo_pozo_usd, capex_usd, depreciacion_usd, bbl_petroleo, mcf_gas, precio_petroleo, participacion_pct')
      .eq('escenario_id', escenarioId).order('fecha'))

    if (filas.length === 0) {
      return NextResponse.json({ error: 'El escenario no tiene resultados. Corré el cálculo primero.' }, { status: 400 })
    }

    // Se ancla a años CALENDARIO desde 2026, no desde la fecha en que arranca
    // la data del escenario -- un escenario con producción básica cargada
    // desde 2025-12 mezclaría un mes de 2025 con 11 de 2026 en el "año 1" si
    // se anclara al primer registro, en vez de comparar años calendario
    // limpios entre escenarios.
    const ANIO_ANCLA = 2026
    type Acc = {
      // Bruto (sin participación) -- sólo como peso para las razones (regalía
      // %, participación % ponderada); nunca se muestra directo.
      ingresoBrutoPeso: number
      regalias: number; regaliasNeto: number; opex: number; capex: number; depreciacion: number
      bbl: number; boeNeto: number; bblPrecioPonderado: number; participacionPonderada: number
    }
    const porAnio = new Map<number, Acc>()

    for (const f of filas) {
      const anioRelativo = Number(String(f.fecha).slice(0, 4)) - ANIO_ANCLA
      if (anioRelativo < 0 || anioRelativo >= ANIOS_TABLERO) continue
      const part = Number(f.participacion_pct ?? 1)
      const bbl = Number(f.bbl_petroleo)
      const boe = bbl + Number(f.mcf_gas) / MCF_POR_BOE
      const ingresoBruto = Number(f.ingreso_bruto_usd)
      const a = porAnio.get(anioRelativo) ?? {
        ingresoBrutoPeso: 0, regalias: 0, regaliasNeto: 0, opex: 0, capex: 0, depreciacion: 0,
        bbl: 0, boeNeto: 0, bblPrecioPonderado: 0, participacionPonderada: 0,
      }
      a.ingresoBrutoPeso += ingresoBruto
      // Regalía en bruto (no se multiplica por participación): es un
      // porcentaje sobre la producción total, no cambia según cuánto de esa
      // torta le toque a CPE -- dividir neto/neto o bruto/bruto da la misma
      // razón, pero mezclar (neto sobre bruto) la escalaría por participación.
      a.regalias += Number(f.regalias_usd)
      // Neta, para el US$/boe: tiene que quedar en la misma base (neta) que
      // el OPEX/boe para poder compararlos directo.
      a.regaliasNeto += Number(f.regalias_usd) * part
      a.opex += (Number(f.opex_fijo_usd) + Number(f.opex_variable_usd) + Number(f.opex_fijo_pozo_usd)) * part
      a.capex += Number(f.capex_usd) * part
      a.depreciacion += Number(f.depreciacion_usd) * part
      a.bbl += bbl
      a.boeNeto += boe * part
      a.bblPrecioPonderado += bbl * Number(f.precio_petroleo)
      a.participacionPonderada += ingresoBruto * part
      porAnio.set(anioRelativo, a)
    }

    const anios = [...porAnio.entries()].sort((a, b) => a[0] - b[0]).map(([anioRelativo, a]) => ({
      anio: ANIO_ANCLA + anioRelativo,
      precio_usd_bbl: a.bbl > 0 ? a.bblPrecioPonderado / a.bbl : null,
      costo_opex_usd_boe: a.boeNeto > 0 ? a.opex / a.boeNeto : null,
      regalia_pct: a.ingresoBrutoPeso > 0 ? a.regalias / a.ingresoBrutoPeso : null,
      regalia_usd_boe: a.boeNeto > 0 ? a.regaliasNeto / a.boeNeto : null,
      amortizacion_usd: a.depreciacion,
      participacion_pct: a.ingresoBrutoPeso > 0 ? a.participacionPonderada / a.ingresoBrutoPeso : null,
      capex_usd: a.capex,
    }))

    return NextResponse.json({ anio_base: ANIO_ANCLA, anios })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

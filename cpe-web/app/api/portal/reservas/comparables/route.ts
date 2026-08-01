import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo, calcularNpvPorTasa } from '@/lib/reservas/engine'

// ─── Valuación por comparables de mercado ────────────────────────────────
// La otra mitad de la valuación: el DCF dice cuánto valen los flujos, los
// comparables dicen a cuánto paga el mercado activos parecidos. Sirven para
// contrastar — si el DCF da el triple que el múltiplo de los pares, algo hay
// que explicar.
//
// La tabla `comparables_mercado` ya tenía todo lo necesario (EV, deuda neta,
// reservas P1/P2, NPV10, producción) pero nada la usaba. Los múltiplos que se
// calculan son los estándar del sector E&P:
//
//   EV / boe de reservas      · cuánto se paga por barril en el subsuelo
//   EV / boe/d de producción  · cuánto se paga por barril diario de flujo
//   EV / NPV10                · qué prima o descuento contra el valor técnico
//
// Se informa la MEDIANA además del promedio: con pocos comparables, uno
// atípico corre el promedio y la mediana no.

export const maxDuration = 60

const MCF_POR_BOE = 6

function mediana(xs: number[]): number | null {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b)
  if (v.length === 0) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}
const promedio = (xs: number[]) => {
  const v = xs.filter(Number.isFinite)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  if (!Number.isFinite(escenarioId)) return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  try {
    const [comparables, reservas, deuda, anual, npvPorTasa] = await Promise.all([
      traerTodo<any>(() => db.from('comparables_mercado').select('*').order('id')),
      traerTodo<any>(() => db.from('reservas_anuales').select('*')
        .or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id')),
      traerTodo<any>(() => db.from('deuda_notas').select('*').order('id')).catch(() => [] as any[]),
      traerTodo<any>(() => db.from('resultados_escenario_anual').select('*')
        .eq('escenario_id', escenarioId).is('yacimiento_id', null).order('anio')),
      calcularNpvPorTasa(escenarioId).catch(() => [] as any[]),
    ])

    if (comparables.length === 0) {
      return NextResponse.json({
        aviso: 'No hay comparables cargados. Cargalos en "Cargar datos → Comparables de mercado".',
        comparables: [], multiplos: null, cpe: null, implicito: null,
      })
    }

    // ─── Múltiplos de cada comparable ───
    const conMultiplos = comparables.map(c => {
      const ev = Number(c.ev_usd_mm ?? 0)
      const p1 = Number(c.reservas_p1_mmboe ?? 0)
      const p2 = Number(c.reservas_p2_mmboe ?? 0)
      const prod = Number(c.produccion_kboepd ?? 0)
      const npv1 = Number(c.npv10_p1_usd_mm ?? 0)
      const npv2 = Number(c.npv10_p2_usd_mm ?? 0)
      return {
        empresa: c.empresa, pais: c.pais ?? null, fecha_corte: c.fecha_corte,
        ev_usd_mm: ev || null,
        // EV en MM y reservas en MMboe → el cociente ya queda en USD/boe.
        ev_por_boe_p1: ev > 0 && p1 > 0 ? ev / p1 : null,
        ev_por_boe_p2: ev > 0 && p2 > 0 ? ev / p2 : null,
        // EV en MM sobre kboe/d → MM USD por cada mil boe diarios.
        ev_por_kboepd: ev > 0 && prod > 0 ? ev / prod : null,
        ev_sobre_npv10_p1: ev > 0 && npv1 > 0 ? ev / npv1 : null,
        ev_sobre_npv10_p2: ev > 0 && npv2 > 0 ? ev / npv2 : null,
      }
    })

    const col = (k: keyof (typeof conMultiplos)[number]) =>
      conMultiplos.map(c => c[k]).filter((v): v is number => typeof v === 'number')

    const multiplos = (['ev_por_boe_p1', 'ev_por_boe_p2', 'ev_por_kboepd', 'ev_sobre_npv10_p1', 'ev_sobre_npv10_p2'] as const)
      .map(k => ({ metrica: k, n: col(k).length, mediana: mediana(col(k)), promedio: promedio(col(k)) }))

    // ─── Las mismas métricas para CPE ───
    // Reservas: el reporte más reciente de cada categoría, en MMboe.
    const masReciente = (categoria: string) => reservas
      .filter(r => r.categoria === categoria)
      .sort((a, b) => String(b.fecha_corte).localeCompare(String(a.fecha_corte)))
    const porCategoria = (categoria: string) => {
      const vistos = new Set<number>()
      return masReciente(categoria).reduce((s, r) => {
        if (vistos.has(r.yacimiento_id)) return s // sólo el reporte más nuevo por yacimiento
        vistos.add(r.yacimiento_id)
        return s + Number(r.reservas_boe ?? 0)
      }, 0) / 1e6
    }
    const p1 = porCategoria('P1')
    const p2Incremental = porCategoria('P2')

    // Producción: el primer año completo del escenario, pasado a kboe/d.
    const primerAnio = anual[0]
    const boeAnio = primerAnio
      ? Number(primerAnio.produccion_petroleo_bbl) + Number(primerAnio.produccion_gas_mcf) / MCF_POR_BOE
      : 0
    const produccionKboepd = boeAnio > 0 ? boeAnio / 365 / 1000 : 0

    const npv10 = (npvPorTasa as any[]).find(t => Math.abs(t.tasa - 0.10) < 1e-9)?.npv_despues_impuestos_usd ?? null
    const npv10Mm = npv10 != null ? npv10 / 1e6 : null
    const deudaNetaMm = deuda.reduce((s, d) => s + Number(d.saldo_usd_mm ?? 0), 0)

    const cpe = {
      // P1/P2/P3 son incrementales, así que el 2P acumulado es P1 + P2.
      reservas_p1_mmboe: p1,
      reservas_2p_mmboe: p1 + p2Incremental,
      produccion_kboepd: produccionKboepd,
      npv10_usd_mm: npv10Mm,
      deuda_neta_usd_mm: deudaNetaMm,
    }

    // ─── Valor implícito aplicando cada múltiplo ───
    const aplicar = (metrica: string, multiplo: number | null, base: number | null, etiqueta: string) => {
      if (multiplo == null || base == null || !(base > 0)) return null
      const ev = multiplo * base
      return {
        metrica, etiqueta, multiplo, base,
        ev_implicito_usd_mm: ev,
        equity_implicito_usd_mm: ev - deudaNetaMm,
      }
    }

    const m = (k: string) => multiplos.find(x => x.metrica === k)?.mediana ?? null
    const implicito = [
      aplicar('ev_por_boe_p1', m('ev_por_boe_p1'), cpe.reservas_p1_mmboe, 'EV / boe de reservas P1'),
      aplicar('ev_por_boe_p2', m('ev_por_boe_p2'), cpe.reservas_2p_mmboe, 'EV / boe de reservas 2P'),
      aplicar('ev_por_kboepd', m('ev_por_kboepd'), cpe.produccion_kboepd, 'EV / producción diaria'),
      aplicar('ev_sobre_npv10_p1', m('ev_sobre_npv10_p1'), cpe.npv10_usd_mm, 'EV / NPV10'),
    ].filter(Boolean) as NonNullable<ReturnType<typeof aplicar>>[]

    const evs = implicito.map(i => i.ev_implicito_usd_mm)

    return NextResponse.json({
      comparables: conMultiplos,
      multiplos,
      cpe,
      implicito,
      rango: evs.length > 0 ? {
        minimo_usd_mm: Math.min(...evs),
        mediana_usd_mm: mediana(evs),
        maximo_usd_mm: Math.max(...evs),
        equity_mediana_usd_mm: (mediana(evs) ?? 0) - deudaNetaMm,
      } : null,
      aviso: npv10Mm == null
        ? 'Falta correr el cálculo del escenario: sin NPV10 no se puede contrastar el múltiplo contra el valor técnico.'
        : null,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

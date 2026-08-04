import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo, calcularNPV, irrAnual } from '@/lib/reservas/engine'

// ─── Reporte "one-line": una fila por pozo ───────────────────────────────
// Es el entregable estándar de un reserve report y el nivel al que realmente
// se decide. Hasta ahora sólo había cash flow mes a mes (decenas de miles de
// filas) o el agregado anual; faltaba el intermedio.
//
// De paso responde una pregunta de NI 51-101 que el simulador podía contestar
// con datos que ya tenía: **qué parte del valor viene de pozos que ya existen
// y qué parte de pozos todavía por perforar** — la distinción entre reservas
// desarrolladas y no desarrolladas, vista desde la economía.
//
// Todos los pozos se descuentan a la MISMA fecha base; si cada uno se
// descontara a su propio primer mes, los pozos tardíos parecerían mejores.

export const maxDuration = 120

const MCF_POR_BOE = 6

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  const tasa = Number(req.nextUrl.searchParams.get('tasa') ?? 0.10)
  if (!Number.isFinite(escenarioId)) return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  if (!Number.isFinite(tasa) || tasa <= -1 || tasa > 10) return NextResponse.json({ error: 'tasa inválida' }, { status: 400 })

  const db = createSupabaseServerAdminClient()

  try {
    const [filas, pozos, concesiones, yacimientos, intervenciones] = await Promise.all([
      traerTodo<any>(() => db.from('cashflow_mensual').select('*').eq('escenario_id', escenarioId).order('fecha')),
      traerTodo<any>(() => db.from('pozos').select('*').order('id')),
      traerTodo<any>(() => db.from('concesiones').select('id, nombre, yacimiento_id').order('id')),
      traerTodo<any>(() => db.from('yacimientos').select('id, nombre').order('id')),
      traerTodo<any>(() => db.from('intervenciones').select('pozo_id, tipo, fecha, fecha_inicio_perforacion')
        .or(`escenario_id.eq.${escenarioId},escenario_id.is.null`).order('id')),
    ])

    if (filas.length === 0) {
      return NextResponse.json({ error: 'El escenario no tiene resultados. Corré el cálculo primero.' }, { status: 400 })
    }

    const fechaBase = filas.reduce((a, f) => (String(f.fecha) < a ? String(f.fecha) : a), String(filas[0].fecha))
    const concPorId = new Map<number, any>(concesiones.map(c => [c.id, c]))
    const yacPorId = new Map<number, any>(yacimientos.map(y => [y.id, y.nombre]))
    const pozoPorId = new Map<number, any>(pozos.map(p => [p.id, p]))

    // Un pozo es "a perforar" si tiene una intervención de perforación en el
    // escenario: nace con la campaña. Si no, ya existe y viene produciendo.
    const aPerforar = new Set(intervenciones.filter(i => i.tipo === 'perforacion' && i.pozo_id != null).map(i => i.pozo_id))

    // Facilities y las Intervenciones sin pozo real (perforación/workover a
    // probar, sin un Pozo cargado todavía) comparten pozo_id = null a
    // propósito — agrupar por pozo_id crudo las mezclaba a todas en un solo
    // bucket "Facilities", perdiendo la economía de los pozos a perforar
    // dentro de esa línea. Se agrupa por pozo_id cuando existe, o por
    // categoria (que sí las distingue) cuando no — sigue sin poder separar
    // dos Intervenciones sin pozo real DISTINTAS entre sí (cashflow_mensual
    // no guarda de cuál intervención salió cada fila), pero ya no las mete
    // todas bajo "Facilities".
    const claveDe = (f: any) => f.pozo_id != null ? String(f.pozo_id) : `sin_pozo:${f.categoria ?? 'facilities'}`
    const porPozo = new Map<string, any[]>()
    for (const f of filas) {
      const clave = claveDe(f)
      const arr = porPozo.get(clave) ?? []
      arr.push(f)
      porPozo.set(clave, arr)
    }

    const mesesEntre = (a: string, b: string) => {
      const x = new Date(a.slice(0, 7) + '-01T00:00:00Z'), y = new Date(b.slice(0, 7) + '-01T00:00:00Z')
      return (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + (y.getUTCMonth() - x.getUTCMonth())
    }

    const lineas = [...porPozo.entries()].map(([clave, rows]) => {
      const pozoId = clave.startsWith('sin_pozo:') ? null : Number(clave)
      const categoriaSinPozo = clave.startsWith('sin_pozo:') ? clave.slice('sin_pozo:'.length) : null
      const pozo = pozoId != null ? pozoPorId.get(pozoId) : null
      const conc = pozo ? concPorId.get(pozo.concesion_id) : null
      const flujos = rows.map(r => ({ fecha: String(r.fecha), cash_flow_neto_usd: Number(r.cash_flow_neto_usd) }))

      // Serie anual para TIR y payback, referida a la misma base que el VAN.
      const porAnio = new Map<number, number>()
      for (const f of flujos) {
        const idx = Math.floor(mesesEntre(fechaBase, f.fecha) / 12)
        porAnio.set(idx, (porAnio.get(idx) ?? 0) + f.cash_flow_neto_usd)
      }
      const serie = Array.from({ length: Math.max(0, ...porAnio.keys()) + 1 }, (_, i) => porAnio.get(i) ?? 0)

      let acum = 0, payback: number | null = null
      for (let i = 0; i < serie.length; i++) {
        const previo = acum
        acum += serie[i]
        if (acum >= 0) {
          payback = i + (serie[i] !== 0 ? Math.min(1, Math.max(0, -previo / serie[i])) : 0)
          break
        }
      }

      const bbl = rows.reduce((s, r) => s + Number(r.bbl_petroleo) * Number(r.participacion_pct ?? 1), 0)
      const mcf = rows.reduce((s, r) => s + Number(r.mcf_gas) * Number(r.participacion_pct ?? 1), 0)
      const boe = bbl + mcf / MCF_POR_BOE
      const ingresos = rows.reduce((s, r) => s + Number(r.ingreso_bruto_usd) * Number(r.participacion_pct ?? 1), 0)
      const opex = rows.reduce((s, r) => s + (Number(r.opex_fijo_usd) + Number(r.opex_variable_usd) + Number(r.opex_fijo_pozo_usd)) * Number(r.participacion_pct ?? 1), 0)
      const regalias = rows.reduce((s, r) => s + Number(r.regalias_usd) * Number(r.participacion_pct ?? 1), 0)
      const ebitda = ingresos - regalias - opex
      const conProduccion = rows.filter(r => Number(r.bbl_petroleo) > 0 || Number(r.mcf_gas) > 0)

      // pozo_id null cubre dos casos distintos, ya separados arriba por
      // categoria: facilities (CAPEX que sostiene el yacimiento, no cuelga
      // de ningún pozo) y una Intervención sin pozo real (perforación/
      // workover que se está probando, todavía sin un Pozo cargado). Ninguno
      // de los dos tiene concesión propia en cashflow_mensual — si en algún
      // momento hay más de una en la misma categoría al mismo tiempo, esta
      // línea sigue mezclándolas entre sí (no con la otra categoría).
      const esFacilities = categoriaSinPozo === 'facilities'
      const esSinPozoReal = categoriaSinPozo != null && !esFacilities
      return {
        pozo_id: pozoId,
        pozo: esFacilities ? 'Facilities'
          : esSinPozoReal ? `${categoriaSinPozo} (sin pozo real)`
          : (pozo?.nombre ?? `#${pozoId}`),
        concesion: conc?.nombre ?? (categoriaSinPozo != null ? '(todas)' : '—'),
        yacimiento: conc ? (yacPorId.get(conc.yacimiento_id) ?? '—') : '—',
        categoria: esFacilities ? 'facilities' : (esSinPozoReal || (pozoId != null && aPerforar.has(pozoId)) ? 'a_perforar' : 'existente'),
        npv_usd: calcularNPV(flujos, tasa, fechaBase),
        irr_pct: (() => { const r = irrAnual(serie); return r === null ? null : r * 100 })(),
        payback_anios: payback,
        capex_usd: rows.reduce((s, r) => s + Number(r.capex_usd) * Number(r.participacion_pct ?? 1), 0),
        eur_bbl: bbl, eur_mcf: mcf, eur_boe: boe,
        ebitda_usd: ebitda,
        netback_usd_boe: boe > 0 ? ebitda / boe : null,
        primera_produccion: conProduccion[0]?.fecha ?? null,
        ultima_produccion: conProduccion[conProduccion.length - 1]?.fecha ?? null,
        cortado_por_limite: rows.some(r => r.economicamente_activo === false),
        meses: rows.length,
      }
    }).sort((a, b) => b.npv_usd - a.npv_usd)

    const suma = (xs: typeof lineas) => ({
      pozos: xs.length,
      npv_usd: xs.reduce((s, l) => s + l.npv_usd, 0),
      capex_usd: xs.reduce((s, l) => s + l.capex_usd, 0),
      eur_boe: xs.reduce((s, l) => s + l.eur_boe, 0),
      ebitda_usd: xs.reduce((s, l) => s + l.ebitda_usd, 0),
    })

    return NextResponse.json({
      fecha_base_descuento: fechaBase,
      tasa_descuento: tasa,
      lineas,
      total: suma(lineas),
      // El corte que pide NI 51-101 para separar desarrolladas de no
      // desarrolladas, visto desde la economía.
      por_categoria: {
        existente: suma(lineas.filter(l => l.categoria === 'existente')),
        a_perforar: suma(lineas.filter(l => l.categoria === 'a_perforar')),
        facilities: suma(lineas.filter(l => l.categoria === 'facilities')),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

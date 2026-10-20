import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole, logActivity } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'
import { calcularMetricas, type Cargamento, type Flete, type PrecioDiario, type ReferenciaMercado } from '@/lib/fletes'

export const runtime = 'nodejs'

const CRUDOS = ['Escalante', 'Medanito'] as const
const CLASES = ['Aframax', 'Suezmax', 'otra'] as const
const TIPOS_FLETE = ['spot', 'time_charter'] as const

function filaACargamento(r: Record<string, unknown>): Cargamento {
  return {
    id: r.id as string, fechaBl: r.fecha_bl as string, puerto: r.puerto as string,
    crudo: r.crudo as Cargamento['crudo'], volumenBbl: Number(r.volumen_bbl),
    comprador: (r.comprador as string | null) ?? null, destino: (r.destino as string | null) ?? null,
    buque: (r.buque as string | null) ?? null, clase: r.clase as Cargamento['clase'],
    precioFobUsdBbl: r.precio_fob_usd_bbl != null ? Number(r.precio_fob_usd_bbl) : null,
    descuentoPactadoUsdBbl: r.descuento_pactado_usd_bbl != null ? Number(r.descuento_pactado_usd_bbl) : null,
    notas: (r.notas as string | null) ?? null,
  }
}

function filaAFlete(r: Record<string, unknown>): Flete {
  return {
    id: r.id as string, cargamentoId: r.cargamento_id as string, tipo: r.tipo as Flete['tipo'],
    tarifaWs: r.tarifa_ws != null ? Number(r.tarifa_ws) : null,
    tarifaLumpSumUsd: r.tarifa_lump_sum_usd != null ? Number(r.tarifa_lump_sum_usd) : null,
    flatRateUsado: r.flat_rate_usado != null ? Number(r.flat_rate_usado) : null,
    costoTotalUsd: Number(r.costo_total_usd), demorasUsd: Number(r.demoras_usd ?? 0),
    combustibleUsd: Number(r.combustible_usd ?? 0), canalOtrosUsd: Number(r.canal_otros_usd ?? 0),
    proveedorBroker: (r.proveedor_broker as string | null) ?? null,
  }
}

function filaAPrecio(r: Record<string, unknown>): PrecioDiario {
  return {
    fecha: r.fecha as string,
    iceBrent: r.ice_brent != null ? Number(r.ice_brent) : null,
    medanito: r.medanito != null ? Number(r.medanito) : null,
    escalanteFob: r.escalante_fob != null ? Number(r.escalante_fob) : null,
    laBrentFuturesStrip: r.la_brent_futures_strip != null ? Number(r.la_brent_futures_strip) : null,
  }
}

function filaAReferencia(r: Record<string, unknown>): ReferenciaMercado {
  return {
    id: r.id as string, fecha: r.fecha as string, ruta: r.ruta as string, clase: r.clase as ReferenciaMercado['clase'],
    tarifaWs: r.tarifa_ws != null ? Number(r.tarifa_ws) : null,
    tarifaUsdTon: r.tarifa_usd_ton != null ? Number(r.tarifa_usd_ton) : null,
    tarifaUsdBbl: r.tarifa_usd_bbl != null ? Number(r.tarifa_usd_bbl) : null,
    fuente: (r.fuente as string | null) ?? null,
  }
}

export async function GET() {
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const [cargamentosRes, fletesRes, referenciasRes, preciosRes, configRes] = await Promise.all([
    db.from('cargamentos').select('*').order('fecha_bl', { ascending: false }),
    db.from('fletes').select('*'),
    db.from('fletes_referencia_mercado').select('*').order('fecha', { ascending: false }),
    db.from('precios_diarios').select('*'),
    db.from('fletes_config').select('*').eq('id', 1).maybeSingle(),
  ])
  for (const r of [cargamentosRes, fletesRes, referenciasRes, preciosRes]) {
    if (r.error) return dbError(r.error)
  }

  const cargamentos = (cargamentosRes.data ?? []).map(filaACargamento)
  const fletesPorCargamento = new Map((fletesRes.data ?? []).map(filaAFlete).map(f => [f.cargamentoId, f]))
  const referencias = (referenciasRes.data ?? []).map(filaAReferencia)
  const preciosPorFecha = new Map((preciosRes.data ?? []).map(filaAPrecio).map(p => [p.fecha, p]))
  const config = {
    umbralVerdePct: Number(configRes.data?.umbral_verde_pct ?? 10),
    umbralAmarilloPct: Number(configRes.data?.umbral_amarillo_pct ?? 25),
  }

  const resultado = cargamentos.map(c => calcularMetricas(
    c, fletesPorCargamento.get(c.id) ?? null, preciosPorFecha.get(c.fechaBl) ?? null, referencias, config
  ))

  return NextResponse.json({ cargamentos: resultado, referencias, config })
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, role, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (role?.role !== 'admin' && role?.role !== 'finanzas') {
    return NextResponse.json({ error: 'No autorizado para cargar fletamentos' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const { cargamento, flete } = body as { cargamento?: Record<string, unknown>; flete?: Record<string, unknown> }
  if (!cargamento) return NextResponse.json({ error: 'Falta el cargamento' }, { status: 400 })

  // Validaciones -- volumen > 0, fechas coherentes, crudo/clase/moneda (siempre USD) conocidos.
  const fechaBl = String(cargamento.fechaBl ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaBl)) return NextResponse.json({ error: 'Fecha de B/L inválida' }, { status: 400 })
  const fechaBlDate = new Date(fechaBl + 'T00:00:00')
  if (Number.isNaN(fechaBlDate.getTime()) || fechaBlDate.getTime() > Date.now() + 86_400_000) {
    return NextResponse.json({ error: 'La fecha de B/L no puede ser futura' }, { status: 400 })
  }
  const volumenBbl = Number(cargamento.volumenBbl)
  if (!Number.isFinite(volumenBbl) || volumenBbl <= 0) {
    return NextResponse.json({ error: 'El volumen debe ser mayor a 0' }, { status: 400 })
  }
  if (!CRUDOS.includes(cargamento.crudo as typeof CRUDOS[number])) {
    return NextResponse.json({ error: 'Crudo inválido (Escalante o Medanito)' }, { status: 400 })
  }
  if (!CLASES.includes(cargamento.clase as typeof CLASES[number])) {
    return NextResponse.json({ error: 'Clase de buque inválida' }, { status: 400 })
  }
  if (!cargamento.puerto) return NextResponse.json({ error: 'Falta el puerto' }, { status: 400 })

  if (flete) {
    if (!TIPOS_FLETE.includes(flete.tipo as typeof TIPOS_FLETE[number])) {
      return NextResponse.json({ error: 'Tipo de flete inválido (spot o time_charter)' }, { status: 400 })
    }
    const costoTotal = Number(flete.costoTotalUsd)
    if (!Number.isFinite(costoTotal) || costoTotal < 0) {
      return NextResponse.json({ error: 'El costo total del flete debe ser un número ≥ 0' }, { status: 400 })
    }
  }

  const db = createSupabaseServerAdminClient()
  const { data: cargamentoRow, error: cargErr } = await db.from('cargamentos').insert({
    fecha_bl: fechaBl, puerto: String(cargamento.puerto).slice(0, 200), crudo: cargamento.crudo,
    volumen_bbl: volumenBbl, comprador: cargamento.comprador ? String(cargamento.comprador).slice(0, 200) : null,
    destino: cargamento.destino ? String(cargamento.destino).slice(0, 200) : null,
    buque: cargamento.buque ? String(cargamento.buque).slice(0, 200) : null, clase: cargamento.clase,
    precio_fob_usd_bbl: cargamento.precioFobUsdBbl != null ? Number(cargamento.precioFobUsdBbl) : null,
    descuento_pactado_usd_bbl: cargamento.descuentoPactadoUsdBbl != null ? Number(cargamento.descuentoPactadoUsdBbl) : null,
    notas: cargamento.notas ? String(cargamento.notas).slice(0, 2000) : null,
    created_by: user.id,
  }).select('id').single()
  if (cargErr) return dbError(cargErr)

  if (flete) {
    const { error: fleteErr } = await db.from('fletes').insert({
      cargamento_id: cargamentoRow.id, tipo: flete.tipo,
      tarifa_ws: flete.tarifaWs != null ? Number(flete.tarifaWs) : null,
      tarifa_lump_sum_usd: flete.tarifaLumpSumUsd != null ? Number(flete.tarifaLumpSumUsd) : null,
      flat_rate_usado: flete.flatRateUsado != null ? Number(flete.flatRateUsado) : null,
      costo_total_usd: Number(flete.costoTotalUsd),
      demoras_usd: flete.demorasUsd != null ? Number(flete.demorasUsd) : 0,
      combustible_usd: flete.combustibleUsd != null ? Number(flete.combustibleUsd) : 0,
      canal_otros_usd: flete.canalOtrosUsd != null ? Number(flete.canalOtrosUsd) : 0,
      proveedor_broker: flete.proveedorBroker ? String(flete.proveedorBroker).slice(0, 200) : null,
    })
    if (fleteErr) return dbError(fleteErr)
  }

  await logActivity({
    userId: user.id, userEmail: user.email ?? null, action: 'cargar_cargamento',
    resourceType: 'cargamento', resourceId: cargamentoRow.id,
    metadata: { puerto: cargamento.puerto, crudo: cargamento.crudo, fecha_bl: fechaBl },
  })

  return NextResponse.json({ id: cargamentoRow.id }, { status: 201 })
}

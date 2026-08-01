import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { traerTodo, calcularNpvPorTasa } from '@/lib/reservas/engine'
import { construirExcel } from '@/lib/reservas/exportExcel'

// Descarga del escenario completo en Excel, con fórmulas vivas para poder
// auditar el cálculo y cruzarlo contra el Excel de referencia.
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escenarioId = Number(req.nextUrl.searchParams.get('escenario_id'))
  if (!Number.isFinite(escenarioId)) {
    return NextResponse.json({ error: 'escenario_id inválido' }, { status: 400 })
  }
  const tasa = Number(req.nextUrl.searchParams.get('tasa') ?? 0.10)

  const db = createSupabaseServerAdminClient()

  try {
    const [escenario, cashflow, anual, depletion, pozos, yacimientos, npvPorTasa] = await Promise.all([
      db.from('escenarios').select('nombre').eq('id', escenarioId).single(),
      traerTodo<any>(() => db.from('cashflow_mensual').select('*').eq('escenario_id', escenarioId).order('fecha').order('pozo_id')),
      traerTodo<any>(() => db.from('resultados_escenario_anual').select('*').eq('escenario_id', escenarioId).order('anio').order('id')),
      traerTodo<any>(() => db.from('reservas_depletion_anual').select('*').eq('escenario_id', escenarioId).order('anio').order('id')),
      traerTodo<any>(() => db.from('pozos').select('id, nombre').order('id')),
      traerTodo<any>(() => db.from('yacimientos').select('id, nombre').order('id')),
      calcularNpvPorTasa(escenarioId),
    ])

    if (cashflow.length === 0) {
      return NextResponse.json({ error: 'El escenario no tiene resultados. Corré el cálculo antes de exportar.' }, { status: 400 })
    }

    const nombrePozo = new Map<number, string>(pozos.map(p => [p.id, p.nombre]))
    const nombreYac = new Map<number, string>(yacimientos.map(y => [y.id, y.nombre]))
    const nombreEscenario = escenario.data?.nombre ?? `Escenario ${escenarioId}`

    const buffer = await construirExcel({
      escenario: nombreEscenario,
      generado: new Date().toISOString().slice(0, 16).replace('T', ' '),
      tasaDescuento: tasa,
      cashflow, anual, depletion, npvPorTasa,
      nombrePozo: id => nombrePozo.get(Number(id)) ?? `Pozo #${id}`,
      nombreYacimiento: id => nombreYac.get(Number(id)) ?? `Yacimiento #${id}`,
    })

    const slug = nombreEscenario.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="simulador-reservas-${slug}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

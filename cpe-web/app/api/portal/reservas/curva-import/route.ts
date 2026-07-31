import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

type CurvaMes = { mes_offset: number; bbl_petroleo: number; mcf_gas: number }

// Reemplaza toda la curva de un pozo o pozo_tipo por la que se acaba de
// parsear de un Excel — evita insertar filas duplicadas si el mismo
// archivo se sube de nuevo.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { pozo_id, pozo_tipo_id, filas } = body as { pozo_id?: number; pozo_tipo_id?: number; filas: CurvaMes[] }

  if (!pozo_id && !pozo_tipo_id) {
    return NextResponse.json({ error: 'Falta pozo_id o pozo_tipo_id' }, { status: 400 })
  }
  if (pozo_id && pozo_tipo_id) {
    return NextResponse.json({ error: 'Elegí pozo o pozo tipo, no ambos' }, { status: 400 })
  }
  if (!Array.isArray(filas) || filas.length === 0) {
    return NextResponse.json({ error: 'Sin filas para importar' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  let del = db.from('curvas_produccion').delete()
  del = pozo_id ? del.eq('pozo_id', pozo_id) : del.eq('pozo_tipo_id', pozo_tipo_id!)
  const { error: delErr } = await del
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

  const rows = filas.map(f => ({
    pozo_id: pozo_id ?? null,
    pozo_tipo_id: pozo_tipo_id ?? null,
    mes_offset: f.mes_offset,
    bbl_petroleo: f.bbl_petroleo,
    mcf_gas: f.mcf_gas,
  }))

  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from('curvas_produccion').insert(rows.slice(i, i + CHUNK))
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, filas: rows.length })
}

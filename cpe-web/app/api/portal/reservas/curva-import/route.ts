import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

type CurvaMes = { mes_offset: number; bbl_petroleo: number; mcf_gas: number }
type Reparto = { pozo_id?: number; pozo_tipo_id?: number; pct_petroleo: number; pct_gas: number }

async function reemplazarCurva(
  db: ReturnType<typeof createSupabaseServerAdminClient>,
  destino: { pozo_id?: number; pozo_tipo_id?: number },
  rows: { pozo_id: number | null; pozo_tipo_id: number | null; mes_offset: number; bbl_petroleo: number; mcf_gas: number }[],
) {
  let del = db.from('curvas_produccion').delete()
  del = destino.pozo_id ? del.eq('pozo_id', destino.pozo_id) : del.eq('pozo_tipo_id', destino.pozo_tipo_id!)
  const { error: delErr } = await del
  if (delErr) throw new Error(delErr.message)

  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from('curvas_produccion').insert(rows.slice(i, i + CHUNK))
    if (error) throw new Error(error.message)
  }
}

// Reemplaza toda la curva de un pozo o pozo_tipo por la que se acaba de
// parsear de un Excel — evita insertar filas duplicadas si el mismo
// archivo se sube de nuevo.
//
// Modo reparto: cuando el archivo del equipo técnico es una curva agregada
// de la concesión entera y todavía no hay apertura por yacimiento, se
// reparte por porcentaje entre varios pozos/pozos tipo destino en la misma
// carga — sin resubir el archivo cuando cambien los porcentajes, sólo se
// vuelve a repartir sobre las mismas filas ya parseadas en el navegador.
// El agua no se reparte porque el motor no la usa en ningún cálculo.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { pozo_id, pozo_tipo_id, filas, repartos } = body as {
    pozo_id?: number; pozo_tipo_id?: number; filas: CurvaMes[]; repartos?: Reparto[]
  }

  if (!Array.isArray(filas) || filas.length === 0) {
    return NextResponse.json({ error: 'Sin filas para importar' }, { status: 400 })
  }
  // Sin este chequeo, una fila mal parseada en el navegador (ej. una celda
  // que dio 0/0 al convertir unidades) insertaba NaN en curvas_produccion —
  // según la columna, Postgres lo rechaza con un 500 opaco o lo guarda como
  // null en silencio, y la curva de ese pozo queda incompleta sin ningún
  // aviso claro.
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i]
    if (!Number.isFinite(f.mes_offset) || f.mes_offset < 0) {
      return NextResponse.json({ error: `Fila ${i + 1}: mes_offset inválido (${f.mes_offset})` }, { status: 400 })
    }
    if (!Number.isFinite(f.bbl_petroleo) || !Number.isFinite(f.mcf_gas)) {
      return NextResponse.json({ error: `Fila ${i + 1} (mes_offset ${f.mes_offset}): bbl_petroleo o mcf_gas inválido` }, { status: 400 })
    }
  }

  const db = createSupabaseServerAdminClient()

  try {
    if (repartos && repartos.length > 0) {
      for (const r of repartos) {
        if (!r.pozo_id && !r.pozo_tipo_id) return NextResponse.json({ error: 'Cada reparto necesita pozo o pozo tipo' }, { status: 400 })
        if (r.pozo_id && r.pozo_tipo_id) return NextResponse.json({ error: 'Elegí pozo o pozo tipo por reparto, no ambos' }, { status: 400 })
      }
      let hechos = 0
      for (const r of repartos) {
        const rows = filas.map(f => ({
          pozo_id: r.pozo_id ?? null,
          pozo_tipo_id: r.pozo_tipo_id ?? null,
          mes_offset: f.mes_offset,
          bbl_petroleo: Math.round(f.bbl_petroleo * (r.pct_petroleo / 100) * 1000) / 1000,
          mcf_gas: Math.round(f.mcf_gas * (r.pct_gas / 100) * 1000) / 1000,
        }))
        await reemplazarCurva(db, r, rows)
        hechos += rows.length
      }
      return NextResponse.json({ ok: true, filas: hechos, destinos: repartos.length })
    }

    if (!pozo_id && !pozo_tipo_id) {
      return NextResponse.json({ error: 'Falta pozo_id o pozo_tipo_id' }, { status: 400 })
    }
    if (pozo_id && pozo_tipo_id) {
      return NextResponse.json({ error: 'Elegí pozo o pozo tipo, no ambos' }, { status: 400 })
    }

    const rows = filas.map(f => ({
      pozo_id: pozo_id ?? null,
      pozo_tipo_id: pozo_tipo_id ?? null,
      mes_offset: f.mes_offset,
      bbl_petroleo: f.bbl_petroleo,
      mcf_gas: f.mcf_gas,
    }))
    await reemplazarCurva(db, { pozo_id, pozo_tipo_id }, rows)
    return NextResponse.json({ ok: true, filas: rows.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

// Strict allowlist of mutable tables and their writable columns.
// Any table / column not listed here is silently rejected.
const ALLOWED_TABLES: Record<string, { cols: string[]; revalidate: string[] }> = {
  ir_events: {
    cols: ['fecha','tipo','titulo_es','titulo_en','nota_es','nota_en','activo','orden'],
    revalidate: ['/inversores'],
  },
  ir_analysts: {
    cols: ['analyst','firm','rating_es','rating_en','target','activo','orden'],
    revalidate: ['/inversores'],
  },
  obligaciones_negociables: {
    cols: ['serie','monto','vencimiento','tasa','isin','bolsa','activo','orden'],
    revalidate: ['/inversores'],
  },
  operations_blocks: {
    cols: ['slug','orden','commodity','eyebrow','titulo','lede_es','lede_en',
           'card_title_es','card_title_en','chips','body_es','body_en','stats','map_stats','activo'],
    revalidate: ['/operaciones'],
  },
  team_members: {
    cols: ['name','role_es','role_en','bio_es','bio_en','initials','bg','tipo','cargo_board','independiente','orden','activo'],
    revalidate: ['/acerca'],
  },
  strategy_cards: {
    cols: ['num','title_es','title_en','body_es','body_en','orden'],
    revalidate: ['/acerca'],
  },
  open_positions: {
    cols: ['area','location','tipo','activo','orden'],
    revalidate: ['/carreras'],
  },
  culture_cards: {
    cols: ['title_es','title_en','desc_es','desc_en','color','icon_key','orden'],
    revalidate: ['/carreras'],
  },
  esg_pillar_data: {
    cols: ['color','lede_es','lede_en','metrics','initiatives_es','initiatives_en'],
    revalidate: ['/esg', '/acerca'],
  },
}

function pickCols(body: Record<string, unknown>, cols: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of cols) if (col in body) out[col] = body[col]
  return out
}

type Params = { params: { table: string } }

export async function GET(req: NextRequest, { params }: Params) {
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = ALLOWED_TABLES[params.table]
  if (!cfg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const db = createSupabaseServerAdminClient()
  const orderCol = params.table === 'esg_pillar_data' ? 'pilar' : 'orden'
  const { data, error } = await db.from(params.table).select('*').order(orderCol)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = ALLOWED_TABLES[params.table]
  if (!cfg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const record = pickCols(body, cfg.cols)

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from(params.table).insert(record).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const path of cfg.revalidate) revalidatePath(path)
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = ALLOWED_TABLES[params.table]
  if (!cfg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { id, pilar, ...rest } = body
  const pk = params.table === 'esg_pillar_data' ? 'pilar' : 'id'
  const pkVal = params.table === 'esg_pillar_data' ? pilar : id
  if (!pkVal) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const patch = { ...pickCols(rest, cfg.cols), updated_at: new Date().toISOString() }
  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from(params.table).update(patch).eq(pk, pkVal).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const path of cfg.revalidate) revalidatePath(path)
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = ALLOWED_TABLES[params.table]
  if (!cfg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? searchParams.get('pilar')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const pk = params.table === 'esg_pillar_data' ? 'pilar' : 'id'
  const db = createSupabaseServerAdminClient()
  const { error } = await db.from(params.table).delete().eq(pk, id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const path of cfg.revalidate) revalidatePath(path)
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

const TIPOS = ['accionista_actual', 'prospecto', 'institucional', 'individual'] as const

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('investor_contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const nombre = String(body.nombre ?? '').trim()
  if (!nombre) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 })

  const tipo = TIPOS.includes(body.tipo) ? body.tipo : 'prospecto'

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('investor_contacts').insert({
    nombre,
    email: String(body.email ?? '').trim(),
    telefono: String(body.telefono ?? '').trim(),
    tipo,
    tenencia_estimada: String(body.tenencia_estimada ?? '').trim(),
    interes_on: !!body.interes_on,
    notas: String(body.notas ?? '').trim(),
  }).select().single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...rest } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['nombre', 'email', 'telefono', 'tipo', 'tenencia_estimada', 'interes_on', 'notas']) {
    if (rest[k] !== undefined) patch[k] = rest[k]
  }

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('investor_contacts').update(patch).eq('id', id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('investor_contacts').delete().eq('id', id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

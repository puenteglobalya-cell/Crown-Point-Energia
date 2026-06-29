import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { categoria, entidad, fecha, periodo, tipo, titulo_en, titulo_es, url, publicado } = body
  const patch: Record<string, unknown> = {}
  if (categoria !== undefined) patch.categoria = categoria
  if (entidad !== undefined) patch.entidad = entidad
  if (fecha !== undefined) patch.fecha = fecha
  if (periodo !== undefined) patch.periodo = periodo
  if (tipo !== undefined) patch.tipo = tipo
  if (titulo_en !== undefined) patch.titulo_en = titulo_en
  if (titulo_es !== undefined) patch.titulo_es = titulo_es
  if (url !== undefined) patch.url = url
  if (publicado !== undefined) patch.publicado = publicado

  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin
    .from('ir_documents')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return dbError(error)
  revalidatePath('/inversores')
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseServerAdminClient()
  const { error } = await admin.from('ir_documents').delete().eq('id', params.id)
  if (error) return dbError(error)
  revalidatePath('/inversores')
  return NextResponse.json({ ok: true })
}

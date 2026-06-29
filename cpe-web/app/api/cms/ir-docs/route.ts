import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export async function GET() {
  const isAdmin = await requireAdminUser()
  const admin = createSupabaseServerAdminClient()

  const base = admin.from('ir_documents').select('*').order('fecha', { ascending: false, nullsFirst: false })
  const { data, error } = await (isAdmin ? base : base.eq('publicado', true))
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { categoria, entidad, fecha, periodo, tipo, titulo_en, titulo_es, url, publicado } = body

  if (!url || !titulo_es || !categoria) {
    return NextResponse.json({ error: 'Faltan campos requeridos: url, titulo_es, categoria' }, { status: 400 })
  }

  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin
    .from('ir_documents')
    .insert({ categoria, entidad: entidad ?? 'CPI', fecha, periodo, tipo, titulo_en, titulo_es, url, publicado: publicado ?? true })
    .select()
    .single()

  if (error) return dbError(error)
  revalidatePath('/inversores')
  return NextResponse.json(data, { status: 201 })
}

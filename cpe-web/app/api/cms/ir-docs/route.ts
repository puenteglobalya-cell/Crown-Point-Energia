import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireCmsUser } from '@/lib/cms-access'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'
import { logActivity } from '@/lib/roles'

export async function GET() {
  const isAdmin = await requireCmsUser()
  const admin = createSupabaseServerAdminClient()

  const base = admin.from('ir_documents').select('*').order('fecha', { ascending: false, nullsFirst: false })
  const { data, error } = await (isAdmin ? base : base.eq('publicado', true))
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireCmsUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { categoria, entidad, fecha, periodo, tipo, titulo_en, titulo_es, url, publicado } = body

  if (!url || !titulo_es || !categoria) {
    return NextResponse.json({ error: 'Faltan campos requeridos: url, titulo_es, categoria' }, { status: 400 })
  }

  const admin = createSupabaseServerAdminClient()
  const record = { categoria, entidad: entidad ?? 'CPI', fecha, periodo, tipo, titulo_en, titulo_es, url, publicado: publicado ?? true }
  const { data, error } = await admin
    .from('ir_documents')
    .insert(record)
    .select()
    .single()

  if (error) return dbError(error)
  void logActivity({ userId: auth.user.id, userEmail: auth.user.email ?? null, action: 'cms_ir_docs_create', resourceType: 'ir_documents', resourceId: String(data.id), metadata: record })
  revalidatePath('/inversores')
  return NextResponse.json(data, { status: 201 })
}

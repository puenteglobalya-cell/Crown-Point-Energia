import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireCmsUser } from '@/lib/cms-access'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'
import { logActivity } from '@/lib/roles'

async function requireAdmin() {
  return requireCmsUser()
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Allowlist: storage_path/file_name are set at creation only; id/created_at never writable
  const { fecha, titulo_es, titulo_en, resumen_es, resumen_en, url, tipo, publicado } = body
  const patch = { fecha, titulo_es, titulo_en, resumen_es, resumen_en, url, tipo, publicado, updated_at: new Date().toISOString() }

  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin
    .from('comunicados')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return dbError(error)
  void logActivity({ userId: auth.user.id, userEmail: auth.user.email ?? null, action: 'cms_comunicados_update', resourceType: 'comunicados', resourceId: params.id, metadata: patch })
  revalidatePath('/comunicados')
  revalidatePath('/')
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseServerAdminClient()

  const { data: doc } = await admin
    .from('comunicados')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  if (doc?.storage_path) {
    await admin.storage.from('documents').remove([doc.storage_path])
  }

  const { error } = await admin.from('comunicados').delete().eq('id', params.id)
  if (error) return dbError(error)
  void logActivity({ userId: auth.user.id, userEmail: auth.user.email ?? null, action: 'cms_comunicados_delete', resourceType: 'comunicados', resourceId: params.id })
  revalidatePath('/comunicados')
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}

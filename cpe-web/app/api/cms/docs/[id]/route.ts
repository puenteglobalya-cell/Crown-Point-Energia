import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase'

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function requireAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !CMS_ADMIN_EMAILS.includes(user.email)) return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin
    .from('documentos')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/inversores')
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseServerAdminClient()

  const { data: doc } = await admin
    .from('documentos')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  if (doc?.storage_path) {
    await admin.storage.from('documents').remove([doc.storage_path])
  }

  const { error } = await admin.from('documentos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/inversores')
  return NextResponse.json({ ok: true })
}

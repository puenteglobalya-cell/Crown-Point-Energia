import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

async function getPortalUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createSupabaseServerAdminClient()
  if (isAdminEmail(user.email)) return { id: user.id, email: user.email, isAdmin: true }
  const { data: roleRow } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (!roleRow?.activo) return null
  return { id: user.id, email: user.email, isAdmin: roleRow.role === 'admin' }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await getPortalUser()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createSupabaseServerAdminClient()
  let q = db.from('report_comments')
    .select('id, texto, created_at, user_id')
    .eq('reporte_id', params.id)
    .order('created_at', { ascending: false })
  if (!u.isAdmin) q = q.eq('user_id', u.id)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const u = await getPortalUser()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { texto } = await req.json()
  if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
    return NextResponse.json({ error: 'texto requerido' }, { status: 400 })
  }
  if (texto.length > 2000) return NextResponse.json({ error: 'Máximo 2000 caracteres' }, { status: 400 })
  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('report_comments')
    .insert({ reporte_id: params.id, user_id: u.id, texto: texto.trim() })
    .select('id, texto, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const u = await getPortalUser()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { commentId } = await req.json()
  if (!commentId) return NextResponse.json({ error: 'commentId requerido' }, { status: 400 })
  const db = createSupabaseServerAdminClient()
  let q = db.from('report_comments').delete().eq('id', commentId).eq('reporte_id', params.id)
  if (!u.isAdmin) q = q.eq('user_id', u.id)
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

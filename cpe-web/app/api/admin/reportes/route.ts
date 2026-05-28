import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  const isAdmin = user?.email && CMS_ADMIN_EMAILS.includes(user.email)
  const db = createSupabaseServerAdminClient()

  const q = db.from('reportes').select('id, titulo, periodo, estado, file_name, file_size, created_at').order('created_at', { ascending: false })
  if (!isAdmin) q.eq('estado', 'publicado')

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user?.email || !CMS_ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { titulo, periodo, datos, html, storage_path, file_name, file_size, estado } = body

  if (!titulo || !periodo || !datos || !html) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('reportes').insert({
    titulo,
    periodo,
    datos,
    html,
    estado: estado ?? 'borrador',
    storage_path: storage_path ?? null,
    file_name: file_name ?? null,
    file_size: file_size ?? null,
    subido_por: user.email,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

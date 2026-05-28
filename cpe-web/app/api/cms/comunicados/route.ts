import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase'

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function isAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email && CMS_ADMIN_EMAILS.includes(user.email)
}

export async function GET() {
  const admin = createSupabaseServerAdminClient()
  const admin_user = await isAdmin()

  const query = admin
    .from('comunicados')
    .select('*')
    .order('fecha', { ascending: false })

  const { data, error } = admin_user ? await query : await query.eq('publicado', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin.from('comunicados').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

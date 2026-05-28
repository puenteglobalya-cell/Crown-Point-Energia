import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'

async function isAdmin() {
  return requireAdminUser()
}

export async function GET() {
  const adminUser = await isAdmin()
  const admin = createSupabaseServerAdminClient()

  const base = admin.from('comunicados').select('*').order('fecha', { ascending: false })
  const { data, error } = await (adminUser ? base : base.eq('publicado', true))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin.from('comunicados').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/comunicados')
  revalidatePath('/')
  return NextResponse.json(data)
}

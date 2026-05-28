import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'

async function getAdmin() {
  return requireAdminUser()
}

export async function GET() {
  const adminUser = await getAdmin()
  const admin = createSupabaseServerAdminClient()

  const base = admin.from('documentos').select('*').order('created_at', { ascending: false })
  const { data, error } = await (adminUser ? base : base.eq('publico', true))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin.from('documentos').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/inversores')
  return NextResponse.json(data)
}

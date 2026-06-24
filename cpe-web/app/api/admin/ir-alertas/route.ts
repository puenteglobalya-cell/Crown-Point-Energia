import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

// GET /api/admin/ir-alertas — list recipients
export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createSupabaseServerClient()
  const { data, error } = await sb
    .from('ir_alert_recipients')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/ir-alertas — add recipient
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nombre, email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const sb = createSupabaseServerClient()
  const { data, error } = await sb
    .from('ir_alert_recipients')
    .insert({ nombre: nombre ?? '', email: email.trim().toLowerCase() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ese email ya está en la lista' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

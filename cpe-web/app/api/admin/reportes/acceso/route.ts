import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const [typesRes, accessRes] = await Promise.all([
    db.from('report_types').select('id, nombre').eq('activo', true).order('id'),
    db.from('report_type_access').select('type_id, role, can_view, can_upload'),
  ])

  return NextResponse.json({
    types: typesRes.data ?? [],
    access: accessRes.data ?? [],
  })
}

export async function PUT(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type_id, role, can_view, can_upload } = await req.json()
  if (!type_id || !role) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('report_type_access').upsert(
    { type_id, role, can_view: !!can_view, can_upload: !!can_upload, updated_at: new Date().toISOString() },
    { onConflict: 'type_id,role' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

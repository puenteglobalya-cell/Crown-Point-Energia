import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

type UserWithRole = {
  id: string
  email: string | undefined
  role: 'viewer' | 'uploader' | 'admin' | null
  activo: boolean
}

async function getUserWithRole(): Promise<UserWithRole | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (user.email && CMS_ADMIN_EMAILS.includes(user.email)) {
    return { id: user.id, email: user.email, role: 'admin', activo: true }
  }

  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (!roleRow) return null

  return {
    id: user.id,
    email: user.email,
    role: roleRow.role as 'viewer' | 'uploader' | 'admin',
    activo: roleRow.activo,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userWithRole = await getUserWithRole()

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('reportes').select('html, estado').eq('id', params.id).single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Unpublished reports: only uploader/admin can view
  if (data.estado !== 'publicado') {
    if (!userWithRole?.activo || userWithRole.role === 'viewer') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  } else {
    // Published reports: any active internal role can view
    if (!userWithRole?.activo) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  return new NextResponse(data.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userWithRole = await getUserWithRole()

  // Only admin can patch reports
  if (!userWithRole?.activo || userWithRole.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('reportes').update({ ...body, updated_at: new Date().toISOString() }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    userId: userWithRole.id,
    userEmail: userWithRole.email ?? null,
    action: 'update_report',
    resourceType: 'reporte',
    resourceId: params.id,
    metadata: body,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userWithRole = await getUserWithRole()

  // Only admin can delete reports
  if (!userWithRole?.activo || userWithRole.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('reportes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    userId: userWithRole.id,
    userEmail: userWithRole.email ?? null,
    action: 'delete_report',
    resourceType: 'reporte',
    resourceId: params.id,
  })

  return NextResponse.json({ ok: true })
}

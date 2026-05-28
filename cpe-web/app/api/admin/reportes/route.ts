import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity, getPermissionsForRole } from '@/lib/roles'

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

  // CMS_ADMIN_EMAILS → always admin
  if (user.email && CMS_ADMIN_EMAILS.includes(user.email)) {
    return { id: user.id, email: user.email, role: 'admin', activo: true }
  }

  // Check user_roles table
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

export async function GET() {
  const userWithRole = await getUserWithRole()

  // Any active internal role can view reports
  if (!userWithRole?.activo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()
  const permissions = await getPermissionsForRole(userWithRole.role!)
  let q = db.from('reportes')
    .select('id, titulo, periodo, estado, file_name, file_size, created_at')
    .order('created_at', { ascending: false })

  if (!permissions.has('view_drafts')) {
    q = q.eq('estado', 'publicado')
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const userWithRole = await getUserWithRole()

  // Only roles with upload_reports permission can create reports
  if (!userWithRole?.activo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const uploadPerms = await getPermissionsForRole(userWithRole.role!)
  if (!uploadPerms.has('upload_reports')) {
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
    subido_por: userWithRole.id,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    userId: userWithRole.id,
    userEmail: userWithRole.email ?? null,
    action: 'upload_report',
    resourceType: 'reporte',
    resourceId: data.id,
    metadata: { titulo, periodo, estado: estado ?? 'borrador' },
  })

  return NextResponse.json(data, { status: 201 })
}

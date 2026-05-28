import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function getAdminUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check CMS_ADMIN_EMAILS first
  if (user.email && CMS_ADMIN_EMAILS.includes(user.email)) return user

  // Check user_roles table for admin role
  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (roleRow?.role === 'admin' && roleRow?.activo) return user

  return null
}

export async function GET() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()

  // List all auth users
  const { data: { users }, error: authError } = await db.auth.admin.listUsers()
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Get all role rows
  const { data: roleRows } = await db.from('user_roles').select('user_id, role, activo')
  const roleMap = new Map((roleRows ?? []).map(r => [r.user_id, r]))

  const result = users.map(u => {
    const roleRow = roleMap.get(u.id)
    const isAdminEmail = u.email && CMS_ADMIN_EMAILS.includes(u.email)
    return {
      id: u.id,
      email: u.email ?? '',
      role: isAdminEmail ? 'admin' : (roleRow?.role ?? null),
      activo: isAdminEmail ? true : (roleRow?.activo ?? null),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'Faltan campos requeridos: email y role' }, { status: 400 })
  }

  if (!['viewer', 'uploader', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') ?? 'https://crownpointenergy.com'

  // Invite user via Supabase Auth
  const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/portal`,
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Insert role row
  const userId = inviteData.user.id
  const { error: roleError } = await db.from('user_roles').upsert({
    user_id: userId,
    role,
    activo: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  await logActivity({
    userId: adminUser.id,
    userEmail: adminUser.email ?? null,
    action: 'invite_user',
    resourceType: 'user',
    resourceId: userId,
    metadata: { email, role },
  })

  return NextResponse.json({ id: userId, email, role }, { status: 201 })
}

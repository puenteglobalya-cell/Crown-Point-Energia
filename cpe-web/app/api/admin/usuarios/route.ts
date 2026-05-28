import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'
import { requireAdminUser, isAdminEmail } from '@/lib/admin-auth'

export async function GET() {
  const adminUser = await requireAdminUser()
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
    const isAdminEmailFlag = isAdminEmail(u.email)
    return {
      id: u.id,
      email: u.email ?? '',
      role: isAdminEmailFlag ? 'admin' : (roleRow?.role ?? null),
      activo: isAdminEmailFlag ? true : (roleRow?.activo ?? null),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminUser()
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

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'
import { requireAdminUser, isAdminEmail } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

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

  // Get all role rows + profiles in parallel
  const [{ data: roleRows }, { data: profileRows }] = await Promise.all([
    db.from('user_roles').select('user_id, role, activo'),
    db.from('user_profiles').select('user_id, dni, nombre, apellido, ubicacion, sector, telefono, notas'),
  ])
  const roleMap    = new Map((roleRows    ?? []).map(r => [r.user_id, r]))
  const profileMap = new Map((profileRows ?? []).map(p => [p.user_id, p]))

  const result = users.map(u => {
    const roleRow = roleMap.get(u.id)
    const profile = profileMap.get(u.id)
    const isAdminEmailFlag = isAdminEmail(u.email)
    return {
      id:              u.id,
      email:           u.email ?? '',
      role:            isAdminEmailFlag ? 'admin' : (roleRow?.role ?? null),
      activo:          isAdminEmailFlag ? true    : (roleRow?.activo ?? null),
      created_at:      u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      dni:             profile?.dni       ?? '',
      nombre:          profile?.nombre    ?? '',
      apellido:        profile?.apellido  ?? '',
      ubicacion:       profile?.ubicacion ?? '',
      sector:          profile?.sector    ?? '',
      telefono:        profile?.telefono  ?? '',
      notas:           profile?.notas     ?? '',
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'Faltan campos requeridos: email y role' }, { status: 400 })
  }

  if (!['viewer', 'uploader', 'admin', 'rrhh', 'accionista'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') ?? 'https://crownpointenergy.com'

  // Invite user via Supabase Auth
  const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/portal/reset-password`,
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

  // Also produce a shareable one-time access link (Área 4, punto 23) — the
  // invite email above may bounce or land in spam; this lets the admin
  // share it directly over Slack/WhatsApp/etc. as a fallback.
  let inviteLink: string | null = null
  try {
    const { data: linkData } = await db.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/portal/reset-password` },
    })
    inviteLink = linkData?.properties?.action_link ?? null
  } catch { /* best-effort — invite email was already sent regardless */ }

  await logActivity({
    userId: adminUser.id,
    userEmail: adminUser.email ?? null,
    action: 'invite_user',
    resourceType: 'user',
    resourceId: userId,
    metadata: { email, role },
  })

  return NextResponse.json({ id: userId, email, role, inviteLink }, { status: 201 })
}

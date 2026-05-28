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
  if (user.email && CMS_ADMIN_EMAILS.includes(user.email)) return user
  const db = createSupabaseServerAdminClient()
  const { data } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  return data?.role === 'admin' && data?.activo ? user : null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data: { user: target }, error } = await db.auth.admin.getUserById(params.id)
  if (error || !target?.email) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crownpointenergy.com'

  // Use anon client so Supabase sends the email via its standard flow
  const anonSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { error: resetError } = await anonSupabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${siteUrl}/portal/reset-password`,
  })

  if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 })

  await logActivity({
    userId: adminUser.id,
    userEmail: adminUser.email ?? null,
    action: 'reset_password',
    resourceType: 'user',
    resourceId: params.id,
    metadata: { targetEmail: target.email },
  })

  return NextResponse.json({ ok: true })
}

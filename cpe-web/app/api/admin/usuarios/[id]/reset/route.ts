import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
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

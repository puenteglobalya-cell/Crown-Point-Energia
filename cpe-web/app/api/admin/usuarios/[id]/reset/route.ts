import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity } from '@/lib/roles'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { enviarInvitacionUsuario } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data: { user: target }, error } = await db.auth.admin.getUserById(params.id)
  if (error || !target?.email) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // TEMP fallback points at the Vercel domain until crownpointenergy.com's
  // DNS migrates — see PENDIENTES.md.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crown-point-energia.vercel.app'

  // generateLink never touches Supabase's own (rate-limited) mailer — it
  // just returns the action link, which we deliver ourselves via Resend.
  // Previously this used resetPasswordForEmail, which DOES send through
  // that limited mailer and could fail with "email rate limit exceeded".
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: 'recovery',
    email: target.email,
    options: { redirectTo: `${siteUrl}/portal/reset-password` },
  })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  const resetLink = linkData.properties?.action_link ?? null
  if (resetLink) {
    await enviarInvitacionUsuario({ email: target.email, link: resetLink, esNuevo: false })
  }

  await logActivity({
    userId: adminUser.id,
    userEmail: adminUser.email ?? null,
    action: 'reset_password',
    resourceType: 'user',
    resourceId: params.id,
    metadata: { targetEmail: target.email },
  })

  return NextResponse.json({ ok: true, resetLink })
}

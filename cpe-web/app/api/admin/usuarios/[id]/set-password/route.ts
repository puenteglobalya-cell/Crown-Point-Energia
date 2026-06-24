import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { logActivity } from '@/lib/roles'
import { dbError } from '@/lib/api-error'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await req.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Mínimo 8 caracteres' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { data: { user: target } } = await db.auth.admin.getUserById(params.id)
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // email_confirm: true confirms the account in case the user never clicked the invite link
  const { error } = await db.auth.admin.updateUserById(params.id, {
    password,
    email_confirm: true,
  })
  if (error) return dbError(error)

  await logActivity({
    userId: adminUser.id,
    userEmail: adminUser.email ?? null,
    action: 'set_provisional_password',
    resourceType: 'user',
    resourceId: params.id,
    metadata: { targetEmail: target.email },
  })

  return NextResponse.json({ ok: true })
}

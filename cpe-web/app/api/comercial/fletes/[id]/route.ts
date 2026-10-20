import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole, logActivity } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const runtime = 'nodejs'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, role } = await getCurrentUserAndRole()
  if (!user || (role?.role !== 'admin' && role?.role !== 'finanzas')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const db = createSupabaseServerAdminClient()
  // ON DELETE CASCADE en fletes.cargamento_id se encarga del flete asociado.
  const { error } = await db.from('cargamentos').delete().eq('id', params.id)
  if (error) return dbError(error)

  await logActivity({
    userId: user.id, userEmail: user.email ?? null, action: 'eliminar_cargamento',
    resourceType: 'cargamento', resourceId: params.id,
  })

  return NextResponse.json({ ok: true })
}

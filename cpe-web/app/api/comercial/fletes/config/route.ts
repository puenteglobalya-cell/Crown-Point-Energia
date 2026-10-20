import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole, logActivity } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, role } = await getCurrentUserAndRole()
  if (!user || (role?.role !== 'admin' && role?.role !== 'finanzas')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const verde = Number(body.umbralVerdePct)
  const amarillo = Number(body.umbralAmarilloPct)
  if (!Number.isFinite(verde) || !Number.isFinite(amarillo) || verde < 0 || amarillo <= verde) {
    return NextResponse.json({ error: 'Umbrales inválidos: el amarillo debe ser mayor que el verde, ambos ≥ 0' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('fletes_config').upsert({
    id: 1, umbral_verde_pct: verde, umbral_amarillo_pct: amarillo, updated_at: new Date().toISOString(),
  })
  if (error) return dbError(error)

  await logActivity({ userId: user.id, userEmail: user.email ?? null, action: 'editar_umbrales_flete', resourceType: 'fletes_config' })

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/admin-auth'
import { patchCmsState } from '@/lib/cms'
import { logActivity } from '@/lib/roles'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

// POST /api/admin/kpi/apply — save extracted KPI fields to cms_fields
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { fields, fieldsEn, period } = body as {
    fields: Record<string, string>
    fieldsEn: Record<string, string>
    period: string
  }

  if (!fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  await patchCmsState({ fields, fieldsEn })

  revalidateTag('cms')
  revalidatePath('/', 'layout')

  await logActivity({
    userId: user.id,
    userEmail: user.email ?? null,
    action: 'kpi_update',
    resourceType: 'cms_fields',
    resourceId: 'kpi',
    metadata: { period, keys: Object.keys(fields) },
  })

  return NextResponse.json({ ok: true })
}

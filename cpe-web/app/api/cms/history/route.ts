import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { getCmsState, patchCmsState, type CMSState } from '@/lib/cms'
import { revalidatePath, revalidateTag } from 'next/cache'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('cms_history')
    .select('id, label, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, id, label } = await req.json() as { action?: string; id?: number; label?: string }

  const db = createSupabaseServerAdminClient()

  // action=snapshot → save current state as a named snapshot
  if (action === 'snapshot') {
    const state = await getCmsState()
    const { error } = await db.from('cms_history').insert({
      snapshot:   state,
      label:      label ?? null,
      created_by: user.email,
    })
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
  }

  // action=restore → restore snapshot by id
  if (action === 'restore' && id) {
    const { data, error } = await db
      .from('cms_history')
      .select('snapshot')
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // Save current state before overwriting
    const current = await getCmsState()
    await db.from('cms_history').insert({
      snapshot:   current,
      label:      `Auto (antes de restaurar #${id})`,
      created_by: user.email,
    })

    await patchCmsState(data.snapshot as CMSState)
    revalidateTag('cms')
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}

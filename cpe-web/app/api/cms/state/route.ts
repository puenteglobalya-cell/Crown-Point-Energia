import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getCmsState, patchCmsState, CMSState } from '@/lib/cms'
import { requireCmsUser } from '@/lib/cms-access'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { logActivity } from '@/lib/roles'

export async function GET() {
  const state = await getCmsState()
  return NextResponse.json(state)
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireCmsUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patch: Partial<CMSState> = await req.json()

  // Snapshot the current state before applying the patch
  try {
    const current = await getCmsState()
    const db = createSupabaseServerAdminClient()
    await db.from('cms_history').insert({
      snapshot:   current,
      label:      null,
      created_by: user.user.email,
    })
  } catch {
    // History is best-effort; don't fail the save
  }

  await patchCmsState(patch)

  void logActivity({ userId: user.user.id, userEmail: user.user.email ?? null, action: 'cms_state_update', resourceType: 'cms_state', metadata: patch })

  // Bust the 'cms' tag cache (unstable_cache in lib/cms.ts) + all page layouts
  revalidateTag('cms')
  revalidatePath('/', 'layout')

  return NextResponse.json({ ok: true })
}

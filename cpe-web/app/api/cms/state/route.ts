import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCmsState, patchCmsState, CMSState } from '@/lib/cms'
import { requireAdminUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export async function GET() {
  const state = await getCmsState()
  return NextResponse.json(state)
}

export async function POST(req: NextRequest) {
  const user = await requireAdminUser()
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
      created_by: user.email,
    })
  } catch {
    // History is best-effort; don't fail the save
  }

  await patchCmsState(patch)

  // Revalidate all public pages so theme/visibility changes are instant
  revalidatePath('/', 'layout')

  return NextResponse.json({ ok: true })
}

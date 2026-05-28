import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCmsState, patchCmsState, CMSState } from '@/lib/cms'
import { requireAdminUser } from '@/lib/admin-auth'

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
  await patchCmsState(patch)

  // Revalidate all public pages so theme/visibility changes are instant
  revalidatePath('/', 'layout')

  return NextResponse.json({ ok: true })
}

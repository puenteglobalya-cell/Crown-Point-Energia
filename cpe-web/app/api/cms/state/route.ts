import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getCmsState, patchCmsState, CMSState } from '@/lib/cms'
import { createSupabaseServerClient } from '@/lib/supabase'

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export async function GET() {
  const state = await getCmsState()
  return NextResponse.json(state)
}

export async function POST(req: NextRequest) {
  // Verify authenticated admin
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email || !CMS_ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patch: Partial<CMSState> = await req.json()
  await patchCmsState(patch)
  revalidateTag('cms')

  return NextResponse.json({ ok: true })
}

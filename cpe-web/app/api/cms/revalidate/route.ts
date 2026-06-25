import { NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  revalidateTag('cms')
  revalidatePath('/', 'layout')

  return NextResponse.json({ ok: true, revalidated: true })
}

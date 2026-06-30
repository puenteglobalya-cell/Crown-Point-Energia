import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { fetchStockQuoteFull, formatCmsFields } from '@/lib/stock'
import { patchCmsState } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const quote = await fetchStockQuoteFull()
    const fields = formatCmsFields(quote)

    await patchCmsState({ fields })
    revalidatePath('/', 'layout')

    return NextResponse.json({ ok: true, price: quote.price, fields })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 502 },
    )
  }
}

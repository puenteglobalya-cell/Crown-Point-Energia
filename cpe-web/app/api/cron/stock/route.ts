import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { fetchStockQuoteFull, formatCmsFields } from '@/lib/stock'
import { patchCmsState } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

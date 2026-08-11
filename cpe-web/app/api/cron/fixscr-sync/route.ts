import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { syncFixscrToSupabase } from '@/lib/fixscr-sync'
import { secureCompare } from '@/lib/secure-compare'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }
  if (!secureCompare(req.headers.get('authorization') ?? '', `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncFixscrToSupabase()
    if (result.errors.length) {
      console.warn('[fixscr-sync] warnings:', result.errors)
    }
    revalidatePath('/inversores', 'page')
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}

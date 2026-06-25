import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()

  // Delete activity_log entries older than 6 months
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 6)

  const { count, error } = await db
    .from('activity_log')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff.toISOString())

  if (error) {
    console.error('[cleanup-logs] activity_log error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cleanup-logs] deleted ${count ?? 0} activity_log rows older than 6 months`)
  return NextResponse.json({ ok: true, deleted: count ?? 0 })
}

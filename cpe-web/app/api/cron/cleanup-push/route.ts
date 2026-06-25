import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import webpush from 'web-push'
import { logger } from '@/lib/logger'

// Runs weekly (Sunday 03:00 UTC) via Vercel Cron.
// Proactively sends a silent push to every subscription and removes stale ones (404/410).
// This complements the reactive cleanup in lib/push.ts (which only cleans on send).

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@crownpointenergy.com',
    pub, priv,
  )
  vapidConfigured = true
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }
  // Vercel Cron passes Authorization: Bearer <CRON_SECRET>
  const auth = req.headers instanceof Headers
    ? req.headers.get('authorization')
    : (req as Request & { headers: Record<string, string> }).headers['authorization']
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  ensureVapid()
  if (!vapidConfigured) {
    return NextResponse.json({ skipped: 'VAPID not configured' })
  }

  const db = createSupabaseServerAdminClient()
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')

  if (error || !subs?.length) {
    return NextResponse.json({ checked: 0, removed: 0 })
  }

  const stale: string[] = []
  const silentPayload = JSON.stringify({ type: 'ping' })

  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        silentPayload,
        { TTL: 0 }, // TTL=0 → deliver immediately or drop; not stored
      )
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) stale.push(s.endpoint)
    }
  }))

  if (stale.length > 0) {
    await db.from('push_subscriptions').delete().in('endpoint', stale)
    logger.info('push-cleanup: removed stale subscriptions', { count: stale.length })
  }

  return NextResponse.json({ checked: subs.length, removed: stale.length })
}

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:admin@crownpointenergy.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, body, url } = await req.json()
  if (!title || !body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url: url || '/portal' })
  let sent = 0, failed = 0
  const stale: string[] = []

  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        payload,
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) stale.push(s.endpoint)
      else failed++
    }
  }))

  // Remove stale (expired/unsubscribed) endpoints
  if (stale.length) {
    await db.from('push_subscriptions').delete().in('endpoint', stale)
  }

  return NextResponse.json({ sent, failed, stale: stale.length })
}

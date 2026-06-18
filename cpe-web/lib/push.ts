import webpush from 'web-push'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@crownpointenergy.com',
    pub,
    priv,
  )
  vapidConfigured = true
}

export async function enviarPushNotificacion({
  title,
  body,
  url = '/portal',
}: {
  title: string
  body:  string
  url?:  string
}): Promise<{ sent: number; failed: number; stale: number }> {
  ensureVapid()
  if (!vapidConfigured) return { sent: 0, failed: 0, stale: 0 }

  const db = createSupabaseServerAdminClient()
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')

  if (!subs?.length) return { sent: 0, failed: 0, stale: 0 }

  const payload   = JSON.stringify({ title, body, url })
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

  if (stale.length) {
    await db.from('push_subscriptions').delete().in('endpoint', stale)
  }

  return { sent, failed, stale: stale.length }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { enviarPushNotificacion } from '@/lib/push'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crownpointenergy.com'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, body, url } = await req.json()
  if (!title || !body) {
    return NextResponse.json({ error: 'title and body son requeridos' }, { status: 400 })
  }

  // Only allow relative paths or same-origin absolute URLs to prevent open redirect
  const safeUrl = typeof url === 'string' && (url.startsWith('/') || url.startsWith(SITE))
    ? url : undefined

  const result = await enviarPushNotificacion({ title, body, url: safeUrl })
  return NextResponse.json(result)
}

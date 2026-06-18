import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { enviarPushNotificacion } from '@/lib/push'

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, body, url } = await req.json()
  if (!title || !body) {
    return NextResponse.json({ error: 'title and body son requeridos' }, { status: 400 })
  }

  const result = await enviarPushNotificacion({ title, body, url })
  return NextResponse.json(result)
}

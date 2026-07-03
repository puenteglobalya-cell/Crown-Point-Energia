import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { checkRateLimit } from '@/lib/ratelimit'
import { looksLikeBot, HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await checkRateLimit(`ir-subscribe:${ip}`, 5, 60 * 60 * 1000) // 5 per hour
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Intentá más tarde.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { nombre, email } = body

    // Bot defense: honeypot + submit timing. Feign success so bots don't learn.
    if (looksLikeBot(body[HONEYPOT_FIELD], body[TIMESTAMP_FIELD])) {
      return NextResponse.json({ ok: true })
    }

    const emailVal = email?.trim().toLowerCase() ?? ''
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const db = createSupabaseServerAdminClient()
    const { error } = await db.from('ir_subscribers').upsert({
      nombre: (nombre ?? '').trim().slice(0, 200),
      email: emailVal,
      activo: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

    if (error) {
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

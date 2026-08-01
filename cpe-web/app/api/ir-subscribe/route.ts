import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { proteger } from '@/lib/proteccion'
import { looksLikeBot, HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'
import { str } from '@/lib/input'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5 per hour per IP, plus the escalating IP blacklist
  const guardia = await proteger(req, {
    nombre: 'ir-subscribe', publico: true, max: 5, ventanaMs: 60 * 60 * 1000,
    mensaje: 'Demasiados intentos. Intentá más tarde.',
  })
  if (!guardia.permitido) return guardia.respuesta

  try {
    const body = await req.json()
    const { nombre, email } = body

    // Bot defense: honeypot + submit timing. Feign success so bots don't learn.
    if (looksLikeBot(body[HONEYPOT_FIELD], body[TIMESTAMP_FIELD])) {
      return NextResponse.json({ ok: true })
    }

    const emailVal = str(email, 320).toLowerCase()
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const db = createSupabaseServerAdminClient()
    const { error } = await db.from('ir_subscribers').upsert({
      nombre: str(nombre, 200),
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

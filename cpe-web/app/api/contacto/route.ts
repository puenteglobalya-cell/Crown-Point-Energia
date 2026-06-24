import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { checkRateLimit } from '@/lib/ratelimit'
import { enviarConfirmacionContacto } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5 submissions per 10 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`contacto:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá unos minutos.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { tipo, nombre, organizacion, email, telefono, mensaje } = body

    const emailVal = email?.trim().toLowerCase() ?? ''
    if (!nombre?.trim() || !emailVal || !mensaje?.trim()) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const db = createSupabaseServerAdminClient()
    const { error } = await db.from('contact_submissions').insert({
      tipo: (tipo ?? '').trim().slice(0, 50),
      nombre: nombre.trim().slice(0, 200),
      organizacion: (organizacion ?? '').trim().slice(0, 200),
      email: emailVal,
      telefono: (telefono ?? '').trim().slice(0, 50),
      mensaje: mensaje.trim().slice(0, 5000),
    })

    if (error) {
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
    }

    enviarConfirmacionContacto({ nombre: nombre.trim(), email: emailVal, asunto: (tipo ?? '').trim() || undefined })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

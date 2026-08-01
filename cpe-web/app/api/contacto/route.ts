import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { proteger } from '@/lib/proteccion'
import { looksLikeBot, HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'
import { enviarConfirmacionContacto } from '@/lib/email'
import { str } from '@/lib/input'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5 submissions per 10 minutes per IP, plus the escalating IP blacklist
  const guardia = await proteger(req, { nombre: 'contacto', publico: true, max: 5, ventanaMs: 10 * 60 * 1000 })
  if (!guardia.permitido) return guardia.respuesta

  try {
    const body = await req.json()
    const { tipo, nombre, organizacion, email, telefono, mensaje } = body

    // Bot defense: honeypot + submit timing. Feign success so bots don't learn.
    if (looksLikeBot(body[HONEYPOT_FIELD], body[TIMESTAMP_FIELD])) {
      return NextResponse.json({ ok: true })
    }

    const nombreVal = str(nombre, 200)
    const emailVal = str(email, 320).toLowerCase()
    const mensajeVal = str(mensaje, 5000)
    const tipoVal = str(tipo, 50)
    const organizacionVal = str(organizacion, 200)
    const telefonoVal = str(telefono, 50)

    if (!nombreVal || !emailVal || !mensajeVal) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const db = createSupabaseServerAdminClient()
    const { error } = await db.from('contact_submissions').insert({
      tipo: tipoVal,
      nombre: nombreVal,
      organizacion: organizacionVal,
      email: emailVal,
      telefono: telefonoVal,
      mensaje: mensajeVal,
    })

    if (error) {
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
    }

    enviarConfirmacionContacto({ nombre: nombreVal, email: emailVal, asunto: tipoVal || undefined })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

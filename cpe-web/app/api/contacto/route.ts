import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { tipo, nombre, organizacion, email, telefono, mensaje } = body

    if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const db = createSupabaseServerAdminClient()
    const { error } = await db.from('contact_submissions').insert({
      tipo: (tipo ?? '').trim(),
      nombre: nombre.trim(),
      organizacion: (organizacion ?? '').trim(),
      email: email.trim(),
      telefono: (telefono ?? '').trim(),
      mensaje: mensaje.trim(),
    })

    if (error) {
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

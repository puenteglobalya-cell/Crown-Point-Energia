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
    const { nombre, email } = body

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

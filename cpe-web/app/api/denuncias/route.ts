import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireComplianceUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { checkRateLimit } from '@/lib/ratelimit'
import { looksLikeBot, HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'
import { enviarNotificacionDenuncia } from '@/lib/email'
import { dbError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

const CATEGORIAS = [
  'anticorrupcion', 'informacion_privilegiada', 'conflicto_interes',
  'acoso_discriminacion', 'fraude_financiero', 'seguridad_ambiente', 'otro',
] as const

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3 submissions per hour per IP — this is a sensitive channel, not a form to spam-test
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`denuncias:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá unos minutos.' }, { status: 429 })
  }

  try {
    const form = await req.formData()
    const g = (k: string) => String(form.get(k) ?? '').trim()

    if (looksLikeBot(form.get(HONEYPOT_FIELD), form.get(TIMESTAMP_FIELD))) {
      return NextResponse.json({ ok: true })
    }

    const categoria = g('categoria')
    const descripcion = g('descripcion')
    const anonimo = g('anonimo') === 'true'
    const fecha_incidente = g('fecha_incidente') || null
    const nombre = anonimo ? '' : g('nombre')
    const email = anonimo ? '' : g('email')
    const telefono = anonimo ? '' : g('telefono')
    const evidencia = form.get('evidencia') as File | null

    if (!CATEGORIAS.includes(categoria as typeof CATEGORIAS[number])) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
    }
    if (!descripcion || descripcion.length < 20) {
      return NextResponse.json({ error: 'Contanos con más detalle qué pasó (mínimo 20 caracteres)' }, { status: 400 })
    }

    const supabase = createSupabaseServerAdminClient()

    let evidencia_path: string | null = null
    let evidencia_name: string | null = null
    let evidencia_size: number | null = null

    if (evidencia && evidencia.size > 0) {
      const MAX_SIZE = 20 * 1024 * 1024
      if (evidencia.size > MAX_SIZE) {
        return NextResponse.json({ error: 'El archivo no puede superar 20 MB' }, { status: 400 })
      }
      const ext = evidencia.name.split('.').pop()?.toLowerCase() ?? ''
      const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx']
      if (!allowedExts.includes(ext)) {
        return NextResponse.json({ error: 'Formato no permitido. Usá PDF, imagen o Word.' }, { status: 400 })
      }
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('denuncias-evidencia').upload(path, evidencia, { upsert: false })
      if (!uploadErr) {
        evidencia_path = path
        evidencia_name = evidencia.name
        evidencia_size = evidencia.size
      }
    }

    const { error: insertErr } = await supabase.from('denuncias_etica').insert({
      categoria, descripcion, fecha_incidente, anonimo,
      nombre, email, telefono,
      evidencia_path, evidencia_name, evidencia_size,
    })

    if (insertErr) {
      return NextResponse.json({ error: 'Error al guardar la denuncia' }, { status: 500 })
    }

    // Best-effort — never include the actual content in the email (sensitive)
    enviarNotificacionDenuncia({ categoria }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET() {
  const user = await requireComplianceUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('denuncias_etica')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireComplianceUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, estado, notas } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (estado !== undefined) update.estado = estado
  if (notas !== undefined) update.notas = notas

  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('denuncias_etica').update(update).eq('id', id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireComplianceUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data: d } = await db.from('denuncias_etica').select('evidencia_path').eq('id', id).single()
  if (d?.evidencia_path) {
    await db.storage.from('denuncias-evidencia').remove([d.evidencia_path])
  }

  const { error } = await db.from('denuncias_etica').delete().eq('id', id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

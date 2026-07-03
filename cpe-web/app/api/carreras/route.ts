import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireHrUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { checkRateLimit } from '@/lib/ratelimit'
import { looksLikeBot, HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'
import { dbError } from '@/lib/api-error'
import { enviarConfirmacionPostulacion } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3 applications per 30 minutes per IP — CV uploads are expensive
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`carreras:${ip}`, 3, 30 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá unos minutos.' }, { status: 429 })
  }

  try {
    const form = await req.formData()
    const g = (k: string) => String(form.get(k) ?? '').trim()

    const nombre   = g('nombre')
    const email    = g('email')
    const telefono = g('telefono')
    const linkedin = g('linkedin')
    const area     = g('area')
    const mensaje  = g('mensaje')
    const cv       = form.get('cv') as File | null

    // Bot defense: honeypot + submit timing. Feign success so bots don't learn.
    if (looksLikeBot(form.get(HONEYPOT_FIELD), form.get(TIMESTAMP_FIELD))) {
      return NextResponse.json({ ok: true })
    }

    if (!nombre || !email || !area) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Structured experience data → stored in JSONB column
    const datos = {
      nivel_estudios:    g('nivel_estudios')    || null,
      carrera:           g('carrera')           || null,
      anios_experiencia: g('anios_experiencia') || null,
      anios_sector:      g('anios_sector')      || null,
      disponibilidad:    g('disponibilidad')    || null,
      relocacion:        g('relocacion')        || null,
      ingles_nivel:      g('ingles_nivel')      || null,
      otros_idiomas:     g('otros_idiomas')     || null,
      pretension:        g('pretension')        || null,
    }

    const supabase = createSupabaseServerAdminClient()

    let cv_path: string | null = null
    let cv_name: string | null = null
    let cv_size: number | null = null

    // Per-email: one application per 24 hours
    const { data: recent } = await supabase
      .from('job_applications')
      .select('id')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
    if (recent && recent.length > 0) {
      return NextResponse.json({ error: 'Ya registramos tu postulación. Podés volver a intentarlo en 24 horas.' }, { status: 429 })
    }

    if (cv && cv.size > 0) {
      const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
      if (cv.size > MAX_SIZE) {
        return NextResponse.json({ error: 'El CV no puede superar 5 MB' }, { status: 400 })
      }

      const ext = cv.name.split('.').pop()?.toLowerCase() ?? ''
      const allowedExts = ['pdf', 'doc', 'docx']
      const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedExts.includes(ext) || !allowedMimes.includes(cv.type)) {
        return NextResponse.json({ error: 'Formato no permitido. Usá PDF, DOC o DOCX.' }, { status: 400 })
      }

      const path = `carreras/${Date.now()}-${nombre.replace(/\s+/g, '_').slice(0, 40)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, cv, { upsert: false })

      if (!uploadErr) {
        cv_path = path
        cv_name = cv.name
        cv_size = cv.size
      }
    }

    const { error: insertErr } = await supabase.from('job_applications').insert({
      nombre, email, telefono, linkedin, area, mensaje,
      cv_path, cv_name, cv_size,
      datos,
    })

    if (insertErr) {
      return NextResponse.json({ error: 'Error al guardar la postulación' }, { status: 500 })
    }

    enviarConfirmacionPostulacion({ nombre, email, area })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET() {
  const user = await requireHrUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServerAdminClient()
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return dbError(error)
  }

  return NextResponse.json(data ?? [])
}

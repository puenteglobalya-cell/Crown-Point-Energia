import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireHrUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const nombre   = String(form.get('nombre') ?? '').trim()
    const email    = String(form.get('email') ?? '').trim()
    const telefono = String(form.get('telefono') ?? '').trim()
    const linkedin = String(form.get('linkedin') ?? '').trim()
    const area     = String(form.get('area') ?? '').trim()
    const mensaje  = String(form.get('mensaje') ?? '').trim()
    const cv       = form.get('cv') as File | null

    if (!nombre || !email || !mensaje) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createSupabaseServerAdminClient()

    let cv_path: string | null = null
    let cv_name: string | null = null
    let cv_size: number | null = null

    if (cv && cv.size > 0) {
      const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
      if (cv.size > MAX_SIZE) {
        return NextResponse.json({ error: 'El CV no puede superar 10 MB' }, { status: 400 })
      }

      const ext = cv.name.split('.').pop()?.toLowerCase() ?? 'pdf'
      const allowed = ['pdf', 'doc', 'docx']
      if (!allowed.includes(ext)) {
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
    })

    if (insertErr) {
      return NextResponse.json({ error: 'Error al guardar la postulación' }, { status: 500 })
    }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

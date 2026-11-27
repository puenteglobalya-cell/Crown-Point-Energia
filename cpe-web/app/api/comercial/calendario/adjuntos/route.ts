import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'
import { safeContentType } from '@/lib/upload-mime'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'txt']

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Form data inválido' }, { status: 400 })

  const notaId = String(form.get('nota_id') ?? '')
  const file = form.get('file') as File | null
  if (!UUID_RE.test(notaId)) return NextResponse.json({ error: 'nota_id inválido' }, { status: 400 })
  if (!file || file.size === 0) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'El archivo no puede superar 10 MB' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: `Formato no permitido. Usá: ${ALLOWED_EXTS.join(', ')}` }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  // La nota tiene que existir -- evita adjuntar a un id inventado.
  const { data: nota } = await db.from('comercial_calendario_notas').select('id').eq('id', notaId).maybeSingle()
  if (!nota) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const path = `calendario-comercial/${notaId}/${Date.now()}-${safeName}`

  const { error: uploadErr } = await db.storage
    .from('documents')
    .upload(path, file, { upsert: false, contentType: safeContentType(ext) })
  if (uploadErr) return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })

  const { data, error } = await db.from('comercial_calendario_adjuntos').insert({
    nota_id: notaId, storage_path: path, file_name: file.name, file_size: file.size, created_by: user.id,
  }).select('id, nota_id, file_name, file_size, created_at').single()
  if (error) return dbError(error)

  return NextResponse.json(data)
}

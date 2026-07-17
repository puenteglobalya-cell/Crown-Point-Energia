import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'
import { enviarNotificacionDocumentoIR } from '@/lib/email'

const CATEGORIA_LABELS: Record<string, string> = {
  directorio: 'Directorio', cap_table: 'Cap table', legal: 'Legal', otro: 'Otro',
}

export const dynamic = 'force-dynamic'

const CATEGORIAS = ['directorio', 'cap_table', 'legal', 'otro'] as const

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('investor_documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()

  try {
    const form = await req.formData()
    const titulo      = String(form.get('titulo') ?? '').trim()
    const descripcion = String(form.get('descripcion') ?? '').trim()
    const categoria    = String(form.get('categoria') ?? 'otro')
    const file         = form.get('file') as File | null

    if (!titulo || !file || file.size === 0) {
      return NextResponse.json({ error: 'Falta título o archivo' }, { status: 400 })
    }
    if (!CATEGORIAS.includes(categoria as typeof CATEGORIAS[number])) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
    }

    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo no puede superar 50 MB' }, { status: 400 })
    }

    const path = `${categoria}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadErr } = await db.storage.from('investor-documents').upload(path, file, { upsert: false })
    if (uploadErr) return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })

    const { data, error } = await db.from('investor_documents').insert({
      titulo, descripcion, categoria,
      storage_path: path, file_name: file.name, file_size: file.size,
      created_by: user.id,
    }).select().single()

    if (error) return dbError(error)

    // Notify accionista users — best-effort, never blocks the upload response
    notifyAccionistas(db, titulo, CATEGORIA_LABELS[categoria] ?? categoria).catch(() => {})

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const { data: doc } = await db.from('investor_documents').select('storage_path').eq('id', id).single()
  if (doc?.storage_path) {
    await db.storage.from('investor-documents').remove([doc.storage_path])
  }

  const { error } = await db.from('investor_documents').delete().eq('id', id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

async function notifyAccionistas(
  db: ReturnType<typeof createSupabaseServerAdminClient>,
  titulo: string,
  categoriaLabel: string,
) {
  const { data: roles } = await db.from('user_roles').select('user_id').eq('role', 'accionista').eq('activo', true)
  if (!roles || roles.length === 0) return

  const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
  const ids = new Set(roles.map(r => r.user_id))
  const recipients = users.filter(u => ids.has(u.id) && u.email).map(u => u.email!)

  await enviarNotificacionDocumentoIR({ titulo, categoria: categoriaLabel, recipients })
}

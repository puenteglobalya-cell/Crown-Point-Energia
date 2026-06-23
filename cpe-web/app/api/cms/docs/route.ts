import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

const MAX_FILE_SIZE = 52_428_800 // 50 MB — matches Supabase bucket limit

async function getAdmin() {
  return requireAdminUser()
}

export async function GET() {
  const adminUser = await getAdmin()
  const admin = createSupabaseServerAdminClient()

  const base = admin.from('documentos').select('*').order('created_at', { ascending: false })
  const { data, error } = await (adminUser ? base : base.eq('publico', true))
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Explicit allowlist — prevents mass assignment of id, created_at, etc.
  const { titulo_es, titulo_en, tipo, periodo, storage_path, file_name, file_size, publico } = body

  if (typeof file_size === 'number' && file_size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx 50 MB)' }, { status: 400 })
  }

  const SAFE_PATH_RE = /^[A-Za-z0-9_\-./]+$/
  if (storage_path && !(SAFE_PATH_RE.test(storage_path) && !storage_path.includes('..'))) {
    return NextResponse.json({ error: 'storage_path inválido' }, { status: 400 })
  }

  const record = { titulo_es, titulo_en, tipo, periodo, storage_path, file_name, file_size, publico }
  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin.from('documentos').insert(record).select().single()
  if (error) return dbError(error)

  revalidatePath('/inversores')
  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

async function isAdmin() {
  return requireAdminUser()
}

export async function GET() {
  const adminUser = await isAdmin()
  const admin = createSupabaseServerAdminClient()

  const base = admin.from('comunicados').select('*').order('fecha', { ascending: false })
  const { data, error } = await (adminUser ? base : base.eq('publicado', true))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Explicit allowlist — prevents mass assignment of id, created_at, etc.
  const { fecha, titulo_es, titulo_en, resumen_es, resumen_en, url, storage_path, file_name, tipo, publicado } = body

  const SAFE_PATH_RE = /^[A-Za-z0-9_\-./]+$/
  if (storage_path && !(SAFE_PATH_RE.test(storage_path) && !storage_path.includes('..'))) {
    return NextResponse.json({ error: 'storage_path inválido' }, { status: 400 })
  }

  const record = { fecha, titulo_es, titulo_en, resumen_es, resumen_en, url, storage_path, file_name, tipo, publicado }

  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin.from('comunicados').insert(record).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/comunicados')
  revalidatePath('/')
  return NextResponse.json(data)
}

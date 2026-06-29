import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'
import { getPostgresClient } from '@/lib/postgres-direct'

export async function GET() {
  try {
    const isAdmin = await requireAdminUser()
    const sql = getPostgresClient()

    const query = isAdmin
      ? `SELECT * FROM ir_documents ORDER BY fecha DESC NULLS LAST`
      : `SELECT * FROM ir_documents WHERE publicado = true ORDER BY fecha DESC NULLS LAST`

    const data = await sql.unsafe(query)
    return NextResponse.json(data)
  } catch (e) {
    console.error('IR Docs API error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!await requireAdminUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { categoria, entidad, fecha, periodo, tipo, titulo_en, titulo_es, url, publicado } = body

  if (!url || !titulo_es || !categoria) {
    return NextResponse.json({ error: 'Faltan campos requeridos: url, titulo_es, categoria' }, { status: 400 })
  }

  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin
    .from('ir_documents')
    .insert({ categoria, entidad: entidad ?? 'CPI', fecha, periodo, tipo, titulo_en, titulo_es, url, publicado: publicado ?? true })
    .select()
    .single()

  if (error) return dbError(error)
  revalidatePath('/inversores')
  return NextResponse.json(data, { status: 201 })
}

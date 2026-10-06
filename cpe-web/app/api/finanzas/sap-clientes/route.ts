import { NextRequest, NextResponse } from 'next/server'
import { requireFinanzasUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { parsearClientesSapExcel } from '@/lib/parsers/padronAgip'
import { logActivity } from '@/lib/roles'

export const runtime = 'nodejs'

export async function GET() {
  const user = await requireFinanzasUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { count } = await db.from('sap_clientes').select('*', { count: 'exact', head: true })
  const { data: ultimo } = await db
    .from('sap_clientes')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ total: count ?? 0, ultimaCarga: ultimo?.updated_at ?? null })
}

export async function POST(req: NextRequest) {
  const user = await requireFinanzasUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo Excel de clientes SAP.' }, { status: 400 })
  }

  let clientes
  try {
    clientes = await parsearClientesSapExcel(await file.arrayBuffer())
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
  if (clientes.length === 0) {
    return NextResponse.json({ error: 'No se encontraron clientes con CUIT y código SAP en el Excel.' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const filas = clientes.map(c => ({
    cuit: c.cuit, codigo_sap: c.codigoSap, razon_social: c.razonSocial, updated_at: new Date().toISOString(),
  }))
  // Upsert en lotes para no exceder el límite de una sola request a PostgREST.
  const LOTE = 1000
  for (let i = 0; i < filas.length; i += LOTE) {
    const { error } = await db.from('sap_clientes').upsert(filas.slice(i, i + LOTE), { onConflict: 'cuit' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity({
    userId: user.id, userEmail: user.email ?? '', action: 'cargar_clientes_sap',
    resourceType: 'sap_clientes', metadata: { total: clientes.length, archivo: file.name },
  })

  return NextResponse.json({ total: clientes.length })
}

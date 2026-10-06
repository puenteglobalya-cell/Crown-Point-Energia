import { NextRequest, NextResponse } from 'next/server'
import { requireFinanzasUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { buscarClientesEnPadron, type ClienteSap } from '@/lib/parsers/padronAgip'
import { logActivity } from '@/lib/roles'

export const runtime = 'nodejs'
export const maxDuration = 300

// El padrón de AGIP pesa decenas/cientos de MB (millones de líneas) -- se
// sube directo del browser a Supabase Storage (bucket "documents") y acá
// sólo se recibe el path, se descarga en streaming y se compara línea por
// línea contra los clientes SAP cargados, sin pasar el archivo entero por
// el body de esta request (Vercel limita el tamaño de body de las
// funciones serverless).
export async function POST(req: NextRequest) {
  const user = await requireFinanzasUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { path } = await req.json().catch(() => ({ path: null }))
  if (!path || typeof path !== 'string' || !path.startsWith('padron-agip/')) {
    return NextResponse.json({ error: 'Falta el path del padrón subido.' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  const { data: clientesRows, error: clientesErr } = await db
    .from('sap_clientes')
    .select('cuit, codigo_sap, razon_social')
  if (clientesErr) return NextResponse.json({ error: clientesErr.message }, { status: 500 })
  if (!clientesRows || clientesRows.length === 0) {
    return NextResponse.json({ error: 'No hay clientes SAP cargados todavía -- subí primero el Excel de clientes.' }, { status: 400 })
  }
  const clientesPorCuit = new Map<string, ClienteSap>(
    clientesRows.map(c => [c.cuit, { cuit: c.cuit, codigoSap: c.codigo_sap, razonSocial: c.razon_social ?? '' }])
  )

  const { data: descarga, error: descargaErr } = await db.storage.from('documents').download(path)
  if (descargaErr || !descarga) {
    return NextResponse.json({ error: descargaErr?.message ?? 'No se pudo descargar el padrón subido.' }, { status: 400 })
  }

  let matches
  try {
    matches = await buscarClientesEnPadron(descarga.stream(), clientesPorCuit)
  } catch (e) {
    return NextResponse.json({ error: `Error leyendo el padrón: ${(e as Error).message}` }, { status: 400 })
  } finally {
    await db.storage.from('documents').remove([path])
  }

  await logActivity({
    userId: user.id, userEmail: user.email ?? '', action: 'procesar_padron_agip',
    resourceType: 'padron_agip', metadata: { matches: matches.length },
  })

  matches.sort((a, b) => a.razonSocialSap.localeCompare(b.razonSocialSap))
  return NextResponse.json({ matches })
}

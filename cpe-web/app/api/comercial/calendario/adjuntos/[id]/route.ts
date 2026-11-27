import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Descarga vía signed URL — el bucket 'documents' es privado, nunca se
// expone una ruta pública directa al archivo.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data: adjunto } = await db.from('comercial_calendario_adjuntos').select('storage_path').eq('id', params.id).maybeSingle()
  if (!adjunto) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await db.storage.from('documents').createSignedUrl(adjunto.storage_path, 300)
  if (error || !data) return NextResponse.json({ error: 'Error al generar el enlace' }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data: adjunto } = await db.from('comercial_calendario_adjuntos').select('storage_path').eq('id', params.id).maybeSingle()
  if (!adjunto) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.storage.from('documents').remove([adjunto.storage_path])
  const { error } = await db.from('comercial_calendario_adjuntos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

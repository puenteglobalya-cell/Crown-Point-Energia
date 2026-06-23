import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'

async function checkAdmin(req?: NextRequest) {
  if (req && !isSameOrigin(req)) return null
  return requireAdminUser()
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createSupabaseServerAdminClient()

  const [grupos, carpetas, carpetaGrupos, documentos, usuarioGrupos] = await Promise.all([
    db.from('bib_grupos').select('*').order('orden'),
    db.from('bib_carpetas').select('*').order('orden'),
    db.from('bib_carpeta_grupos').select('*'),
    db.from('bib_documentos').select('*').order('created_at', { ascending: false }),
    db.from('bib_usuario_grupos').select('*'),
  ])

  const { data: { users } } = await db.auth.admin.listUsers({ perPage: 500 })

  return NextResponse.json({
    grupos: grupos.data ?? [],
    carpetas: carpetas.data ?? [],
    carpetaGrupos: carpetaGrupos.data ?? [],
    documentos: documentos.data ?? [],
    usuarios: (users ?? []).map(u => ({ id: u.id, email: u.email ?? '', created_at: u.created_at })),
    usuarioGrupos: usuarioGrupos.data ?? [],
  })
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createSupabaseServerAdminClient()
  const body = await req.json()
  const { action } = body

  if (action === 'create_carpeta') {
    const { nombre, descripcion } = body
    const { data, error } = await db.from('bib_carpetas').insert({ nombre, descripcion: descripcion ?? '' }).select().single()
    if (error) return dbError(error)
    return NextResponse.json(data)
  }

  if (action === 'update_carpeta') {
    const { id, nombre, descripcion, activa, orden } = body
    const patch: Record<string, unknown> = {}
    if (nombre !== undefined) patch.nombre = nombre
    if (descripcion !== undefined) patch.descripcion = descripcion
    if (activa !== undefined) patch.activa = activa
    if (orden !== undefined) patch.orden = orden
    const { error } = await db.from('bib_carpetas').update(patch).eq('id', id)
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_carpeta') {
    const { id } = body
    const { error } = await db.from('bib_carpetas').delete().eq('id', id)
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_carpeta_grupos') {
    const { carpeta_id, grupo_ids } = body
    await db.from('bib_carpeta_grupos').delete().eq('carpeta_id', carpeta_id)
    if (grupo_ids.length > 0) {
      const { error } = await db.from('bib_carpeta_grupos').insert(
        (grupo_ids as number[]).map(grupo_id => ({ carpeta_id, grupo_id }))
      )
      if (error) return dbError(error)
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_usuario_grupos') {
    const { user_id, grupo_ids } = body
    await db.from('bib_usuario_grupos').delete().eq('user_id', user_id)
    if (grupo_ids.length > 0) {
      const { error } = await db.from('bib_usuario_grupos').insert(
        (grupo_ids as number[]).map(grupo_id => ({ user_id, grupo_id }))
      )
      if (error) return dbError(error)
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'create_doc') {
    const { carpeta_id, nombre, path, size_bytes, mime_type } = body
    const { data, error } = await db.from('bib_documentos').insert({
      carpeta_id, nombre, path, size_bytes, mime_type, vigente: false,
    }).select().single()
    if (error) return dbError(error)
    return NextResponse.json(data)
  }

  if (action === 'set_vigente') {
    const { doc_id, carpeta_id } = body
    await db.from('bib_documentos').update({ vigente: false }).eq('carpeta_id', carpeta_id)
    const { error } = await db.from('bib_documentos').update({ vigente: true }).eq('id', doc_id)
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_doc') {
    const { doc_id, path } = body
    await db.from('bib_documentos').delete().eq('id', doc_id)
    await db.storage.from('biblioteca').remove([path])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity, getPermissionsForRole } from '@/lib/roles'
import { isAdminEmail } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'

async function getUserWithRole() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (isAdminEmail(user.email)) {
    return { id: user.id, email: user.email, role: 'admin' as const, activo: true }
  }

  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (!roleRow) return null

  return { id: user.id, email: user.email, role: roleRow.role as 'viewer' | 'uploader' | 'admin', activo: roleRow.activo }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userWithRole = await getUserWithRole()
  if (!userWithRole?.activo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const db = createSupabaseServerAdminClient()

  if (req.nextUrl.searchParams.get('format') === 'json') {
    const { data, error } = await db.from('reportes')
      .select('id, type_id, titulo, periodo, estado, datos')
      .eq('id', params.id).single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (data.estado !== 'publicado') {
      const permissions = await getPermissionsForRole(userWithRole.role)
      if (!permissions.has('view_drafts')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  }

  const { data, error } = await db.from('reportes').select('html, estado').eq('id', params.id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Drafts require view_drafts permission
  if (data.estado !== 'publicado') {
    const permissions = await getPermissionsForRole(userWithRole.role)
    if (!permissions.has('view_drafts')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  return new NextResponse(data.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userWithRole = await getUserWithRole()

  if (!userWithRole?.activo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const db = createSupabaseServerAdminClient()

  // Branch: merge update (datos + html)
  if ('datos' in body || 'html' in body) {
    const uploadPerms = await getPermissionsForRole(userWithRole.role)
    if (!uploadPerms.has('upload_reports')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { datos, html, titulo, periodo, estado: newEstado } = body
    if (!datos || !html) return NextResponse.json({ error: 'Faltan datos o html' }, { status: 400 })

    const VALID_ESTADOS = ['borrador', 'publicado']
    const patch: Record<string, unknown> = { datos, html, updated_at: new Date().toISOString() }
    if (titulo) patch.titulo = String(titulo).slice(0, 500)
    if (periodo) patch.periodo = String(periodo).slice(0, 40)
    if (newEstado && VALID_ESTADOS.includes(newEstado)) patch.estado = newEstado

    const { error } = await db.from('reportes').update(patch).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      userId: userWithRole.id,
      userEmail: userWithRole.email ?? null,
      action: 'update_report',
      resourceType: 'reporte',
      resourceId: params.id,
      metadata: { titulo, periodo, tipo: 'merge_facturacion' },
    })

    return NextResponse.json({ ok: true, id: params.id })
  }

  // Branch: estado-only update (admin only)
  if (userWithRole.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only estado is patchable — prevents overwriting titulo, datos, html, subido_por, etc.
  const VALID_ESTADOS = ['borrador', 'publicado'] as const
  type Estado = typeof VALID_ESTADOS[number]
  if (!VALID_ESTADOS.includes(body.estado as Estado)) {
    return NextResponse.json({ error: 'estado inválido' }, { status: 400 })
  }
  const patch = { estado: body.estado as Estado, updated_at: new Date().toISOString() }

  const { error } = await db.from('reportes').update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    userId: userWithRole.id,
    userEmail: userWithRole.email ?? null,
    action: 'update_report',
    resourceType: 'reporte',
    resourceId: params.id,
    metadata: body,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userWithRole = await getUserWithRole()

  if (!userWithRole?.activo || userWithRole.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()

  // Fetch storage_path before deleting so we can clean up the file
  const { data: row } = await db.from('reportes').select('storage_path').eq('id', params.id).single()
  if (row?.storage_path) {
    await db.storage.from('documents').remove([row.storage_path])
  }

  const { error } = await db.from('reportes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity({
    userId: userWithRole.id,
    userEmail: userWithRole.email ?? null,
    action: 'delete_report',
    resourceType: 'reporte',
    resourceId: params.id,
  })

  return NextResponse.json({ ok: true })
}

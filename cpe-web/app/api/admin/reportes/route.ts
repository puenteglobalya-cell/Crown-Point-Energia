import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { logActivity, getPermissionsForRole } from '@/lib/roles'
import { isAdminEmail } from '@/lib/admin-auth'
import { isSameOrigin } from '@/lib/csrf'
import { dbError } from '@/lib/api-error'
import { FINANZAS_REPORT_TYPES } from '@/lib/permissions-config'

const MAX_FILE_SIZE = 52_428_800 // 50 MB — matches Supabase bucket limit

type UserWithRole = {
  id: string
  email: string | undefined
  role: 'viewer' | 'uploader' | 'admin' | 'rrhh' | 'accionista' | 'finanzas' | null
  activo: boolean
}

async function getUserWithRole(): Promise<UserWithRole | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (isAdminEmail(user.email)) {
    return { id: user.id, email: user.email, role: 'admin', activo: true }
  }

  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (!roleRow) return null

  return {
    id: user.id,
    email: user.email,
    role: roleRow.role as 'viewer' | 'uploader' | 'admin' | 'rrhh' | 'accionista' | 'finanzas',
    activo: roleRow.activo,
  }
}

export async function GET() {
  const userWithRole = await getUserWithRole()

  if (!userWithRole?.activo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()
  const permissions = await getPermissionsForRole(userWithRole.role!)

  // Determine which report types this role can view
  // Admin role and admin emails bypass type-level access control
  let visibleTypes: string[] | null = null
  const isAdmin = isAdminEmail(userWithRole.email) || userWithRole.role === 'admin'
  if (!isAdmin) {
    const { data: typeAccess } = await db
      .from('report_type_access')
      .select('type_id')
      .eq('role', userWithRole.role!)
      .eq('can_view', true)
    // If table doesn't exist yet (migration not run), fall back to allow all
    visibleTypes = typeAccess ? typeAccess.map(r => r.type_id) : null
  }

  let q = db.from('reportes')
    .select('id, type_id, titulo, periodo, estado, file_name, file_size, created_at')
    .order('created_at', { ascending: false })

  if (!permissions.has('view_drafts')) {
    q = q.eq('estado', 'publicado')
  }

  if (visibleTypes !== null && visibleTypes.length > 0) {
    q = q.in('type_id', visibleTypes)
  } else if (visibleTypes !== null && visibleTypes.length === 0) {
    // Role has no access to any type
    return NextResponse.json([])
  }

  const { data, error } = await q
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userWithRole = await getUserWithRole()

  if (!userWithRole?.activo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const uploadPerms = await getPermissionsForRole(userWithRole.role!)
  if (!uploadPerms.has('upload_reports')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Explicit allowlist — subido_por comes from session, not from request body
  const { type_id, titulo, periodo, datos, html, storage_path, file_name, file_size, estado } = body

  if (!titulo || !periodo || !datos || !html) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  if (typeof file_size === 'number' && file_size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx 50 MB)' }, { status: 400 })
  }

  const VALID_ESTADOS = ['borrador', 'publicado']
  const estadoFinal = VALID_ESTADOS.includes(estado) ? estado : 'borrador'

  // Allowlist storage_path to prevent path traversal (incl. encoded variants like ..%2f).
  // Only permit alphanumeric, dash, underscore, dot, and forward slash.
  const SAFE_PATH_RE = /^[A-Za-z0-9_\-./]+$/
  const safePath = typeof storage_path === 'string' && SAFE_PATH_RE.test(storage_path) && !storage_path.includes('..')
    ? storage_path.replace(/^\/+/, '')
    : null

  const VALID_TYPES = ['ingresos', 'produccion', 'financiero', 'accionista', 'henry_hub', 'ice_brent', 'facturacion']
  if (typeof type_id !== 'string' || !VALID_TYPES.includes(type_id)) {
    return NextResponse.json({ error: `Tipo de reporte inválido: ${type_id}` }, { status: 400 })
  }
  // 'finanzas' is sandboxed to its own sub-portal — can only touch financial report types
  if (userWithRole.role === 'finanzas' && !(FINANZAS_REPORT_TYPES as readonly string[]).includes(type_id)) {
    return NextResponse.json({ error: 'Tu rol solo puede subir reportes Financiero o Facturación' }, { status: 403 })
  }
  const typeIdFinal = type_id

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('reportes').insert({
    type_id:      typeIdFinal,
    titulo:       String(titulo).slice(0, 500),
    periodo:      String(periodo).slice(0, 40),
    datos,
    html,
    estado:       estadoFinal,
    storage_path: safePath,
    file_name:    file_name ? String(file_name).slice(0, 255) : null,
    file_size:    file_size ?? null,
    subido_por:   userWithRole.id,  // always from session — never from body
  }).select('id').single()

  if (error) return dbError(error)

  await logActivity({
    userId: userWithRole.id,
    userEmail: userWithRole.email ?? null,
    action: 'upload_report',
    resourceType: 'reporte',
    resourceId: data.id,
    metadata: { titulo, periodo, estado: estado ?? 'borrador' },
  })

  return NextResponse.json(data, { status: 201 })
}

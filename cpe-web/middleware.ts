import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

type CookieEntry = { name: string; value: string; options?: CookieOptions }
type RoleRow = { role: string; activo: boolean }

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://crownpointenergy.com https://*.supabase.co https://*.tile.openstreetmap.org",
    "connect-src 'self' https://*.supabase.co https://supabase.co wss://*.supabase.co https://*.tile.openstreetmap.org",
    "media-src 'self' https://*.supabase.co",
    "worker-src 'self' blob:",
    "frame-src https://www.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}

// Fast path: read role from JWT app_metadata (set by sync_role_to_jwt trigger).
// Only trusts the JWT when activo===true — if false, we fall back to DB so that
// a re-enabled user isn't locked out for the full JWT TTL (~1 hour).
function roleFromJwt(user: { app_metadata?: Record<string, unknown> } | null): RoleRow | null {
  const m = user?.app_metadata
  if (m && typeof m.role === 'string' && m.activo === true) {
    return { role: m.role, activo: true }
  }
  return null
}

// Slow path: DB query (used only when JWT lacks role claims — i.e. tokens issued
// before the sync trigger was installed, or first login before role is assigned).
async function getRoleRow(userId: string): Promise<RoleRow | null> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await Promise.race([
      db.from('user_roles').select('role, activo').eq('user_id', userId).single(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])
    if (error) return null
    return data as RoleRow
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  requestHeaders.set('x-nonce', nonce)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet: CookieEntry[]) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Resolve role once per request — JWT fast path, DB fallback.
  // Memoized so multiple checks in the same request only query DB once.
  let _roleRow: RoleRow | null | undefined = undefined
  async function getRole(): Promise<RoleRow | null> {
    if (_roleRow !== undefined) return _roleRow
    _roleRow = roleFromJwt(user) ?? (user ? await getRoleRow(user.id) : null)
    return _roleRow
  }

  // ── Portal auth ──────────────────────────────────────────────────────────
  if (
    (pathname === '/portal' || pathname.startsWith('/portal/')) &&
    !pathname.startsWith('/portal/login') &&
    !pathname.startsWith('/portal/mfa') &&
    !pathname.startsWith('/portal/reset-password')
  ) {
    if (!user) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (!isAdminEmail) {
      const roleRow = await getRole()
      if (!roleRow?.activo) {
        return NextResponse.redirect(new URL('/portal/login', request.url))
      }
    }
  }

  // Logged-in admin on /portal/login → redirect to /portal
  if (pathname === '/portal/login' && user) {
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (isAdminEmail) return NextResponse.redirect(new URL('/portal', request.url))
  }

  // ── Admin auth ───────────────────────────────────────────────────────────
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && !pathname.startsWith('/admin/login') && !pathname.startsWith('/admin/reset-password')) {
    const isAdminEmailFlag = user?.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (!isAdminEmailFlag) {
      let userRole: string | null = null
      if (user) {
        const roleRow = await getRole()
        if (roleRow?.activo) userRole = roleRow.role
      }

      if (pathname.startsWith('/admin/rrhh')) {
        if (userRole !== 'rrhh' && userRole !== 'admin') {
          return NextResponse.redirect(new URL('/admin/login', request.url))
        }
      } else {
        if (userRole !== 'admin') {
          return NextResponse.redirect(new URL('/admin/login', request.url))
        }
      }
    }
  }

  // Logged-in admin on /admin/login → redirect to /admin
  if (pathname === '/admin/login' && user) {
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (isAdminEmail) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    const roleRow = await getRole()
    if (roleRow?.role === 'admin' && roleRow?.activo) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ── Biblioteca auth ──────────────────────────────────────────────────────
  if (pathname.startsWith('/biblioteca')) {
    if (!user) return NextResponse.redirect(new URL('/portal/login', request.url))
  }

  // ── Infografía: portal users only ────────────────────────────────────────
  if (pathname.startsWith('/infografia')) {
    if (!user) return NextResponse.redirect(new URL('/portal/login', request.url))
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (!isAdminEmail) {
      const roleRow = await getRole()
      if (!roleRow?.activo) return NextResponse.redirect(new URL('/portal/login', request.url))
    }
  }

  // ── Maintenance mode ─────────────────────────────────────────────────────
  const isAdminRoute    = pathname.startsWith('/admin')
  const isPortalRoute   = pathname.startsWith('/portal')
  const isApiRoute      = pathname.startsWith('/api')
  const isBibliotecaRoute = pathname.startsWith('/biblioteca')
  const isMaintenancePage = pathname === '/maintenance'

  if (!isAdminRoute && !isPortalRoute && !isApiRoute && !isBibliotecaRoute && !isMaintenancePage) {
    try {
      const timeout = new Promise<null>(r => setTimeout(() => r(null), 2000))
      const result = await Promise.race([
        supabase.from('cms_settings').select('maintenance').eq('id', 1).single()
          .then(r => r.data),
        timeout,
      ])
      if (result?.maintenance === true) {
        return NextResponse.redirect(new URL('/maintenance', request.url))
      }
    } catch {}
  }

  if (!isApiRoute) {
    supabaseResponse.headers.set('Content-Security-Policy', buildCsp(nonce))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

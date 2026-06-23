import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

type CookieEntry = { name: string; value: string; options?: CookieOptions }

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // nonce covers inline scripts; strict-dynamic allows scripts loaded by trusted scripts.
    // unsafe-inline is ignored by nonce-aware browsers but kept as fallback for older ones.
    // CDN hosts are kept as fallback too; strict-dynamic would drop them in modern browsers.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
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

// Use service role to bypass RLS when checking user_roles in middleware
async function getRoleRow(userId: string) {
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
    return data as { role: string; activo: boolean } | null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Per-request nonce for Content-Security-Policy
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Propagate pathname + nonce so layout.tsx can use them
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

  // ── Portal auth ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/portal') && !pathname.startsWith('/portal/login')) {
    if (!user) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    // Check role: CMS_ADMIN_EMAILS are always allowed; others need an active role row
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (!isAdminEmail) {
      const roleRow = await getRoleRow(user.id)
      if (!roleRow?.activo) {
        return NextResponse.redirect(new URL('/portal/login', request.url))
      }
    }
  }

  // Logged-in admin on /portal/login → redirect to /portal
  // NOTE: Only redirect CMS admin emails here to avoid redirect loops.
  // Regular portal users are redirected by the login form itself (window.location.href).
  // Calling getRoleRow() here + at /portal can cause race-condition redirect loops.
  if (pathname === '/portal/login' && user) {
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (isAdminEmail) return NextResponse.redirect(new URL('/portal', request.url))
  }

  // ── Admin auth ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const isAdminEmailFlag = user?.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (!isAdminEmailFlag) {
      let userRole: string | null = null
      if (user) {
        const roleRow = await getRoleRow(user.id)
        if (roleRow?.activo) userRole = roleRow.role
      }

      // /admin/rrhh/* is accessible to 'rrhh' and 'admin' roles
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
    // Also check user_roles
    const roleRow = await getRoleRow(user.id)
    if (roleRow?.role === 'admin' && roleRow?.activo) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ── Biblioteca auth (any authenticated user) ─────────────────────────────
  if (pathname.startsWith('/biblioteca')) {
    if (!user) return NextResponse.redirect(new URL('/portal/login', request.url))
  }

  // ── Infografía: portal users only ────────────────────────────────────────
  if (pathname.startsWith('/infografia')) {
    if (!user) return NextResponse.redirect(new URL('/portal/login', request.url))
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (!isAdminEmail) {
      const roleRow = await getRoleRow(user.id)
      if (!roleRow?.activo) return NextResponse.redirect(new URL('/portal/login', request.url))
    }
  }

  // ── Maintenance mode ─────────────────────────────────────────────────────
  const isAdminRoute = pathname.startsWith('/admin')
  const isPortalRoute = pathname.startsWith('/portal')
  const isApiRoute = pathname.startsWith('/api')
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

  // CSP with nonce for page routes only.
  // API routes are excluded: /api/admin/reportes/[id] returns self-contained
  // HTML with inline Chart.js scripts that don't carry a nonce.
  if (!isApiRoute) {
    supabaseResponse.headers.set('Content-Security-Policy', buildCsp(nonce))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

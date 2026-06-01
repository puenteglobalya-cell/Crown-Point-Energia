import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieEntry = { name: string; value: string; options?: CookieOptions }

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Propagate pathname so layout.tsx can conditionally render Header/Footer
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

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
      const { data: roleRow } = await supabase.from('user_roles').select('role, activo').eq('user_id', user.id).single()
      if (!roleRow?.activo) {
        return NextResponse.redirect(new URL('/portal/login', request.url))
      }
    }
  }

  // Logged-in user on /portal/login → redirect to /portal
  if (pathname === '/portal/login' && user) {
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (isAdminEmail) return NextResponse.redirect(new URL('/portal', request.url))
    const { data: roleRow } = await supabase.from('user_roles').select('activo').eq('user_id', user.id).single()
    if (roleRow?.activo) return NextResponse.redirect(new URL('/portal', request.url))
  }

  // ── Admin auth ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const isAdminEmail = user?.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (!isAdminEmail) {
      // Also accept users with admin role in user_roles table
      let hasAdminRole = false
      if (user) {
        const { data: roleRow } = await supabase.from('user_roles').select('role, activo').eq('user_id', user.id).single()
        hasAdminRole = roleRow?.role === 'admin' && roleRow?.activo === true
      }
      if (!hasAdminRole) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
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
    const { data: roleRow } = await supabase.from('user_roles').select('role, activo').eq('user_id', user.id).single()
    if (roleRow?.role === 'admin' && roleRow?.activo) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ── Biblioteca auth (any authenticated user) ─────────────────────────────
  if (pathname.startsWith('/biblioteca')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
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

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

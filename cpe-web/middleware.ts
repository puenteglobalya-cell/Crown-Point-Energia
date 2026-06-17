import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

type CookieEntry = { name: string; value: string; options?: CookieOptions }

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

// Use service role to bypass RLS when checking user_roles in middleware
async function getRoleRow(userId: string) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await db.from('user_roles').select('role, activo').eq('user_id', userId).single()
  return data as { role: string; activo: boolean } | null
}

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
      const roleRow = await getRoleRow(user.id)
      if (!roleRow?.activo) {
        return NextResponse.redirect(new URL('/portal/login', request.url))
      }
    }
  }

  // Logged-in user on /portal/login → redirect to /portal
  if (pathname === '/portal/login' && user) {
    const isAdminEmail = user.email && CMS_ADMIN_EMAILS.includes(user.email)
    if (isAdminEmail) return NextResponse.redirect(new URL('/portal', request.url))
    const roleRow = await getRoleRow(user.id)
    if (roleRow?.activo) return NextResponse.redirect(new URL('/portal', request.url))
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

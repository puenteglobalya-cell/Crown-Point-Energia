import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieEntry = { name: string; value: string; options?: CookieOptions }

const CMS_ADMIN_EMAILS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet: CookieEntry[]) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // /admin requires authenticated admin
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user?.email || !CMS_ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Logged-in admin on /admin/login → redirect to /admin
  if (pathname === '/admin/login' && user?.email && CMS_ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Maintenance mode: redirect all public routes
  const isAdminRoute = pathname.startsWith('/admin')
  const isApiRoute = pathname.startsWith('/api')
  const isMaintenancePage = pathname === '/maintenance'

  if (!isAdminRoute && !isApiRoute && !isMaintenancePage) {
    try {
      const { data } = await supabase
        .from('cms_settings')
        .select('maintenance')
        .eq('id', 1)
        .single()
      if (data?.maintenance === true) {
        return NextResponse.redirect(new URL('/maintenance', request.url))
      }
    } catch {}
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

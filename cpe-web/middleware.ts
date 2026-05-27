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

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}

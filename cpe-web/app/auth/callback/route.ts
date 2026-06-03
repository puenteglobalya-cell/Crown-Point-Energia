import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

const SAFE_NEXT_PATHS = ['/portal', '/admin', '/biblioteca']

function safePath(next: string | null): string {
  if (!next) return '/portal'
  // Only allow relative paths that start with a known safe prefix
  if (next.startsWith('/') && SAFE_NEXT_PATHS.some(p => next === p || next.startsWith(p + '/'))) {
    return next
  }
  return '/portal'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safePath(searchParams.get('next'))

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(toSet) {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/portal/login?error=invalid_link', request.url))
}

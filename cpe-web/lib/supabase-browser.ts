import { createBrowserClient } from '@supabase/ssr'
import { AUTH_COOKIE_OPTIONS } from '@/lib/auth-cookie-options'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: AUTH_COOKIE_OPTIONS }
  )
}

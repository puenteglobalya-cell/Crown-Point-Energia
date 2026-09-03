import type { CookieOptions } from '@supabase/ssr'

// @supabase/ssr's own default is 400 days (the max a cookie can legally live
// per the Chrome/RFC6265bis cap) with httpOnly:false — httpOnly has to stay
// off so the browser client can read/refresh the session itself, but there's
// no reason a stolen cookie should still work over a YEAR later. Capping
// maxAge here is the one lever we have to shrink that window without
// breaking the client-side refresh flow.
//
// Kept in its own file (no server-only imports) so it's safe to import from
// both server code and client components — lib/supabase.ts pulls in
// next/headers, which poisons any client bundle that imports it.
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

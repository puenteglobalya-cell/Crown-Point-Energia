import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'http://localhost:3000',
].filter(Boolean) as string[]

/**
 * Rejects cross-origin mutation requests (POST/PATCH/DELETE).
 * Returns true if the request should be allowed, false if it should be blocked.
 *
 * Defence-in-depth: Supabase auth cookies are SameSite=Lax so they won't be
 * sent cross-site anyway, but an explicit origin check stops any edge-case
 * (e.g. subdomain takeover, misconfigured CORS).
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  // Requests from same-origin (e.g. SSR fetch) have no Origin header — allow.
  if (!origin) return true

  // Check against explicitly configured origins (exact origin match — never prefix,
  // or look-alike hosts like "https://crownpointenergy.com.evil.com" would pass).
  let parsedOrigin: string | null = null
  try { parsedOrigin = new URL(origin).origin } catch { return false }
  if (ALLOWED_ORIGINS.some(allowed => {
    try { return parsedOrigin === new URL(allowed).origin } catch { return false }
  })) {
    return true
  }

  // Fallback: compare origin host against the request's own host header.
  // This works in any deployment without needing NEXT_PUBLIC_SITE_URL configured.
  const host = req.headers.get('host')
  if (host) {
    try {
      return new URL(origin).host === host
    } catch { /* malformed origin — deny */ }
  }

  return false
}

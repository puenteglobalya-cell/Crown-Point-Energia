/** @type {import('next').NextConfig} */

// Static headers applied to every response (nonce-less, non-sensitive headers).
// The Content-Security-Policy header is injected per-request in middleware.ts
// where a per-request nonce is generated and embedded in script-src.
const securityHeaders = [
  // DENY embedding in all iframes — portal/admin don't need framing
  { key: 'X-Frame-Options', value: 'DENY' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Minimal permissions policy
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // HSTS — 2 years with preload (submit at https://hstspreload.org once stable)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'crownpointenergy.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig

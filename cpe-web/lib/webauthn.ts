import { NextRequest } from 'next/server'

// rpID must exactly match the domain the browser is on. Derived per-request
// (rather than hardcoded) so this keeps working across the vercel.app domain
// and crownpointenergy.com once DNS migrates — but a passkey registered under
// one domain will NOT work under the other (WebAuthn ties credentials to the
// exact rpID used at registration time).
export function getRpID(req: NextRequest): string {
  return req.headers.get('host')?.split(':')[0] ?? 'crown-point-energia.vercel.app'
}

export function getOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${req.headers.get('host')}`
}

export const RP_NAME = 'Crown Point Energia'

export const CHALLENGE_COOKIE = 'cpe_webauthn_challenge'

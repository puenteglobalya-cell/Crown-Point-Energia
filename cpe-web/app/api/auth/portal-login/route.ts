import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { isSameOrigin } from '@/lib/csrf'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { checkLockout, recordFailedAttempt, resetAttempts } from '@/lib/login-lockout'

const GENERIC_ERROR = 'Email o contraseña inválidos.'
const LOCKED_ERROR = 'Demasiados intentos fallidos. Probá de nuevo en unos minutos.'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password } = await req.json()
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
  }

  // IP-level throttle (covers credential-stuffing across many emails) and
  // per-account lockout (covers repeated guesses against one email) — both
  // independent of Supabase's own internal rate limiting, and both
  // persisted server-side so they survive across serverless cold starts.
  const ip = getClientIp(req)
  if (!await checkRateLimit(`portal-login:${ip}`, 15, 15 * 60 * 1000)) {
    return NextResponse.json({ error: LOCKED_ERROR }, { status: 429 })
  }

  const lockout = await checkLockout(email)
  if (lockout.locked) {
    return NextResponse.json({ error: LOCKED_ERROR }, { status: 423 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await recordFailedAttempt(email)
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
  }

  await resetAttempts(email)

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const needsMfa = aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2'

  return NextResponse.json({ ok: true, userId: data.user?.id ?? null, needsMfa })
}

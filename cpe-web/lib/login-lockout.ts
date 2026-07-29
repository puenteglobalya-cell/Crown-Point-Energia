import { createSupabaseServerAdminClient } from '@/lib/supabase'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

// Failed attempts reset by themselves after this long even without a
// successful login, so a mistyped password from months ago can't combine
// with today's attempts to trigger a lockout.
const ATTEMPT_WINDOW_MINUTES = 15

export type LockoutStatus = { locked: false } | { locked: true; retryAfterSeconds: number }

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function checkLockout(email: string): Promise<LockoutStatus> {
  const db = createSupabaseServerAdminClient()
  const { data } = await db
    .from('login_lockouts')
    .select('locked_until')
    .eq('email', normalizeEmail(email))
    .maybeSingle()

  if (data?.locked_until && new Date(data.locked_until).getTime() > Date.now()) {
    const retryAfterSeconds = Math.ceil((new Date(data.locked_until).getTime() - Date.now()) / 1000)
    return { locked: true, retryAfterSeconds }
  }
  return { locked: false }
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const db = createSupabaseServerAdminClient()
  const normalized = normalizeEmail(email)
  const now = new Date()

  const { data: existing } = await db
    .from('login_lockouts')
    .select('failed_count, updated_at')
    .eq('email', normalized)
    .maybeSingle()

  const windowExpired = existing?.updated_at
    ? (now.getTime() - new Date(existing.updated_at).getTime()) > ATTEMPT_WINDOW_MINUTES * 60_000
    : true

  const nextCount = windowExpired ? 1 : (existing?.failed_count ?? 0) + 1
  const lockedUntil = nextCount >= MAX_ATTEMPTS
    ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString()
    : null

  await db.from('login_lockouts').upsert({
    email: normalized,
    failed_count: nextCount,
    locked_until: lockedUntil,
    updated_at: now.toISOString(),
  }, { onConflict: 'email' })
}

export async function resetAttempts(email: string): Promise<void> {
  const db = createSupabaseServerAdminClient()
  await db.from('login_lockouts').delete().eq('email', normalizeEmail(email))
}

import { timingSafeEqual, createHash } from 'crypto'

// Plain `a !== b` on a secret leaks timing information: JS string comparison
// short-circuits at the first mismatched character, so response time can
// correlate with how many leading characters an attacker guessed correctly.
// Hashing both sides first gives fixed-length (32-byte) digests — this also
// sidesteps the length itself leaking anything — then compares those with
// Node's constant-time timingSafeEqual.
export function secureCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

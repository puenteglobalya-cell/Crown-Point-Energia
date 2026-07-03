// Dependency-free bot defense for public forms: honeypot + submit-timing.
// Complements CSRF (isSameOrigin) and per-IP rate limiting already in place.
//
// How it works:
//  - Honeypot: forms render a hidden field a human never sees or fills.
//    A non-empty value is a strong bot signal.
//  - Timing: forms embed the render timestamp. Submissions that arrive
//    implausibly fast (< MIN_ELAPSED_MS) were almost certainly scripted.
//
// Field names are intentionally plausible-looking so naive bots fill them.
export const HONEYPOT_FIELD = 'apellido_confirmacion'
export const TIMESTAMP_FIELD = 'form_ts'

const MIN_ELAPSED_MS = 2500        // humans take >2.5s to fill a real form
const MAX_ELAPSED_MS = 6 * 60 * 60 * 1000 // stale token (>6h) → treat as suspicious

/**
 * Returns true when the submission looks like a bot.
 * `honeypot` is the raw honeypot field value; `ts` is the render timestamp
 * (string or number) embedded in the form.
 */
export function looksLikeBot(honeypot: unknown, ts: unknown): boolean {
  // 1) Honeypot filled → bot.
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return true
  if (honeypot != null && typeof honeypot !== 'string') return true

  // 2) Timing. Absent/invalid timestamps are tolerated (JS-disabled or old
  //    cached forms) — we only reject clearly-too-fast submissions.
  const n = typeof ts === 'number' ? ts : parseInt(String(ts ?? ''), 10)
  if (Number.isFinite(n) && n > 0) {
    const elapsed = Date.now() - n
    if (elapsed >= 0 && elapsed < MIN_ELAPSED_MS) return true
    if (elapsed > MAX_ELAPSED_MS) return true
  }
  return false
}

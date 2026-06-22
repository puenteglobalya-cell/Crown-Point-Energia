// In-process sliding-window rate limiter.
// Works within a warm serverless instance; each cold start resets the counter.
// For distributed rate limiting across instances, replace with Upstash Redis:
//   https://upstash.com/blog/nextjs-ratelimiting

const windows = new Map<string, number[]>()

// Returns true if the request is allowed, false if rate-limited.
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const hits = (windows.get(key) ?? []).filter(t => now - t < windowMs)
  hits.push(now)
  windows.set(key, hits)

  // Evict stale entries once the map grows large (prevents memory leak on busy instances)
  if (windows.size > 5_000) {
    for (const [k, v] of windows) {
      if (v.every(t => now - t > windowMs)) windows.delete(k)
    }
  }

  return hits.length <= maxRequests
}

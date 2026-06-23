// Sliding-window rate limiter.
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
// falling back to an in-process map (resets on cold start — burst-only protection).

const windows = new Map<string, number[]>()

function inMemoryCheck(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (windows.get(key) ?? []).filter(t => now - t < windowMs)
  hits.push(now)
  windows.set(key, hits)
  if (windows.size > 5_000) {
    for (const [k, v] of windows) {
      if (v.every(t => now - t > windowMs)) windows.delete(k)
    }
  }
  return hits.length <= maxRequests
}

async function redisCheck(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const windowSec = Math.ceil(windowMs / 1000)
  const now   = Date.now()
  const min   = now - windowMs

  // ZADD + ZREMRANGEBYSCORE + ZCARD + EXPIRE in a pipeline
  const pipeline = [
    ['ZADD', key, String(now), String(now)],
    ['ZREMRANGEBYSCORE', key, '-inf', String(min)],
    ['ZCARD', key],
    ['EXPIRE', key, String(windowSec)],
  ]

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(pipeline),
  })

  if (!res.ok) throw new Error(`Redis pipeline failed: ${res.status}`)

  const json = await res.json() as Array<{ result: unknown }>
  const count = json[2]?.result as number
  return count <= maxRequests
}

// Returns true if the request is allowed, false if rate-limited.
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await redisCheck(key, maxRequests, windowMs)
    } catch {
      // Degrade gracefully to in-memory on Redis errors
    }
  }
  return inMemoryCheck(key, maxRequests, windowMs)
}

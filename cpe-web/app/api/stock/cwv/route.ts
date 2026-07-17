import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const revalidate = 300

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/CWV.V'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Yahoo Finance frequently rate-limits (HTTP 429) requests from datacenter IPs
// like Vercel's — when that happens, fall back to the last values an admin
// entered manually in the CMS (cms_fields, keys stock.*) instead of showing
// a blank quote band. No price history in this fallback, only the snapshot.
function parseNumber(raw: string | undefined): number {
  if (!raw) return 0
  const n = parseFloat(raw.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function parseMagnitude(raw: string | undefined): number {
  if (!raw) return 0
  const n = parseNumber(raw)
  if (/B\b/i.test(raw)) return n * 1e9
  if (/M\b/i.test(raw)) return n * 1e6
  if (/K\b/i.test(raw)) return n * 1e3
  return n
}

async function fallbackFromCms() {
  const db = createSupabaseServerAdminClient()
  const { data } = await db
    .from('cms_fields')
    .select('key, value_es, updated_at')
    .in('key', ['stock.price', 'stock.delta', 'stock.high52', 'stock.low52', 'stock.cap', 'stock.shares'])

  const rows = data ?? []
  const byKey = Object.fromEntries(rows.map(r => [r.key, r.value_es]))
  const updatedAt = rows[0]?.updated_at ? new Date(rows[0].updated_at).getTime() : Date.now()

  const price = parseNumber(byKey['stock.price'])
  if (!price) return null // nothing usable stored either — let the caller show the error state

  const deltaMatch = (byKey['stock.delta'] ?? '').match(/(-?[\d.]+)\s*\(?(-?[\d.]+)?%?\)?/)
  const delta  = deltaMatch ? parseFloat(deltaMatch[1]) || 0 : 0
  const deltaP = deltaMatch && deltaMatch[2] ? parseFloat(deltaMatch[2]) || 0 : 0

  return {
    ok: true as const,
    price,
    prevClose: price - delta,
    delta,
    deltaP,
    high52: parseNumber(byKey['stock.high52']),
    low52: parseNumber(byKey['stock.low52']),
    marketCap: parseMagnitude(byKey['stock.cap']),
    shares: parseMagnitude(byKey['stock.shares']),
    currency: 'CAD',
    ts: updatedAt,
    history: [] as { date: string; close: number }[],
    source: 'cms' as const,
  }
}

export async function GET() {
  try {
    const res = await fetch(`${YF_CHART}?interval=1d&range=2y`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`Yahoo ${res.status}`)

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) throw new Error('No chart result')

    const meta = result.meta
    const timestamps: number[]        = result.timestamp ?? []
    const closes: (number | null)[]   = result.indicators?.quote?.[0]?.close ?? []

    const history = timestamps
      .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: closes[i] }))
      .filter((p): p is { date: string; close: number } => p.close != null)

    const price     = meta.regularMarketPrice     as number
    const prevClose = meta.regularMarketPreviousClose as number | undefined
    const delta     = prevClose != null ? price - prevClose : null
    const deltaP    = prevClose ? (delta! / prevClose) * 100 : null

    return NextResponse.json({
      ok:       true,
      price,
      prevClose,
      delta,
      deltaP,
      high52:   (meta.fiftyTwoWeekHigh  as number | null) ?? null,
      low52:    (meta.fiftyTwoWeekLow   as number | null) ?? null,
      marketCap: (meta.marketCap        as number | null) ?? null,
      shares:   (meta.sharesOutstanding as number | null) ?? null,
      currency: meta.currency               as string,
      ts:       Date.now(),
      history,
      source: 'yahoo',
    })
  } catch (err) {
    console.error('[stock/cwv] Yahoo unavailable, falling back to CMS values:', err)
    try {
      const fallback = await fallbackFromCms()
      if (fallback) return NextResponse.json(fallback)
    } catch (fallbackErr) {
      console.error('[stock/cwv] CMS fallback also failed:', fallbackErr)
    }
    return NextResponse.json({ ok: false, error: 'No se pudo obtener datos de mercado' }, { status: 502 })
  }
}

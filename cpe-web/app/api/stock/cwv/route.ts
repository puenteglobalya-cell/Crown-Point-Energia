import { NextResponse } from 'next/server'

export const revalidate = 300

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/CWV.V'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

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
    const prevClose = meta.regularMarketPreviousClose as number
    const delta     = price - prevClose
    const deltaP    = (delta / prevClose) * 100

    return NextResponse.json({
      ok:       true,
      price,
      prevClose,
      delta,
      deltaP,
      high52:   meta.fiftyTwoWeekHigh       as number,
      low52:    meta.fiftyTwoWeekLow        as number,
      marketCap: meta.marketCap             as number,
      shares:   meta.sharesOutstanding      as number,
      currency: meta.currency               as string,
      ts:       Date.now(),
      history,
    })
  } catch (err) {
    console.error('[stock/cwv]', err)
    return NextResponse.json({ ok: false, error: 'No se pudo obtener datos de mercado' }, { status: 502 })
  }
}

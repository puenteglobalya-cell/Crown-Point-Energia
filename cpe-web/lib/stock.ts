const YAHOO_SYMBOL = 'CWV.V'

export type StockQuote = {
  price: number
  currency: string
  change: number
  changePct: number
  volume: number
  avgVolume: number
  marketCap: number
  sharesOutstanding: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  beta: number
}

export async function fetchStockQuote(): Promise<StockQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${YAHOO_SYMBOL}?interval=1d&range=1d`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Yahoo Finance responded ${res.status}`)
  }

  const json = await res.json()
  const meta = json.chart?.result?.[0]?.meta
  if (!meta) throw new Error('No quote data returned')

  const price = meta.regularMarketPrice ?? 0
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price
  const change = price - prevClose
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0

  return {
    price,
    currency: meta.currency ?? 'CAD',
    change,
    changePct,
    volume: meta.regularMarketVolume ?? 0,
    avgVolume: 0,
    marketCap: 0,
    sharesOutstanding: 0,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    beta: 0,
  }
}

export async function fetchStockQuoteFull(): Promise<StockQuote> {
  const base = await fetchStockQuote()

  try {
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${YAHOO_SYMBOL}?modules=defaultKeyStatistics,price`
    const res = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 },
    })
    if (res.ok) {
      const json = await res.json()
      const result = json.quoteSummary?.result?.[0]
      const stats = result?.defaultKeyStatistics
      const priceModule = result?.price

      base.beta = stats?.beta?.raw ?? base.beta
      base.sharesOutstanding = stats?.sharesOutstanding?.raw ?? priceModule?.sharesOutstanding?.raw ?? 0
      base.marketCap = priceModule?.marketCap?.raw ?? 0
      base.avgVolume = priceModule?.averageDailyVolume3Month?.raw ?? 0
    }
  } catch { /* summary is best-effort */ }

  return base
}

export function formatCmsFields(q: StockQuote): Record<string, string> {
  const sign = q.change >= 0 ? '+' : ''
  const fmtNum = (n: number, dec = 2) => n.toLocaleString('en-CA', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  const fmtInt = (n: number) => n.toLocaleString('en-CA', { maximumFractionDigits: 0 })

  const fmtCap = (n: number) => {
    if (n >= 1e9) return `CA $${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `CA $${(n / 1e6).toFixed(1)}M`
    return `CA $${fmtInt(n)}`
  }

  const fmtShares = (n: number) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
    return fmtInt(n)
  }

  return {
    'stock.price': `CA $${fmtNum(q.price, 3)}`,
    'stock.delta': `${sign}${fmtNum(q.changePct)}%`,
    ...(q.beta > 0 && { 'stock.beta': fmtNum(q.beta) }),
    ...(q.avgVolume > 0 && { 'stock.vol30': fmtInt(q.avgVolume) }),
    ...(q.fiftyTwoWeekHigh > 0 && { 'stock.high52': `CA $${fmtNum(q.fiftyTwoWeekHigh)}` }),
    ...(q.fiftyTwoWeekLow > 0 && { 'stock.low52': `CA $${fmtNum(q.fiftyTwoWeekLow)}` }),
    ...(q.marketCap > 0 && { 'stock.cap': fmtCap(q.marketCap) }),
    ...(q.sharesOutstanding > 0 && { 'stock.shares': fmtShares(q.sharesOutstanding) }),
  }
}

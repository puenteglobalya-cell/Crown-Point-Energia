import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 86400  // cache 24 h

export interface MacroPoint {
  label: string    // "Jul-26"
  hh:    number    // USD/MMBtu  — Henry Hub
  brent: number    // USD/bbl    — ICE Brent
}

// ── CME Henry Hub NG futures ──────────────────────────────────
// Product 444 = Henry Hub Natural Gas (NYMEX NG)
const CME_URL = 'https://www.cmegroup.com/CmeWS/mvc/Quotes/Future/444/G'
const CME_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.cmegroup.com/markets/energy/natural-gas/natural-gas.quotes.html',
  'Origin':          'https://www.cmegroup.com',
}

// ── ICE Brent Crude futures ───────────────────────────────────
// marketId 6018430 = ICE Brent Crude Oil Futures (BRN)
const ICE_URL = 'https://www.theice.com/marketdata/DelayedMarkets.shtml?getContents=true&marketId=6018430&_=' + Date.now()
const ICE_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.ice.com/products/219/Brent-Crude-Futures',
  'Origin':          'https://www.ice.com',
  'X-Requested-With': 'XMLHttpRequest',
}

const MES_ABREV: Record<string, string> = {
  JANUARY: 'Ene', FEBRUARY: 'Feb', MARCH: 'Mar', APRIL: 'Abr',
  MAY: 'May', JUNE: 'Jun', JULY: 'Jul', AUGUST: 'Ago',
  SEPTEMBER: 'Sep', OCTOBER: 'Oct', NOVEMBER: 'Nov', DECEMBER: 'Dic',
}

function shortLabel(monthYear: string): string {
  const [mon, yr] = monthYear.trim().toUpperCase().split(/\s+/)
  const abbr = MES_ABREV[mon] ?? mon.slice(0, 3)
  const yy   = (yr ?? '').slice(-2)
  return `${abbr}-${yy}`
}

async function fetchHH(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const res = await fetch(CME_URL, { headers: CME_HEADERS, next: { revalidate: 86400 } })
    if (!res.ok) return map
    const json = await res.json() as { quotes?: { last?: string; priorSettle?: string; settle?: string; expirationMonth?: string }[] }
    for (const q of json.quotes ?? []) {
      if (!q.expirationMonth) continue
      // Use Prior Settle as the reference price
      const raw = q.priorSettle ?? q.settle ?? q.last
      if (!raw) continue
      const price = parseFloat(raw.replace(',', '.'))
      if (isNaN(price) || price <= 0) continue
      map.set(shortLabel(q.expirationMonth), price)
    }
  } catch { /* network error — return empty */ }
  return map
}

async function fetchBrent(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const res = await fetch(ICE_URL, { headers: ICE_HEADERS, next: { revalidate: 86400 } })
    if (!res.ok) return map
    const json = await res.json() as Array<{ marketStrip?: string; lastPrice?: string; settlementPrice?: string }>
    for (const row of json) {
      const strip = row.marketStrip
      const raw   = row.lastPrice ?? row.settlementPrice
      if (!strip || !raw) continue
      const price = parseFloat(raw.replace(',', '.'))
      if (isNaN(price) || price <= 0) continue
      map.set(shortLabel(strip), price)
    }
  } catch { /* network error — return empty */ }
  return map
}

// Build the next 12 month labels starting from next month
function next12Labels(): string[] {
  const labels: string[] = []
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const now = new Date()
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    labels.push(`${MESES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`)
  }
  return labels
}

export async function GET() {
  const [hhMap, brentMap] = await Promise.all([fetchHH(), fetchBrent()])
  const labels = next12Labels()

  const points: MacroPoint[] = labels.map(label => ({
    label,
    hh:    hhMap.get(label) ?? 0,
    brent: brentMap.get(label) ?? 0,
  }))

  const hasHH    = points.some(p => p.hh > 0)
  const hasBrent = points.some(p => p.brent > 0)

  return NextResponse.json({
    points,
    hasHH,
    hasBrent,
    updatedAt: new Date().toISOString(),
  })
}

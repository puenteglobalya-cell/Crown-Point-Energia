import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── CME Henry Hub (NYMEX NG, product 444) ────────────────────────────────────
const CME_URL = 'https://www.cmegroup.com/CmeWS/mvc/Quotes/Future/444/G'
const CME_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://www.cmegroup.com/markets/energy/natural-gas/natural-gas.quotes.html',
  'Origin': 'https://www.cmegroup.com',
}

// ── ICE Brent Crude (marketId 6018430) ───────────────────────────────────────
const ICE_MARKET_ID = '6018430'
const ICE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://www.ice.com/products/219/Brent-Crude-Futures',
  'Origin': 'https://www.ice.com',
  'X-Requested-With': 'XMLHttpRequest',
}

const MES: Record<string, string> = {
  JANUARY: 'Ene', FEBRUARY: 'Feb', MARCH: 'Mar', APRIL: 'Abr',
  MAY: 'May', JUNE: 'Jun', JULY: 'Jul', AUGUST: 'Ago',
  SEPTEMBER: 'Sep', OCTOBER: 'Oct', NOVEMBER: 'Nov', DECEMBER: 'Dic',
  JAN: 'Ene', FEB: 'Feb', MAR: 'Mar', APR: 'Abr',
  JUN: 'Jun', JUL: 'Jul', AUG: 'Ago',
  SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dic',
}

function shortLabel(s: string): string | null {
  const u = s.trim().toUpperCase()
  const compact = u.match(/^([A-Z]{3})(\d{2})$/)
  if (compact) { const a = MES[compact[1]]; return a ? `${a}-${compact[2]}` : null }
  const long = u.match(/^([A-Z]+)\s+(\d{2,4})$/)
  if (long)   { const a = MES[long[1]];    return a ? `${a}-${long[2].slice(-2)}` : null }
  return null
}

async function fetchHH(): Promise<Array<{ label: string; price: number }>> {
  const res = await fetch(CME_URL, { headers: CME_HEADERS, cache: 'no-store' })
  if (!res.ok) throw new Error(`CME ${res.status}`)
  const json = await res.json() as {
    quotes?: { priorSettle?: string; settle?: string; last?: string; expirationMonth?: string }[]
  }
  const points: Array<{ label: string; price: number }> = []
  for (const q of json.quotes ?? []) {
    if (!q.expirationMonth) continue
    const label = shortLabel(q.expirationMonth)
    if (!label) continue
    const raw = q.priorSettle ?? q.settle ?? q.last
    if (!raw) continue
    const price = parseFloat(raw.replace(',', '.'))
    if (!isNaN(price) && price > 0) points.push({ label, price })
  }
  return points
}

async function fetchBrent(): Promise<Array<{ label: string; price: number }>> {
  const url = `https://www.theice.com/marketdata/DelayedMarkets.shtml?getContents=true&marketId=${ICE_MARKET_ID}&_=${Date.now()}`
  const res = await fetch(url, { headers: ICE_HEADERS, cache: 'no-store' })
  if (!res.ok) throw new Error(`ICE ${res.status}`)
  const json = await res.json() as Array<Record<string, string>>
  const points: Array<{ label: string; price: number }> = []
  for (const row of json) {
    const strip = row.strip ?? row.marketStrip ?? row.contract ?? row.contractName
    if (!strip) continue
    const label = shortLabel(strip)
    if (!label) continue
    const raw = row.last ?? row.lastPrice ?? row.Last ?? row.price
    if (!raw) continue
    const price = parseFloat(String(raw).replace(',', '.'))
    if (!isNaN(price) && price > 0) points.push({ label, price })
  }
  return points
}

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function currentPeriodo(): string {
  const d = new Date()
  return `${MESES_ES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`
}

async function upsertMacro(
  db: ReturnType<typeof createSupabaseServerAdminClient>,
  typeId: 'henry_hub' | 'ice_brent',
  titulo: string,
  source: 'hh' | 'brent',
  points: Array<{ label: string; price: number }>,
) {
  const periodo = currentPeriodo()
  const datos = { source, points, periodo }

  // Check if a record already exists for today
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await db
    .from('reportes')
    .select('id')
    .eq('type_id', typeId)
    .gte('created_at', `${today}T00:00:00Z`)
    .limit(1)
    .single()

  if (existing?.id) {
    await db.from('reportes').update({ datos, titulo }).eq('id', existing.id)
    return 'updated'
  }

  await db.from('reportes').insert({
    type_id: typeId,
    titulo,
    periodo,
    estado: 'publicado',
    datos,
  })
  return 'inserted'
}

// GET /api/cron/macro — runs weekdays at 21:00 UTC (after NYMEX + ICE close)
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()
  const results: Record<string, string> = {}

  // Henry Hub
  try {
    const points = await fetchHH()
    if (points.length > 0) {
      const op = await upsertMacro(db, 'henry_hub', 'Henry Hub Natural Gas Futures', 'hh', points)
      results.henry_hub = `${op} — ${points.length} meses`
    } else {
      results.henry_hub = 'sin datos'
    }
  } catch (e) {
    results.henry_hub = `error: ${(e as Error).message}`
  }

  // ICE Brent
  try {
    const points = await fetchBrent()
    if (points.length > 0) {
      const op = await upsertMacro(db, 'ice_brent', 'ICE Brent Crude Futures', 'brent', points)
      results.ice_brent = `${op} — ${points.length} meses`
    } else {
      results.ice_brent = 'sin datos'
    }
  } catch (e) {
    results.ice_brent = `error: ${(e as Error).message}`
  }

  const date = new Date().toISOString().slice(0, 10)
  const hasErrors = Object.values(results).some(v => v.startsWith('error'))

  void db.from('activity_log').insert({
    user_id:       null,
    user_email:    'cron/macro',
    action:        hasErrors ? 'cron_macro_error' : 'cron_macro_ok',
    resource_type: 'macro',
    metadata:      { results, date },
  })

  return NextResponse.json({ ok: true, date, results })
}

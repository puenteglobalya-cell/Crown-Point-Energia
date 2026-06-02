import { NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import type { DatosMacro } from '@/lib/parsers/macro'

export const dynamic = 'force-dynamic'

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
  // 3-letter abbreviations (ICE format: Aug26, Sep26, …)
  JAN: 'Ene', FEB: 'Feb', MAR: 'Mar', APR: 'Abr',
  JUN: 'Jun', JUL: 'Jul', AUG: 'Ago',
  SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dic',
}

// Handles both "JULY 2025" (CME) and "Aug26" / "Aug 2026" (ICE)
function shortLabel(monthYear: string): string {
  const s = monthYear.trim().toUpperCase()
  // "Aug26" or "AUG26"
  const compact = s.match(/^([A-Z]{3})(\d{2})$/)
  if (compact) {
    const abbr = MES_ABREV[compact[1]] ?? compact[1].slice(0, 3)
    return `${abbr}-${compact[2]}`
  }
  // "AUGUST 2026" or "Aug 2026"
  const [mon, yr] = s.split(/\s+/)
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
    // ICE can return JSON array with various field names — try all known variants
    const json = await res.json() as Array<Record<string, string>>
    for (const row of json) {
      // Strip / contract identifier: strip | marketStrip | contract | contractName
      const strip = row.strip ?? row.marketStrip ?? row.contract ?? row.contractName
      // Price: last | lastPrice | Last | price
      const raw   = row.last ?? row.lastPrice ?? row.Last ?? row.price
      if (!strip || !raw) continue
      const price = parseFloat(String(raw).replace(',', '.'))
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
  // ── 1. Try manual uploads stored in DB ───────────────────────
  try {
    const db = createSupabaseServerAdminClient()
    const [{ data: hhRec }, { data: brentRec }] = await Promise.all([
      db.from('reportes').select('datos, created_at').eq('type_id', 'henry_hub').eq('estado', 'publicado')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('reportes').select('datos, created_at').eq('type_id', 'ice_brent').eq('estado', 'publicado')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (hhRec?.datos || brentRec?.datos) {
      const hhMap  = new Map<string, number>(
        ((hhRec?.datos as DatosMacro)?.points ?? []).map(p => [p.label, p.price])
      )
      const brentMap = new Map<string, number>(
        ((brentRec?.datos as DatosMacro)?.points ?? []).map(p => [p.label, p.price])
      )
      const labels = next12Labels()
      const points: MacroPoint[] = labels.map(label => ({
        label,
        hh:    hhMap.get(label) ?? 0,
        brent: brentMap.get(label) ?? 0,
      }))
      const updatedAt = [hhRec?.created_at, brentRec?.created_at]
        .filter(Boolean).sort().reverse()[0] ?? new Date().toISOString()
      return NextResponse.json({
        points,
        hasHH:    points.some(p => p.hh > 0),
        hasBrent: points.some(p => p.brent > 0),
        updatedAt,
        source: 'manual',
      })
    }
  } catch { /* DB unavailable — fall through to live fetch */ }

  // ── 2. Fall back to live API fetch ────────────────────────────
  const [hhMap, brentMap] = await Promise.all([fetchHH(), fetchBrent()])
  const labels = next12Labels()

  const points: MacroPoint[] = labels.map(label => ({
    label,
    hh:    hhMap.get(label) ?? 0,
    brent: brentMap.get(label) ?? 0,
  }))

  return NextResponse.json({
    points,
    hasHH:    points.some(p => p.hh > 0),
    hasBrent: points.some(p => p.brent > 0),
    updatedAt: new Date().toISOString(),
    source: 'live',
  })
}

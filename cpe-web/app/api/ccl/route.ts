import { NextResponse } from 'next/server'
import { fetchCclRate } from '@/lib/matbarofex'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await fetchCclRate()
  if (!data) return NextResponse.json({ error: 'CCL unavailable' }, { status: 502 })
  return NextResponse.json(data)
}

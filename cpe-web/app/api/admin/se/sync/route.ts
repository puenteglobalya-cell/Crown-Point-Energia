import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { scrapearSeOfertaExport } from '@/lib/se-scraper'
import { dbError } from '@/lib/api-error'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { fechaDesde, fechaHasta, brentRef } = await req.json()
  const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/
  if (!fechaDesde || !fechaHasta || !DATE_RE.test(fechaDesde) || !DATE_RE.test(fechaHasta)) {
    return NextResponse.json({ error: 'fechaDesde y fechaHasta son requeridos (DD/MM/AAAA)' }, { status: 400 })
  }

  try {
    const { headers, filas } = await scrapearSeOfertaExport(fechaDesde, fechaHasta)

    const db = createSupabaseServerAdminClient()

    // Parse DD/MM/AAAA → YYYY-MM-DD for the DB date column
    const toIso = (s: string) => {
      const [d, m, y] = s.split('/')
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }

    const { data, error } = await db
      .from('se_referencias')
      .insert({
        fecha_desde: toIso(fechaDesde),
        fecha_hasta: toIso(fechaHasta),
        headers,
        filas,
        brent_ref:  brentRef ?? null,
        scraped_by: user.id,
      })
      .select('id')
      .single()

    if (error) return dbError(error)

    return NextResponse.json({ ok: true, id: data.id, rows: filas.length })
  } catch (e: unknown) {
    console.error('[se-sync]', e)
    return NextResponse.json({ error: (e as Error).message ?? 'Error al scrapear' }, { status: 500 })
  }
}

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data } = await db
    .from('se_referencias')
    .select('id, fecha_desde, fecha_hasta, scraped_at, brent_ref, headers')
    .order('scraped_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}

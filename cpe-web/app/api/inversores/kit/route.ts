import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Public "Investor Kit" — bundles the latest CPI financial statements, MD&A and
// corporate presentation into a single ZIP. Only published documents.
export async function GET() {
  const db = createSupabaseServerAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function latest(filter: (q: any) => any) {
    const base = db.from('ir_documents').select('titulo_es,titulo_en,url,fecha,tipo,categoria,entidad,periodo').eq('publicado', true)
    const { data } = await filter(base)
    return (data && data[0]) || null
  }

  const [fs, mda, pres] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latest((q: any) => q.eq('categoria', 'financiero').eq('entidad', 'CPI').eq('tipo', 'FS').order('fecha', { ascending: false, nullsFirst: false }).limit(1)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latest((q: any) => q.eq('categoria', 'financiero').eq('entidad', 'CPI').eq('tipo', 'MDA').order('fecha', { ascending: false, nullsFirst: false }).limit(1)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latest((q: any) => q.eq('categoria', 'otro').order('fecha', { ascending: false, nullsFirst: false }).limit(1)),
  ])

  const items = [fs, mda, pres].filter(Boolean) as Array<{ url: string; tipo: string; periodo: string; titulo_en: string; titulo_es: string }>
  if (items.length === 0) {
    return NextResponse.json({ error: 'No documents available' }, { status: 404 })
  }

  const zip = new JSZip()
  let added = 0
  await Promise.all(items.map(async (d, i) => {
    try {
      const res = await fetch(d.url)
      if (!res.ok) return
      const buf = Buffer.from(await res.arrayBuffer())
      const prefix = d.tipo === 'FS' ? '1-EEFF' : d.tipo === 'MDA' ? '2-MDA' : `${i + 1}-Presentacion`
      const period = (d.periodo || '').replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '')
      zip.file(`CrownPoint-${prefix}${period ? '-' + period : ''}.pdf`, buf)
      added++
    } catch { /* skip unreachable file */ }
  }))

  if (added === 0) return NextResponse.json({ error: 'Documents unavailable' }, { status: 502 })

  const blob = await zip.generateAsync({ type: 'nodebuffer' })
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(new Uint8Array(blob), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Crown-Point-Kit-Inversor-${date}.zip"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

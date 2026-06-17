import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

// Chromium binary URL for Vercel serverless — pinned to a stable build
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

// Extra CSS injected before PDF render to fix page breaks in all existing reports
const PRINT_FIX_CSS = `
<style>
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print, #print-btn { display: none !important; }
  .sec  { break-after: avoid !important; }
  .card { break-inside: avoid !important; }
  .card-full { break-inside: avoid !important; }
  .acard { break-inside: avoid !important; }
  .areas { break-inside: avoid !important; }
  .g2   { break-inside: avoid !important; }
  /* facturación */
  .filter-bar, .fiscal-filter-bar, .export-bar { display: none !important; }
  .section { break-inside: avoid !important; }
</style>`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const db = createSupabaseServerAdminClient()
  const { data: reporte, error } = await db
    .from('reportes')
    .select('html, titulo, type_id')
    .eq('id', id)
    .single()

  if (error || !reporte?.html) {
    console.error('[pdf] db error or no html:', error?.message, 'id:', id)
    return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  }

  // Inject page-break fixes into the stored HTML
  const html = reporte.html.includes('</head>')
    ? reporte.html.replace('</head>', `${PRINT_FIX_CSS}</head>`)
    : PRINT_FIX_CSS + reporte.html

  try {
    const chromium = (await import('@sparticuz/chromium-min')).default
    const puppeteer = (await import('puppeteer-core')).default

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 900 },
      executablePath: await chromium.executablePath(CHROMIUM_URL),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })

    // Let Chart.js finish rendering animations
    await new Promise(r => setTimeout(r, 2500))

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
      printBackground: true,
      displayHeaderFooter: false,
    })

    await browser.close()

    const slug = (reporte.titulo ?? reporte.type_id ?? 'reporte')
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80)

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[pdf]', err)
    return NextResponse.json(
      { error: 'Error generando PDF. Intentá de nuevo.' },
      { status: 500 }
    )
  }
}

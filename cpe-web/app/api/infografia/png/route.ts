import { NextResponse } from 'next/server'
import { getCmsState } from '@/lib/cms'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { generateInfografiaHtml, type InfografiaData } from '@/lib/infografia-html'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

const YF_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/CWV.V'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

function fmtCAD(n: number, d = 3) { return `CA $${n.toFixed(d)}` }
function fmtCap(n: number) {
  if (n >= 1e9) return `CA $${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `CA $${(n / 1e6).toFixed(1)}M`
  return `CA $${n.toLocaleString()}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const mParam = searchParams.get('m')
    const activeModules = mParam ? mParam.split(',').filter(Boolean) : undefined

    // ── Fetch data ─────────────────────────────────────────────────────────────
    const db = createSupabaseServerAdminClient()
    const [s, blocksRes, stockRes] = await Promise.all([
      getCmsState(),
      db.from('operations_blocks')
        .select('slug,titulo,subtitulo_es,commodity,wi,chips')
        .eq('activo', true)
        .order('orden'),
      fetch(`${YF_URL}?interval=1d&range=1d`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      }).then(r => r.json()).catch(() => null),
    ])

    const f = s.fields
    const blocks = (blocksRes.data ?? []) as Array<{
      slug: string; titulo: string; subtitulo_es: string; commodity: 'oil' | 'gas' | 'mixed'; wi?: string; chips?: string[]
    }>

    // Stock data
    let stockData: InfografiaData['stock'] = {
      price:   f['stock.price']  || 'CA $0.205',
      delta:   '+0.000',
      deltaP:  '+0.00%',
      high52:  f['stock.high52'] || 'CA $0.31',
      low52:   f['stock.low52']  || 'CA $0.16',
      cap:     f['stock.cap']    || 'CA $19.8M',
      shares:  f['stock.shares'] || '96.6M',
      isUp:    true,
    }

    if (stockRes?.chart?.result?.[0]) {
      const meta = stockRes.chart.result[0].meta
      const price = meta.regularMarketPrice as number
      const prev  = meta.regularMarketPreviousClose as number
      const delta = price - prev
      const deltaP = (delta / prev) * 100
      stockData = {
        price:  fmtCAD(price),
        delta:  `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}`,
        deltaP: `${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(2)}%`,
        high52: fmtCAD(meta.fiftyTwoWeekHigh),
        low52:  fmtCAD(meta.fiftyTwoWeekLow),
        cap:    fmtCap(meta.marketCap),
        shares: `${((meta.sharesOutstanding as number) / 1e6).toFixed(1)}M`,
        isUp:   delta >= 0,
      }
    }

    const dateStr = new Date().toLocaleDateString('es-AR', {
      month: 'long', year: 'numeric',
    })

    const data: InfografiaData = {
      stats: {
        pozos:       f['stats.pozos']       || '357',
        inyectores:  f['stats.inyectores']  || '83',
        cuencas:     f['stats.cuencas']     || '4',
        ha:          f['stats.ha']          || '372k',
        anios:       f['stats.anios']       || '25+',
      },
      production: {
        val:    f['ops.kpi.production'] || '3,090',
        unit:   'boe/d neto',
        mix:    `${f['ops.kpi.mix'] || '54/46'} % gas / líquidos`,
        periodo: 'Q1 2026',
      },
      blocks: blocks.map(b => ({
        slug:      b.slug,
        titulo:    b.titulo,
        subtitulo: b.subtitulo_es || '',
        commodity: b.commodity,
        wi:        b.wi || undefined,
      })),
      stock: stockData,
      ratings: [
        { concepto: 'ON Clase VI Garantizadas — hasta USD 20 MM', isin: 'AR0134464806', rating: 'A-(arg)' },
        { concepto: 'ON Clase VII — hasta USD 10 MM',              isin: 'AR0370555119', rating: 'BBB(arg)' },
        { concepto: 'ON Clase IX Garantizadas — hasta USD 15 MM',  isin: 'AR0764757453', rating: 'A-(arg)' },
      ],
      thesis: {
        prodVal:   f['kpi.production.value'] || '3,090',
        prodUnit:  f['kpi.production.unit']  || 'boe/d neto',
        prodDelta: f['kpi.production.delta'] || 'Q1 2026',
        resVal:    f['kpi.reserves.value']   || 'N/D',
        resUnit:   f['kpi.reserves.unit']    || 'MMboe 2P',
        resDelta:  f['kpi.reserves.delta']   || '',
        ebVal:     f['kpi.ebitda.value']     || 'N/D',
        ebUnit:    f['kpi.ebitda.unit']      || 'USD MM',
        ebDelta:   f['kpi.ebitda.delta']     || '',
      },
      date:    dateStr,
      url:     'crown-point-energia.vercel.app',
      modules: activeModules,
    }

    // ── Generate HTML ──────────────────────────────────────────────────────────
    const html = generateInfografiaHtml(data)

    // ── Puppeteer screenshot ───────────────────────────────────────────────────
    const chromium = (await import('@sparticuz/chromium-min')).default
    const puppeteer = (await import('puppeteer-core')).default

    const browser = await puppeteer.launch({
      args:            chromium.args,
      defaultViewport: { width: 1080, height: 1350 },
      executablePath:  await chromium.executablePath(CHROMIUM_URL),
      headless:        true,
    })

    const page = await browser.newPage()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.setContent(html, { waitUntil: 'networkidle2' as any, timeout: 20_000 })

    const bodyH = await page.evaluate(() => document.getElementById('ig')?.scrollHeight ?? 1350)
    await page.setViewport({ width: 1080, height: bodyH })

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: bodyH },
    })

    await browser.close()

    return new NextResponse(new Uint8Array(screenshot as Buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="crown-point-infografia-${new Date().toISOString().slice(0, 10)}.png"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[infografia/png]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

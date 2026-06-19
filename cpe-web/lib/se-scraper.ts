const SE_URL = 'https://www.se.gob.ar/comercio_exterior_liquidos/oferta_com_ext_expo.php'
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

export interface SeReferencia {
  headers: string[]
  filas: Record<string, string>[]
}

// ── HTML table parser (no browser needed) ─────────────────────────────────────

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&[a-z]+;/gi, ' ')
}

function cellText(cellHtml: string): string {
  return decodeHtmlEntities(cellHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
}

function parseTable(html: string): SeReferencia {
  // Find the largest table (most likely the data one)
  const tableMatches = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)]
  if (!tableMatches.length) return { headers: [], filas: [] }

  const tableHtml = tableMatches.reduce((a, b) => a[0].length >= b[0].length ? a : b)[0]
  const rowMatches = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)]

  const headers: string[] = []
  const filas: Record<string, string>[] = []

  for (const [ri, rowMatch] of rowMatches.entries()) {
    const rowHtml = rowMatch[0]
    const isHeaderRow = /<th[\s\S]*?<\/th>/i.test(rowHtml)
    const cells = [...rowHtml.matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map(m => cellText(m[0]))

    if (ri === 0 || isHeaderRow) {
      if (!headers.length && cells.some(c => c)) headers.push(...cells)
    } else if (cells.some(c => c)) {
      const obj: Record<string, string> = {}
      cells.forEach((v, ci) => { obj[headers[ci] ?? `col_${ci}`] = v })
      filas.push(obj)
    }
  }

  return { headers, filas }
}

// ── Strategy 1: direct HTTP POST (fast, ~1-2s) ───────────────────────────────

async function scrapearDirecto(
  fechaDesde: string,
  fechaHasta: string,
): Promise<SeReferencia | null> {
  const allFilas: Record<string, string>[] = []
  let headers: string[] = []

  // Try common form field name patterns for the SE PHP form
  const fieldVariants = [
    { desde: 'txtFechaDesde', hasta: 'txtFechaHasta', btn: 'btnBuscar' },
    { desde: 'fecha_desde',   hasta: 'fecha_hasta',   btn: 'buscar' },
    { desde: 'fdesde',        hasta: 'fhasta',        btn: 'buscar' },
    { desde: 'FechaDesde',    hasta: 'FechaHasta',    btn: 'Buscar' },
  ]

  let html: string | null = null

  for (const fields of fieldVariants) {
    try {
      const body = new URLSearchParams({
        [fields.desde]: fechaDesde,
        [fields.hasta]: fechaHasta,
        [fields.btn]: 'Buscar',
      })
      const res = await fetch(SE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Referer': SE_URL,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) continue
      const text = await res.text()
      // Validate we got actual table data back (not just the empty form)
      if (/<table/i.test(text) && /<tr/i.test(text)) {
        html = text
        break
      }
    } catch {
      continue
    }
  }

  if (!html) return null

  const firstPage = parseTable(html)
  if (!firstPage.filas.length) return null

  headers = firstPage.headers
  allFilas.push(...firstPage.filas)

  // Handle server-side pagination if present (look for page links like ?pagina=2)
  const pageLinks = [...html.matchAll(/[?&](?:pagina|page|p)=(\d+)/gi)]
  const pageNums = [...new Set(pageLinks.map(m => parseInt(m[1])))].filter(n => n > 1).sort((a, b) => a - b)

  for (const pageNum of pageNums.slice(0, 49)) {
    try {
      const res = await fetch(`${SE_URL}?pagina=${pageNum}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0',
          'Referer': SE_URL,
        },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) break
      const text = await res.text()
      const pg = parseTable(text)
      if (!pg.filas.length) break
      allFilas.push(...pg.filas)
    } catch {
      break
    }
  }

  return { headers, filas: allFilas }
}

// ── Strategy 2: puppeteer fallback ───────────────────────────────────────────

async function scrapearConBrowser(
  fechaDesde: string,
  fechaHasta: string,
): Promise<SeReferencia> {
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 900 },
    executablePath: await chromium.executablePath(CHROMIUM_URL),
    headless: true,
  })

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(25_000)

    await page.goto(SE_URL, { waitUntil: 'networkidle2', timeout: 25_000 })

    await page.evaluate((desde, hasta) => {
      function setInput(selectors: string[], value: string) {
        for (const sel of selectors) {
          const el = document.querySelector<HTMLInputElement>(sel)
          if (el) {
            el.value = value
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
            return true
          }
        }
        return false
      }
      setInput(['#txtFechaDesde', '[name*="desde" i]', '[id*="desde" i]', 'input[type="text"]:first-of-type'], desde)
      setInput(['#txtFechaHasta', '[name*="hasta" i]', '[id*="hasta" i]', 'input[type="text"]:last-of-type'], hasta)
    }, fechaDesde, fechaHasta)

    await page.evaluate(() => {
      const candidates = [
        document.querySelector<HTMLElement>('#btnBuscar'),
        document.querySelector<HTMLElement>('input[type="submit"]'),
        document.querySelector<HTMLElement>('button[type="submit"]'),
        document.querySelector<HTMLElement>('input[value*="Buscar"]'),
        [...document.querySelectorAll<HTMLElement>('input,button')]
          .find(el => /buscar|consultar/i.test(el.textContent ?? '') ||
                      /buscar|consultar/i.test((el as HTMLInputElement).value ?? '')),
        document.querySelector<HTMLElement>('form'),
      ].filter(Boolean)
      if (candidates[0]) {
        if (candidates[0] instanceof HTMLFormElement) candidates[0].submit()
        else (candidates[0] as HTMLElement).click()
      }
    })

    await page.waitForNetworkIdle({ timeout: 20_000 }).catch(() => {})

    // Try to maximize rows per page
    await page.evaluate(() => {
      const sel = document.querySelector<HTMLSelectElement>(
        'select[name*="cantidad" i], select[name*="rows" i], select[name*="limit" i], select[name*="pagesize" i]'
      )
      if (!sel) return
      const opts = Array.from(sel.options).filter(o => /^\d+$/.test(o.value.trim()))
      if (!opts.length) return
      const max = opts.reduce((a, b) => parseInt(a.value) > parseInt(b.value) ? a : b)
      sel.value = max.value
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForNetworkIdle({ timeout: 10_000 }).catch(() => {})

    const allFilas: Record<string, string>[] = []
    let headers: string[] = []
    let pageNum = 0

    while (pageNum++ < 50) {
      const { headers: hdrs, filas, hasNext } = await page.evaluate((existingHdrs: string[]) => {
        const table = document.querySelector<HTMLTableElement>('#tablaResultados, table.tabla, table')
        if (!table) return { headers: existingHdrs, filas: [], hasNext: false }

        const rows = Array.from(table.querySelectorAll('tr'))
        const hdrs = existingHdrs.length ? existingHdrs : []
        const filas: Record<string, string>[] = []

        rows.forEach((tr, i) => {
          const cells = Array.from(tr.querySelectorAll('th, td')).map(c =>
            c.textContent?.trim().replace(/\s+/g, ' ') ?? ''
          )
          if ((i === 0 || tr.querySelectorAll('th').length > 0) && !existingHdrs.length) {
            if (cells.some(c => c)) hdrs.push(...cells)
          } else if (cells.some(c => c)) {
            const obj: Record<string, string> = {}
            cells.forEach((v, ci) => { obj[(existingHdrs.length ? existingHdrs : hdrs)[ci] ?? `col_${ci}`] = v })
            filas.push(obj)
          }
        })

        const nextEl = document.querySelector<HTMLElement>(
          'a[id*="siguiente" i], a.paginate_button.next:not(.disabled), #tablaResultados_next:not(.disabled) a, a.next:not(.disabled)'
        )
        const hasNext = !!(nextEl && !nextEl.classList.contains('disabled') && !nextEl.hasAttribute('disabled'))
        return { headers: hdrs, filas, hasNext }
      }, headers)

      if (!headers.length) headers = hdrs
      allFilas.push(...filas)
      if (!hasNext || !filas.length) break

      const clicked = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>(
          'a[id*="siguiente" i], a.paginate_button.next:not(.disabled), #tablaResultados_next:not(.disabled) a, a.next:not(.disabled)'
        )
        if (el) { el.click(); return true }
        return false
      })
      if (!clicked) break
      await page.waitForNetworkIdle({ timeout: 15_000 }).catch(() => {})
    }

    return { headers, filas: allFilas }
  } finally {
    await browser.close()
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function scrapearSeOfertaExport(
  fechaDesde: string,
  fechaHasta: string,
): Promise<SeReferencia> {
  // Try fast direct HTTP first (no browser needed, ~1-2s)
  const direct = await scrapearDirecto(fechaDesde, fechaHasta)
  if (direct && direct.filas.length > 0) return direct

  // Fallback: full browser scraping
  return scrapearConBrowser(fechaDesde, fechaHasta)
}

/** ((Brent - 1) * (1 - DDEE)) / 0.97  — todas las entradas en USD/bbl y fracción */
export function aplicarFormulaSE(brent: number, ddee: number): number {
  return ((brent - 1) * (1 - ddee)) / 0.97
}

const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

export interface SeReferencia {
  headers: string[]
  filas: Record<string, string>[]
}

export async function scrapearSeOfertaExport(
  fechaDesde: string,  // DD/MM/AAAA
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
    page.setDefaultTimeout(30_000)

    await page.goto(
      'https://www.se.gob.ar/comercio_exterior_liquidos/oferta_com_ext_expo.php',
      { waitUntil: 'networkidle2', timeout: 30_000 },
    )

    // Fill date range — try multiple selector patterns
    await page.evaluate(
      (desde, hasta) => {
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
        setInput(['#txtFechaDesde', '[name*="desde" i]', '[id*="desde" i]', '[placeholder*="desde" i]', 'input[type="text"]:first-of-type'], desde)
        setInput(['#txtFechaHasta', '[name*="hasta" i]', '[id*="hasta" i]', '[placeholder*="hasta" i]', 'input[type="text"]:last-of-type'], hasta)
      },
      fechaDesde,
      fechaHasta,
    )

    // Find and click the search button — try multiple selectors
    const clicked = await page.evaluate(() => {
      const candidates = [
        document.querySelector<HTMLElement>('#btnBuscar'),
        document.querySelector<HTMLElement>('input[type="submit"]'),
        document.querySelector<HTMLElement>('button[type="submit"]'),
        document.querySelector<HTMLElement>('input[value*="Buscar"]'),
        document.querySelector<HTMLElement>('button'),
        [...document.querySelectorAll<HTMLElement>('input,button')]
          .find(el => /buscar|search|consultar/i.test(el.textContent ?? '') ||
                      /buscar|search|consultar/i.test((el as HTMLInputElement).value ?? '')),
      ].filter(Boolean)
      if (candidates[0]) { candidates[0].click(); return true }
      // Last resort: submit the first form
      const form = document.querySelector('form')
      if (form) { form.submit(); return true }
      return false
    })

    if (!clicked) {
      const bodySnippet = await page.evaluate(() => document.body.innerHTML.slice(0, 2000))
      throw new Error(`No se encontró botón de búsqueda en la página SE. Snippet: ${bodySnippet}`)
    }

    await page.waitForNetworkIdle({ timeout: 20_000 }).catch(() => {})

    // Extract table — try common selectors
    const result = await page.evaluate(() => {
      const selectors = ['#tablaResultados', 'table.tabla', 'table']
      let table: HTMLTableElement | null = null
      for (const sel of selectors) {
        table = document.querySelector<HTMLTableElement>(sel)
        if (table) break
      }
      if (!table) return { headers: [], filas: [] }

      const rows = Array.from(table.querySelectorAll('tr'))
      const headers: string[] = []
      const filas: Record<string, string>[] = []

      rows.forEach((tr, i) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map(c =>
          c.textContent?.trim().replace(/\s+/g, ' ') ?? ''
        )
        if (i === 0 || tr.querySelectorAll('th').length > 0) {
          if (cells.some(c => c)) headers.push(...cells)
        } else if (cells.some(c => c)) {
          const obj: Record<string, string> = {}
          cells.forEach((v, ci) => {
            obj[headers[ci] ?? `col_${ci}`] = v
          })
          filas.push(obj)
        }
      })

      return { headers, filas }
    })

    return result
  } finally {
    await browser.close()
  }
}

/** ((Brent - 1) * (1 - DDEE)) / 0.97  — todas las entradas en USD/bbl y fracción */
export function aplicarFormulaSE(brent: number, ddee: number): number {
  return ((brent - 1) * (1 - ddee)) / 0.97
}

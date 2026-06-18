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

    // Fill date range
    await page.evaluate(
      (desde, hasta) => {
        const d = document.querySelector<HTMLInputElement>('#txtFechaDesde')
        const h = document.querySelector<HTMLInputElement>('#txtFechaHasta')
        if (d) { d.value = desde; d.dispatchEvent(new Event('change')) }
        if (h) { h.value = hasta; h.dispatchEvent(new Event('change')) }
      },
      fechaDesde,
      fechaHasta,
    )

    await page.click('#btnBuscar')
    await page.waitForNetworkIdle({ timeout: 15_000 }).catch(() => {})

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

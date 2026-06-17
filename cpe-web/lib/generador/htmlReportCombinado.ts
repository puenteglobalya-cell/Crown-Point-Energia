// Combines multiple report HTML documents into a single printable document.
// Chart canvas IDs are made unique per section to avoid collisions.

interface ReporteHTML {
  id: string
  titulo: string
  html: string
}

function makeChartIdsUnique(html: string, suffix: number): string {
  const ids: string[] = []
  html.replace(/<canvas[^>]+id="([^"]+)"/g, (_, id) => { ids.push(id); return _ })
  let out = html
  for (const id of ids) {
    out = out.replace(new RegExp(`id="${id}"`, 'g'), `id="${id}-${suffix}"`)
    out = out.replace(
      new RegExp(`getElementById\\(['"]${id}['"]\\)`, 'g'),
      `getElementById('${id}-${suffix}')`
    )
  }
  return out
}

function extractStyleBlocks(html: string): string[] {
  return (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [])
}

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return m ? m[1] : html
}

function stripPrintBtn(html: string): string {
  return html
    .replace(/<button[^>]*id="print-btn"[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<div[^>]*class="no-print"[^>]*>[\s\S]*?<\/div>\s*(?=<\/div>|<[a-z]|$)/gi, '')
}

export function combinarReportesHTML(reportes: ReporteHTML[]): string {
  const styleBlocks = reportes.flatMap(r => extractStyleBlocks(r.html))

  const sections = reportes.map((r, i) => {
    let body = extractBody(r.html)
    body = makeChartIdsUnique(body, i)
    body = stripPrintBtn(body)
    const pageBreak = i < reportes.length - 1 ? 'page-break-after:always;' : ''
    return `<section class="report-section" style="${pageBreak}">${body}</section>`
  }).join('\n')

  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reporte Consolidado — Crown Point Energy — ${fecha}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
${styleBlocks.join('\n')}
<style>
.report-section { position: relative; }
.no-print{}
@media print {
  .no-print { display: none !important; }
  .report-section { page-break-after: always; }
  .report-section:last-child { page-break-after: auto; }
}
</style>
</head>
<body>
<div class="no-print" style="position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
  <button style="display:inline-flex;align-items:center;gap:7px;white-space:nowrap;background:#1F2566;color:#fff;border:none;border-radius:40px;padding:11px 20px;font-size:13px;font-weight:600;font-family:Inter,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(31,37,102,.3)" onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Imprimir
  </button>
</div>
${sections}
</body>
</html>`
}

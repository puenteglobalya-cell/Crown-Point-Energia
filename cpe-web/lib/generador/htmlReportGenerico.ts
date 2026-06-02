import type { DatosGenerico, HojaGenerica } from '@/lib/parsers/generico'

const TIPO_LABEL: Record<string, string> = {
  produccion: 'Reporte de Producción',
  financiero: 'Reporte Financiero',
}
const TIPO_COLOR: Record<string, string> = {
  produccion: '#2a6e3f',
  financiero: '#1f2566',
}

function fmtCell(v: string | number | null): string {
  if (v === null) return ''
  if (typeof v === 'number') {
    // If integer-ish, use locale integer; otherwise 2 decimals
    return Number.isInteger(v)
      ? v.toLocaleString('es-AR')
      : v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return v
}

function buildHoja(hoja: HojaGenerica, idx: number): string {
  const hasHeaders = hoja.headers.some(h => h !== '')
  const thead = hasHeaders
    ? `<thead><tr>${hoja.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
    : ''

  const tbody = hoja.filas.map(row => {
    const cells = hoja.headers.length > 0
      ? hoja.headers.map((_, ci) => `<td>${fmtCell(row[ci] ?? null)}</td>`).join('')
      : row.map(c => `<td>${fmtCell(c)}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('\n')

  return `
  <section class="hoja" id="hoja-${idx}">
    <h2 class="hoja-title">${hoja.nombre}</h2>
    <div class="table-wrap">
      <table>
        ${thead}
        <tbody>${tbody}</tbody>
      </table>
    </div>
  </section>`
}

export function generarReporteGenericoHTML(datos: DatosGenerico): string {
  const label  = TIPO_LABEL[datos.tipo] ?? datos.tipo
  const accent = TIPO_COLOR[datos.tipo] ?? '#1f2566'
  const hojas  = datos.hojas.map((h, i) => buildHoja(h, i)).join('\n')

  const nav = datos.hojas.length > 1
    ? `<nav class="toc">
        ${datos.hojas.map((h, i) => `<a href="#hoja-${i}">${h.nombre}</a>`).join('')}
      </nav>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${label} — ${datos.periodo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:#f4f4f0;color:#1a1a2e;font-size:14px;padding:32px 24px}
  .page{max-width:960px;margin:0 auto}
  header{margin-bottom:32px;border-bottom:3px solid ${accent};padding-bottom:20px}
  .label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${accent};margin-bottom:8px}
  h1{font-family:'Lora',serif;font-size:26px;font-weight:700;color:#1a1a2e;margin-bottom:4px}
  .sub{font-size:13px;color:#666;margin-top:4px}
  .toc{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px}
  .toc a{font-size:12px;padding:5px 12px;background:#fff;border:1px solid #ddd;border-radius:20px;color:${accent};text-decoration:none;font-weight:500}
  .toc a:hover{background:${accent};color:#fff}
  .hoja{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:24px;margin-bottom:28px}
  .hoja-title{font-family:'Lora',serif;font-size:16px;font-weight:600;color:${accent};margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee}
  .table-wrap{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead tr{background:${accent}08;border-bottom:2px solid ${accent}30}
  th{padding:9px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#555;white-space:nowrap}
  td{padding:8px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafafa}
  td:first-child{font-weight:500;color:#222}
  td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}
  #cpe-print-btn{position:fixed;bottom:24px;right:24px;background:${accent};color:#fff;border:none;border-radius:50px;padding:12px 22px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:999}
  @media print{
    body{background:#fff;padding:16px}
    #cpe-print-btn{display:none}
    .hoja{break-inside:avoid;border:none;padding:0;margin-bottom:32px}
    .toc{display:none}
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="label">${label}</div>
    <h1>${datos.periodo}</h1>
    <p class="sub">${datos.titulo_archivo}</p>
  </header>
  ${nav}
  ${hojas}
</div>
<button id="cpe-print-btn" onclick="window.print()">Imprimir / PDF</button>
</body>
</html>`
}

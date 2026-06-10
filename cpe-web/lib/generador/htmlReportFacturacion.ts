import type { DatosFacturacion, PivotRow } from '@/lib/parsers/facturacion'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fMM(n: number): string {
  const sign = n < 0 ? '−' : ''
  return sign + 'us$ ' + (Math.abs(n) / 1_000_000).toFixed(3).replace('.', ',') + ' MM'
}

function fK(n: number): string {
  if (n === 0) return ''
  const sign = n < 0 ? '−' : ''
  return sign + (Math.abs(n) / 1000).toFixed(1).replace('.', ',') + 'k'
}

function fN(n: number): string {
  return Math.round(n).toLocaleString('es-AR')
}

function fD(n: number, d = 2): string {
  return n.toFixed(d).replace('.', ',')
}

function enc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function j(v: unknown): string {
  return JSON.stringify(v)
}

function fechaCorta(iso: string): string {
  // "2026-01-15" → "15/01"
  const parts = iso.split('-')
  return `${parts[2]}/${parts[1]}`
}

// ─── Color palette ────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  'Petróleo':             '#2B6CB0',
  'Gas':                  '#38A169',
  'Transporte/Logística': '#D69E2E',
  'Recupero Regalías':    '#805AD5',
  'Recupero Gastos':      '#718096',
  'Venta Materiales':     '#9F7AEA',
  'Financiero':           '#A0AEC0',
  'Otros':                '#CBD5E0',
  'Ajuste/NC':            '#E53E3E',
  'Ajuste/ND':            '#DD6B20',
}

const CAT_ORDER = ['Petróleo','Gas','Transporte/Logística','Recupero Regalías','Venta Materiales','Recupero Gastos','Financiero','Otros','Ajuste/NC','Ajuste/ND']
const BLOQUE_ORDER = ['ET','PCKK','CH','PPC','ENA','Gas','Financiero','Admin','Varios']

// ─── Pivot HTML builder (SSR) ─────────────────────────────────────────────────

function buildPivotHTML(meses: string[], mes_labels: Record<string, string>, pivot: PivotRow[]): string {
  const byCat: Record<string, PivotRow[]> = {}
  for (const r of pivot) {
    if (!byCat[r.categoria]) byCat[r.categoria] = []
    byCat[r.categoria].push(r)
  }
  const sortedCats = Object.keys(byCat).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  let html = ''
  const grandTotals: Record<string, number> = {}
  for (const m of meses) grandTotals[m] = 0
  let grandTotal = 0

  for (const cat of sortedCats) {
    const rows = byCat[cat]
    const catTotals: Record<string, number> = {}
    for (const m of meses) {
      catTotals[m] = rows.reduce((s, r) => s + (r.por_mes[m] ?? 0), 0)
      grandTotals[m] += catTotals[m]
    }
    const catTotal = rows.reduce((s, r) => s + r.total, 0)
    grandTotal += catTotal
    const isNC = cat === 'Ajuste/NC' || cat === 'Ajuste/ND'
    const color = isNC ? ' style="color:#C53030"' : ''

    html += `<tr class="cat-header"${color}>` +
      `<td class="cat-label" colspan="2">${enc(cat)}</td>` +
      meses.map(m => `<td class="num subtotal">${fK(catTotals[m])}</td>`).join('') +
      `<td class="num subtotal total-col">${fK(catTotal)}</td></tr>`

    const showDetail = rows.length > 1 || rows[0]?.bloque !== 'Varios'
    if (showDetail) {
      const sorted = [...rows].sort((a, b) => {
        const ia = BLOQUE_ORDER.indexOf(a.bloque), ib = BLOQUE_ORDER.indexOf(b.bloque)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
      for (const r of sorted) {
        const rowTotal = meses.reduce((s, m) => s + (r.por_mes[m] ?? 0), 0)
        if (rowTotal === 0 && r.total === 0) continue
        html += `<tr class="detail-row"${color}>` +
          `<td></td><td class="bloque-label">${enc(r.bloque)}</td>` +
          meses.map(m => `<td class="num">${fK(r.por_mes[m] ?? 0)}</td>`).join('') +
          `<td class="num total-col">${fK(rowTotal)}</td></tr>`
      }
    }
  }

  html += `<tr class="grand-total"><td colspan="2">TOTAL NETO</td>` +
    meses.map(m => `<td class="num">${fK(grandTotals[m])}</td>`).join('') +
    `<td class="num total-col">${fK(grandTotal)}</td></tr>`
  return html
}

// ─── Fiscal detail table (grouped by month) ───────────────────────────────────

function buildFiscalTableHTML(
  meses: string[],
  mes_labels: Record<string, string>,
  lineas: DatosFacturacion['lineas']
): string {
  let html = ''

  for (const mes of meses) {
    const grupo = lineas.filter(l => l.mes === mes)
    if (grupo.length === 0) continue

    const label = mes_labels[mes] ?? mes
    const totalUSD = grupo.reduce((s, l) => s + l.importe_usd, 0)
    const totalARS = grupo.reduce((s, l) => s + l.importe_ars, 0)

    // Month header
    html += `<tr class="fiscal-mes-header"><td colspan="14">${enc(label)}</td></tr>`

    // Detail rows
    for (const l of grupo) {
      const isNC = l.categoria === 'Ajuste/NC' || l.categoria === 'Ajuste/ND'
      const ncStyle = isNC ? ' style="color:#C53030"' : ''
      const editStyle = ' class="editable-cell" contenteditable="true" data-placeholder="—"'

      html += `<tr class="fiscal-row"${ncStyle}>` +
        `<td class="dt">${fechaCorta(l.fecha)}</td>` +
        `<td class="comp mono">${enc(l.comprobante)}</td>` +
        `<td class="cli">${enc(l.cliente)}</td>` +
        `<td class="art mono">${enc(l.art_codigo)}</td>` +
        `<td class="desc">${enc(l.art_desc)}</td>` +
        `<td class="blq">${enc(l.bloque)}</td>` +
        `<td class="num">${fN(l.cantidad)}</td>` +
        `<td class="num">${fD(l.precio_neto_usd_u, 4)}</td>` +
        `<td class="num${isNC ? ' nc-val' : ''}">${fK(l.importe_usd)}</td>` +
        `<td class="num ars-col">${fK(l.importe_ars)}</td>` +
        `<td class="num tc-col">${l.tc > 0 ? fN(l.tc) : ''}</td>` +
        (l.es_petroleo
          ? `<td${editStyle}></td><td${editStyle}></td><td${editStyle}></td>`
          : `<td class="na-cell">—</td><td class="na-cell">—</td><td class="na-cell">—</td>`) +
        `</tr>`
    }

    // Month subtotal
    html += `<tr class="fiscal-subtotal">` +
      `<td colspan="8">Subtotal ${enc(label)}</td>` +
      `<td class="num">${fK(totalUSD)}</td>` +
      `<td class="num ars-col">${fK(totalARS)}</td>` +
      `<td colspan="4"></td>` +
      `</tr>`
  }

  return html
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generarReporteFacturacionHTML(datos: DatosFacturacion): string {
  const { meses, mes_labels, pivot, resumen, periodo, lineas } = datos

  const fechaGen = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Filter chips
  const filterChips = meses
    .map(m => `<button class="chip active" data-mes="${m}" onclick="toggleMes('${enc(m)}',this)">${enc(mes_labels[m] ?? m)}</button>`)
    .join('')

  // Pivot month headers
  const mesHeaders = meses
    .map(m => `<th class="num-h mes-col" data-mes="${m}">${enc(mes_labels[m] ?? m)}</th>`)
    .join('')

  const pivotRows   = buildPivotHTML(meses, mes_labels, pivot)
  const fiscalRows  = buildFiscalTableHTML(meses, mes_labels, lineas)

  // Client summary
  const clienteMap: Record<string, number> = {}
  for (const l of lineas) {
    clienteMap[l.cliente] = (clienteMap[l.cliente] ?? 0) + l.importe_usd
  }
  const clienteRows = Object.entries(clienteMap)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `<tr><td>${enc(c || '—')}</td><td class="num">${fK(v)}</td></tr>`)
    .join('')
  const showClientes = Object.keys(clienteMap).length > 1

  // Charts
  const cats = [...new Set(pivot.map(p => p.categoria))]
  const catDatasets = cats.map(cat => ({
    label: cat,
    data: meses.map(m => pivot.filter(p => p.categoria === cat).reduce((s, r) => s + (r.por_mes[m] ?? 0), 0)),
    backgroundColor: CAT_COLORS[cat] ?? '#A0AEC0',
    stack: 'stack',
  }))
  const donutLabels = cats.filter(c => (resumen.por_categoria[c] ?? 0) !== 0)
  const donutData   = donutLabels.map(c => Math.abs(resumen.por_categoria[c] ?? 0))
  const donutColors = donutLabels.map(c => CAT_COLORS[c] ?? '#A0AEC0')

  const ncLineas = lineas.filter(l => l.categoria === 'Ajuste/NC' || l.categoria === 'Ajuste/ND')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte de Facturación · Crown Point Energía</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;font-size:13px;color:#14172E;background:#F4F5F8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-header{background:#14172E;color:#fff;padding:24px 36px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.header-badge{font-family:'Lora',serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.55;margin-bottom:2px}
.header-title{font-family:'Lora',serif;font-size:22px;font-weight:700;letter-spacing:-.02em}
.header-right{text-align:right;font-size:11px;opacity:.55;line-height:1.7}
.page{max-width:1200px;margin:0 auto;padding:28px 24px}
/* KPIs */
.kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{background:#fff;border-radius:10px;padding:18px 20px;border:1px solid #E8EAEF}
.kpi-label{font-size:11px;color:#7A8099;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px}
.kpi-value{font-size:17px;font-family:'Lora',serif;font-weight:700;letter-spacing:-.02em;color:#14172E;line-height:1.2}
.kpi-value.negative{color:#C53030}
.kpi-sub{font-size:11px;color:#7A8099;margin-top:3px}
/* Filter */
.filter-bar{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:14px 20px;margin-bottom:20px;display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.filter-label{font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em;margin-right:4px}
.chip{font-size:12px;padding:5px 12px;border-radius:20px;border:1.5px solid #E8EAEF;background:#F4F5F8;color:#7A8099;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.chip.active{background:#14172E;color:#fff;border-color:#14172E}
.chip-ctrl{font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid #E8EAEF;background:#fff;color:#7A8099;cursor:pointer;margin-left:4px}
/* Section */
.section{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:20px 24px;margin-bottom:20px}
.section-title{font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #E8EAEF;display:flex;align-items:center;gap:8px}
.section-badge{font-size:10px;background:#F0F2F6;border-radius:10px;padding:2px 8px;text-transform:none;letter-spacing:0;color:#A0A8C0;font-weight:500}
/* Pivot table */
.pivot-wrap{overflow-x:auto}
table.pivot{border-collapse:collapse;width:100%;font-size:12px}
table.pivot th{padding:7px 10px;text-align:left;font-weight:600;font-size:11px;color:#7A8099;background:#F8F9FB;border-bottom:2px solid #E8EAEF;white-space:nowrap}
table.pivot td{padding:6px 10px;border-bottom:1px solid #F0F2F6;vertical-align:middle}
table.pivot .num{text-align:right;font-variant-numeric:tabular-nums}
table.pivot .num-h{text-align:right}
table.pivot .cat-header td{font-weight:600;padding-top:10px;padding-bottom:4px;border-bottom:none}
table.pivot .detail-row td{color:#4A5568;padding-top:4px;padding-bottom:4px;border-bottom:none}
table.pivot .detail-row td.bloque-label{padding-left:22px;color:#666}
table.pivot .subtotal{font-weight:600;color:#14172E}
table.pivot .total-col{background:rgba(20,23,46,.04);font-weight:600}
table.pivot .grand-total td{font-weight:700;font-size:13px;padding:10px;border-top:2px solid #14172E;background:#F8F9FB}
table.pivot .grand-total .total-col{background:rgba(20,23,46,.08)}
/* Charts */
.charts-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px}
.chart-card{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:20px 24px}
/* Fiscal detail table */
table.fiscal{border-collapse:collapse;width:100%;font-size:11.5px;min-width:1100px}
table.fiscal th{padding:7px 8px;text-align:left;font-weight:600;font-size:10.5px;color:#7A8099;background:#F8F9FB;border-bottom:2px solid #E8EAEF;white-space:nowrap;position:sticky;top:0;z-index:1}
table.fiscal th.num-h{text-align:right}
table.fiscal td{padding:5px 8px;border-bottom:1px solid #F3F4F8;vertical-align:middle}
table.fiscal .num{text-align:right;font-variant-numeric:tabular-nums;font-family:'DM Sans',sans-serif}
table.fiscal .mono{font-family:monospace;font-size:11px;letter-spacing:-.01em}
table.fiscal .dt{white-space:nowrap;color:#7A8099}
table.fiscal .cli{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
table.fiscal .desc{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#4A5568}
table.fiscal .blq{font-weight:600;font-size:11px;white-space:nowrap}
table.fiscal .ars-col{color:#7A8099}
table.fiscal .tc-col{color:#7A8099;font-size:11px}
table.fiscal .nc-val{color:#C53030}
/* Editable cells */
table.fiscal .editable-cell{background:#FFFBEB;border:1px dashed #D69E2E;border-radius:3px;min-width:70px;cursor:text;color:#744210}
table.fiscal .editable-cell:empty::before{content:attr(data-placeholder);color:#C8CCDA;font-style:italic}
table.fiscal .editable-cell:focus{outline:2px solid #D69E2E;background:#FFF9E6;border-color:transparent}
table.fiscal .na-cell{color:#C8CCDA;text-align:center}
/* Month group header */
table.fiscal .fiscal-mes-header td{background:#14172E;color:#fff;font-weight:700;font-size:12px;letter-spacing:.04em;padding:8px 10px;text-transform:uppercase}
/* Month subtotal */
table.fiscal .fiscal-subtotal td{background:#F8F9FB;font-weight:700;font-size:12px;border-top:2px solid #E8EAEF;border-bottom:2px solid #E8EAEF}
table.fiscal .fiscal-subtotal .num{color:#14172E}
/* Other tables */
table.detail{border-collapse:collapse;width:100%;font-size:12px}
table.detail th{padding:6px 10px;text-align:left;font-size:11px;color:#7A8099;background:#F8F9FB;border-bottom:1.5px solid #E8EAEF}
table.detail td{padding:5px 10px;border-bottom:1px solid #F0F2F6}
table.detail .num{text-align:right;font-variant-numeric:tabular-nums}
/* Buttons */
.export-bar{display:flex;gap:12px;justify-content:flex-end;margin-bottom:20px}
.btn-exp{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s}
.btn-exp:hover{opacity:.85}
.btn-primary{background:#14172E;color:#fff}
.btn-secondary{background:#fff;color:#14172E;border:1.5px solid #E8EAEF}
/* Footer */
.report-footer{margin-top:24px;padding:16px 0;border-top:1px solid #E8EAEF;display:flex;justify-content:space-between;font-size:11px;color:#A0A8C0}
/* Print */
@media print{
  body{background:#fff}
  .filter-bar,.export-bar{display:none!important}
  .section,.kpi{break-inside:avoid}
  .charts-grid{break-inside:avoid}
  table.fiscal .editable-cell{background:#FFFBEB!important;border:1px solid #D69E2E!important}
}
</style>
</head>
<body>

<div class="report-header">
  <div>
    <div class="header-badge">Crown Point Energía</div>
    <div class="header-title">Reporte de Facturación</div>
  </div>
  <div class="header-right">
    Período: <strong>${enc(periodo)}</strong><br>
    Generado: ${enc(fechaGen)}
  </div>
</div>

<div class="page">

  <div class="kpi-strip">
    <div class="kpi">
      <div class="kpi-label">Total Facturado</div>
      <div class="kpi-value">${fMM(resumen.total_facturas)}</div>
      <div class="kpi-sub">Facturas acumuladas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Notas de Crédito</div>
      <div class="kpi-value negative">(${fMM(Math.abs(resumen.total_nc))})</div>
      <div class="kpi-sub">${ncLineas.length} ajuste${ncLineas.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Neto Facturado</div>
      <div class="kpi-value">${fMM(resumen.neto)}</div>
      <div class="kpi-sub">Acumulado ${enc(periodo)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Meses cubiertos</div>
      <div class="kpi-value">${meses.length}</div>
      <div class="kpi-sub">${enc(periodo)}</div>
    </div>
  </div>

  <div class="filter-bar">
    <span class="filter-label">Meses</span>
    ${filterChips}
    <button class="chip-ctrl" onclick="toggleAll(true)">Todos</button>
    <button class="chip-ctrl" onclick="toggleAll(false)">Ninguno</button>
  </div>

  <!-- Pivot summary -->
  <div class="section">
    <div class="section-title">
      Resumen por Categoría y Bloque &middot; us$
      <span class="section-badge">responde al filtro de mes</span>
    </div>
    <div class="pivot-wrap">
      <table class="pivot" id="pivot-table">
        <thead>
          <tr>
            <th style="width:130px">Categoría</th>
            <th style="width:80px">Bloque</th>
            ${mesHeaders}
            <th class="num-h total-col" style="width:90px">Total</th>
          </tr>
        </thead>
        <tbody id="pivot-body">${pivotRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Charts -->
  <div class="charts-grid">
    <div class="chart-card">
      <div class="section-title">Facturación mensual &middot; us$</div>
      <canvas id="barChart" height="190"></canvas>
    </div>
    <div class="chart-card">
      <div class="section-title">Mix por categoría</div>
      <canvas id="donutChart" height="190"></canvas>
    </div>
  </div>

  <!-- Fiscal detail table -->
  <div class="section">
    <div class="section-title">
      Detalle Fiscal por Comprobante
      <span class="section-badge">Buque · Certificado · °API editables para filas de petróleo</span>
    </div>
    <div style="overflow-x:auto">
      <table class="fiscal" id="fiscal-table">
        <thead>
          <tr>
            <th style="width:40px">Fecha</th>
            <th style="width:130px">Comprobante</th>
            <th style="width:130px">Cliente</th>
            <th style="width:80px">Artículo</th>
            <th style="width:190px">Descripción</th>
            <th style="width:55px">Bloque</th>
            <th class="num-h" style="width:70px">Cantidad</th>
            <th class="num-h" style="width:70px">P.Neto USD/u</th>
            <th class="num-h" style="width:75px">Total Neto USD</th>
            <th class="num-h ars-col" style="width:80px">Total Neto ARS</th>
            <th class="num-h tc-col" style="width:55px">TC</th>
            <th style="width:80px; background:#FFFBEB">Certificado</th>
            <th style="width:55px; background:#FFFBEB">°API</th>
            <th style="width:110px; background:#FFFBEB">Buque</th>
          </tr>
        </thead>
        <tbody id="fiscal-body">${fiscalRows}</tbody>
      </table>
    </div>
  </div>

  ${showClientes ? `
  <div class="section">
    <div class="section-title">Resumen por Cliente &middot; us$</div>
    <table class="detail">
      <thead><tr><th>Cliente</th><th class="num">Importe neto</th></tr></thead>
      <tbody>${clienteRows}</tbody>
    </table>
  </div>` : ''}

  <div class="export-bar">
    <button class="btn-exp btn-secondary" onclick="window.print()">Imprimir / PDF</button>
    <button class="btn-exp btn-primary" onclick="exportarExcel()">Exportar a Excel</button>
  </div>

  <div class="report-footer">
    <span>Crown Point Energía · Reporte de Facturación · ${enc(periodo)}</span>
    <span>Generado ${enc(fechaGen)}</span>
  </div>

</div>

<script>
var MESES      = ${j(meses)};
var MES_LABELS = ${j(mes_labels)};
var PIVOT_DATA = ${j(pivot)};
var LINEAS     = ${j(lineas)};
var RESUMEN    = ${j(resumen)};
var CAT_ORDER  = ${j(CAT_ORDER)};
var CAT_COLORS = ${j(CAT_COLORS)};

var activeMeses = new Set(MESES);

function fK(n) {
  if (!n) return '';
  var sign = n < 0 ? '−' : '';
  return sign + (Math.abs(n)/1000).toFixed(1).replace('.',',') + 'k';
}
function fN(n) { return Math.round(n).toLocaleString('es-AR'); }
function fD(n,d) { return n.toFixed(d||2).replace('.',','); }
function fechaCorta(iso) { var p=iso.split('-'); return p[2]+'/'+p[1]; }
function enc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Month filter ──────────────────────────────────────────────────────────────
function toggleMes(mes, btn) {
  if (activeMeses.has(mes)) { activeMeses.delete(mes); btn.classList.remove('active'); }
  else                      { activeMeses.add(mes);    btn.classList.add('active'); }
  renderPivot(); renderFiscal(); updateBarChart();
}
function toggleAll(show) {
  MESES.forEach(function(m){ show ? activeMeses.add(m) : activeMeses.delete(m); });
  document.querySelectorAll('.chip[data-mes]').forEach(function(c){
    show ? c.classList.add('active') : c.classList.remove('active');
  });
  renderPivot(); renderFiscal(); updateBarChart();
}

// ── Pivot re-render ───────────────────────────────────────────────────────────
function renderPivot() {
  var filtered = MESES.filter(function(m){ return activeMeses.has(m); });
  // Rebuild thead
  var tbl = document.getElementById('pivot-table');
  var thead = tbl.querySelector('thead tr');
  Array.from(thead.querySelectorAll('th.mes-col')).forEach(function(th){ th.remove(); });
  var totalTh = thead.querySelector('.total-col');
  filtered.forEach(function(m){
    var th = document.createElement('th');
    th.className = 'num-h mes-col';
    th.textContent = MES_LABELS[m]||m;
    thead.insertBefore(th, totalTh);
  });
  // Build body
  var byCat = {};
  PIVOT_DATA.forEach(function(r){ if(!byCat[r.categoria]) byCat[r.categoria]=[]; byCat[r.categoria].push(r); });
  var cats = Object.keys(byCat).sort(function(a,b){
    return (CAT_ORDER.indexOf(a)<0?99:CAT_ORDER.indexOf(a))-(CAT_ORDER.indexOf(b)<0?99:CAT_ORDER.indexOf(b));
  });
  var html='', gTotals={}, gTotal=0;
  filtered.forEach(function(m){ gTotals[m]=0; });
  cats.forEach(function(cat){
    var rows=byCat[cat], catTotals={}, catTotal=0;
    filtered.forEach(function(m){
      catTotals[m]=rows.reduce(function(s,r){return s+(r.por_mes[m]||0);},0);
      gTotals[m]+=catTotals[m];
    });
    catTotal=rows.reduce(function(s,r){return s+r.total;},0);
    gTotal+=catTotal;
    var isNC=cat==='Ajuste/NC'||cat==='Ajuste/ND', col=isNC?' style="color:#C53030"':'';
    html+='<tr class="cat-header"'+col+'><td class="cat-label" colspan="2">'+cat+'</td>'+
      filtered.map(function(m){return '<td class="num subtotal">'+fK(catTotals[m])+'</td>';}).join('')+
      '<td class="num subtotal total-col">'+fK(catTotal)+'</td></tr>';
    if(rows.length>1||rows[0].bloque!=='Varios'){
      rows.forEach(function(r){
        var rTotal=filtered.reduce(function(s,m){return s+(r.por_mes[m]||0);},0);
        if(!rTotal) return;
        html+='<tr class="detail-row"'+col+'><td></td><td class="bloque-label">'+r.bloque+'</td>'+
          filtered.map(function(m){return '<td class="num">'+(r.por_mes[m]?fK(r.por_mes[m]):'')+'</td>';}).join('')+
          '<td class="num total-col">'+fK(rTotal)+'</td></tr>';
      });
    }
  });
  html+='<tr class="grand-total"><td colspan="2">TOTAL NETO</td>'+
    filtered.map(function(m){return '<td class="num">'+fK(gTotals[m])+'</td>';}).join('')+
    '<td class="num total-col">'+fK(gTotal)+'</td></tr>';
  document.getElementById('pivot-body').innerHTML=html;
}

// ── Fiscal table re-render ────────────────────────────────────────────────────
// Preserve manually-entered values when re-rendering
var manualData = {}; // key: "mes|comprobante|artCod" → {cert, api, buque}

function saveManualData() {
  document.querySelectorAll('#fiscal-body .fiscal-row').forEach(function(tr) {
    var key = tr.getAttribute('data-key');
    if (!key) return;
    var cells = tr.querySelectorAll('.editable-cell');
    if (cells.length === 3) {
      manualData[key] = {
        cert:  cells[0].textContent.trim(),
        api:   cells[1].textContent.trim(),
        buque: cells[2].textContent.trim(),
      };
    }
  });
}

function renderFiscal() {
  saveManualData();
  var filtered = new Set(MESES.filter(function(m){ return activeMeses.has(m); }));
  var html = '';
  MESES.forEach(function(mes) {
    if (!filtered.has(mes)) return;
    var grupo = LINEAS.filter(function(l){ return l.mes === mes; });
    if (!grupo.length) return;
    var label = MES_LABELS[mes]||mes;
    var totalUSD = grupo.reduce(function(s,l){return s+l.importe_usd;},0);
    var totalARS = grupo.reduce(function(s,l){return s+l.importe_ars;},0);
    html += '<tr class="fiscal-mes-header"><td colspan="14">'+label+'</td></tr>';
    grupo.forEach(function(l) {
      var isNC = l.categoria==='Ajuste/NC'||l.categoria==='Ajuste/ND';
      var ncS  = isNC ? ' style="color:#C53030"' : '';
      var key  = l.mes+'|'+l.comprobante+'|'+l.art_codigo;
      var saved = manualData[key]||{};
      html += '<tr class="fiscal-row" data-key="'+enc(key)+'"'+ncS+'>'+
        '<td class="dt">'+fechaCorta(l.fecha)+'</td>'+
        '<td class="comp mono">'+enc(l.comprobante)+'</td>'+
        '<td class="cli" title="'+enc(l.cliente)+'">'+enc(l.cliente)+'</td>'+
        '<td class="art mono">'+enc(l.art_codigo)+'</td>'+
        '<td class="desc" title="'+enc(l.art_desc)+'">'+enc(l.art_desc)+'</td>'+
        '<td class="blq">'+enc(l.bloque)+'</td>'+
        '<td class="num">'+fN(l.cantidad)+'</td>'+
        '<td class="num">'+fD(l.precio_neto_usd_u,4)+'</td>'+
        '<td class="num'+(isNC?' nc-val':'')+'">'+fK(l.importe_usd)+'</td>'+
        '<td class="num ars-col">'+fK(l.importe_ars)+'</td>'+
        '<td class="num tc-col">'+(l.tc>0?fN(l.tc):'')+'</td>'+
        (l.es_petroleo
          ? '<td class="editable-cell" contenteditable="true" data-placeholder="—">'+(saved.cert||'')+'</td>'+
            '<td class="editable-cell" contenteditable="true" data-placeholder="—">'+(saved.api||'')+'</td>'+
            '<td class="editable-cell" contenteditable="true" data-placeholder="—">'+(saved.buque||'')+'</td>'
          : '<td class="na-cell">—</td><td class="na-cell">—</td><td class="na-cell">—</td>')+
        '</tr>';
    });
    html += '<tr class="fiscal-subtotal">'+
      '<td colspan="8">Subtotal '+label+'</td>'+
      '<td class="num">'+fK(totalUSD)+'</td>'+
      '<td class="num ars-col">'+fK(totalARS)+'</td>'+
      '<td colspan="4"></td></tr>';
  });
  document.getElementById('fiscal-body').innerHTML = html;
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
var barChart;
(function(){
  var ctx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(ctx, {
    type:'bar',
    data:{ labels: MESES.map(function(m){return MES_LABELS[m]||m;}), datasets: ${j(catDatasets)} },
    options:{
      responsive:true,
      plugins:{legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:11}}},
        y:{ticks:{font:{size:11},callback:function(v){return (v/1000).toFixed(0)+'k';}},grid:{color:'rgba(0,0,0,.06)'}},
      },
    },
  });
})();

function updateBarChart() {
  if (!barChart) return;
  var filtered = MESES.filter(function(m){ return activeMeses.has(m); });
  barChart.data.labels = filtered.map(function(m){ return MES_LABELS[m]||m; });
  var byCat={};
  PIVOT_DATA.forEach(function(r){
    if(!byCat[r.categoria]) byCat[r.categoria]={label:r.categoria,data:[],backgroundColor:CAT_COLORS[r.categoria]||'#A0AEC0',stack:'stack'};
    filtered.forEach(function(m,i){ byCat[r.categoria].data[i]=(byCat[r.categoria].data[i]||0)+(r.por_mes[m]||0); });
  });
  barChart.data.datasets = Object.values(byCat);
  barChart.update();
}

// ── Donut chart ───────────────────────────────────────────────────────────────
(function(){
  var ctx = document.getElementById('donutChart').getContext('2d');
  new Chart(ctx,{
    type:'doughnut',
    data:{ labels:${j(donutLabels)}, datasets:[{data:${j(donutData)},backgroundColor:${j(donutColors)},borderWidth:2,borderColor:'#fff'}] },
    options:{
      responsive:true, cutout:'62%',
      plugins:{
        legend:{position:'bottom',labels:{font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:function(ctx){
          var total=ctx.dataset.data.reduce(function(a,b){return a+b;},0);
          return ' '+(ctx.parsed/1e6).toFixed(3)+' MM ('+(total>0?(ctx.parsed/total*100).toFixed(1):0)+'%)';
        }}},
      },
    },
  });
})();

// ── Excel export ──────────────────────────────────────────────────────────────
function exportarExcel() {
  saveManualData();
  var filtered = new Set(MESES.filter(function(m){ return activeMeses.has(m); }));
  var wb = XLSX.utils.book_new();

  // Sheet 1: Resumen pivot
  var pivHdr = ['Categoría','Bloque'].concat(MESES.filter(function(m){return filtered.has(m);}).map(function(m){return MES_LABELS[m]||m;})).concat(['Total']);
  var pivRows = [pivHdr];
  var byCat={};
  PIVOT_DATA.forEach(function(r){if(!byCat[r.categoria])byCat[r.categoria]=[];byCat[r.categoria].push(r);});
  Object.keys(byCat).forEach(function(cat){
    var rows=byCat[cat];
    var fMeses=MESES.filter(function(m){return filtered.has(m);});
    pivRows.push([cat,''].concat(fMeses.map(function(m){return rows.reduce(function(s,r){return s+(r.por_mes[m]||0);},0);})).concat([rows.reduce(function(s,r){return s+r.total;},0)]));
    rows.forEach(function(r){
      pivRows.push(['',r.bloque].concat(fMeses.map(function(m){return r.por_mes[m]||0;})).concat([r.total]));
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pivRows), 'Resumen');

  // Sheet 2: Detalle fiscal
  var detHdr = ['Fecha','Mes','Comprobante','Cliente','Artículo','Descripción','Bloque','Categoría','Cantidad','P.Neto USD/u','Total Neto USD','Total Neto ARS','TC','Certificado','°API','Buque'];
  var detRows = [detHdr];
  LINEAS.filter(function(l){return filtered.has(l.mes);}).forEach(function(l){
    var key = l.mes+'|'+l.comprobante+'|'+l.art_codigo;
    var saved = manualData[key]||{};
    detRows.push([l.fecha,MES_LABELS[l.mes]||l.mes,l.comprobante,l.cliente,l.art_codigo,l.art_desc,l.bloque,l.categoria,l.cantidad,l.precio_neto_usd_u,l.importe_usd,l.importe_ars,l.tc>0?l.tc:'',saved.cert||'',saved.api||'',saved.buque||'']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detRows), 'Detalle Fiscal');

  var tag = Array.from(filtered).sort()[0]||'';
  XLSX.writeFile(wb, 'Facturacion_'+tag.replace('-','')+'.xlsx');
}

// Initial data-key attributes for SSR-rendered rows (fiscal table)
document.querySelectorAll('#fiscal-body .fiscal-row').forEach(function(tr){
  // rows rendered server-side don't have data-key; add it from cell content
  var cells = tr.querySelectorAll('td');
  if (cells.length >= 3) {
    var comp = cells[1].textContent.trim();
    var art  = cells[3].textContent.trim();
    // find matching line to get mes
    var line = LINEAS.find(function(l){ return l.comprobante===comp && l.art_codigo===art; });
    if (line) tr.setAttribute('data-key', line.mes+'|'+line.comprobante+'|'+line.art_codigo);
  }
});
<\/script>
</body>
</html>`
}

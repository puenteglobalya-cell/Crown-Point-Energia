import type { DatosFacturacion, PivotRow } from '@/lib/parsers/facturacion'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fMM(n: number): string {
  const sign = n < 0 ? '−' : ''
  return sign + 'us$ ' + (Math.abs(n) / 1_000_000).toFixed(3).replace('.', ',') + ' MM'
}

function fK(n: number): string {
  if (n === 0) return ''
  const sign = n < 0 ? '−' : ''
  return sign + (Math.abs(n) / 1000).toFixed(1).replace('.', ',') + 'k'
}

function enc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function j(v: unknown): string {
  return JSON.stringify(v)
}

// ─── Color palette ────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  'Petróleo':  '#2B6CB0',
  'Gas':       '#38A169',
  'Transporte':'#D69E2E',
  'Servicios': '#718096',
  'Otros':     '#9F7AEA',
  'Ajuste/NC': '#E53E3E',
  'Ajuste/ND': '#DD6B20',
}
const CAT_ORDER = ['Petróleo', 'Gas', 'Transporte', 'Servicios', 'Otros', 'Ajuste/NC', 'Ajuste/ND']
const BLOQUE_ORDER = ['ET', 'PCKK', 'CH', 'RCLV', 'TDF', 'CER', 'Varios']

// ─── Pivot HTML builder (TypeScript / SSR) ────────────────────────────────────

function buildPivotHTML(meses: string[], mes_labels: Record<string, string>, pivot: PivotRow[]): string {
  const byCat: Record<string, PivotRow[]> = {}
  for (const r of pivot) {
    if (!byCat[r.categoria]) byCat[r.categoria] = []
    byCat[r.categoria].push(r)
  }

  const sortedCats = Object.keys(byCat).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a)
    const ib = CAT_ORDER.indexOf(b)
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

    // Category header row
    html += `<tr class="cat-header"${color}>` +
      `<td class="cat-label" colspan="2">${enc(cat)}</td>` +
      meses.map(m => `<td class="num subtotal">${fK(catTotals[m])}</td>`).join('') +
      `<td class="num subtotal total-col">${fK(catTotal)}</td>` +
      `</tr>`

    // Detail rows per bloque (skip if single row with bloque "Varios")
    const showDetail = rows.length > 1 || rows[0]?.bloque !== 'Varios'
    if (showDetail) {
      const sorted = [...rows].sort((a, b) => {
        const ia = BLOQUE_ORDER.indexOf(a.bloque)
        const ib = BLOQUE_ORDER.indexOf(b.bloque)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
      for (const r of sorted) {
        const rowTotal = meses.reduce((s, m) => s + (r.por_mes[m] ?? 0), 0)
        if (rowTotal === 0 && r.total === 0) continue
        html += `<tr class="detail-row"${color}>` +
          `<td></td><td class="bloque-label">${enc(r.bloque)}</td>` +
          meses.map(m => `<td class="num">${fK(r.por_mes[m] ?? 0)}</td>`).join('') +
          `<td class="num total-col">${fK(rowTotal)}</td>` +
          `</tr>`
      }
    }
  }

  // Grand total
  html += `<tr class="grand-total">` +
    `<td colspan="2">TOTAL NETO</td>` +
    meses.map(m => `<td class="num">${fK(grandTotals[m])}</td>`).join('') +
    `<td class="num total-col">${fK(grandTotal)}</td>` +
    `</tr>`

  return html
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generarReporteFacturacionHTML(datos: DatosFacturacion): string {
  const { meses, mes_labels, pivot, resumen, periodo, lineas } = datos

  const fechaGen = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Month filter chips
  const filterChips = meses
    .map(m => `<button class="chip active" data-mes="${m}" onclick="toggleMes('${enc(m)}',this)">${enc(mes_labels[m] ?? m)}</button>`)
    .join('')

  // Pivot table header cells
  const mesHeaders = meses
    .map(m => `<th class="num-h mes-col" data-mes="${m}">${enc(mes_labels[m] ?? m)}</th>`)
    .join('')

  // Initial pivot rows
  const pivotRows = buildPivotHTML(meses, mes_labels, pivot)

  // Client summary
  const clienteMap: Record<string, number> = {}
  for (const l of lineas) {
    clienteMap[l.cliente] = (clienteMap[l.cliente] ?? 0) + l.importe
  }
  const clienteRows = Object.entries(clienteMap)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `<tr><td>${enc(c || '—')}</td><td class="num">${fK(v)}</td></tr>`)
    .join('')
  const showClientes = Object.keys(clienteMap).length > 1

  // NC/ND detail
  const ncLineas = lineas.filter(l => l.categoria === 'Ajuste/NC' || l.categoria === 'Ajuste/ND')
  const ncRows = ncLineas
    .map(l => `<tr>` +
      `<td>${enc(l.mes_label)}</td>` +
      `<td>${enc(l.tipo_comp + ' ' + l.nro_comp)}</td>` +
      `<td>${enc(l.cliente)}</td>` +
      `<td>${enc(l.art_desc || l.art_codigo)}</td>` +
      `<td class="num">${fK(l.importe)}</td>` +
      `</tr>`)
    .join('')

  // Chart data (for Chart.js)
  const cats = [...new Set(pivot.map(p => p.categoria))]
  const catDatasets = cats.map(cat => {
    const rows = pivot.filter(p => p.categoria === cat)
    return {
      label: cat,
      data: meses.map(m => rows.reduce((s, r) => s + (r.por_mes[m] ?? 0), 0)),
      backgroundColor: CAT_COLORS[cat] ?? '#A0AEC0',
      stack: 'stack',
    }
  })

  const donutLabels = cats.filter(c => (resumen.por_categoria[c] ?? 0) !== 0)
  const donutData   = donutLabels.map(c => Math.abs(resumen.por_categoria[c] ?? 0))
  const donutColors = donutLabels.map(c => CAT_COLORS[c] ?? '#A0AEC0')

  const totalFacturadoStr = fMM(resumen.total_facturas)
  const totalNCStr        = fMM(Math.abs(resumen.total_nc))
  const netoStr           = fMM(resumen.neto)

  // ── HTML ────────────────────────────────────────────────────────────────────
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
.page{max-width:1100px;margin:0 auto;padding:28px 24px}
.kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{background:#fff;border-radius:10px;padding:18px 20px;border:1px solid #E8EAEF}
.kpi-label{font-size:11px;color:#7A8099;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px}
.kpi-value{font-size:18px;font-family:'Lora',serif;font-weight:700;letter-spacing:-.02em;color:#14172E;line-height:1.2}
.kpi-value.negative{color:#C53030}
.kpi-sub{font-size:11px;color:#7A8099;margin-top:3px}
.filter-bar{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:14px 20px;margin-bottom:20px;display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.filter-label{font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em;margin-right:4px}
.chip{font-size:12px;padding:5px 12px;border-radius:20px;border:1.5px solid #E8EAEF;background:#F4F5F8;color:#7A8099;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.chip.active{background:#14172E;color:#fff;border-color:#14172E}
.chip-ctrl{font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid #E8EAEF;background:#fff;color:#7A8099;cursor:pointer;margin-left:4px}
.section{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:20px 24px;margin-bottom:20px}
.section-title{font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #E8EAEF}
.pivot-wrap{overflow-x:auto}
table.pivot{border-collapse:collapse;width:100%;font-size:12px}
table.pivot th{padding:7px 10px;text-align:left;font-weight:600;font-size:11px;color:#7A8099;background:#F8F9FB;border-bottom:2px solid #E8EAEF;white-space:nowrap}
table.pivot td{padding:6px 10px;border-bottom:1px solid #F0F2F6;vertical-align:middle}
table.pivot .num{text-align:right;font-variant-numeric:tabular-nums}
table.pivot .num-h{text-align:right}
table.pivot .cat-header td{font-weight:600;padding-top:10px;padding-bottom:4px;border-bottom:none}
table.pivot .cat-header td.cat-label{padding-left:10px}
table.pivot .detail-row td{color:#4A5568;padding-top:4px;padding-bottom:4px;border-bottom:none}
table.pivot .detail-row td.bloque-label{padding-left:22px;color:#666}
table.pivot .subtotal{font-weight:600;color:#14172E}
table.pivot .total-col{background:rgba(20,23,46,.04);font-weight:600}
table.pivot .grand-total td{font-weight:700;font-size:13px;padding:10px;border-top:2px solid #14172E;background:#F8F9FB;color:#14172E}
table.pivot .grand-total .total-col{background:rgba(20,23,46,.08)}
table.pivot tr:hover:not(.grand-total):not(.cat-header) td{background:#F8F9FB}
.charts-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px}
.chart-card{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:20px 24px}
table.detail{border-collapse:collapse;width:100%;font-size:12px}
table.detail th{padding:6px 10px;text-align:left;font-size:11px;color:#7A8099;background:#F8F9FB;border-bottom:1.5px solid #E8EAEF}
table.detail td{padding:5px 10px;border-bottom:1px solid #F0F2F6}
table.detail .num{text-align:right;font-variant-numeric:tabular-nums}
.export-bar{display:flex;gap:12px;justify-content:flex-end;margin-bottom:20px}
.btn-exp{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s}
.btn-exp:hover{opacity:.85}
.btn-primary{background:#14172E;color:#fff}
.btn-secondary{background:#fff;color:#14172E;border:1.5px solid #E8EAEF}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field-item label{display:block;font-size:11px;color:#7A8099;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.field-val{width:100%;font-size:13px;color:#14172E;padding:8px 12px;border-radius:6px;border:1px dashed #C8CCDA;min-height:36px;background:#fafafa;font-family:'DM Sans',sans-serif;resize:none}
.field-val:focus{outline:2px solid #14172E;border-color:transparent;background:#fff}
.report-footer{margin-top:24px;padding:16px 0;border-top:1px solid #E8EAEF;display:flex;justify-content:space-between;font-size:11px;color:#A0A8C0}
@media print{body{background:#fff}.filter-bar,.export-bar{display:none!important}.section,.kpi{break-inside:avoid}.charts-grid{break-inside:avoid}}
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
      <div class="kpi-value">${totalFacturadoStr}</div>
      <div class="kpi-sub">Facturas acumuladas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Notas de Crédito</div>
      <div class="kpi-value negative">(${totalNCStr})</div>
      <div class="kpi-sub">${ncLineas.length} ajuste${ncLineas.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Neto Facturado</div>
      <div class="kpi-value">${netoStr}</div>
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

  <div class="section">
    <div class="section-title">Facturación por Categoría y Bloque &middot; us$</div>
    <div class="pivot-wrap">
      <table class="pivot" id="pivot-table">
        <thead>
          <tr>
            <th style="width:110px">Categoría</th>
            <th style="width:80px">Bloque</th>
            ${mesHeaders}
            <th class="num-h total-col" style="width:90px">Total</th>
          </tr>
        </thead>
        <tbody id="pivot-body">${pivotRows}</tbody>
      </table>
    </div>
  </div>

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

  ${showClientes ? `
  <div class="section">
    <div class="section-title">Resumen por Cliente &middot; us$</div>
    <table class="detail">
      <thead><tr><th>Cliente</th><th class="num">Importe neto</th></tr></thead>
      <tbody>${clienteRows}</tbody>
    </table>
  </div>` : ''}

  ${ncLineas.length > 0 ? `
  <div class="section">
    <div class="section-title">Detalle de Ajustes y Notas de Crédito</div>
    <table class="detail">
      <thead>
        <tr><th>Mes</th><th>Comprobante</th><th>Cliente</th><th>Artículo</th><th class="num">Importe</th></tr>
      </thead>
      <tbody>${ncRows}</tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-title">
      Datos complementarios
      <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#A0A8C0;font-size:11px">
        &mdash; completar antes de imprimir
      </span>
    </div>
    <div class="field-grid">
      <div class="field-item">
        <label>°API Crudo (promedio)</label>
        <textarea class="field-val" rows="1" placeholder="ej. 26.5°API"></textarea>
      </div>
      <div class="field-item">
        <label>Buques / Vessel names</label>
        <textarea class="field-val" rows="1" placeholder="ej. MV Nordic Grace; MV Stena Sunrise"></textarea>
      </div>
      <div class="field-item">
        <label>Notas adicionales</label>
        <textarea class="field-val" rows="2" placeholder="Observaciones, condiciones contractuales, etc."></textarea>
      </div>
      <div class="field-item">
        <label>Elaborado por</label>
        <textarea class="field-val" rows="1" placeholder="Nombre / área"></textarea>
      </div>
    </div>
  </div>

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
var MESES       = ${j(meses)};
var MES_LABELS  = ${j(mes_labels)};
var PIVOT_DATA  = ${j(pivot)};
var LINEAS      = ${j(lineas)};
var RESUMEN     = ${j(resumen)};
var CAT_ORDER   = ${j(CAT_ORDER)};
var CAT_COLORS  = ${j(CAT_COLORS)};

var activeMeses = new Set(MESES);

function fK(n) {
  if (!n) return '';
  var sign = n < 0 ? '−' : '';
  return sign + (Math.abs(n)/1000).toFixed(1).replace('.',',') + 'k';
}

function toggleMes(mes, btn) {
  if (activeMeses.has(mes)) { activeMeses.delete(mes); btn.classList.remove('active'); }
  else                      { activeMeses.add(mes);    btn.classList.add('active'); }
  renderPivot(); updateBarChart();
}

function toggleAll(show) {
  MESES.forEach(function(m) { show ? activeMeses.add(m) : activeMeses.delete(m); });
  document.querySelectorAll('.chip[data-mes]').forEach(function(c) {
    show ? c.classList.add('active') : c.classList.remove('active');
  });
  renderPivot(); updateBarChart();
}

function renderPivot() {
  var filtered = MESES.filter(function(m){ return activeMeses.has(m); });

  // Rebuild thead cols
  var tbl   = document.getElementById('pivot-table');
  var thead = tbl.querySelector('thead tr');
  Array.from(thead.querySelectorAll('th.mes-col')).forEach(function(th){ th.remove(); });
  var totalTh = thead.querySelector('.total-col');
  filtered.forEach(function(m) {
    var th = document.createElement('th');
    th.className = 'num-h mes-col';
    th.textContent = MES_LABELS[m] || m;
    thead.insertBefore(th, totalTh);
  });

  // Build body
  var byCat = {};
  PIVOT_DATA.forEach(function(r) {
    if (!byCat[r.categoria]) byCat[r.categoria] = [];
    byCat[r.categoria].push(r);
  });

  var cats = Object.keys(byCat).slice().sort(function(a,b){
    var ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });

  var html = '', grandTotals = {}, grandTotal = 0;
  filtered.forEach(function(m){ grandTotals[m]=0; });

  cats.forEach(function(cat) {
    var rows = byCat[cat];
    var catTotals = {}, catTotal = 0;
    filtered.forEach(function(m) {
      catTotals[m] = rows.reduce(function(s,r){ return s+(r.por_mes[m]||0); },0);
      grandTotals[m] += catTotals[m];
    });
    catTotal = rows.reduce(function(s,r){ return s+r.total; },0);
    grandTotal += catTotal;

    var isNC = cat==='Ajuste/NC'||cat==='Ajuste/ND';
    var col  = isNC ? ' style="color:#C53030"' : '';

    html += '<tr class="cat-header"'+col+'>'+
      '<td class="cat-label" colspan="2">'+cat+'</td>'+
      filtered.map(function(m){ return '<td class="num subtotal">'+fK(catTotals[m])+'</td>'; }).join('')+
      '<td class="num subtotal total-col">'+fK(catTotal)+'</td></tr>';

    if (rows.length>1 || rows[0].bloque!=='Varios') {
      rows.forEach(function(r) {
        var rTotal = filtered.reduce(function(s,m){ return s+(r.por_mes[m]||0); },0);
        if (!rTotal) return;
        html += '<tr class="detail-row"'+col+'>'+
          '<td></td><td class="bloque-label">'+r.bloque+'</td>'+
          filtered.map(function(m){ return '<td class="num">'+(r.por_mes[m]?fK(r.por_mes[m]):'')+'</td>'; }).join('')+
          '<td class="num total-col">'+fK(rTotal)+'</td></tr>';
      });
    }
  });

  html += '<tr class="grand-total"><td colspan="2">TOTAL NETO</td>'+
    filtered.map(function(m){ return '<td class="num">'+fK(grandTotals[m])+'</td>'; }).join('')+
    '<td class="num total-col">'+fK(grandTotal)+'</td></tr>';

  document.getElementById('pivot-body').innerHTML = html;
}

// Bar chart
var barChart;
(function() {
  var ctx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MESES.map(function(m){ return MES_LABELS[m]||m; }),
      datasets: ${j(catDatasets)},
    },
    options: {
      responsive: true,
      plugins: { legend: { position:'bottom', labels:{ font:{size:11}, boxWidth:12 } } },
      scales: {
        x: { grid:{display:false}, ticks:{font:{size:11}} },
        y: { ticks:{ font:{size:11}, callback:function(v){ return (v/1000).toFixed(0)+'k'; } }, grid:{color:'rgba(0,0,0,.06)'} },
      },
    },
  });
})();

function updateBarChart() {
  if (!barChart) return;
  var filtered = MESES.filter(function(m){ return activeMeses.has(m); });
  barChart.data.labels = filtered.map(function(m){ return MES_LABELS[m]||m; });
  var byCat = {};
  PIVOT_DATA.forEach(function(r) {
    if (!byCat[r.categoria]) byCat[r.categoria] = { label:r.categoria, data:[], backgroundColor:CAT_COLORS[r.categoria]||'#A0AEC0', stack:'stack' };
    filtered.forEach(function(m,i){
      byCat[r.categoria].data[i] = (byCat[r.categoria].data[i]||0)+(r.por_mes[m]||0);
    });
  });
  barChart.data.datasets = Object.values(byCat);
  barChart.update();
}

// Donut chart
(function() {
  var ctx = document.getElementById('donutChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   ${j(donutLabels)},
      datasets: [{ data:${j(donutData)}, backgroundColor:${j(donutColors)}, borderWidth:2, borderColor:'#fff' }],
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: { position:'bottom', labels:{ font:{size:11}, boxWidth:12 } },
        tooltip: { callbacks: { label: function(ctx) {
          var total = ctx.dataset.data.reduce(function(a,b){return a+b;},0);
          var pct   = total>0 ? ((ctx.parsed/total)*100).toFixed(1) : '0';
          return ' '+(ctx.parsed/1e6).toFixed(3)+' MM ('+pct+'%)';
        }}}
      },
    },
  });
})();

// Excel export
function exportarExcel() {
  var filtered = MESES.filter(function(m){ return activeMeses.has(m); });
  var wb = XLSX.utils.book_new();

  // Resumen sheet
  var hdr = ['Categoría','Bloque'].concat(filtered.map(function(m){ return MES_LABELS[m]||m; })).concat(['Total']);
  var rows = [hdr];
  var byCat = {};
  PIVOT_DATA.forEach(function(r){ if(!byCat[r.categoria]) byCat[r.categoria]=[]; byCat[r.categoria].push(r); });
  var cats = Object.keys(byCat).sort(function(a,b){ return (CAT_ORDER.indexOf(a)<0?99:CAT_ORDER.indexOf(a))-(CAT_ORDER.indexOf(b)<0?99:CAT_ORDER.indexOf(b)); });
  var gTotals = filtered.map(function(m){ return PIVOT_DATA.reduce(function(s,r){ return s+(r.por_mes[m]||0); },0); });
  var gTotal  = PIVOT_DATA.reduce(function(s,r){ return s+r.total; },0);

  cats.forEach(function(cat) {
    var rs = byCat[cat];
    var catRow = [cat,''].concat(filtered.map(function(m){ return rs.reduce(function(s,r){ return s+(r.por_mes[m]||0); },0); })).concat([rs.reduce(function(s,r){return s+r.total;},0)]);
    rows.push(catRow);
    rs.forEach(function(r) {
      rows.push(['',r.bloque].concat(filtered.map(function(m){ return r.por_mes[m]||0; })).concat([r.total]));
    });
  });
  rows.push(['TOTAL NETO',''].concat(gTotals).concat([gTotal]));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Resumen');

  // Detalle sheet
  var dHdr = ['Fecha','Mes','Tipo','Nro.','Cliente','Cód. Art.','Artículo','Categoría','Bloque','Cantidad','Unidad','Precio U.','Importe'];
  var dRows = [dHdr].concat(
    LINEAS.filter(function(l){ return activeMeses.has(l.mes); })
          .map(function(l){ return [l.fecha,l.mes_label,l.tipo_comp,l.nro_comp,l.cliente,l.art_codigo,l.art_desc,l.categoria,l.bloque,l.cantidad,l.unidad,l.precio_unitario,l.importe]; })
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dRows), 'Detalle');

  var tag = (filtered[0]||'').replace('-','')+(filtered.length>1?'-'+(filtered[filtered.length-1]||'').replace('-',''):'');
  XLSX.writeFile(wb, 'Facturacion_'+tag+'.xlsx');
}
<\/script>
</body>
</html>`
}

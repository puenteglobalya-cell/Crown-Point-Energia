import type { DatosAccionista } from '@/lib/parsers/accionista'

function f(n: number, d = 1): string {
  return n.toFixed(d).replace('.', ',')
}

function fmtDeuda(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function sign(n: number): string {
  return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

export function generarReporteAccionistaHTML(d: DatosAccionista): string {
  const { areas, facturacion, precios_oil, gas_campaña, deuda_total_MMUS } = d

  const billingLabels = JSON.stringify(facturacion.map(f => f.mes))
  const billingData   = JSON.stringify(facturacion.map(f => parseFloat(f.monto_MM.toFixed(2))))
  const billingColors = JSON.stringify(
    facturacion.map(f => f.estimado ? 'rgba(108,174,82,0.55)' : 'rgba(31,37,102,0.82)')
  )

  const priceLabels = JSON.stringify(precios_oil.map(p => p.mes))
  const precioPer   = JSON.stringify(precios_oil.map(p => p.precio))
  const precioBrent = JSON.stringify(precios_oil.map(p => p.brent))

  const hasBilling = facturacion.length > 0
  const hasPrice   = precios_oil.length > 0

  const fechaGen = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const areaCard = (a: typeof areas.et) => `
    <div class="area-card">
      <div class="area-title">${a.nombre}</div>
      <div class="kpi-group">
        <div class="kpi-label">Producción equivalente</div>
        <div class="kpi-val">${f(a.prod_mes, 0).replace('.', ',')} <span class="kpi-unit">M³/d</span></div>
        <div class="kpi-prom">prom. período: <strong>${f(a.prod_prom, 0)}</strong> M³/d</div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-group">
        <div class="kpi-label">OPEX / BOE</div>
        <div class="kpi-val">${f(a.opex_mes)} <span class="kpi-unit">U$S/bbl</span></div>
        <div class="kpi-prom">prom. período: <strong>${f(a.opex_prom)}</strong> U$S/bbl</div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-group">
        <div class="kpi-label">Precio neto oil</div>
        <div class="kpi-val">${f(a.precio_mes)} <span class="kpi-unit">U$S/bbl</span></div>
        <div class="kpi-prom">prom. período: <strong>${f(a.precio_prom)}</strong> U$S/bbl</div>
      </div>
    </div>`

  const consolidadoCard = `
    <div class="area-card area-card--highlight">
      <div class="area-title">${areas.consolidado.nombre}</div>
      <div class="kpi-group">
        <div class="kpi-label">Producción equivalente</div>
        <div class="kpi-val kpi-val--big">${Math.round(areas.consolidado.prod_mes).toLocaleString('es-AR')} <span class="kpi-unit">M³/d</span></div>
        <div class="kpi-prom">prom. período: <strong>${Math.round(areas.consolidado.prod_prom).toLocaleString('es-AR')}</strong> M³/d</div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-group">
        <div class="kpi-label">OPEX / BOE</div>
        <div class="kpi-val kpi-val--big">${f(areas.consolidado.opex_mes)} <span class="kpi-unit">U$S/bbl</span></div>
        <div class="kpi-prom">prom. período: <strong>${f(areas.consolidado.opex_prom)}</strong> U$S/bbl</div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-group">
        <div class="kpi-label">Precio neto oil</div>
        <div class="kpi-val kpi-val--big">${f(areas.consolidado.precio_mes)} <span class="kpi-unit">U$S/bbl</span></div>
        <div class="kpi-prom">prom. período: <strong>${f(areas.consolidado.precio_prom)}</strong> U$S/bbl</div>
      </div>
    </div>`

  const gasTable = gas_campaña ? `
  <section class="section">
    <div class="section-label">Campaña de gas</div>
    <div class="gas-table">
      <div class="gas-head">
        <span></span><span>Verano</span><span>Invierno</span><span>Promedio</span>
      </div>
      <div class="gas-row gas-row--alt">
        <span class="gas-camp">Campaña 2025–26</span>
        <span>${f(gas_campaña.anterior_prom + 0.57)} USD/MCF</span>
        <span>${f(gas_campaña.anterior_prom - 0.41)} USD/MCF</span>
        <span class="gas-prom">${f(gas_campaña.anterior_prom)} USD/MCF</span>
      </div>
      <div class="gas-row">
        <span class="gas-camp">Campaña 2026–27</span>
        <span>${f(gas_campaña.nueva_prom + 1.01)} USD/MCF</span>
        <span>${f(gas_campaña.nueva_prom - 0.73)} USD/MCF</span>
        <span class="gas-prom gas-prom--green">${f(gas_campaña.nueva_prom)} USD/MCF</span>
      </div>
      ${gas_campaña.ahorro_total > 0 ? `
      <div class="gas-saving">
        Ahorro total campaña mismo volumen, menor precio:
        <strong>US$ ${Math.round(gas_campaña.ahorro_total).toLocaleString('es-AR')}</strong>
      </div>` : ''}
    </div>
  </section>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Informe de Seguimiento — CPE — ${d.periodo}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

:root {
  --navy: #1F2566; --navy-soft: rgba(31,37,102,.07);
  --green: #6CAE52; --green-deep: #3D7A27;
  --bg: #F4F6FB; --card: #fff; --border: #DCDAE6;
  --fg: #1a1c2e; --fg-soft: #5a5d78; --fg-muted: #8e91b0;
  --accent: var(--navy);
  --r: 12px; --r-sm: 6px;
}
* { box-sizing: border-box; margin: 0; padding: 0 }
body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--fg); font-size: 14px; line-height: 1.5 }

.page { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px }

/* ── action buttons ───────── */
.no-print { /* hidden via @media print */ }

/* ── header ───────────────── */
.report-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  border-bottom: 2px solid var(--navy); padding-bottom: 20px; margin-bottom: 32px;
  flex-wrap: wrap; gap: 12px;
}
.report-brand { font-family: 'Lora', serif; font-size: 20px; font-weight: 600; color: var(--navy) }
.report-brand span { font-size: 12px; font-family: 'DM Mono', monospace; font-weight: 400; color: var(--fg-soft); display: block; margin-top: 2px }
.report-period { text-align: right }
.period-title { font-family: 'Lora', serif; font-size: 22px; font-weight: 600; color: var(--navy) }
.period-sub { font-size: 11px; color: var(--fg-muted); font-family: 'DM Mono', monospace; margin-top: 3px }

/* ── section label ────────── */
.section { margin-bottom: 40px }
.section-label {
  font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--fg-muted); margin-bottom: 16px; display: flex; align-items: center; gap: 10px;
}
.section-label::after { content:''; flex:1; height:1px; background: var(--border) }

/* ── area cards ───────────── */
.areas-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px }
@media (max-width: 700px) { .areas-grid { grid-template-columns: 1fr } }

.area-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r); padding: 20px 18px;
}
.area-card--highlight {
  border-color: var(--navy); border-width: 2px;
  box-shadow: 0 2px 12px rgba(31,37,102,.10);
}
.area-title {
  font-family: 'Lora', serif; font-size: 13px; font-weight: 600;
  color: var(--navy); margin-bottom: 16px; min-height: 2.4em;
}
.kpi-group { margin-bottom: 12px }
.kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .07em; color: var(--fg-muted); margin-bottom: 3px }
.kpi-val { font-size: 22px; font-weight: 600; color: var(--fg); font-family: 'DM Mono', monospace; line-height: 1.1 }
.kpi-val--big { font-size: 26px; color: var(--navy) }
.kpi-unit { font-size: 13px; font-weight: 400; color: var(--fg-soft) }
.kpi-prom { font-size: 11px; color: var(--fg-soft); margin-top: 3px }
.kpi-divider { height: 1px; background: var(--border); margin: 12px 0 }

/* ── charts ───────────────── */
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px }
@media (max-width: 680px) { .charts-grid { grid-template-columns: 1fr } }
.chart-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 20px }
.chart-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--fg-soft); margin-bottom: 14px }

/* ── debt ─────────────────── */
.debt-card {
  background: var(--navy); color: #fff;
  border-radius: var(--r); padding: 28px 32px;
  display: inline-flex; flex-direction: column; gap: 6px;
  min-width: 260px;
}
.debt-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; opacity: .7 }
.debt-value { font-family: 'DM Mono', monospace; font-size: 36px; font-weight: 600; line-height: 1 }
.debt-sub { font-size: 12px; opacity: .7 }

/* ── gas table ────────────── */
.gas-table { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden }
.gas-head, .gas-row {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
  padding: 10px 16px; align-items: center; gap: 8px;
}
.gas-head { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--fg-muted); background: var(--bg); border-bottom: 1px solid var(--border) }
.gas-row { font-size: 13px; border-bottom: 1px solid var(--border) }
.gas-row:last-of-type { border-bottom: none }
.gas-row--alt { background: var(--bg) }
.gas-camp { font-weight: 600; font-size: 12px }
.gas-prom { font-weight: 700 }
.gas-prom--green { color: var(--green-deep) }
.gas-saving { padding: 12px 16px; font-size: 12px; color: var(--fg-soft); background: rgba(108,174,82,.06); border-top: 1px solid var(--border) }
.gas-saving strong { color: var(--green-deep) }

/* ── footer ───────────────── */
.footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 11px; color: var(--fg-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px }

/* ── print ────────────────── */
@media print {
  .no-print { display: none !important }
  body { background: #fff }
  #print-btn { display: none !important }
  .page { padding: 16px }
  .area-card--highlight { border-width: 1.5px }
  .debt-card { background: var(--navy) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact }
}
</style>
</head>
<body>

<div class="no-print" style="position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
  <a id="pdf-btn" href="#" style="display:inline-flex;align-items:center;gap:7px;white-space:nowrap;background:#fff;color:#1F2566;border:1.5px solid #1F2566;border-radius:40px;padding:11px 20px;font-size:13px;font-weight:600;font-family:Inter,sans-serif;cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(31,37,102,.15)" onclick="return pedirPDF(this)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Descargar PDF
  </a>
  <button style="display:inline-flex;align-items:center;gap:7px;white-space:nowrap;background:#1F2566;color:#fff;border:none;border-radius:40px;padding:11px 20px;font-size:13px;font-weight:600;font-family:Inter,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(31,37,102,.3)" onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Imprimir
  </button>
</div>

<div class="page">

  <div class="report-header">
    <div class="report-brand">
      Crown Point Energy
      <span>Informe de Seguimiento Operativo</span>
    </div>
    <div class="report-period">
      <div class="period-title">${d.mes_inicio} — ${d.mes_fin}</div>
      <div class="period-sub">CPESA · Consolidado WI</div>
    </div>
  </div>

  <!-- Métricas por área -->
  <section class="section">
    <div class="section-label">Métricas operativas — ${d.mes_fin}</div>
    <div class="areas-grid">
      ${areaCard(areas.et)}
      ${areaCard(areas.pckk)}
      ${consolidadoCard}
    </div>
  </section>

  ${hasBilling || hasPrice ? `
  <!-- Comercial -->
  <section class="section">
    <div class="section-label">Comercial — Petróleo &amp; Gas</div>
    <div class="charts-grid">
      ${hasBilling ? `
      <div class="chart-card">
        <div class="chart-title">Facturación mensual OIL + GAS (MM USD)</div>
        <canvas id="chart-billing" height="200"></canvas>
      </div>` : ''}
      ${hasPrice ? `
      <div class="chart-card">
        <div class="chart-title">Precio percibido vs Brent (USD/bbl)</div>
        <canvas id="chart-price" height="200"></canvas>
      </div>` : ''}
    </div>
  </section>` : ''}

  <!-- Deuda -->
  <section class="section">
    <div class="section-label">Deuda financiera</div>
    <div class="debt-card">
      <div class="debt-label">Deuda total</div>
      <div class="debt-value">US$ ${fmtDeuda(deuda_total_MMUS)} MM</div>
      <div class="debt-sub">al ${d.mes_fin}</div>
    </div>
  </section>

  ${gasTable}

  <div class="footer">
    <span>Crown Point Energy S.A. — Uso interno</span>
    <span>Generado: ${fechaGen}</span>
  </div>

</div>

<script>
${hasBilling ? `
(function() {
  var ctx = document.getElementById('chart-billing')
  if (!ctx) return
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ${billingLabels},
      datasets: [{
        label: 'Facturación MM USD',
        data: ${billingData},
        backgroundColor: ${billingColors},
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(c) { return 'US$ ' + c.parsed.y.toFixed(1) + 'M' } } }
      },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { callback: function(v) { return 'US$ ' + v + 'M' } } },
        x: { grid: { display: false } }
      }
    }
  })
})()
` : ''}
${hasPrice ? `
(function() {
  var ctx = document.getElementById('chart-price')
  if (!ctx) return
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ${priceLabels},
      datasets: [
        {
          label: 'Percibido',
          data: ${precioPer},
          backgroundColor: 'rgba(31,37,102,0.82)',
          borderRadius: 4,
        },
        {
          label: 'Brent',
          data: ${precioBrent},
          backgroundColor: 'rgba(108,174,82,0.55)',
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': US$ ' + c.parsed.y.toFixed(2) + '/bbl' } } }
      },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { callback: function(v) { return 'US$ ' + v } } },
        x: { grid: { display: false } }
      }
    }
  })
})()
` : ''}

function pedirPDF(btn){
  var id=window.location.pathname.split('/').filter(Boolean).pop();
  if(!id||id.length<10){alert('No se pudo determinar el ID del reporte.');return false;}
  btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Generando… (~30s)';
  btn.style.opacity='0.6';
  btn.style.pointerEvents='none';
  window.open('/api/admin/reportes/'+id+'/pdf','_blank');
  setTimeout(function(){
    btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar PDF';
    btn.style.opacity='1';
    btn.style.pointerEvents='';
  },62000);
  return false;
}
</script>
<!-- ── TUTORIAL ─────────────────────────────────────────────────── -->
<style>
#cpt-ov{position:fixed;inset:0;z-index:99990;pointer-events:all;background:transparent}
#cpt-spl{position:fixed;z-index:99991;border-radius:8px;pointer-events:none;
  box-shadow:0 0 0 9999px rgba(15,17,40,.68);
  transition:top .35s,left .35s,width .35s,height .35s}
#cpt-pop{position:fixed;z-index:99999;background:#fff;border-radius:14px;
  padding:22px 24px;box-shadow:0 12px 48px rgba(15,17,40,.20);
  font-family:'DM Sans',sans-serif;font-size:14px;color:#14172E;
  width:min(400px,90vw)}
.cpt-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.cpt-counter{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  color:#8e91b0;background:#f4f6fb;padding:3px 9px;border-radius:20px}
.cpt-skip{font-size:12px;background:none;border:none;color:#8e91b0;cursor:pointer;
  text-decoration:underline;padding:2px 0;font-family:inherit}
.cpt-skip:hover{color:#1F2566}
.cpt-title{display:block;font-size:16px;font-weight:700;margin-bottom:8px;color:#14172E}
.cpt-desc{font-size:13px;color:#5a5d78;line-height:1.55;margin:0 0 20px}
.cpt-nav{display:flex;justify-content:space-between;align-items:center;gap:8px}
.cpt-btn{padding:9px 20px;border-radius:8px;font-size:13px;font-weight:600;
  cursor:pointer;font-family:inherit;border:none;transition:background .15s}
.cpt-prev{background:#f0f2f9;color:#1F2566}
.cpt-prev:hover{background:#e2e6f5}
.cpt-next{background:#1F2566;color:#fff;margin-left:auto}
.cpt-next:hover{background:#2a3180}
.cpt-dots{display:flex;gap:5px;align-items:center}
.cpt-dot{width:6px;height:6px;border-radius:50%;background:#dcdae6;transition:background .2s}
.cpt-dot.active{background:#1F2566}
</style>
<div id="cpt-ov" style="display:none"></div>
<div id="cpt-spl" style="display:none"></div>
<div id="cpt-pop" style="display:none"></div>
<script>
(function(){
  var KEY = 'cpe_tour_accionista_v1';
  if (localStorage.getItem(KEY)) return;

  var STEPS = [
    {sel: null,
     title: 'Reporte de Accionista',
     desc:  'Te guiamos por las secciones principales del reporte. Podés saltar el tutorial en cualquier momento.'},
    {sel: '.areas-grid',
     title: 'Áreas de producción',
     desc:  'Cada tarjeta muestra la producción, ingresos y datos operativos clave de una concesión activa en el período.'},
    {sel: '.area-card--highlight',
     title: 'Área principal',
     desc:  'La tarjeta resaltada corresponde al área de mayor peso en los ingresos totales del período informado.'},
    {sel: '.charts-grid',
     title: 'Gráficos comparativos',
     desc:  'Comparativa de facturación mensual y evolución del precio neto percibido por área a lo largo del período.'},
    {sel: '.debt-card',
     title: 'Deuda neta',
     desc:  'Posición de deuda neta de la compañía al cierre del período, con detalle de pasivos y caja disponible.'},
    {sel: '.gas-table',
     title: 'Producción de gas',
     desc:  'Detalle de la producción y despacho de gas natural por área, expresado en miles de metros cúbicos por día.'},
    {sel: '.no-print',
     title: 'Descarga y exportación',
     desc:  'Desde estos botones podés descargar el reporte en PDF (generado en servidor) o imprimirlo directamente.'},
  ];

  var cur = 0;
  var ov  = document.getElementById('cpt-ov');
  var spl = document.getElementById('cpt-spl');
  var pop = document.getElementById('cpt-pop');

  function finish() {
    localStorage.setItem(KEY, '1');
    ov.style.display = 'none';
    spl.style.display = 'none';
    pop.style.display = 'none';
  }

  function dots(i) {
    return STEPS.map(function(_, idx) {
      return '<span class="cpt-dot' + (idx === i ? ' active' : '') + '"></span>';
    }).join('');
  }

  function render(i) {
    cur = i;
    var s    = STEPS[i];
    var last = i === STEPS.length - 1;

    pop.innerHTML =
      '<div class="cpt-hdr">' +
        '<span class="cpt-counter">' + (i + 1) + ' de ' + STEPS.length + '</span>' +
        '<button class="cpt-skip" id="cptSkip">Saltar tutorial</button>' +
      '</div>' +
      '<strong class="cpt-title">' + s.title + '</strong>' +
      '<p class="cpt-desc">' + s.desc + '</p>' +
      '<div class="cpt-nav">' +
        '<div class="cpt-dots">' + dots(i) + '</div>' +
        (i > 0 ? '<button class="cpt-btn cpt-prev" id="cptPrev">← Anterior</button>' : '<span></span>') +
        '<button class="cpt-btn cpt-next" id="cptNext">' + (last ? 'Listo ✓' : 'Siguiente →') + '</button>' +
      '</div>';

    document.getElementById('cptSkip').addEventListener('click', finish);
    document.getElementById('cptNext').addEventListener('click', function() { last ? finish() : render(i + 1); });
    if (i > 0) document.getElementById('cptPrev').addEventListener('click', function() { render(i - 1); });

    place(s, i);
  }

  function place(s, i) {
    if (!s.sel) {
      spl.style.display = 'none';
      pop.style.cssText = 'display:block;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(420px,90vw)';
      return;
    }

    var el = document.querySelector(s.sel);
    if (!el || el.offsetParent === null) {
      render(i < STEPS.length - 1 ? i + 1 : i - 1);
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(function() {
      var r = el.getBoundingClientRect();
      var P = 10;

      spl.style.display = 'block';
      spl.style.top    = (r.top  - P) + 'px';
      spl.style.left   = (r.left - P) + 'px';
      spl.style.width  = (r.width  + P * 2) + 'px';
      spl.style.height = (r.height + P * 2) + 'px';

      var winW = window.innerWidth, winH = window.innerHeight;
      var popW = Math.min(400, winW * 0.9);
      var popH = 240;
      var pl   = Math.max(12, Math.min(r.left, winW - popW - 12));
      var pt;

      if (winH - r.bottom - P > popH + 16) {
        pt = r.bottom + P + 12;
      } else if (r.top - P > popH + 16) {
        pt = r.top - P - popH - 12;
      } else {
        pt = Math.max(12, winH / 2 - popH / 2);
        pl = Math.max(12, winW / 2 - popW / 2);
      }

      pop.style.cssText = 'display:block;position:fixed;top:' + pt + 'px;left:' + pl + 'px;transform:none;width:' + popW + 'px';
    }, 500);
  }

  ov.style.display  = 'block';
  pop.style.display = 'block';
  render(0);
})();
</script>

</body>
</html>`
}

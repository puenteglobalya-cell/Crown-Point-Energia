import { DatosIngresos } from '@/lib/parsers/ingresos'

function f(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n)) return '—'
  return n.toFixed(d).replace('.', ',')
}

function fN(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return Math.round(n).toLocaleString('es-AR')
}

export function generarReporteHTML(datos: DatosIngresos): string {
  const { areas, gas, mensual_historico } = datos

  // ── Ingresos por área ─────────────────────────────────────
  const ingOilET   = areas.ET.ingreso   / 1_000_000
  const ingOilPCKK = areas.PCKK.ingreso / 1_000_000
  const ingOilCH   = areas.CH.ingreso   / 1_000_000
  const ingOilRCLV = areas.RCLV.ingreso / 1_000_000
  const ingGasET   = gas.ET.ingreso     / 1_000_000
  const ingGasRCLV = gas.RCLV.ingreso   / 1_000_000
  const totalMM    = ingOilET + ingOilPCKK + ingOilCH + ingOilRCLV + ingGasET + ingGasRCLV

  // ── Participación % ───────────────────────────────────────
  const pct = (v: number) => totalMM > 0 ? ((v / totalMM) * 100).toFixed(1) : '0.0'

  // ── Stock ─────────────────────────────────────────────────
  const stockStr = datos.stock_MM > 0 ? `us$ ${f(datos.stock_MM)} MM` : '—'

  // ── Historial ─────────────────────────────────────────────
  const hasHistorico = mensual_historico && mensual_historico.length > 1

  const historicoLabels = hasHistorico
    ? JSON.stringify(mensual_historico!.map(h => h.mes))
    : '[]'
  const historicoData = hasHistorico
    ? JSON.stringify(mensual_historico!.map(h => h.total_MM))
    : '[]'

  // ── Génesis del reporte ───────────────────────────────────
  const fechaGen = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Ingresos ${datos.mes} — Crown Point Energía</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F7F5F0;--bg2:#EDEAE1;--card:#fff;--border:#E0DBD0;
  --naranja:#B5611A;--azul:#1B5FA6;--verde:#1A7A48;--violeta:#6B3AA8;
  --warm:#C09020;--rojo:#B83030;--text:#1A1714;--muted:#776B58;--muted2:#A89B85;
}
body{
  font-family:'DM Sans',sans-serif;
  background:var(--bg);
  color:var(--text);
  font-size:14px;
  line-height:1.5;
}
a{color:inherit;text-decoration:none}
/* ── LAYOUT ─────────────────── */
.page{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
/* ── HEADER ─────────────────── */
.site-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 24px;background:var(--card);border-bottom:1px solid var(--border);
  margin-bottom:32px;
}
.logo{font-family:'DM Sans',sans-serif;font-size:18px;font-weight:600;color:var(--naranja)}
.period-badge{
  font-family:'JetBrains Mono',monospace;font-size:12px;
  background:var(--bg2);color:var(--muted);
  padding:5px 12px;border-radius:8px;border:1px solid var(--border);
}
/* ── SECTION LABEL ───────────── */
.section-lbl{
  position:relative;
  font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
  color:var(--muted2);margin:0 0 16px;
  display:flex;align-items:center;gap:12px;
}
.section-lbl::after{
  content:'';flex:1;height:1px;background:var(--border);
}
/* ── KPI CARDS ───────────────── */
.kpi-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;margin-bottom:32px;
}
@media(min-width:600px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:900px){.kpi-grid{grid-template-columns:repeat(5,1fr)}}
.kpi-card{
  background:var(--card);border:1px solid var(--border);border-radius:12px;
  padding:16px 16px 12px;position:relative;overflow:hidden;
}
.kpi-card-bar{
  position:absolute;bottom:0;left:0;right:0;height:3px;
}
.kpi-label{font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:500}
.kpi-value{
  font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:600;
  line-height:1.1;margin-bottom:4px;
}
.kpi-sub{font-size:11px;color:var(--muted2)}
/* ── CHARTS ROW ──────────────── */
.charts-row{
  display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:32px;
}
@media(min-width:720px){.charts-row{grid-template-columns:3fr 2fr}}
.chart-card{
  background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;
}
.chart-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:16px}
.chart-wrap{position:relative}
/* ── PRICE CHART ─────────────── */
.price-section{margin-bottom:32px}
.price-chart-card{
  background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;
}
/* ── HISTORY CHART ───────────── */
.history-section{margin-bottom:32px}
.history-chart-card{
  background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;
}
/* ── OIL AREA CARDS ──────────── */
.areas-grid{
  display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:32px;
}
@media(min-width:560px){.areas-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.areas-grid{grid-template-columns:repeat(4,1fr)}}
.area-card{
  background:var(--card);border:1px solid var(--border);border-radius:12px;
  padding:16px 16px 0;overflow:hidden;
}
.area-name{font-size:12px;font-weight:700;margin-bottom:12px;letter-spacing:.3px}
.area-rows{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.area-row{display:flex;justify-content:space-between;align-items:center}
.area-row-label{font-size:11px;color:var(--muted)}
.area-row-val{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--text)}
.area-row-val.rojo{color:var(--rojo)}
.area-divider{height:1px;background:var(--border);margin:8px 0}
.area-bottom-bar{height:3px}
/* ── GAS AREA CARDS ──────────── */
.gas-grid{
  display:grid;grid-template-columns:1fr;gap:14px;max-width:720px;margin-bottom:32px;
}
@media(min-width:480px){.gas-grid{grid-template-columns:repeat(2,1fr)}}
.gas-card{
  background:var(--card);border:1px solid var(--border);border-radius:12px;
  padding:16px 16px 0;overflow:hidden;
}
.gas-name{font-size:12px;font-weight:700;margin-bottom:12px;letter-spacing:.3px}
.gas-rows{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.gas-bottom-bar{height:3px}
/* ── PARTICIPATION BAR ───────── */
.part-bar-wrap{height:3px;background:var(--bg2)}
.part-bar-fill{height:3px}
/* ── FOOTER ──────────────────── */
.footer{
  text-align:center;font-size:11px;color:var(--muted2);
  border-top:1px solid var(--border);padding:24px 0 0;margin-top:32px;
}
</style>
</head>
<body>

<header class="site-header">
  <span class="logo">Crown Point Energía</span>
  <span class="period-badge">${datos.periodo}</span>
</header>

<div class="page">

  <!-- KPI CARDS -->
  <p class="section-lbl">Resumen del período</p>
  <div class="kpi-grid">

    <div class="kpi-card">
      <div class="kpi-label">Ventas estimadas</div>
      <div class="kpi-value" style="color:var(--naranja)">us$ ${f(datos.ventas_MM)} MM</div>
      <div class="kpi-sub">${datos.dias} días — ${datos.mes}</div>
      <div class="kpi-card-bar" style="background:var(--naranja)"></div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Vol. Producido</div>
      <div class="kpi-value" style="color:var(--azul)">${fN(datos.vol_producido_boed)} boe/d</div>
      <div class="kpi-sub">producción total 100%</div>
      <div class="kpi-card-bar" style="background:var(--azul)"></div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Vol. Vendido</div>
      <div class="kpi-value" style="color:var(--verde)">${fN(datos.vol_vendido_boed)} boe/d</div>
      <div class="kpi-sub">volumen de ventas</div>
      <div class="kpi-card-bar" style="background:var(--verde)"></div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Precio neto Oil</div>
      <div class="kpi-value" style="color:var(--warm)">${f(datos.precio_neto_oil)} us$/bbl</div>
      <div class="kpi-sub">Brent ref: ${f(datos.brent_prom)} — Med: ${f(datos.medanito_prom)}</div>
      <div class="kpi-card-bar" style="background:var(--warm)"></div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Precio neto Gas</div>
      <div class="kpi-value" style="color:var(--muted)">${f(datos.precio_neto_gas)} us$/mcf</div>
      <div class="kpi-sub">precio promedio gas</div>
      <div class="kpi-card-bar" style="background:var(--muted2)"></div>
    </div>

  </div>

  <!-- CHARTS ROW -->
  <p class="section-lbl">Distribución de ingresos</p>
  <div class="charts-row">

    <div class="chart-card">
      <div class="chart-title">Ingresos por Área — MM us$</div>
      <div class="chart-wrap" style="height:260px">
        <canvas id="barChart"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-title">Participación %</div>
      <div class="chart-wrap" style="height:260px">
        <canvas id="doughnutChart"></canvas>
      </div>
    </div>

  </div>

  <!-- PRICE CHART -->
  <p class="section-lbl">Precios por área</p>
  <div class="price-section">
    <div class="price-chart-card">
      <div class="chart-title">Precio Neto por Área — us$/bbl</div>
      <div class="chart-wrap" style="height:220px">
        <canvas id="priceChart"></canvas>
      </div>
    </div>
  </div>

  ${hasHistorico ? `
  <!-- HISTORY CHART -->
  <p class="section-lbl">Evolución histórica</p>
  <div class="history-section">
    <div class="history-chart-card">
      <div class="chart-title">Evolución Mensual — MM us$</div>
      <div class="chart-wrap" style="height:220px">
        <canvas id="historyChart"></canvas>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- OIL AREA CARDS -->
  <p class="section-lbl">Detalle por área — Petróleo</p>
  <div class="areas-grid">

    <!-- ET / LT-PQ -->
    <div class="area-card">
      <div class="area-name" style="color:var(--naranja)">ET / LT-PQ</div>
      <div class="area-rows">
        <div class="area-row">
          <span class="area-row-label">Prod. neta</span>
          <span class="area-row-val">${f(areas.ET.prod_neta_m3d)} m³/d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">m³ entregados</span>
          <span class="area-row-val">${fN(areas.ET.entregados_m3)} m³</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Vol. bbl</span>
          <span class="area-row-val">${fN(areas.ET.vol_bbl)} bbl</span>
        </div>
        ${areas.ET.brent_ref != null ? `
        <div class="area-row">
          <span class="area-row-label">Brent ref.</span>
          <span class="area-row-val">${f(areas.ET.brent_ref)} us$</span>
        </div>` : ''}
        ${areas.ET.descuento != null && areas.ET.descuento !== 0 ? `
        <div class="area-row">
          <span class="area-row-label">Descuento</span>
          <span class="area-row-val rojo">${f(areas.ET.descuento)} us$</span>
        </div>` : ''}
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Precio neto</span>
          <span class="area-row-val">${f(areas.ET.precio_neto)} us$/bbl</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Ingreso período</span>
          <span class="area-row-val">us$ ${fN(areas.ET.ingreso)}</span>
        </div>
        ${areas.ET.stock_m3 != null && areas.ET.stock_m3 > 0 ? `
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Stock m³</span>
          <span class="area-row-val">${fN(areas.ET.stock_m3)} m³</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Stock días</span>
          <span class="area-row-val">${f(areas.ET.stock_dias ?? 0, 1)} d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Stock us$</span>
          <span class="area-row-val">${fN(areas.ET.stock_us ?? 0)}</span>
        </div>` : ''}
      </div>
      <div class="part-bar-wrap">
        <div class="part-bar-fill" style="background:var(--naranja);width:${pct(ingOilET)}%"></div>
      </div>
      <div class="area-bottom-bar" style="background:var(--naranja)"></div>
    </div>

    <!-- PC-KK -->
    <div class="area-card">
      <div class="area-name" style="color:var(--azul)">PC-KK</div>
      <div class="area-rows">
        <div class="area-row">
          <span class="area-row-label">Prod. neta</span>
          <span class="area-row-val">${f(areas.PCKK.prod_neta_m3d)} m³/d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">m³ entregados</span>
          <span class="area-row-val">${fN(areas.PCKK.entregados_m3)} m³</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Vol. bbl</span>
          <span class="area-row-val">${fN(areas.PCKK.vol_bbl)} bbl</span>
        </div>
        ${areas.PCKK.brent_ref != null ? `
        <div class="area-row">
          <span class="area-row-label">Brent ref.</span>
          <span class="area-row-val">${f(areas.PCKK.brent_ref)} us$</span>
        </div>` : ''}
        ${areas.PCKK.descuento != null && areas.PCKK.descuento !== 0 ? `
        <div class="area-row">
          <span class="area-row-label">Descuento</span>
          <span class="area-row-val rojo">${f(areas.PCKK.descuento)} us$</span>
        </div>` : ''}
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Precio neto</span>
          <span class="area-row-val">${f(areas.PCKK.precio_neto)} us$/bbl</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Ingreso período</span>
          <span class="area-row-val">us$ ${fN(areas.PCKK.ingreso)}</span>
        </div>
        ${areas.PCKK.stock_m3 != null && areas.PCKK.stock_m3 > 0 ? `
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Stock m³</span>
          <span class="area-row-val">${fN(areas.PCKK.stock_m3)} m³</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Stock días</span>
          <span class="area-row-val">${f(areas.PCKK.stock_dias ?? 0, 1)} d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Stock us$</span>
          <span class="area-row-val">${fN(areas.PCKK.stock_us ?? 0)}</span>
        </div>` : ''}
      </div>
      <div class="part-bar-wrap">
        <div class="part-bar-fill" style="background:var(--azul);width:${pct(ingOilPCKK)}%"></div>
      </div>
      <div class="area-bottom-bar" style="background:var(--azul)"></div>
    </div>

    <!-- CH / PPC -->
    <div class="area-card">
      <div class="area-name" style="color:var(--verde)">CH / PPC</div>
      <div class="area-rows">
        <div class="area-row">
          <span class="area-row-label">Prod. neta</span>
          <span class="area-row-val">${f(areas.CH.prod_neta_m3d)} m³/d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">m³ entregados</span>
          <span class="area-row-val">${fN(areas.CH.entregados_m3)} m³</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Vol. bbl</span>
          <span class="area-row-val">${fN(areas.CH.vol_bbl)} bbl</span>
        </div>
        ${areas.CH.brent_ref != null ? `
        <div class="area-row">
          <span class="area-row-label">Medanito ref.</span>
          <span class="area-row-val">${f(areas.CH.brent_ref)} us$</span>
        </div>` : ''}
        ${areas.CH.descuento != null && areas.CH.descuento !== 0 ? `
        <div class="area-row">
          <span class="area-row-label">Descuento</span>
          <span class="area-row-val rojo">${f(areas.CH.descuento)} us$</span>
        </div>` : ''}
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Precio neto</span>
          <span class="area-row-val">${f(areas.CH.precio_neto)} us$/bbl</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Ingreso período</span>
          <span class="area-row-val">us$ ${fN(areas.CH.ingreso)}</span>
        </div>
      </div>
      <div class="part-bar-wrap">
        <div class="part-bar-fill" style="background:var(--verde);width:${pct(ingOilCH)}%"></div>
      </div>
      <div class="area-bottom-bar" style="background:var(--verde)"></div>
    </div>

    <!-- RCLV -->
    <div class="area-card">
      <div class="area-name" style="color:var(--violeta)">RCLV</div>
      <div class="area-rows">
        <div class="area-row">
          <span class="area-row-label">Prod. neta</span>
          <span class="area-row-val">${f(areas.RCLV.prod_neta_m3d)} m³/d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">m³ entregados</span>
          <span class="area-row-val">${fN(areas.RCLV.entregados_m3)} m³</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Vol. bbl</span>
          <span class="area-row-val">${fN(areas.RCLV.vol_bbl)} bbl</span>
        </div>
        ${areas.RCLV.brent_ref != null ? `
        <div class="area-row">
          <span class="area-row-label">Brent ref.</span>
          <span class="area-row-val">${f(areas.RCLV.brent_ref)} us$</span>
        </div>` : ''}
        ${areas.RCLV.descuento != null && areas.RCLV.descuento !== 0 ? `
        <div class="area-row">
          <span class="area-row-label">Descuento</span>
          <span class="area-row-val rojo">${f(areas.RCLV.descuento)} us$</span>
        </div>` : ''}
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Precio neto</span>
          <span class="area-row-val">${f(areas.RCLV.precio_neto)} us$/bbl</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Ingreso período</span>
          <span class="area-row-val">us$ ${fN(areas.RCLV.ingreso)}</span>
        </div>
      </div>
      <div class="part-bar-wrap">
        <div class="part-bar-fill" style="background:var(--violeta);width:${pct(ingOilRCLV)}%"></div>
      </div>
      <div class="area-bottom-bar" style="background:var(--violeta)"></div>
    </div>

  </div>

  <!-- GAS AREA CARDS -->
  <p class="section-lbl">Detalle por área — Gas</p>
  <div class="gas-grid">

    <!-- Gas ET-LT-PQ -->
    <div class="gas-card">
      <div class="gas-name" style="color:var(--warm)">Gas ET-LT-PQ</div>
      <div class="gas-rows">
        <div class="area-row">
          <span class="area-row-label">Prod. neta</span>
          <span class="area-row-val">${f(gas.ET.prod_mcfd)} Mcf/d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Precio</span>
          <span class="area-row-val">${f(gas.ET.precio_mcf)} us$/mcf</span>
        </div>
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Ingreso período</span>
          <span class="area-row-val">us$ ${fN(gas.ET.ingreso)}</span>
        </div>
      </div>
      <div class="part-bar-wrap">
        <div class="part-bar-fill" style="background:var(--warm);width:${pct(ingGasET)}%"></div>
      </div>
      <div class="gas-bottom-bar" style="background:var(--warm)"></div>
    </div>

    <!-- Gas RCLV -->
    <div class="gas-card">
      <div class="gas-name" style="color:var(--muted)">Gas RCLV</div>
      <div class="gas-rows">
        <div class="area-row">
          <span class="area-row-label">Prod. neta</span>
          <span class="area-row-val">${f(gas.RCLV.prod_mcfd)} Mcf/d</span>
        </div>
        <div class="area-row">
          <span class="area-row-label">Precio</span>
          <span class="area-row-val">${f(gas.RCLV.precio_mcf)} us$/mcf</span>
        </div>
        <div class="area-divider"></div>
        <div class="area-row">
          <span class="area-row-label">Ingreso período</span>
          <span class="area-row-val">us$ ${fN(gas.RCLV.ingreso)}</span>
        </div>
      </div>
      <div class="part-bar-wrap">
        <div class="part-bar-fill" style="background:var(--muted2);width:${pct(ingGasRCLV)}%"></div>
      </div>
      <div class="gas-bottom-bar" style="background:var(--muted2)"></div>
    </div>

  </div>

  <div class="footer">Crown Point Energía &middot; Generado ${fechaGen}</div>

</div>

<script>
(function(){
  // ── Color helpers ──────────────────────────────────────────
  var naranja  = '#B5611A';
  var azul     = '#1B5FA6';
  var verde    = '#1A7A48';
  var violeta  = '#6B3AA8';
  var warm     = '#C09020';
  var muted    = '#776B58';
  var muted2   = '#A89B85';
  var border   = '#E0DBD0';
  var text     = '#1A1714';

  var monoFont = "'JetBrains Mono', monospace";

  // ── Shared defaults ─────────────────────────────────────────
  Chart.defaults.font.family = monoFont;
  Chart.defaults.color       = muted;

  // ── Data ────────────────────────────────────────────────────
  var barData   = [${ingOilET.toFixed(4)},${ingOilPCKK.toFixed(4)},${ingOilCH.toFixed(4)},${ingOilRCLV.toFixed(4)},${ingGasET.toFixed(4)},${ingGasRCLV.toFixed(4)}];
  var barLabels = ['ET / LT-PQ','PC-KK','CH / PPC','RCLV','Gas ET','Gas RCLV'];
  var barColors = [naranja, azul, verde, violeta, warm, muted2];

  var priceData   = [${areas.ET.precio_neto.toFixed(4)},${areas.PCKK.precio_neto.toFixed(4)},${areas.CH.precio_neto.toFixed(4)},${areas.RCLV.precio_neto.toFixed(4)}];
  var priceLabels = ['ET / LT-PQ','PC-KK','CH / PPC','RCLV'];
  var priceColors = [naranja, azul, verde, violeta];

  // ── Price label plugin ──────────────────────────────────────
  var pricePlugin = {
    id:'priceLabels',
    afterDatasetsDraw:function(chart){
      var ctx  = chart.ctx;
      var data = chart.data;
      var meta = chart.getDatasetMeta(0);
      ctx.save();
      data.datasets[0].data.forEach(function(v,i){
        var bar = meta.data[i];
        ctx.fillStyle = text;
        ctx.font = 'bold 11px JetBrains Mono,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Number(v).toFixed(2)+' us$', bar.x, bar.y - 6);
      });
      ctx.restore();
    }
  };

  // ── Horizontal bar chart ─────────────────────────────────────
  new Chart(document.getElementById('barChart'), {
    type:'bar',
    data:{
      labels:barLabels,
      datasets:[{
        data:barData,
        backgroundColor:barColors,
        borderRadius:6,
        borderSkipped:false
      }]
    },
    options:{
      indexAxis:'y',
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:function(ctx){ return ' '+ctx.parsed.x.toFixed(2)+' MM us$'; }
          }
        }
      },
      scales:{
        x:{
          grid:{color:border+'88'},
          ticks:{font:{family:monoFont,size:10}}
        },
        y:{
          grid:{display:false},
          ticks:{font:{family:monoFont,size:11}}
        }
      }
    }
  });

  // ── Doughnut chart ────────────────────────────────────────────
  new Chart(document.getElementById('doughnutChart'), {
    type:'doughnut',
    data:{
      labels:barLabels,
      datasets:[{
        data:barData,
        backgroundColor:barColors,
        borderWidth:2,
        borderColor:'#fff'
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'65%',
      plugins:{
        legend:{
          position:'bottom',
          labels:{
            font:{family:monoFont,size:10},
            boxWidth:10,
            padding:8
          }
        },
        tooltip:{
          callbacks:{
            label:function(ctx){
              var total = ctx.dataset.data.reduce(function(a,b){return a+b;},0);
              var pct   = total>0 ? ((ctx.parsed/total)*100).toFixed(1) : '0.0';
              return ' '+ctx.label+': '+ctx.parsed.toFixed(2)+' MM ('+pct+'%)';
            }
          }
        }
      }
    }
  });

  // ── Price bar chart ────────────────────────────────────────────
  new Chart(document.getElementById('priceChart'), {
    type:'bar',
    data:{
      labels:priceLabels,
      datasets:[{
        data:priceData,
        backgroundColor:priceColors,
        borderRadius:6,
        borderSkipped:false
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      layout:{padding:{top:28}},
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:function(ctx){ return ' '+ctx.parsed.y.toFixed(2)+' us$/bbl'; }
          }
        }
      },
      scales:{
        x:{
          grid:{display:false},
          ticks:{font:{family:monoFont,size:11}}
        },
        y:{
          grid:{color:border+'88'},
          ticks:{font:{family:monoFont,size:10}}
        }
      }
    },
    plugins:[pricePlugin]
  });

  ${hasHistorico ? `
  // ── Monthly history chart ──────────────────────────────────────
  new Chart(document.getElementById('historyChart'), {
    type:'line',
    data:{
      labels:${historicoLabels},
      datasets:[{
        data:${historicoData},
        borderColor:naranja,
        backgroundColor:'rgba(181,97,26,0.08)',
        fill:true,
        tension:0.3,
        pointBackgroundColor:naranja,
        pointRadius:4,
        pointHoverRadius:6,
        borderWidth:2
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:function(ctx){ return ' '+ctx.parsed.y.toFixed(2)+' MM us$'; }
          }
        }
      },
      scales:{
        x:{
          grid:{display:false},
          ticks:{font:{family:monoFont,size:10},maxRotation:45}
        },
        y:{
          grid:{color:border+'88'},
          ticks:{font:{family:monoFont,size:10}}
        }
      }
    }
  });
  ` : ''}

})();
</script>
</body>
</html>`
}

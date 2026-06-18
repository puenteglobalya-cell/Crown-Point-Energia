import type { DatosIngresos } from '@/lib/parsers/ingresos'

export interface MacroSnapshot {
  points:     Array<{ label: string; hh: number; brent: number }>
  prevPoints?: Array<{ label: string; hh: number; brent: number }>
  hasHH:      boolean
  hasBrent:   boolean
  updatedAt:  string
  prevUpdatedAt?: string
}

function f(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n as number)) return '—'
  return (n as number).toFixed(d).replace('.', ',')
}

function fN(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return '—'
  return Math.round(n as number).toLocaleString('es-AR')
}

function j(v: number[], d = 4): string {
  return JSON.stringify(v.map(x => parseFloat(x.toFixed(d))))
}

export function generarReporteHTML(datos: DatosIngresos, macro?: MacroSnapshot): string {
  const { areas, gas, mensual_historico } = datos

  const ingOilET   = areas.ET.ingreso
  const ingOilPCKK = areas.PCKK.ingreso
  const ingOilCH   = areas.CH.ingreso
  const ingOilRCLV = areas.RCLV.ingreso
  const ingGasET   = gas.ET.ingreso
  const ingGasRCLV = gas.RCLV.ingreso
  const ingGasTotal = ingGasET + ingGasRCLV
  const totalUS    = ingOilET + ingOilPCKK + ingOilCH + ingOilRCLV + ingGasTotal
  const totalMM    = totalUS / 1_000_000
  const totalMMStr = `us$ ${totalMM.toFixed(2).replace('.', ',')}MM`

  const pct = (v: number) => totalUS > 0 ? ((v / totalUS) * 100).toFixed(1) : '0.0'

  const hasHistorico = !!(mensual_historico && mensual_historico.length >= 2)

  // Only show price chart when prices actually vary across months.
  // When all months use currentPrices (no historical price table in the Excel),
  // every month shows the same value — a flat chart with no informational value.
  const hasPriceHistory = hasHistorico && (() => {
    const h = mensual_historico!
    const etPrices = h.map(m => m.precio_ET)
    const spread = Math.max(...etPrices) - Math.min(...etPrices)
    return spread > 0.5  // meaningful variation > 0.5 us$/bbl
  })()

  const mensualLabels = hasHistorico ? JSON.stringify(mensual_historico!.map(h => h.mes)) : '[]'
  const mensualPCKK   = hasHistorico ? j(mensual_historico!.map(h => h.PCKK_MM)) : '[]'
  const mensualET     = hasHistorico ? j(mensual_historico!.map(h => h.ET_MM))   : '[]'
  const mensualRCLV   = hasHistorico ? j(mensual_historico!.map(h => h.RCLV_MM)) : '[]'
  const mensualCH     = hasHistorico ? j(mensual_historico!.map(h => h.CH_MM))   : '[]'
  const mensualGas    = hasHistorico ? j(mensual_historico!.map(h => h.gas_MM))  : '[]'

  const precioETArr   = hasPriceHistory ? j(mensual_historico!.map(h => h.precio_ET))   : '[]'
  const precioPCKKArr = hasPriceHistory ? j(mensual_historico!.map(h => h.precio_PCKK)) : '[]'
  const precioCHArr   = hasPriceHistory ? j(mensual_historico!.map(h => h.precio_CH))   : '[]'
  const precioRCLVArr = hasPriceHistory ? j(mensual_historico!.map(h => h.precio_RCLV)) : '[]'

  const fechaGen = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  // ── Macro price projections (optional) ────────────────────────────────────
  const hasMacro     = !!macro && (macro.hasHH || macro.hasBrent)
  const macroLabels  = hasMacro ? JSON.stringify(macro!.points.map(p => p.label)) : '[]'
  const macroBrentData = (hasMacro && macro!.hasBrent)
    ? JSON.stringify(macro!.points.map(p => p.brent > 0 ? +p.brent.toFixed(2) : null)) : '[]'
  const macroHHData  = (hasMacro && macro!.hasHH)
    ? JSON.stringify(macro!.points.map(p => p.hh > 0 ? +p.hh.toFixed(3) : null)) : '[]'
  const macroDate    = hasMacro
    ? new Date(macro!.updatedAt).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })
    : ''
  const hasMacroPrev  = hasMacro && !!macro!.prevPoints?.some(p => p.hh > 0 || p.brent > 0)
  const macroPrevDate = (hasMacroPrev && macro!.prevUpdatedAt)
    ? new Date(macro!.prevUpdatedAt).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })
    : ''
  const macroPrevBrent = (hasMacroPrev && macro!.hasBrent)
    ? JSON.stringify(macro!.prevPoints!.map(p => p.brent > 0 ? +p.brent.toFixed(2) : null)) : ''
  const macroPrevHH  = (hasMacroPrev && macro!.hasHH)
    ? JSON.stringify(macro!.prevPoints!.map(p => p.hh > 0 ? +p.hh.toFixed(3) : null)) : ''
  const macroGridCols = (macro?.hasHH && macro?.hasBrent) ? '1fr 1fr' : '1fr'
  const macroPrevNote = macroPrevDate ? ` · comparado con ${macroPrevDate}` : ''
  // Pre-built prev dataset strings to avoid deep template literal nesting
  const brentPrevDs  = macroPrevBrent
    ? `,{label:'Anterior (${macroPrevDate})',data:${macroPrevBrent},borderColor:'rgba(130,188,0,.45)',backgroundColor:'transparent',borderDash:[5,4],tension:.35,pointRadius:0,borderWidth:1.5,fill:false}`
    : ''
  const hhPrevDs     = macroPrevHH
    ? `,{label:'Anterior (${macroPrevDate})',data:${macroPrevHH},borderColor:'rgba(139,26,42,.40)',backgroundColor:'transparent',borderDash:[5,4],tension:.35,pointRadius:0,borderWidth:1.5,fill:false}`
    : ''
  const brentLegend  = macroPrevBrent ? 'true' : 'false'
  const hhLegend     = macroPrevHH    ? 'true' : 'false'

  const oilProd = datos.oil_pct_prod > 0 ? datos.oil_pct_prod.toFixed(1) : null
  const gasProd = datos.gas_pct_prod > 0 ? datos.gas_pct_prod.toFixed(1) : null
  const oilVend = datos.oil_pct_vend > 0 ? datos.oil_pct_vend.toFixed(1) : null
  const gasVend = datos.gas_pct_vend > 0 ? datos.gas_pct_vend.toFixed(1) : null

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ingresos Estimados — ${datos.mes}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --bg:#F4F6FB; --bg2:#E6EAF5; --card:#FFFFFF; --card2:#FAFBFE;
  --border:#DCDAE6; --shadow:rgba(31,37,102,.06); --shadow2:rgba(31,37,102,.12);
  --naranja:#1F2566; --azul:#6CAE52; --verde:#C9A24A;
  --violeta:#4F5478; --warm:#8BC87A; --rojo:#B33B2E;
  --text:#14172E; --muted:#4F5478; --muted2:#8488A8;
  --r:14px;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;}
body::before{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 55% 45% at 5% 5%, rgba(31,37,102,.05) 0%,transparent 60%),
    radial-gradient(ellipse 45% 55% at 95% 95%,rgba(108,174,82,.04) 0%,transparent 60%);
}
.wrap{max-width:1400px;margin:0 auto;padding:0 36px 72px;position:relative;z-index:1;}

/* ── HEADER ─────────────────────────────────────────────── */
header{
  display:flex;align-items:flex-end;justify-content:space-between;
  padding:48px 0 30px;border-bottom:2px solid var(--border);margin-bottom:38px;
}
.h-left h1{
  font-family:'Playfair Display',serif;font-size:46px;font-weight:600;line-height:1.08;
  letter-spacing:-.5px;color:var(--text);
}
.h-left h1 em{font-style:italic;color:var(--naranja);}
.h-left p{margin-top:9px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted2);}
.h-right{text-align:right;}
.badge{
  display:inline-flex;align-items:center;gap:7px;
  background:rgba(181,97,26,.1);border:1px solid rgba(181,97,26,.22);
  border-radius:20px;padding:6px 15px;
  font-size:11px;font-weight:600;color:var(--naranja);letter-spacing:1.5px;text-transform:uppercase;
}
.dot{width:6px;height:6px;border-radius:50%;background:var(--naranja);animation:blink 2.2s ease infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.h-date{margin-top:9px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--muted2);}

/* ── SECCIÓN LABEL ──────────────────────────────────────── */
.sec{
  font-size:9.5px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
  color:var(--muted2);display:flex;align-items:center;gap:14px;margin-bottom:18px;
}
.sec::after{content:'';flex:1;height:1px;background:var(--border);}

/* ── KPIs ───────────────────────────────────────────────── */
.kpi-row{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:32px;}
.kpi{
  background:var(--card);border:1px solid var(--border);border-radius:var(--r);
  padding:22px 20px 18px;box-shadow:0 2px 10px var(--shadow);
  position:relative;overflow:hidden;
  transition:transform .18s,box-shadow .18s;
  animation:up .5s ease both;
}
.kpi:hover{transform:translateY(-3px);box-shadow:0 8px 22px var(--shadow2);}
.kpi::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--c,var(--naranja));border-radius:0 0 var(--r) var(--r);}
.kpi:nth-child(1){animation-delay:.04s;--c:var(--naranja);}
.kpi:nth-child(2){animation-delay:.08s;--c:var(--azul);}
.kpi:nth-child(3){animation-delay:.12s;--c:var(--verde);}
.kpi:nth-child(4){animation-delay:.16s;--c:var(--warm);}
.kpi:nth-child(5){animation-delay:.20s;--c:var(--muted);}
.kpi-lbl{font-size:9.5px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;}
.kpi-val{font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:600;color:var(--text);line-height:1;letter-spacing:-1px;}
.kpi-unit{font-size:11px;color:var(--muted2);font-weight:400;margin-left:3px;font-family:'DM Sans',sans-serif;letter-spacing:0;}
.kpi-sub{margin-top:9px;font-size:10.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px;align-items:center;}
.tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:9.5px;font-weight:600;background:rgba(181,97,26,.1);color:var(--naranja);}
.tag.az{background:rgba(27,95,166,.1);color:var(--azul);}
.tag.vd{background:rgba(26,122,72,.1);color:var(--verde);}
.tag.wm{background:rgba(192,144,32,.1);color:var(--warm);}
.tag.rj{background:rgba(184,48,48,.1);color:var(--rojo);}
.tag.mu{background:rgba(119,107,88,.1);color:var(--muted);}

/* ── GRID PRINCIPAL ─────────────────────────────────────── */
.g2{display:grid;grid-template-columns:1fr 390px;gap:18px;margin-bottom:18px;}
.card{
  background:var(--card);border:1px solid var(--border);border-radius:var(--r);
  padding:26px;box-shadow:0 2px 10px var(--shadow);animation:up .5s ease .25s both;
}
.card-hdr{
  font-size:9.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--muted2);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;
}
.card-hdr-val{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:var(--naranja);letter-spacing:0;text-transform:none;}
.ch{position:relative;height:270px;}

/* ── ÁREAS ──────────────────────────────────────────────── */
.areas{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;animation:up .5s ease .35s both;}
.acard{
  background:var(--card);border:1px solid var(--border);border-radius:var(--r);
  padding:20px;box-shadow:0 2px 8px var(--shadow);transition:border-color .18s,transform .18s;
}
.acard:hover{border-color:var(--ac,var(--naranja));transform:translateY(-2px);}
.aname{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;display:flex;align-items:center;gap:7px;}
.adot{width:8px;height:8px;border-radius:50%;background:var(--ac,var(--naranja));flex-shrink:0;}
.arow{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bg2);}
.arow:last-of-type{border:none;}
.albl{font-size:11.5px;color:var(--muted);}
.aval{font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:600;color:var(--text);}
.aval.hi{color:var(--ac,var(--naranja));}
.aval.neg{color:var(--rojo);}
.aval.mu{color:var(--muted2);font-style:italic;}
.anote{margin-top:8px;padding:8px 0 4px;border-top:1px dashed var(--border);font-size:10.5px;color:var(--muted);line-height:1.5;}
.abr{margin-top:12px;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden;}
.abr-f{height:100%;border-radius:2px;background:var(--ac,var(--naranja));}

/* ── FULL-WIDTH CARD ────────────────────────────────────── */
.card-full{
  background:var(--card);border:1px solid var(--border);border-radius:var(--r);
  padding:26px;box-shadow:0 2px 10px var(--shadow);margin-bottom:18px;
}

/* ── TABLA ──────────────────────────────────────────────── */
table.t{width:100%;border-collapse:collapse;}
table.t th{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted2);text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);}
table.t th:not(:first-child){text-align:right;}
table.t td{padding:9px 10px;font-size:11.5px;border-bottom:1px solid var(--bg2);color:var(--text);}
table.t td:not(:first-child){font-family:'JetBrains Mono',monospace;font-size:11px;text-align:right;}
table.t tr:last-child td{border:none;}
table.t .tot td{background:rgba(181,97,26,.05);font-weight:700;color:var(--naranja);border-top:1px solid rgba(181,97,26,.18);}

/* ── FOOTER ─────────────────────────────────────────────── */
.footer{text-align:center;font-size:11px;color:var(--muted2);border-top:1px solid var(--border);padding:28px 0 0;margin-top:32px;}

@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:960px){
  .kpi-row{grid-template-columns:repeat(2,1fr);}
  .g2{grid-template-columns:1fr;}
  .areas{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:600px){
  .wrap{padding:0 16px 48px;}
  .h-left h1{font-size:32px;}
  .kpi-row{grid-template-columns:1fr;}
  .areas{grid-template-columns:1fr;}
}
@media print{
  .no-print{display:none!important;}
  body::before{display:none;}
  body{background:#fff;}
  .wrap{padding:0 16px;}
  .card{box-shadow:none;border:1px solid #ddd;break-inside:avoid;}
  .card-full{box-shadow:none;border:1px solid #ddd;break-inside:avoid;}
  .acard{break-inside:avoid;}
  .areas{break-inside:avoid;}
  .g2{break-inside:avoid;}
  .sec{break-after:avoid;}
}
#print-btn{
  position:fixed;bottom:28px;right:28px;z-index:9999;
  display:flex;align-items:center;gap:8px;
  background:#1F2566;color:#fff;border:none;border-radius:40px;
  padding:12px 22px;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;
  cursor:pointer;box-shadow:0 4px 20px rgba(31,37,102,.35);
  transition:transform .15s,box-shadow .15s;
}
#print-btn:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(31,37,102,.45);}
</style>
</head>
<body>
<div class="wrap">
<div class="no-print" style="position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
  <a id="pdf-btn"
    href="#"
    style="display:inline-flex;align-items:center;gap:7px;white-space:nowrap;background:#fff;color:#1F2566;border:1.5px solid #1F2566;border-radius:40px;padding:11px 20px;font-size:13px;font-weight:600;font-family:Inter,sans-serif;cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(31,37,102,.15)"
    onclick="return pedirPDF(this)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Descargar PDF
  </a>
  <button
    style="display:inline-flex;align-items:center;gap:7px;white-space:nowrap;background:#1F2566;color:#fff;border:none;border-radius:40px;padding:11px 20px;font-size:13px;font-weight:600;font-family:Inter,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(31,37,102,.3)"
    onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Imprimir
  </button>
</div>

<!-- HEADER -->
<header>
  <div class="h-left">
    <h1>Ingresos <em>Estimados</em><br>${datos.mes}</h1>
    <p>Petróleo &amp; Gas · Sales, Volume &amp; Price Analysis</p>
  </div>
  <div class="h-right">
    <div class="badge"><div class="dot"></div>Estimado</div>
    <div class="h-date">Período: ${datos.periodo} · ${datos.dias} días</div>
  </div>
</header>

<!-- KPIs -->
<div class="sec">Indicadores Clave — ${datos.mes}</div>
<div class="kpi-row">

  <div class="kpi">
    <div class="kpi-lbl">Ventas del Período</div>
    <div class="kpi-val">${f(datos.ventas_MM)}<span class="kpi-unit">MM us$</span></div>
    <div class="kpi-sub"><span class="tag rj">Stock mes sig.: ${f(datos.stock_MM)} MM us$</span></div>
  </div>

  <div class="kpi">
    <div class="kpi-lbl">Volumen Producido</div>
    <div class="kpi-val">${fN(datos.vol_producido_boed)}<span class="kpi-unit">BOE/d</span></div>
    <div class="kpi-sub">
      ${oilProd ? `<span class="tag az">Oil ${oilProd}%</span>` : ''}
      ${gasProd ? `<span class="tag wm">Gas ${gasProd}%</span>` : ''}
    </div>
  </div>

  <div class="kpi">
    <div class="kpi-lbl">Volumen Vendido</div>
    <div class="kpi-val">${fN(datos.vol_vendido_boed)}<span class="kpi-unit">BOE/d</span></div>
    <div class="kpi-sub">
      ${oilVend ? `<span class="tag vd">Oil ${oilVend}%</span>` : ''}
      ${gasVend ? `<span class="tag wm">Gas ${gasVend}%</span>` : ''}
    </div>
  </div>

  <div class="kpi">
    <div class="kpi-lbl">Precio Neto Oil</div>
    <div class="kpi-val">${f(datos.precio_neto_oil)}<span class="kpi-unit">us$/bbl</span></div>
    <div class="kpi-sub"><span class="tag wm">BRENT ref: ${f(datos.brent_prom)} us$/bbl</span></div>
  </div>

  <div class="kpi">
    <div class="kpi-lbl">Precio Neto Gas</div>
    <div class="kpi-val">${f(datos.precio_neto_gas)}<span class="kpi-unit">us$/mcf</span></div>
    <div class="kpi-sub"><span class="tag mu">ET + RCLV promedio</span></div>
  </div>

</div>

<!-- GRÁFICOS PRINCIPALES -->
<div class="sec">Composición del Ingreso</div>
<div class="g2">
  <div class="card">
    <div class="card-hdr">Ingresos por Área y Tipo <span class="card-hdr-val">us$ — ${datos.mes}</span></div>
    <div class="ch"><canvas id="cBarras"></canvas></div>
  </div>
  <div class="card">
    <div class="card-hdr">Participación en Ventas <span class="card-hdr-val">% · us$</span></div>
    <div class="ch"><canvas id="cDonut"></canvas></div>
  </div>
</div>

<!-- DETALLE PETRÓLEO -->
<div class="sec">Detalle por Área — Petróleo</div>
<div class="areas">

  <!-- ET / LT-PQ -->
  <div class="acard" style="--ac:var(--naranja)">
    <div class="aname"><div class="adot"></div>ET / LT-PQ</div>
    ${areas.ET.prod_100_m3d ? `<div class="arow"><span class="albl">Producción 100% (m³/d)</span><span class="aval">${f(areas.ET.prod_100_m3d, 1)}</span></div>` : ''}
    <div class="arow"><span class="albl">Producción neta (m³/d)</span><span class="aval">${f(areas.ET.prod_neta_m3d, 2)}</span></div>
    <div class="arow"><span class="albl">m³ entregados</span><span class="aval">${fN(areas.ET.entregados_m3)}</span></div>
    <div class="arow"><span class="albl">Volumen (bbl)</span><span class="aval">${fN(areas.ET.vol_bbl)}</span></div>
    ${areas.ET.brent_ref ? `<div class="arow"><span class="albl">BRENT ref. (us$/bbl)</span><span class="aval">${f(areas.ET.brent_ref)}</span></div>` : ''}
    ${areas.ET.descuento ? `<div class="arow"><span class="albl">Descuento (us$/bbl)</span><span class="aval neg">(${f(Math.abs(areas.ET.descuento))})</span></div>` : ''}
    <div class="arow"><span class="albl">Precio neto (us$/bbl)</span><span class="aval hi">${f(areas.ET.precio_neto)}</span></div>
    <div class="arow"><span class="albl">Ingreso período (us$)</span><span class="aval hi">${fN(areas.ET.ingreso)}</span></div>
    ${areas.ET.stock_m3 ? `
    <div class="arow"><span class="albl">Stock mes siguiente (m³)</span><span class="aval mu">${fN(areas.ET.stock_m3)} / ${f(areas.ET.stock_dias ?? 0, 1)}d</span></div>
    <div class="arow"><span class="albl">Stock valorizado (us$)</span><span class="aval mu">${fN(areas.ET.stock_us ?? 0)}</span></div>` : ''}
    <div class="abr"><div class="abr-f" style="width:${pct(ingOilET)}%"></div></div>
  </div>

  <!-- PC-KK -->
  <div class="acard" style="--ac:var(--azul)">
    <div class="aname"><div class="adot"></div>PC-KK</div>
    ${areas.PCKK.prod_100_m3d ? `<div class="arow"><span class="albl">Producción 100% (m³/d)</span><span class="aval">${f(areas.PCKK.prod_100_m3d, 1)}</span></div>` : ''}
    <div class="arow"><span class="albl">Producción neta (m³/d)</span><span class="aval">${f(areas.PCKK.prod_neta_m3d, 2)}</span></div>
    <div class="arow"><span class="albl">m³ entregados</span><span class="aval">${fN(areas.PCKK.entregados_m3)}</span></div>
    <div class="arow"><span class="albl">Volumen (bbl)</span><span class="aval">${fN(areas.PCKK.vol_bbl)}</span></div>
    ${areas.PCKK.brent_1q ? `<div class="arow"><span class="albl">BRENT 1° Quincena (us$/bbl)</span><span class="aval">${f(areas.PCKK.brent_1q)}</span></div>` : ''}
    ${areas.PCKK.brent_2q ? `<div class="arow"><span class="albl">BRENT 2° Quincena (us$/bbl)</span><span class="aval">${f(areas.PCKK.brent_2q)}</span></div>` : ''}
    ${areas.PCKK.brent_ref && !areas.PCKK.brent_1q ? `<div class="arow"><span class="albl">BRENT ref. (us$/bbl)</span><span class="aval">${f(areas.PCKK.brent_ref)}</span></div>` : ''}
    ${areas.PCKK.brent_1q && areas.PCKK.brent_2q ? `<div class="anote">* Precio calculado en base a las <strong style="color:var(--azul)">2 semanas anteriores</strong> a la quincena de entrega</div>` : ''}
    <div class="arow"><span class="albl">Precio estimado (us$/bbl)</span><span class="aval hi">${f(areas.PCKK.precio_neto)}</span></div>
    <div class="arow"><span class="albl">Ingreso período (us$)</span><span class="aval hi">${fN(areas.PCKK.ingreso)}</span></div>
    ${areas.PCKK.stock_m3 ? `
    <div class="arow"><span class="albl">Stock mes siguiente (m³)</span><span class="aval mu">${fN(areas.PCKK.stock_m3)} / ${f(areas.PCKK.stock_dias ?? 0, 1)}d</span></div>
    <div class="arow"><span class="albl">Stock valorizado (us$)</span><span class="aval mu">${fN(areas.PCKK.stock_us ?? 0)}</span></div>` : ''}
    ${areas.PCKK.in_kind_bbl != null ? `
    <div class="arow" style="margin-top:6px"><span class="albl">In kind (bbl/mes)</span><span class="aval mu">${fN(Math.abs(areas.PCKK.in_kind_bbl))}</span></div>
    <div class="arow"><span class="albl">In kind / producción</span><span class="aval mu">${f(Math.abs(areas.PCKK.in_kind_pct ?? 0) * 100, 2)}%</span></div>
    <div class="arow"><span class="albl">In kind valorizado (us$)</span><span class="aval mu">${fN(Math.abs(areas.PCKK.in_kind_us ?? 0))}</span></div>` : ''}
    <div class="abr"><div class="abr-f" style="width:${pct(ingOilPCKK)}%"></div></div>
  </div>

  <!-- CH / PPC -->
  <div class="acard" style="--ac:var(--verde)">
    <div class="aname"><div class="adot"></div>CH / PPC</div>
    ${areas.CH.prod_100_m3d ? `<div class="arow"><span class="albl">Producción 100% (m³/d)</span><span class="aval">${f(areas.CH.prod_100_m3d, 2)}</span></div>` : ''}
    <div class="arow"><span class="albl">Producción neta (m³/d)</span><span class="aval">${f(areas.CH.prod_neta_m3d, 2)}</span></div>
    <div class="arow"><span class="albl">m³ entregados</span><span class="aval">${fN(areas.CH.entregados_m3)}</span></div>
    <div class="arow"><span class="albl">Volumen (bbl)</span><span class="aval">${fN(areas.CH.vol_bbl)}</span></div>
    ${areas.CH.brent_ref ? `<div class="arow"><span class="albl">MEDANITO ref. (us$/bbl)</span><span class="aval">${f(areas.CH.brent_ref)}</span></div>` : ''}
    <div class="arow"><span class="albl">Precio neto (us$/bbl)</span><span class="aval hi">${f(areas.CH.precio_neto)}</span></div>
    <div class="arow"><span class="albl">Ingreso período (us$)</span><span class="aval hi">${fN(areas.CH.ingreso)}</span></div>
    <div class="abr"><div class="abr-f" style="width:${pct(ingOilCH)}%"></div></div>
  </div>

  <!-- RCLV -->
  <div class="acard" style="--ac:var(--violeta)">
    <div class="aname"><div class="adot"></div>RCLV — Petróleo</div>
    <div class="arow"><span class="albl">Producción neta (m³/d)</span><span class="aval">${f(areas.RCLV.prod_neta_m3d, 2)}</span></div>
    <div class="arow"><span class="albl">m³ entregados</span><span class="aval">${fN(areas.RCLV.entregados_m3)}</span></div>
    <div class="arow"><span class="albl">Volumen (bbl)</span><span class="aval">${fN(areas.RCLV.vol_bbl)}</span></div>
    ${areas.RCLV.brent_ref ? `<div class="arow"><span class="albl">BRENT ref. (us$/bbl)</span><span class="aval">${f(areas.RCLV.brent_ref)}</span></div>` : ''}
    ${areas.RCLV.descuento ? `<div class="arow"><span class="albl">Descuento (us$/bbl)</span><span class="aval neg">(${f(Math.abs(areas.RCLV.descuento))})</span></div>` : ''}
    <div class="arow"><span class="albl">Precio neto (us$/bbl)</span><span class="aval hi">${f(areas.RCLV.precio_neto)}</span></div>
    <div class="arow"><span class="albl">Ingreso período (us$)</span><span class="aval hi">${fN(areas.RCLV.ingreso)}</span></div>
    <div class="abr"><div class="abr-f" style="width:${pct(ingOilRCLV)}%"></div></div>
  </div>

</div>

<!-- DETALLE GAS -->
<div class="sec">Detalle por Área — Gas</div>
<div class="areas" style="grid-template-columns:repeat(2,1fr);max-width:760px">

  <div class="acard" style="--ac:var(--warm)">
    <div class="aname"><div class="adot"></div>Gas — ET-LT-PQ</div>
    <div class="arow"><span class="albl">Producción neta (Mm³/d)</span><span class="aval">${fN(gas.ET.prod_mcfd)}</span></div>
    <div class="arow"><span class="albl">Volumen mes (Mm³)</span><span class="aval">${fN(gas.ET.vol_mes_mcf)}</span></div>
    <div class="arow"><span class="albl">Precio (us$/mcf)</span><span class="aval hi">${f(gas.ET.precio_mcf)}</span></div>
    <div class="arow"><span class="albl">Ingreso período (us$)</span><span class="aval hi">${fN(gas.ET.ingreso)}</span></div>
    <div class="abr"><div class="abr-f" style="width:${pct(ingGasET)}%"></div></div>
  </div>

  <div class="acard" style="--ac:var(--muted)">
    <div class="aname"><div class="adot" style="background:var(--muted)"></div>Gas — RCLV</div>
    <div class="arow"><span class="albl">Producción neta (Mm³/d)</span><span class="aval">${fN(gas.RCLV.prod_mcfd)}</span></div>
    <div class="arow"><span class="albl">Volumen mes (Mm³)</span><span class="aval">${fN(gas.RCLV.vol_mes_mcf)}</span></div>
    <div class="arow"><span class="albl">Precio (us$/mcf)</span><span class="aval" style="color:var(--muted)">${f(gas.RCLV.precio_mcf)}</span></div>
    <div class="arow"><span class="albl">Ingreso período (us$)</span><span class="aval" style="color:var(--muted)">${fN(gas.RCLV.ingreso)}</span></div>
    <div class="abr"><div class="abr-f" style="width:${pct(ingGasRCLV)}%;background:var(--muted)"></div></div>
  </div>

</div>

${hasHistorico ? `
<!-- EVOLUCIÓN MENSUAL -->
<div class="sec">Evolución Mensual de Ingresos</div>
<div class="card-full">
  <div class="card-hdr">Ingresos por Área <span class="card-hdr-val">MM us$</span></div>
  <div class="ch" style="height:240px"><canvas id="cMensual"></canvas></div>
</div>
` : ''}

${hasPriceHistory ? `
<!-- PRECIO NETO POR ÁREA -->
<div class="sec">Precio Neto por Área</div>
<div class="card-full">
  <div class="card-hdr">Evolución del Precio Neto <span class="card-hdr-val">us$/bbl</span></div>
  <div class="ch" style="height:320px"><canvas id="cPrecios"></canvas></div>
</div>
` : ''}

${hasMacro ? `
<div class="sec">Contexto de Mercado</div>
<div style="display:grid;grid-template-columns:${macroGridCols};gap:20px;margin-bottom:8px">
  ${macro!.hasBrent ? `<div class="card" style="padding:22px 20px"><div class="card-hdr">ICE Brent Crude <span class="card-hdr-val">USD/bbl · proyección</span></div><div class="ch" style="height:200px"><canvas id="cMacroBrent"></canvas></div></div>` : ''}
  ${macro!.hasHH ? `<div class="card" style="padding:22px 20px"><div class="card-hdr">Henry Hub Natural Gas <span class="card-hdr-val">USD/MMBtu · proyección</span></div><div class="ch" style="height:200px"><canvas id="cMacroHH"></canvas></div></div>` : ''}
</div>
<p style="font-size:10px;color:var(--muted2);text-align:right;margin-bottom:32px">Futuros próximos 12 meses · ${macroDate}${macroPrevNote} · ICE Futures Europe + CME Group</p>
` : ''}

<div class="footer">Crown Point Energía &middot; Generado ${fechaGen}</div>
</div><!-- /wrap -->

<script>
const C = {
  naranja:'#1F2566', azul:'#6CAE52', verde:'#C9A24A',
  violeta:'#4F5478', warm:'#8BC87A', rojo:'#B33B2E',
  muted:'#4F5478', muted2:'#8488A8', border:'#DCDAE6',
  bg2:'#E6EAF5', card:'#FFFFFF'
};
const tip = {
  backgroundColor:C.card, borderColor:C.border, borderWidth:1,
  titleColor:C.muted, bodyColor:'#1A1714', padding:10
};
Chart.defaults.color = C.muted;
Chart.defaults.borderColor = C.border;
Chart.defaults.font.family = "'Inter', sans-serif";

// ── BARRAS POR ÁREA ──────────────────────────────────────────
new Chart(document.getElementById('cBarras'),{
  type:'bar',
  data:{
    labels:['ET/LT-PQ','PC-KK','CH/PPCO','RCLV','Gas ET','Gas RCLV'],
    datasets:[{
      label:'Ingreso (us$)',
      data:[${ingOilET.toFixed(0)},${ingOilPCKK.toFixed(0)},${ingOilCH.toFixed(0)},${ingOilRCLV.toFixed(0)},${ingGasET.toFixed(0)},${ingGasRCLV.toFixed(0)}],
      backgroundColor:[C.naranja,C.azul,C.verde,C.violeta,C.verde+'88',C.muted+'88'],
      borderRadius:5, borderSkipped:false
    }]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{...tip, callbacks:{label:c=>\` us$ \${(c.raw/1e6).toFixed(2)} MM\`}}
    },
    scales:{
      x:{grid:{color:C.bg2}, ticks:{font:{family:"'JetBrains Mono'",size:10},color:C.muted}},
      y:{grid:{color:C.bg2}, ticks:{callback:v=>\`\${(v/1e6).toFixed(0)}MM\`,font:{family:"'JetBrains Mono'",size:10},color:C.muted}}
    }
  }
});

// ── DONUT CON VALORES ────────────────────────────────────────
const dVals   = [${ingOilET.toFixed(0)},${ingOilPCKK.toFixed(0)},${ingOilCH.toFixed(0)},${ingOilRCLV.toFixed(0)},${ingGasTotal.toFixed(0)}];
const dLabels = ['ET / LT-PQ','PC-KK','CH / PPCO','RCLV','Gas'];
const dColors = [C.naranja,C.azul,C.verde,C.violeta,C.warm];
const dTotal  = dVals.reduce((a,b)=>a+b,0);

new Chart(document.getElementById('cDonut'),{
  type:'doughnut',
  data:{
    labels:dLabels,
    datasets:[{data:dVals,backgroundColor:dColors,borderColor:'#fff',borderWidth:3,hoverOffset:10}]
  },
  options:{
    responsive:true, maintainAspectRatio:false, cutout:'60%',
    plugins:{
      legend:{
        position:'bottom',
        labels:{
          padding:11, font:{size:10.5}, usePointStyle:true, pointStyleWidth:8, color:C.muted,
          generateLabels(chart){
            return dLabels.map((lbl,i)=>{
              const pct=((dVals[i]/dTotal)*100).toFixed(1);
              const mm=(dVals[i]/1e6).toFixed(2);
              return{text:\`\${lbl}  \${pct}%  (us$ \${mm}MM)\`,fillStyle:dColors[i],strokeStyle:'#fff',lineWidth:2,pointStyle:'circle',index:i,hidden:false};
            });
          }
        }
      },
      tooltip:{...tip, callbacks:{label:c=>{const p=((c.raw/dTotal)*100).toFixed(1);return \` \${p}%  —  us$ \${(c.raw/1e6).toFixed(2)} MM\`;}}}
    }
  },
  plugins:[{
    id:'centro',
    afterDraw(chart){
      const {ctx,chartArea:{left,top,right,bottom}}=chart;
      const cx=(left+right)/2, cy=(top+bottom)/2-18;
      ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=C.muted; ctx.font='10px Inter'; ctx.fillText('VENTAS TOTALES',cx,cy-13);
      ctx.fillStyle='#14172E'; ctx.font='bold 16px JetBrains Mono'; ctx.fillText('${totalMMStr}',cx,cy+4);
      ctx.fillStyle=C.muted; ctx.font='9.5px Inter'; ctx.fillText('sin stock',cx,cy+20);
      ctx.restore();
    }
  }]
});

${hasHistorico ? `
// ── MENSUAL APILADO ──────────────────────────────────────────
new Chart(document.getElementById('cMensual'),{
  type:'bar',
  data:{
    labels:${mensualLabels},
    datasets:[
      {label:'PC-KK',   data:${mensualPCKK},  backgroundColor:C.azul,    borderRadius:4, borderSkipped:false},
      {label:'ET/LT',   data:${mensualET},    backgroundColor:C.naranja, borderRadius:4, borderSkipped:false},
      {label:'RCLV',    data:${mensualRCLV},  backgroundColor:C.violeta, borderRadius:4, borderSkipped:false},
      {label:'CH/PPCO', data:${mensualCH},    backgroundColor:C.verde,   borderRadius:4, borderSkipped:false},
      {label:'Gas',     data:${mensualGas},   backgroundColor:C.warm,    borderRadius:4, borderSkipped:false},
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{labels:{font:{size:10},usePointStyle:true,pointStyleWidth:7,color:C.muted}},
      tooltip:{...tip, callbacks:{label:c=>\` \${c.dataset.label}: us$ \${c.raw.toFixed(2)} MM\`}}
    },
    scales:{
      x:{stacked:true, grid:{color:C.bg2}, ticks:{font:{family:"'JetBrains Mono'",size:11},color:C.muted}},
      y:{stacked:true, grid:{color:C.bg2}, ticks:{callback:v=>\`\${v.toFixed(0)}MM\`,font:{family:"'JetBrains Mono'",size:11},color:C.muted}}
    }
  }
});
` : ''}

${hasPriceHistory ? `
// ── PRECIOS POR ÁREA — LÍNEAS con labels escalonados ────────
const preciosData = {
  'ET/LT-PQ': {data:${precioETArr},   color:C.naranja, fill:true},
  'PC-KK':    {data:${precioPCKKArr}, color:C.azul,   fill:false},
  'CH / PPC': {data:${precioCHArr},   color:C.verde,  fill:false},
  'RCLV':     {data:${precioRCLVArr}, color:C.violeta,fill:false},
};
const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;

new Chart(document.getElementById('cPrecios'),{
  type:'line',
  data:{
    labels:${mensualLabels},
    datasets:Object.entries(preciosData).map(([label,{data,color,fill}])=>({
      label, data, fill,
      borderColor:color,
      backgroundColor:color+'18',
      tension:.4,
      pointRadius:4.5,
      pointHoverRadius:7,
      pointBackgroundColor:color,
      pointBorderColor:'#fff',
      pointBorderWidth:1.5,
      borderWidth:2.5,
    }))
  },
  options:{
    responsive:true, maintainAspectRatio:false,
    interaction:{mode:'index',intersect:false},
    plugins:{
      legend:{labels:{font:{size:10.5},usePointStyle:true,pointStyleWidth:8,color:C.muted}},
      tooltip:{...tip, callbacks:{label:c=>\` \${c.dataset.label}: us$ \${c.raw.toFixed(2)}/bbl\`}}
    },
    scales:{
      x:{grid:{color:C.bg2}, ticks:{font:{family:"'JetBrains Mono'",size:11},color:C.muted}},
      y:{
        grid:{color:C.bg2},
        ticks:{callback:v=>\`\$\${v}\`,font:{family:"'JetBrains Mono'",size:10.5},color:C.muted}
      }
    },
    layout:{padding:{right:90,top:20,bottom:10,left:10}}
  },
  plugins:[{
    id:'smartLabels',
    afterDatasetsDraw(chart){
      const {ctx,data}=chart;
      const nCols=data.labels.length, nSeries=data.datasets.length, MIN_GAP=15;
      for(let col=0;col<nCols;col++){
        const isLast=col===nCols-1, isFirst=col===0;
        let pts=[];
        for(let si=0;si<nSeries;si++){
          const ds=data.datasets[si];
          const color=preciosData[ds.label]?.color||C.muted;
          const meta=chart.getDatasetMeta(si);
          const pt=meta.data[col];
          if(!pt) continue;
          pts.push({x:pt.x,y:pt.y,val:ds.data[col],color});
        }
        pts.sort((a,b)=>a.y-b.y);
        for(let i=1;i<pts.length;i++){
          if(pts[i].y-pts[i-1].y<MIN_GAP) pts[i].y=pts[i-1].y+MIN_GAP;
        }
        pts.forEach(({x,y,val,color})=>{
          const txt=val.toFixed(1);
          ctx.save();
          ctx.font="500 11px 'JetBrains Mono'";
          const tw=ctx.measureText(txt).width;
          let lx=x, align='center';
          if(isLast){lx=x-tw/2-8;align='right';}
          if(isFirst){lx=x+tw/2+8;align='left';}
          ctx.fillStyle='rgba(255,255,255,0.85)';
          const pad=3;
          ctx.fillRect(lx-tw/2-pad,y-8,tw+pad*2,16);
          ctx.fillStyle=color;
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          ctx.fillText(txt,lx,y);
          ctx.restore();
        });
      }
      let avgPts=[];
      for(let si=0;si<nSeries;si++){
        const ds=data.datasets[si];
        const color=preciosData[ds.label]?.color||C.muted;
        const meta=chart.getDatasetMeta(si);
        const lastPt=meta.data[nCols-1];
        if(!lastPt) continue;
        avgPts.push({y:lastPt.y,x:lastPt.x,val:avg(ds.data),color});
      }
      avgPts.sort((a,b)=>a.y-b.y);
      for(let i=1;i<avgPts.length;i++){
        if(avgPts[i].y-avgPts[i-1].y<13) avgPts[i].y=avgPts[i-1].y+13;
      }
      avgPts.forEach(({x,y,val,color})=>{
        ctx.save();
        ctx.fillStyle=color;
        ctx.font="500 10px 'JetBrains Mono'";
        ctx.textAlign='left';
        ctx.textBaseline='middle';
        ctx.fillText(\`x̅ \${val.toFixed(1)}\`,x+52,y);
        ctx.restore();
      });
    }
  }]
});
` : ''}

${hasMacro ? `
const _mL=${macroLabels};
${macro!.hasBrent ? `new Chart(document.getElementById('cMacroBrent'),{type:'line',data:{labels:_mL,datasets:[{label:'Actual',data:${macroBrentData},borderColor:'#82BC00',backgroundColor:'rgba(130,188,0,.12)',tension:.35,pointRadius:3.5,pointHoverRadius:5.5,pointBackgroundColor:'#82BC00',borderWidth:2.5,fill:true}${brentPrevDs}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:${brentLegend},labels:{font:{size:10},usePointStyle:true,color:C.muted}},tooltip:{...tip,callbacks:{label:c=>\`  \${c.dataset.label}: \${c.parsed.y?.toFixed(2)} USD/bbl\`}}},scales:{x:{grid:{color:C.bg2},ticks:{font:{family:"'JetBrains Mono'",size:10.5},color:C.muted,maxRotation:40}},y:{grid:{color:C.bg2},ticks:{callback:v=>\`\$\${Number(v).toFixed(0)}\`,font:{family:"'JetBrains Mono'",size:10.5},color:C.muted}}}}});` : ''}
${macro!.hasHH ? `new Chart(document.getElementById('cMacroHH'),{type:'line',data:{labels:_mL,datasets:[{label:'Actual',data:${macroHHData},borderColor:'#8B1A2A',backgroundColor:'rgba(139,26,42,.08)',tension:.35,pointRadius:3.5,pointHoverRadius:5.5,pointBackgroundColor:'#8B1A2A',borderWidth:2.5,fill:true}${hhPrevDs}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:${hhLegend},labels:{font:{size:10},usePointStyle:true,color:C.muted}},tooltip:{...tip,callbacks:{label:c=>\`  \${c.dataset.label}: \${c.parsed.y?.toFixed(3)} USD/MMBtu\`}}},scales:{x:{grid:{color:C.bg2},ticks:{font:{family:"'JetBrains Mono'",size:10.5},color:C.muted,maxRotation:40}},y:{grid:{color:C.bg2},ticks:{callback:v=>\`\$\${Number(v).toFixed(2)}\`,font:{family:"'JetBrains Mono'",size:10.5},color:C.muted}}}}});` : ''}
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
  var KEY = 'cpe_tour_ingresos_v1';
  if (localStorage.getItem(KEY)) return;

  var STEPS = [
    {sel: null,
     title: 'Reporte de Ingresos Estimados',
     desc:  'Te guiamos por las secciones principales. Podés saltar el tutorial en cualquier momento usando el botón "Saltar".'},
    {sel: '.kpi-row',
     title: 'Indicadores clave',
     desc:  'Los KPIs muestran el total de ingresos del período, producción de petróleo y gas, y el precio promedio estimado.'},
    {sel: '.g2',
     title: 'Composición de ingresos',
     desc:  'El gráfico circular muestra el peso de cada área sobre el total. A la derecha ves el desglose con valores absolutos.'},
    {sel: '.areas',
     title: 'Detalle por área',
     desc:  'Cada tarjeta resume la producción e ingresos estimados de una concesión. La barra indica su participación porcentual en el total.'},
    {sel: '#cMensual',
     title: 'Evolución mensual',
     desc:  'Gráfico de barras apiladas con la evolución de los ingresos mes a mes, desagregado por área y gas.'},
    {sel: '#cPrecios',
     title: 'Precios netos por área',
     desc:  'Evolución del precio neto de petróleo recibido por cada concesión a lo largo del período.'},
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

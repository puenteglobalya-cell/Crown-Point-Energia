import type { DatosComercial, AreaPrecio } from '@/lib/parsers/comercial'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtNum(v: number | null | undefined, dec = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return ''
  if (Math.abs(v - Math.round(v)) < 1e-6) {
    return Math.round(v).toLocaleString('es-AR')
  }
  return v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtUsd(v: number | null | undefined, unit: 'K' | 'MM' | '' = 'K', dec = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  if (unit === 'K') return `US$ ${fmtNum(v / 1000, dec)}K`
  if (unit === 'MM') return `US$ ${fmtNum(v / 1e6, 2)}MM`
  return `US$ ${fmtNum(v, dec)}`
}

function fmtDate(d: Date | null): string {
  if (!d) return ''
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${MESES[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`
}

const MESES10 = ['Ene-26', 'Feb-26', 'Mar-26', 'Abr-26', 'May-26', 'Jun-26', 'Jul-26', 'Ago-26', 'Sep-26', 'Oct-26']

type TabEntry = { key: string; label: string; icon: string; html: string; chartJs: string | null }

function buildQuartersTable(precios: (number | null)[]): string {
  const chunks: { vals: number[]; idxs: number[] }[] = []
  for (let i = 0; i < precios.length; i += 3) {
    const slice = precios.slice(i, i + 3)
    const idxs: number[] = []
    const vals: number[] = []
    slice.forEach((v, k) => { if (v !== null) { vals.push(v); idxs.push(i + k) } })
    if (vals.length) chunks.push({ vals, idxs })
  }
  let prevAvg: number | null = null
  let rows = ''
  chunks.forEach((c, qi) => {
    const avg = c.vals.reduce((a, b) => a + b, 0) / c.vals.length
    const mlabels = c.idxs.map(i => MESES10[i]).join(', ')
    const isLast = qi === chunks.length - 1
    const partial = c.vals.length < 3 ? ' (parcial)' : ''
    let deltaCell = '—'
    if (prevAvg !== null) {
      const d = ((avg - prevAvg) / prevAvg) * 100
      deltaCell = `<span class="${d >= 0 ? 'pos' : 'neg'}">${d >= 0 ? '+' : ''}${fmtNum(d)}%</span>`
    }
    rows += `<tr${isLast ? ' style="background:var(--bg-accent)"' : ''}><td${isLast ? ' class="b"' : ''}>Q${qi + 1} 2026${partial}</td><td class="r${isLast ? ' b' : ''}">${fmtNum(avg)}</td><td class="mu">${mlabels}</td><td class="r">${deltaCell}</td></tr>`
    prevAvg = avg
  })
  return rows
}

function buildResumen(d: DatosComercial): string {
  const rowsHtml = d.gestiones.map(g => {
    const e27Cell = g.efecto2027 ? fmtUsd(g.efecto2027) : '<span class="mu">—</span>'
    return `<tr data-yac="${esc(g.yacimiento)}" data-prod="${esc(g.producto)}" data-total="${g.total}"><td><a href="#" onclick="goTo('${g.tabKey}');return false" style="color:var(--text-accent);font-weight:500;text-decoration:none">${esc(g.nombre)} <i class="ti ti-arrow-up-right" style="font-size:10px"></i></a></td><td class="mu">${esc(g.yacimiento)}</td><td class="mu">${esc(g.producto)}</td><td class="r">${fmtUsd(g.efecto2026)}</td><td class="r">${e27Cell}</td><td class="r b">${fmtUsd(g.total)}</td></tr>`
  }).join('')

  return `
<div class="grid3" style="margin-bottom:12px">
  <div class="card-l"><div class="lbl">Impacto 2026</div><div class="big" style="font-size:26px">${fmtUsd(d.impacto2026, 'MM')}</div></div>
  <div class="card-l"><div class="lbl">Impacto 2027</div><div class="big" style="font-size:26px">${fmtUsd(d.impacto2027, 'MM')}</div></div>
  <div style="background:linear-gradient(135deg,#0f2847,#1b3f6e);border-radius:12px;padding:14px 16px;color:white"><div class="lbl" style="color:rgba(255,255,255,.6)">Total consolidado</div><div class="big" style="font-size:26px;color:white">${fmtUsd(d.impactoTotal, 'MM')}</div></div>
</div>
<div class="st">Impacto valorizado de gestiones comerciales 2026-2027</div>
<div class="card" style="padding:16px;margin-bottom:12px;overflow-x:auto">
  <table id="tbl-gestiones"><tr>
    <th>Gestión <span class="mu" style="font-weight:400;text-transform:none;letter-spacing:0">(clic en el nombre para ver detalle)</span></th>
    <th style="cursor:pointer" onclick="sortGestiones('yac')">Yacimiento <i class="ti ti-arrows-sort" style="font-size:11px"></i></th>
    <th style="cursor:pointer" onclick="sortGestiones('prod')">Producto <i class="ti ti-arrows-sort" style="font-size:11px"></i></th>
    <th class="r">Efecto 2026</th><th class="r">Efecto 2027</th>
    <th class="r" style="cursor:pointer" onclick="sortGestiones('total')">Total <i class="ti ti-arrows-sort" style="font-size:11px"></i></th>
  </tr>
  <tbody id="tbl-gestiones-body">
  ${rowsHtml}
  </tbody>
  <tr style="background:var(--navy);color:white"><td class="b" style="color:white">TOTAL</td><td colspan="3"></td><td class="r b" style="color:white">${fmtUsd(d.impacto2026, 'MM')}</td><td class="r b" style="color:white">${fmtUsd(d.impactoTotal, 'MM')}</td></tr>
  </table>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Clic en "Yacimiento", "Producto" o "Total" para ordenar la tabla.</div>
</div>
<div class="card" style="padding:14px;font-size:12px;color:var(--text-secondary);line-height:1.6">
  <strong style="color:var(--text-primary)">${esc(d.notaRevision1)}</strong><br>${esc(d.notaRevision2)}
</div>`
}

function buildBrent(d: DatosComercial): { html: string; chartJs: string } {
  const s = d.serieBrent
  const rowsFor = (serie: (number | null)[], color: string, label: string) =>
    `<tr><td style="color:${color};font-weight:600">${label}</td>${serie.map(v => `<td class="r">${v !== null ? fmtNum(v) : '—'}</td>`).join('')}</tr>`
  const header = s.meses.map(m => `<th class="r">${m}</th>`).join('')
  const html = `
<p class="intro">Evolución mensual de precios de referencia y precio neto por área, enero–octubre 2026. RCLV finalizó operaciones en agosto 2026.</p>
<div class="card" style="padding:16px;margin-bottom:12px">
  <div style="position:relative;height:260px"><canvas id="chart-brentfull"></canvas></div>
</div>
<div class="card" style="padding:16px;margin-bottom:12px;overflow-x:auto">
  <table style="font-size:11px"><tr><th></th>${header}</tr>
  ${rowsFor(s.iceBrent, '#e05555', 'ICE Brent')}
  ${rowsFor(s.etLtPq, '#4aad6e', 'ET/LT-PQ')}
  ${rowsFor(s.pcKk, '#2a5ba0', 'PC-KK')}
  ${rowsFor(s.chPpc, '#d4a84b', 'CH/PPC')}
  ${rowsFor(s.rclv, '#2a8a9e', 'RCLV')}
  </table>
</div>`
  const chartJs = `
new Chart(document.getElementById('chart-brentfull'),{
  type:'line',
  data:{labels:${JSON.stringify(s.meses)},datasets:[
    {label:'ICE Brent',data:${JSON.stringify(s.iceBrent)},borderColor:'#e05555',borderWidth:2.5,pointRadius:3,tension:.3},
    {label:'ET/LT-PQ',data:${JSON.stringify(s.etLtPq)},borderColor:'#4aad6e',borderWidth:2.5,pointRadius:3,tension:.3},
    {label:'PC-KK',data:${JSON.stringify(s.pcKk)},borderColor:'#2a5ba0',borderWidth:2.5,pointRadius:3,tension:.3},
    {label:'CH/PPC',data:${JSON.stringify(s.chPpc)},borderColor:'#d4a84b',borderWidth:2.5,pointRadius:3,tension:.3},
    {label:'RCLV',data:${JSON.stringify(s.rclv)},borderColor:'#2a8a9e',borderWidth:2.5,pointRadius:3,tension:.3,spanGaps:false},
  ]},
  options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}},scales:{y:{ticks:{callback:v=>'$'+v}}}}
});`
  return { html, chartJs }
}

function buildAreas(d: DatosComercial): { html: string; chartJs: string } {
  const colors: Record<string, string> = { 'ET/LT-PQ': '#4aad6e', 'PC-KK': '#2a5ba0', RCLV: '#2a8a9e', 'CH/PPCO': '#d4a84b' }
  const octNota = `En octubre cae tanto el precio (pasa de tarifa de invierno a tarifa de verano, más baja) como el volumen disponible para la venta — ref. hoja Gas, col. m³/d disponible.`
  const chartDatasets: { area: string; precios: (number | null)[]; color: string }[] = []
  let cardsHtml = ''
  for (const area of d.areas as AreaPrecio[]) {
    const petro = area.productos[0]
    const badge = area.area === 'RCLV' ? ' <span style="background:#fde2e2;color:#c0392b;font-size:9px;padding:1px 6px;border-radius:3px;font-weight:600">FINALIZÓ EN AGOSTO</span>' : ''
    chartDatasets.push({ area: area.area, precios: petro.precios, color: colors[area.area] ?? '#1b3f6e' })
    let prodRows = ''
    for (const prod of area.productos) {
      const octNoteHtml = area.area === 'ET/LT-PQ' && (prod.nombre === 'Gas — Plan Gas' || prod.nombre === 'Gas — Sin Cammesa')
        ? `<div style="font-size:11px;color:var(--text-muted);margin-top:8px">${octNota}</div>`
        : ''
      prodRows += `<div class="card" style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:500;margin-bottom:6px">${esc(prod.nombre)}</div>
        <table><tr><th>Período</th><th class="r">Precio prom.</th><th>Meses</th><th class="r">Var.</th></tr>${buildQuartersTable(prod.precios)}</table>
        <div class="mono" style="margin-top:10px">Fórmula vigente: ${esc(prod.formula)}</div>
        ${octNoteHtml}
      </div>`
    }
    cardsHtml += `<div class="st">${esc(area.area)}${badge}</div>${prodRows}`
  }
  const html = `
<p class="intro">Precio neto por área y producto, enero–octubre 2026 (RCLV solo hasta agosto).</p>
<div class="card" style="padding:16px;margin-bottom:16px">
  <div style="position:relative;height:240px"><canvas id="chart-areas"></canvas></div>
</div>
${cardsHtml}`
  const chartJs = `
new Chart(document.getElementById('chart-areas'),{
  type:'line',
  data:{labels:${JSON.stringify(MESES10)},datasets:[
    ${chartDatasets.map(c => `{label:${JSON.stringify(c.area)},data:${JSON.stringify(c.precios)},borderColor:${JSON.stringify(c.color)},borderWidth:2.5,pointRadius:3,tension:.3,spanGaps:false}`).join(',\n    ')}
  ]},
  options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}}}
});`
  return { html, chartJs }
}

function buildDifET(d: DatosComercial): string {
  const colors = ['var(--fill-danger)', 'var(--fill-warning)', 'var(--fill-warning)', 'var(--fill-success)', 'var(--fill-success)', 'var(--fill-warning)', 'var(--fill-warning)', 'var(--fill-warning)', 'var(--fill-warning)']
  const notas = [
    'Diferencial Escalante de calidad. Precio ligado al descuento histórico de la corriente.',
    'Primera renegociación. Descuento fijo independiente de la calidad Escalante.',
    'Se mantiene el descuento fijo durante el segundo trimestre.',
    'Se invierte la ecuación: Crown Point cobra premio sobre Brent por primera vez.',
    'Premio sostenido para el resto del trimestre (contrato Trafigura firmado 29/05/2026).',
    'Se pasa a descuento fijo por nueva banda de precio tras el vencimiento del premio de ago-sep.',
    'Se mantiene el ajuste de octubre.',
    'Valor de referencia preliminar — fórmula: (ICE Brent FL − Dif. Escalante + 2) × (1−DDEE)/0,964. Variará según la cotización ICE Brent de diciembre.',
    'Valor de referencia preliminar para enero 2027 — variará según la cotización ICE Brent y el diferencial Escalante vigentes en ese momento.',
  ]
  const items = d.diferencialET.map((item, i) => {
    let valHtml: string, valStyle: string
    if (item.esReferencia) {
      valHtml = `${esc(item.valor)} us$/bbl <span style="background:#fff3cd;color:#856404;font-size:9px;padding:1px 6px;border-radius:3px;font-weight:600;margin-left:4px">REFERENCIA</span>`
      valStyle = 'color:var(--text-warning);font-weight:600'
    } else {
      const n = item.valor as number
      const cls = n >= 0 ? 'pos b' : 'neg'
      valHtml = `<span class="${cls}">${n >= 0 ? '+' : ''}${fmtNum(n)} us$/bbl</span>`
      valStyle = ''
    }
    const mb = i === d.diferencialET.length - 1 ? ' style="margin-bottom:16px"' : ''
    const nota = notas[i] ?? ''
    return `<div class="tl-item"${mb}><div class="tl-dot" style="background:${colors[i] ?? 'var(--navy)'}">${i + 1}</div><div class="tl-body"><div style="display:flex;justify-content:space-between"><span style="font-size:11px;color:var(--text-muted)">${esc(item.periodo)}</span><span style="${valStyle}">${valHtml}</span></div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${nota}</div></div></div>`
  }).join('')

  return `
<p class="intro">La renegociación con Trafigura es el principal logro de 2026. En el año el diferencial pasó de −3,50 a +1,50 us$/bbl sobre Brent, con ajustes posteriores.</p>
<div class="st">Evolución diferencial ET/LT-PQ</div>
${items}`
}

function buildTransporteTdf(d: DatosComercial): string {
  const t = d.transporte
  const row = (label: string, vals: number[], cls = '') =>
    `<tr><td${cls.includes('b-row') ? ' class="b"' : ''}>${label}</td>${vals.map(v => `<td class="r${cls}">${fmtNum(v, v === t.volumenM3 ? 2 : 0)}</td>`).join('')}</tr>`
  return `
<p class="intro">Simulación de escenarios — transporte de crudo liviano remanente de TDF a PC-KK (~812 m³, 27 camiones, ~1.300 km) para tratarlo y venderlo como calidad Cañadón Seco.</p>
<div class="card" style="padding:16px;overflow-x:auto">
  <table><tr><th>Concepto</th><th class="r">Brent ${fmtNum(t.brent[0], 0)}</th><th class="r">Brent ${fmtNum(t.brent[1], 0)}</th><th class="r">Brent ${fmtNum(t.brent[2], 0)}</th></tr>
  <tr><td class="b">ICE Brent (us$/bbl)</td><td class="r b">${fmtNum(t.brent[0], 0)}</td><td class="r b">${fmtNum(t.brent[1], 0)}</td><td class="r b">${fmtNum(t.brent[2], 0)}</td></tr>
  <tr><td>Descuento mix Escalante</td>${t.descuentoMix.map(v => `<td class="r">${fmtNum(v)}</td>`).join('')}</tr>
  <tr><td>Export parity</td>${t.exportParity.map(v => `<td class="r">${fmtNum(v)}</td>`).join('')}</tr>
  <tr style="background:var(--surface-1)"><td class="b">Neto</td>${t.neto.map(v => `<td class="r b">${fmtNum(v)}</td>`).join('')}</tr>
  <tr><td>Transporte (1.300 km)</td>${t.transporteCosto.map(v => `<td class="r neg">${fmtNum(v)}</td>`).join('')}</tr>
  <tr><td>Otros comerciales</td>${t.otrosComerciales.map(v => `<td class="r neg">${fmtNum(v)}</td>`).join('')}</tr>
  <tr><td>Tasa</td>${t.tasa.map(v => `<td class="r neg">${fmtNum(v)}</td>`).join('')}</tr>
  <tr><td>IIBB (3%)</td>${t.iibb.map(v => `<td class="r neg">${fmtNum(v)}</td>`).join('')}</tr>
  <tr style="background:var(--bg-accent)"><td class="b">Neto final (us$/bbl)</td>${t.netoFinal.map(v => `<td class="r b">${fmtNum(v)}</td>`).join('')}</tr>
  <tr><td>Volumen (m³)</td><td class="r" colspan="3">${fmtNum(t.volumenM3)}</td></tr>
  <tr><td>us$ total</td>${t.usdTotal.map(v => `<td class="r">${fmtNum(v, 0)}</td>`).join('')}</tr>
  <tr><td>us$ propuesta ROCH</td>${t.usdPropuestaRoch.map(v => `<td class="r">${fmtNum(v, 0)}</td>`).join('')}</tr>
  <tr style="background:var(--navy);color:white"><td class="b" style="color:white">Neto incremental</td>${t.netoIncremental.map(v => `<td class="r b" style="color:white">${fmtNum(v, 0)}</td>`).join('')}</tr>
  </table>
</div>`
}

function buildAcuerdoPae(d: DatosComercial): string {
  const p = d.acuerdoPae
  return `
<div class="card-g" style="padding:16px 18px;margin-bottom:12px;background:var(--bg-success)">
  <div style="font-size:15px;font-weight:600;color:var(--text-success);line-height:1.5">${esc(p.texto)}</div>
</div>
<div class="grid4" style="margin-bottom:12px">
  <div class="card"><div class="lbl">Vigencia</div><div style="font-size:14px;font-weight:500">${fmtDate(p.vigenciaDesde)} – ${fmtDate(p.vigenciaHasta)}</div></div>
  <div class="card"><div class="lbl">Ajuste</div><div class="big">+${fmtNum(p.ajuste)}</div><div style="font-size:12px;color:var(--text-secondary)">us$/bbl</div></div>
  <div class="card"><div class="lbl">Volumen</div><div class="big">${fmtNum(p.m3d, 0)}</div><div style="font-size:12px;color:var(--text-secondary)">m³/d · ${fmtNum(p.dias, 0)} días · ${fmtNum(p.bbl, 0)} bbl</div></div>
  <div class="card-g"><div class="lbl">Impacto total</div><div class="big">${fmtUsd(p.usdTotal, 'MM')}</div></div>
</div>
<div class="card" style="padding:14px">
  <div class="lbl" style="margin-bottom:8px">Punteo de entrega</div>
  <div style="font-size:13px;margin-bottom:12px">${esc(p.punteoEntrega)}</div>
  <table><tr><th>Año</th><th class="r">Efecto</th></tr>
  <tr><td>2026</td><td class="r">${fmtUsd(p.efecto2026)}</td></tr>
  <tr><td>2027</td><td class="r">${fmtUsd(p.efecto2027)}</td></tr>
  <tr style="background:var(--bg-accent)"><td class="b">Total</td><td class="r b">${fmtUsd(p.usdTotal, 'MM')}</td></tr>
  </table>
</div>`
}

function buildYpf(d: DatosComercial): string {
  const y = d.ypf
  const rows = y.tabla.map(row => {
    const isFinal = row.concepto === 'Precio Final'
    const fmt = (v: number) => row.esPct ? `${fmtNum(v * 100, 2)}%` : fmtNum(v)
    return `<tr${isFinal ? ' style="background:var(--bg-accent)"' : ''}><td${isFinal ? ' class="b"' : ''}>${esc(row.concepto)}</td><td class="r${isFinal ? ' b' : ''}">${fmt(row.valorET)}</td><td class="r${isFinal ? ' b' : ''}">${fmt(row.valorPAE)}</td></tr>`
  }).join('')
  return `
<div class="card-g" style="padding:16px 18px;margin-bottom:12px;background:var(--bg-success)">
  <div style="font-size:15px;font-weight:600;color:var(--text-success);line-height:1.5">Negociación de precio para la venta de petróleo ET-LT-PQ a YPF (noviembre 2026): mejor resultado neto que la venta de referencia en PC-KK a PAE, con una ganancia incremental de ${fmtUsd(y.gananciaConsolidada, 'K', 1)}.</div>
</div>
<div class="grid3" style="margin-bottom:12px">
  <div class="card"><div class="lbl">Volumen Venta ET-LT-PQ a YPF</div><div class="big">${fmtNum(y.volET, 0)}</div><div style="font-size:12px;color:var(--text-secondary)">m³</div></div>
  <div class="card"><div class="lbl">Volumen Venta PC-KK a PAE (ref.)</div><div class="big">${fmtNum(y.volPAE, 0)}</div><div style="font-size:12px;color:var(--text-secondary)">m³</div></div>
  <div class="card-g"><div class="lbl">Ganancia neta consolidada</div><div class="big">${fmtUsd(y.gananciaConsolidada, 'K', 1)}</div></div>
</div>
<div class="card" style="padding:14px;overflow-x:auto">
  <div class="lbl" style="margin-bottom:8px">${esc(y.referencia)}</div>
  <table><tr><th>Concepto</th><th class="r">Venta ET-LT-PQ a YPF</th><th class="r">Venta PC-KK a PAE (ref.)</th></tr>${rows}
  <tr style="background:var(--surface-1)"><td class="b">Ganancia anualizada</td><td class="r b">${fmtUsd(y.gananciaET, 'K', 1)}</td><td class="r b">${fmtUsd(y.gananciaPAE, 'K', 1)}</td></tr>
  </table>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Ganancia neta consolidada (venta a YPF menos el resultado de referencia de PC-KK a PAE): ${fmtUsd(y.gananciaConsolidada, 'K', 1)}.</div>
</div>`
}

function buildPlanGas(d: DatosComercial): { html: string; chartJs: string } {
  const rows = d.planGas.map(p => `<tr><td class="b">${esc(p.periodo)}</td><td class="r b">${fmtNum(p.precio)}</td><td class="r">${fmtNum(p.volM3d, 0)}</td><td class="r">~US$ ${fmtNum(p.ingresoK, 0)}K</td></tr>`).join('')
  const html = `
<p class="intro">Plan Gas ET-LT-PQ · Cammesa vía Gasener (TOP/DOP 83%) · contrato hasta ago-2028.</p>
<div class="grid3" style="margin-bottom:12px">
  <div class="card"><div class="lbl">Promedio anual</div><div class="big">${fmtNum(d.planGasPromedioAnual)}</div><div style="font-size:12px;color:var(--text-secondary)">us$/MMBtu</div></div>
  <div class="card"><div class="lbl">Ingreso anual est.</div><div class="big">US$ 4,55MM</div><div style="font-size:12px;color:var(--text-secondary)">713.831 Mbtu/mes</div></div>
  <div class="card"><div class="lbl">Volumen</div><div class="big">53.000</div><div style="font-size:12px;color:var(--text-secondary)">m³/d</div></div>
</div>
<div class="card" style="padding:16px;margin-bottom:12px">
  <div style="position:relative;height:200px"><canvas id="chart-plangas"></canvas></div>
</div>
<div class="card" style="padding:14px;overflow-x:auto">
  <table><tr><th>Período</th><th class="r">Precio (us$/MMBtu)</th><th class="r">Vol (m³/d)</th><th class="r">Ingreso mensual est.</th></tr>${rows}</table>
</div>`
  const chartJs = `
new Chart(document.getElementById('chart-plangas'),{
  type:'bar',
  data:{labels:${JSON.stringify(d.planGas.map(p => p.periodo))},datasets:[{label:'Precio us$/MMBtu',data:${JSON.stringify(d.planGas.map(p => p.precio))},backgroundColor:'#d4a84b',borderRadius:4}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
});`
  return { html, chartJs }
}

function buildAhorroGas(d: DatosComercial): string {
  const spread = d.ahorroGas[2]?.promPond ?? 0
  const ahorroSpread = spread * 528000
  return `
<p class="intro">Spread de compra/venta de gas entre PC-KK (compra para generación) y ET (venta sin Cammesa).</p>
<div class="grid3" style="margin-bottom:12px">
  <div class="card-r"><div class="lbl">Compra PC-KK (OPEX)</div><div class="big">US$ 1,50MM</div><div style="font-size:12px;color:var(--text-secondary)">528K MCF/año</div></div>
  <div class="card-g"><div class="lbl">Venta ET (sin Cammesa)</div><div class="big">US$ 1,55MM</div><div style="font-size:12px;color:var(--text-secondary)">528K MCF/año</div></div>
  <div style="background:linear-gradient(135deg,#0f2847,#1b3f6e);border-radius:12px;padding:14px 16px;color:white"><div class="lbl" style="color:rgba(255,255,255,.6)">Ahorro por spread compra/venta</div><div class="big" style="color:white">~${fmtUsd(ahorroSpread, 'K', 1)}/año</div></div>
</div>
<div class="card" style="padding:14px;overflow-x:auto">
  <table><tr><th>Concepto</th><th class="r">Prom. pond.</th><th class="r">Volumen anual</th><th class="r">Total anual</th></tr>
  <tr><td>Compra gas PC-KK (OPEX)</td><td class="r neg b">${fmtNum(d.ahorroGas[0]?.promPond)} us$/MMBtu</td><td class="r">${esc(d.ahorroGas[0]?.volumenAnual)}</td><td class="r neg b">US$ 1,50MM</td></tr>
  <tr><td>Venta gas ET (sin Cammesa)</td><td class="r pos b">${fmtNum(d.ahorroGas[1]?.promPond)} us$/MMBtu</td><td class="r">${esc(d.ahorroGas[1]?.volumenAnual)}</td><td class="r pos b">US$ 1,55MM</td></tr>
  <tr style="background:var(--surface-1)"><td class="b">Spread (diferencial compra/venta)</td><td class="r b">+${fmtNum(spread)} us$/MMBtu</td><td class="r">${esc(d.ahorroGas[2]?.volumenAnual)}</td><td class="r b">~${fmtUsd(ahorroSpread, 'K', 1)}/año</td></tr>
  </table>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px">RCLV — Gasener: ${fmtNum(d.rclvGasenerPrecio)} us$/MMBtu, ${esc(d.rclvGasenerVol)} (finalizó ago-2026). Ver también la solapa Campaña Gas: "Ahorro vs. campaña anterior" es un cálculo distinto (compara el precio actual vs. el de la campaña previa, no compra vs. venta).</div>
</div>`
}

function buildCampGas(d: DatosComercial): string {
  const rows = d.campaniaGas.map(c => `<tr><td class="b">${esc(c.mes)}</td><td class="r">${fmtNum(c.venta)}</td><td class="r">${fmtNum(c.compra)}</td><td class="r ${c.diferencia >= 0 ? 'pos' : 'neg'}">${fmtNum(c.diferencia, 0)}</td><td class="r">${fmtUsd(c.estimado, '', 0)}</td></tr>`).join('')
  const diferenciaTotal = d.campaniaGas.reduce((s, c) => s + c.diferencia, 0)
  const estimadoTotal = d.campaniaGas.reduce((s, c) => s + c.estimado, 0)
  const ventaActual = d.campaniaGas[0] ? d.campaniaGas.reduce((s, c) => s + c.venta, 0) / d.campaniaGas.length : 0
  const ventaAnterior = d.ahorroGas[1]?.promPond ?? 0
  const ahorroVsAnterior = (ventaAnterior - ventaActual) * 528000
  return `
<p class="intro">Campaña de gas may-2026 a abr-2027: compra PC-KK vs. venta ET, con diferencia y estimado de ingreso mensual.</p>
<div class="grid3" style="margin-bottom:12px">
  <div class="card"><div class="lbl">Diferencia total (suma mensual)</div><div class="big ${diferenciaTotal >= 0 ? 'pos' : 'neg'}">${fmtUsd(diferenciaTotal, '', 0)}</div></div>
  <div class="card"><div class="lbl">Estimado total</div><div class="big">${fmtUsd(estimadoTotal, 'MM')}</div></div>
  <div class="card-a"><div class="lbl">Ahorro vs. campaña anterior (preliminar)</div><div class="big">${fmtUsd(ahorroVsAnterior, 'K', 1)}</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${fmtNum(ventaActual)} us$/MMBtu actual vs. ~${fmtNum(ventaAnterior)} us$/MMBtu campaña anterior</div></div>
</div>
<div class="card" style="padding:14px;overflow-x:auto">
  <table><tr><th>Mes</th><th class="r">Venta ET (us$/MMBtu)</th><th class="r">Compra PC-KK (us$/MMBtu)</th><th class="r">Diferencia (us$)</th><th class="r">Estimado</th></tr>${rows}
  <tr style="background:var(--navy);color:white"><td class="b" style="color:white">TOTAL</td><td colspan="2"></td><td class="r b" style="color:white">${fmtUsd(diferenciaTotal, '', 0)}</td><td class="r b" style="color:white">${fmtUsd(estimadoTotal, 'MM')}</td></tr>
  </table>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Precio promedio ponderado de venta (campaña actual): ${fmtNum(ventaActual)} us$/MMBtu. El "ahorro vs. campaña anterior" usa ${fmtNum(ventaAnterior)} us$/MMBtu (hoja Gas, "Venta gas ET sin Cammesa") como referencia de la campaña previa — confirmar si ese es el precio real de la campaña anterior.</div>
</div>`
}

function buildOtrosIngresos(d: DatosComercial): { html: string; chartJs: string } {
  const a = d.alianza
  const chartMonths = a.porMes.map(m => m.etiqueta)
  const chartGan = a.porMes.map(m => Math.round(m.ganancia * 100) / 100)
  const alianzaRows = a.porMes.map(m => `<tr><td class="b">${esc(m.etiqueta)}</td><td class="r mu">${m.actas}</td><td class="r">${fmtNum(m.m3, 2)}</td><td class="r ${m.ganancia >= 0 ? 'pos' : 'neg'} b">${fmtUsd(m.ganancia, '', 0)}</td></tr>`).join('')
  void alianzaRows

  const cgc = d.cgc
  const cgcLabels = cgc.porMes.map(m => m.etiqueta)
  const cgcValues = cgc.porMes.map(m => Math.round(m.usd * 100) / 100)

  const petro = d.petrominera
  const petroRows = petro.porMes.map(m => `<tr><td class="b">${esc(m.etiqueta)}</td><td class="r">${fmtUsd(m.fee, '', 0)}</td><td class="r">${fmtNum(m.m3, 0)}</td><td class="r">${fmtUsd(m.transporteUsd, '', 0)}</td><td class="r b">${fmtUsd(m.total, '', 0)}</td></tr>`).join('')

  const html = `
<p class="intro">Gestiones comerciales de apoyo — Alianza Petrolera, venta de agua a CGC, CAPEX y Petrominera. Ver el detalle valorizado consolidado en la solapa Resumen.</p>
<div class="st">Alianza Petrolera — Compra/venta gasolina El Tordillo</div>
<p class="intro">Compra/venta de gasolina El Tordillo con Alianza Petrolera — agrupado por mes de entrega (actas con la misma fecha se consolidan).</p>
<div class="grid3" style="margin-bottom:12px">
  <div style="text-align:center" class="card"><div class="lbl">Actas</div><div style="font-size:22px;font-weight:500">${fmtNum(a.actasTotal, 0)}</div></div>
  <div style="text-align:center" class="card"><div class="lbl">Total m³</div><div style="font-size:22px;font-weight:500">${fmtNum(a.m3Total, 1)}</div></div>
  <div style="text-align:center" class="card"><div class="lbl">Ganancia neta</div><div style="font-size:22px;font-weight:500;color:var(--text-success)">${fmtUsd(a.gananciaTotal, '', 0)}</div></div>
</div>
<div class="card" style="padding:16px">
  <div style="position:relative;height:220px"><canvas id="chart-alianza"></canvas></div>
</div>
<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Las actas de nov-dic 2026 repiten volumen sin fecha de acta real — son una proyección a confirmar, no actas firmadas todavía.</div>

<div class="st">Venta de Agua a CGC</div>
<p class="intro">Venta de agua a CGC desde PC-KK — reduce el OPEX de inyección de agua. Acuerdo firmado, plazo 5 años (05-may-2026 a 04-may-2031). Caudal operativo desde octubre 2026.</p>
<div class="grid4" style="margin-bottom:12px">
  <div class="card"><div class="lbl">Precio</div><div class="big">2,01</div><div style="font-size:12px;color:var(--text-secondary)">us$/m³ + IVA</div></div>
  <div class="card"><div class="lbl">Caudal</div><div style="font-size:16px;font-weight:500">300–450</div><div style="font-size:12px;color:var(--text-secondary)">m³/d (prom. 375)</div></div>
  <div class="card-g"><div class="lbl">Ingreso 2026</div><div class="big">${fmtUsd(cgc.ingreso2026, 'K', 1)}</div></div>
  <div class="card-g"><div class="lbl">Ingreso 2027</div><div class="big">${fmtUsd(cgc.ingreso2027, 'K', 1)}</div></div>
</div>
<div class="card" style="padding:16px">
  <div style="position:relative;height:220px"><canvas id="chart-cgc"></canvas></div>
</div>

<div class="st">CAPEX — Mantenimiento y Transporte (ET/LT-PQ)</div>
<p class="intro">Servicio de transporte de petróleo y mantenimiento de oleoducto — ET/LT-PQ. Costo mensual constante durante todo 2026.</p>
<div class="grid4" style="margin-bottom:12px">
  <div class="card"><div class="lbl">Mantenimiento</div><div class="big">${fmtUsd(d.capex.mantenimiento, '', 0)}</div><div style="font-size:12px;color:var(--text-secondary)">us$/mes</div></div>
  <div class="card"><div class="lbl">Transporte</div><div class="big">${fmtUsd(d.capex.transporteUsd, '', 0)}</div><div style="font-size:12px;color:var(--text-secondary)">${fmtNum(d.capex.transporteM3, 0)} m³ × ${fmtNum(d.capex.usdM3)} us$/m³</div></div>
  <div class="card-r"><div class="lbl">Total mensual</div><div class="big">${fmtUsd(d.capex.totalMensual, '', 0)}</div></div>
  <div class="card-r"><div class="lbl">Total anual</div><div class="big">${fmtUsd(d.capex.totalAnual, 'K', 1)}</div></div>
</div>
<div style="font-size:11px;color:var(--text-muted)">Valor mensual constante (US$ ${fmtNum(d.capex.totalMensual, 0)}) × 12 meses = ${fmtUsd(d.capex.totalAnual, 'K', 1)}/año.</div>

<div class="st">Petrominera — Comercialización (ET/LT-PQ)</div>
<p class="intro">Servicio de comercialización y transporte de petróleo — ET/LT-PQ. El fee es fijo (US$ 2.500/mes); el transporte varía mes a mes según volumen real despachado.</p>
<div class="grid3" style="margin-bottom:12px">
  <div class="card"><div class="lbl">Fee mensual</div><div class="big">US$ 2.500</div></div>
  <div class="card"><div class="lbl">Tarifa transporte</div><div class="big">1,20</div><div style="font-size:12px;color:var(--text-secondary)">us$/m³</div></div>
  <div class="card-r"><div class="lbl">Total anual</div><div class="big">${fmtUsd(petro.totalAnual, 'K', 1)}</div></div>
</div>
<div class="card" style="padding:16px;margin-bottom:12px">
  <div style="position:relative;height:200px"><canvas id="chart-petrominera"></canvas></div>
</div>
<div class="card" style="padding:14px;overflow-x:auto">
  <table><tr><th>Mes</th><th class="r">Fee</th><th class="r">Vol. (m³)</th><th class="r">Transporte</th><th class="r">Total</th></tr>${petroRows}</table>
</div>`

  const chartJs = `
new Chart(document.getElementById('chart-alianza'),{
  type:'bar',
  data:{labels:${JSON.stringify(chartMonths)},datasets:[{label:'Ganancia (US$)',data:${JSON.stringify(chartGan)},backgroundColor:${JSON.stringify(chartGan.map(g => (g >= 0 ? '#4aad6e' : '#e05555')))},borderRadius:4}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
});

new Chart(document.getElementById('chart-cgc'),{
  type:'bar',
  data:{labels:${JSON.stringify(cgcLabels)},datasets:[{label:'Ingreso (US$)',data:${JSON.stringify(cgcValues)},backgroundColor:'#2a5ba0',borderRadius:3}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
});

new Chart(document.getElementById('chart-petrominera'),{
  type:'bar',
  data:{labels:${JSON.stringify(petro.porMes.map(m => m.etiqueta))},datasets:[{label:'Total mensual (US$)',data:${JSON.stringify(petro.porMes.map(m => Math.round(m.total * 100) / 100))},backgroundColor:'#1b3f6e',borderRadius:3}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
});`
  return { html, chartJs }
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#1b3f6e;--navy-l:#2a5ba0;--navy-d:#0f2847;
  --green:#4aad6e;--gold:#d4a84b;--red:#e05555;--teal:#2a8a9e;
  --surface-0:#f1f4f9;--surface-1:#e8edf4;--surface-2:#ffffff;
  --text-primary:#1a2235;--text-secondary:#3b4d6b;--text-muted:#8494a7;
  --border:rgba(27,63,110,0.12);--border-strong:rgba(27,63,110,0.25);
  --border-accent:#2a5ba0;--border-success:#4aad6e;--border-danger:#e05555;--border-warning:#d4a84b;
  --bg-accent:rgba(42,91,160,0.08);--bg-success:rgba(74,173,110,0.10);
  --bg-danger:rgba(224,85,85,0.08);--bg-warning:rgba(212,168,75,0.10);
  --text-accent:#1b3f6e;--text-success:#2d7a4a;--text-danger:#c0392b;--text-warning:#9a6c10;
  --fill-accent:#2a5ba0;--fill-success:#4aad6e;--fill-warning:#d4a84b;--fill-danger:#e05555;
  --radius:6px;--font-sans:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;--font-mono:'SFMono-Regular',Consolas,monospace;
}
body{font-family:var(--font-sans);background:var(--surface-0);color:var(--text-primary);font-size:14px}
.hdr{background:linear-gradient(135deg,var(--navy-d),var(--navy));padding:16px 20px 14px;color:white}
.hdr-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.logo{width:30px;height:30px;background:var(--navy-l);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500}
.hdr h1{font-size:18px;font-weight:500}
.hdr p{font-size:12px;color:rgba(255,255,255,.55);margin-top:2px}
.tabs{display:flex;background:var(--surface-2);border-bottom:0.5px solid var(--border);overflow-x:auto}
.tab{flex:0 0 auto;padding:10px 10px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-secondary);font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:var(--font-sans);transition:.15s}
.tab.active{border-bottom-color:var(--border-accent);color:var(--text-accent)}
.tab:hover:not(.active){color:var(--text-primary)}
.content{padding:16px 18px 48px;display:none}
.content.active{display:block}
.card{background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px}
.card-l{background:var(--surface-2);border:0.5px solid var(--border);border-left:3px solid var(--border-accent);border-radius:12px;padding:14px 16px}
.card-g{background:var(--surface-2);border:0.5px solid var(--border);border-left:3px solid var(--border-success);border-radius:12px;padding:14px 16px}
.card-r{background:var(--surface-2);border:0.5px solid var(--border);border-left:3px solid var(--border-danger);border-radius:12px;padding:14px 16px}
.card-a{background:var(--surface-2);border:0.5px solid var(--border);border-left:3px solid var(--border-warning);border-radius:12px;padding:14px 16px}
.st{font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:1.5px;margin:20px 0 10px;padding:8px 14px;background:#dce6f5;border-left:4px solid var(--navy);border-radius:0 6px 6px 0;display:block}
.lbl{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;font-weight:500}
.mono{font-family:var(--font-mono);font-size:12px;background:var(--surface-1);border:0.5px solid var(--border);border-radius:var(--radius);padding:6px 10px;color:var(--text-primary);margin:8px 0}
.intro{color:var(--text-secondary);font-size:13px;line-height:1.7;margin-bottom:16px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.big{font-size:22px;font-weight:500;color:var(--text-primary)}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:5px 8px;color:var(--text-muted);font-weight:500;font-size:11px;border-bottom:0.5px solid var(--border)}
th.r{text-align:right}
td{padding:7px 8px;border-bottom:0.5px solid var(--border);color:var(--text-primary)}
td.r{text-align:right;font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:none}
.pos{color:var(--text-success);font-weight:500}
.neg{color:var(--text-danger);font-weight:500}
.mu{color:var(--text-muted)}
.b{font-weight:600}
.tl-item{display:flex;gap:12px;margin-bottom:12px}
.tl-dot{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:500;flex-shrink:0}
.tl-body{flex:1;background:var(--surface-1);border-radius:8px;padding:10px 14px}
.print-btn{position:fixed;bottom:20px;right:20px;background:var(--navy);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:500;cursor:pointer;font-family:var(--font-sans);display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(27,63,110,0.3);z-index:999}
@media print{
  .tabs{display:none}
  .hdr{background:#1b3f6e!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .content{display:block!important;padding:12px 18px}
  .print-btn{display:none}
  body{background:white}
}
@media (max-width:640px){.grid4{grid-template-columns:1fr 1fr}.grid3{grid-template-columns:1fr 1fr}}
`

export function generarReporteComercialHTML(d: DatosComercial): string {
  const brent = buildBrent(d)
  const areas = buildAreas(d)
  const planGas = buildPlanGas(d)
  const otros = buildOtrosIngresos(d)

  const TABS: TabEntry[] = [
    { key: 'resumen', label: 'Resumen', icon: 'ti-map-pin', html: buildResumen(d), chartJs: null },
    { key: 'brent', label: 'Precios Brent Mensual', icon: 'ti-chart-line', html: brent.html, chartJs: brent.chartJs },
    { key: 'areas', label: 'Precios por Área', icon: 'ti-building-factory', html: areas.html, chartJs: areas.chartJs },
    { key: 'difet', label: 'Diferencial ET', icon: 'ti-trending-up', html: buildDifET(d), chartJs: null },
    { key: 'transporte-tdf', label: 'Transporte TDF→PCKK', icon: 'ti-truck', html: buildTransporteTdf(d), chartJs: null },
    { key: 'acuerdo-pae', label: 'Acuerdo PAE', icon: 'ti-file-text', html: buildAcuerdoPae(d), chartJs: null },
    { key: 'ypf-nov', label: 'Negociación YPF', icon: 'ti-handshake', html: buildYpf(d), chartJs: null },
    { key: 'plangas', label: 'Plan Gas', icon: 'ti-flame', html: planGas.html, chartJs: planGas.chartJs },
    { key: 'ahorrogas', label: 'Ahorro Gas', icon: 'ti-coin', html: buildAhorroGas(d), chartJs: null },
    { key: 'campgas', label: 'Campaña Gas', icon: 'ti-chart-candle', html: buildCampGas(d), chartJs: null },
    { key: 'otros-ingresos', label: 'Otros Ingresos', icon: 'ti-coin', html: otros.html, chartJs: otros.chartJs },
  ]

  const tabBtns = TABS.map((t, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-key="${t.key}" onclick="show('${t.key}',this)"><i class="ti ${t.icon}" style="font-size:13px;vertical-align:-1px;margin-right:4px"></i>${t.label}</button>`).join('\n')
  const tabContents = TABS.map((t, i) => `<div id="sec-${t.key}" class="content${i === 0 ? ' active' : ''}">${t.html}</div>`).join('\n')
  const titles = JSON.stringify(Object.fromEntries(TABS.map(t => [t.key, t.label])))
  const chartBuilders = TABS.filter(t => t.chartJs).map(t => `CHART_BUILDERS['${t.key}']=function(){\n${t.chartJs}\n};`).join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Crown Point — Modelo Comercial</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
<style>${CSS}</style>
</head>
<body>

<button class="print-btn" onclick="window.print()"><i class="ti ti-printer" style="font-size:15px"></i> Imprimir / PDF</button>

<div class="hdr">
  <div class="hdr-top">
    <div class="logo" style="color:white">CP</div>
    <div><div style="font-size:14px;font-weight:500">Crown Point Energía</div><div style="font-size:11px;color:rgba(255,255,255,.5)">Confidencial</div></div>
  </div>
  <h1 id="hdr-title">Modelo de Comercialización</h1>
  <p id="hdr-sub">Resumen consolidado</p>
</div>

<div class="tabs">
${tabBtns}
</div>

${tabContents}

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
const TITLES=${titles};
const CHART_BUILDERS={};
const CHART_BUILT={};

function show(id,btn){
  document.querySelectorAll('.content').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('hdr-title').textContent=TITLES[id];
  if(!CHART_BUILT[id] && CHART_BUILDERS[id]){ CHART_BUILDERS[id](); CHART_BUILT[id]=true; }
}

function goTo(id){
  const btn=document.querySelector('.tab[data-key="'+id+'"]');
  if(btn) show(id,btn);
}

const gestionesSortState={};
function sortGestiones(field){
  const tbody=document.getElementById('tbl-gestiones-body');
  const rows=Array.from(tbody.querySelectorAll('tr'));
  const asc = gestionesSortState[field]=!gestionesSortState[field];
  rows.sort((a,b)=>{
    let va,vb;
    if(field==='total'){ va=parseFloat(a.dataset.total); vb=parseFloat(b.dataset.total); }
    else { va=a.dataset[field].toLowerCase(); vb=b.dataset[field].toLowerCase(); }
    if(va<vb) return asc?-1:1;
    if(va>vb) return asc?1:-1;
    return 0;
  });
  rows.forEach(r=>tbody.appendChild(r));
}

${chartBuilders}
</script>
</body>
</html>
`
}

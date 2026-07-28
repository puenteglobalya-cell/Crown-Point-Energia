import type { DatosProduccion, AreaProduccion, BloqueProduccion } from '@/lib/parsers/produccion'

const ACCENT = '#2a6e3f'

function fmt(n: number, d = 1): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function fmtDelta(n: number, d = 1): string {
  const s = fmt(Math.abs(n), d)
  return n > 0 ? `+${s}` : n < 0 ? `-${s}` : s
}

function pctClass(n: number): string {
  return n > 0 ? 'pos' : n < 0 ? 'neg' : ''
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildTabla(bloque: BloqueProduccion, semana1: number, semana2: number): string {
  const rows = bloque.areas.map((a: AreaProduccion) => `
    <tr>
      <td class="lbl">
        <span class="tag ${a.unidadGestion === 'Operado' ? 'op' : 'nop'}">${a.unidadGestion === 'Operado' ? 'OP' : 'NOP'}</span>
        ${esc(a.area)}
        <span class="prov">${esc(a.provincia)}</span>
      </td>
      <td class="num">${fmt(a.semana1)}</td>
      <td class="num">${fmt(a.semana2)}</td>
      <td class="num ${pctClass(a.delta)}">${fmtDelta(a.deltaPct * 100, 1)}%</td>
      <td class="num muted">${fmt(a.paMes)}</td>
      <td class="num ${pctClass(a.deltaVsPa)}">${fmtDelta(a.deltaVsPa)}</td>
      <td class="num muted">${fmt(a.perdidasSemana2)}</td>
    </tr>`).join('')

  return `
  <table>
    <thead>
      <tr>
        <th>Área</th>
        <th class="num">Sem. ${semana1}</th>
        <th class="num">Sem. ${semana2}</th>
        <th class="num">Δ%</th>
        <th class="num">Plan (mes)</th>
        <th class="num">Δ vs plan</th>
        <th class="num">Pérdidas S${semana2}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td class="lbl">Total</td>
        <td class="num">${fmt(bloque.total.semana1)}</td>
        <td class="num">${fmt(bloque.total.semana2)}</td>
        <td class="num ${pctClass(bloque.total.delta)}">${fmtDelta((bloque.total.delta / (bloque.total.semana1 || 1)) * 100)}%</td>
        <td class="num muted">${fmt(bloque.total.paMes)}</td>
        <td class="num ${pctClass(bloque.total.deltaVsPa)}">${fmtDelta(bloque.total.deltaVsPa)}</td>
        <td class="num muted">${fmt(bloque.total.perdidasSemana2)}</td>
      </tr>
    </tfoot>
  </table>`
}

export function generarReporteProduccionHTML(datos: DatosProduccion): string {
  const { petroleo, gas, serieDiaria, semana1, semana2, rangoFechas } = datos

  const oilDeltaPct = (petroleo.total.delta / (petroleo.total.semana1 || 1)) * 100
  const gasDeltaPct = (gas.total.delta / (gas.total.semana1 || 1)) * 100

  const labels = JSON.stringify(serieDiaria.map(p => {
    const [, m, d] = p.fecha.split('-')
    return `${d}/${m}`
  }))
  const oilSerie = JSON.stringify(serieDiaria.map(p => Math.round(p.oilM3d)))
  const gasSerie = JSON.stringify(serieDiaria.map(p => Math.round(p.gasMm3d)))

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Producción — ${datos.periodo}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:#f4f4f0;color:#1a1a2e;font-size:14px;padding:32px 24px}
  .page{max-width:1040px;margin:0 auto}
  header{margin-bottom:28px;border-bottom:3px solid ${ACCENT};padding-bottom:20px}
  .label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ACCENT};margin-bottom:8px}
  h1{font-family:'Lora',serif;font-size:26px;font-weight:700;margin-bottom:4px}
  .sub{font-size:13px;color:#666;margin-top:4px}

  .stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e2e2dc;border-radius:10px;overflow:hidden;margin-bottom:28px}
  .stat{background:#fff;padding:16px 18px}
  .stat .k{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:6px}
  .stat .v{font-family:'Lora',serif;font-size:22px;font-weight:700}
  .stat .v small{font-size:12px;font-weight:500;color:#888;margin-left:4px}
  .stat .d{font-size:11px;margin-top:4px;font-weight:600}
  .pos{color:#2a6e3f}
  .neg{color:#b33b2e}
  .muted{color:#888}

  .card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:24px;margin-bottom:24px}
  .card-title{font-family:'Lora',serif;font-size:16px;font-weight:600;color:${ACCENT};margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:baseline}
  .card-title span{font-size:11px;font-weight:400;color:#888;font-family:'DM Sans',sans-serif;text-transform:none;letter-spacing:0}

  table{width:100%;border-collapse:collapse;font-size:13px}
  thead tr{background:${ACCENT}0c;border-bottom:2px solid ${ACCENT}30}
  th{padding:9px 10px;text-align:left;font-weight:600;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:#555;white-space:nowrap}
  th.num,td.num{text-align:right}
  td{padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:middle;white-space:nowrap}
  tbody tr:hover td{background:#fafafa}
  td.lbl{font-weight:500;white-space:nowrap}
  td.num{font-variant-numeric:tabular-nums}
  tfoot td{border-top:2px solid #ddd;border-bottom:none;font-weight:700;padding-top:10px}
  .tag{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.04em;padding:1px 5px;border-radius:4px;margin-right:6px}
  .tag.op{background:${ACCENT}18;color:${ACCENT}}
  .tag.nop{background:#88888818;color:#666}
  .prov{color:#999;font-size:11px;font-weight:400;margin-left:6px}

  .ch{height:260px;position:relative}

  footer{margin-top:24px;font-size:11px;color:#999;text-align:center}
  @media print{ body{background:#fff;padding:16px} .card{break-inside:avoid} }
</style>
</head>
<body>
<div class="page">

  <header>
    <div class="label">Crown Point Energía · Resumen de producción</div>
    <h1>${esc(datos.periodo)}</h1>
    <div class="sub">${esc(rangoFechas)}</div>
  </header>

  <div class="stat-row">
    <div class="stat">
      <div class="k">Petróleo · sem. ${semana2}</div>
      <div class="v">${fmt(petroleo.total.semana2, 0)}<small>m³/d</small></div>
      <div class="d ${pctClass(oilDeltaPct)}">${fmtDelta(oilDeltaPct)}% vs sem. ${semana1}</div>
    </div>
    <div class="stat">
      <div class="k">Petróleo vs plan</div>
      <div class="v ${pctClass(petroleo.total.deltaVsPa)}">${fmtDelta(petroleo.total.deltaVsPa, 0)}<small>m³/d</small></div>
      <div class="d muted">plan mes: ${fmt(petroleo.total.paMes, 0)} m³/d</div>
    </div>
    <div class="stat">
      <div class="k">Gas · sem. ${semana2}</div>
      <div class="v">${fmt(gas.total.semana2, 0)}<small>Mm³/d</small></div>
      <div class="d ${pctClass(gasDeltaPct)}">${fmtDelta(gasDeltaPct)}% vs sem. ${semana1}</div>
    </div>
    <div class="stat">
      <div class="k">Gas vs plan</div>
      <div class="v ${pctClass(gas.total.deltaVsPa)}">${fmtDelta(gas.total.deltaVsPa, 0)}<small>Mm³/d</small></div>
      <div class="d muted">plan mes: ${fmt(gas.total.paMes, 0)} Mm³/d</div>
    </div>
  </div>

  ${serieDiaria.length > 1 ? `
  <div class="card">
    <div class="card-title">Evolución diaria <span>petróleo (m³/d) y gas (Mm³/d) · todas las áreas</span></div>
    <div class="ch"><canvas id="cDiaria"></canvas></div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Petróleo — producción 100% <span>${petroleo.unidad}</span></div>
    ${buildTabla(petroleo, semana1, semana2)}
  </div>

  <div class="card">
    <div class="card-title">Gas — producción 100% <span>${gas.unidad}</span></div>
    ${buildTabla(gas, semana1, semana2)}
  </div>

  <footer>Crown Point Energía S.A. · Reporte generado automáticamente a partir del resumen semanal de producción</footer>
</div>

<script>
${serieDiaria.length > 1 ? `
new Chart(document.getElementById('cDiaria'), {
  type: 'line',
  data: {
    labels: ${labels},
    datasets: [
      {
        label: 'Petróleo (m³/d)',
        data: ${oilSerie},
        borderColor: '${ACCENT}',
        backgroundColor: '${ACCENT}20',
        yAxisID: 'y',
        tension: .3, pointRadius: 2, borderWidth: 2, fill: true,
      },
      {
        label: 'Gas (Mm³/d)',
        data: ${gasSerie},
        borderColor: '#8B1A2A',
        backgroundColor: '#8B1A2A10',
        yAxisID: 'y1',
        tension: .3, pointRadius: 2, borderWidth: 2, fill: false,
      },
    ],
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { font: { size: 11 }, usePointStyle: true } } },
    scales: {
      y:  { position: 'left',  title: { display: true, text: 'm³/d',  font: { size: 10 } } },
      y1: { position: 'right', title: { display: true, text: 'Mm³/d', font: { size: 10 } }, grid: { drawOnChartArea: false } },
    },
  },
});` : ''}
</script>
</body>
</html>`
}

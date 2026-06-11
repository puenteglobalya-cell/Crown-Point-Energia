import type { DatosFacturacion, PivotRow } from '@/lib/parsers/facturacion'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fMM(n: number): string {
  const sign = n < 0 ? '−' : ''
  return sign + 'us$ ' + (Math.abs(n) / 1_000_000).toFixed(3).replace('.', ',') + ' MM'
}

function fN(n: number): string {
  if (n === 0) return ''
  return Math.round(n).toLocaleString('es-AR')
}

function fD(n: number, d = 2): string {
  return n.toFixed(d).replace('.', ',')
}

type Linea = DatosFacturacion['lineas'][number]
function precioDerivado(l: Linea): string {
  if (l.es_petroleo && l.cantidad !== 0)
    return fD(l.importe_usd / (l.cantidad * 6.28981), 2) + ' $/bbl'
  if (l.es_gas && l.cantidad !== 0)
    return fD(l.importe_usd / (l.cantidad / 1000 * 35.314), 2) + ' $/MMBTU'
  return ''
}

function enc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function j(v: unknown): string {
  return JSON.stringify(v)
}

function fechaCorta(iso: string): string {
  const parts = iso.split('-')
  return `${parts[2]}/${parts[1]}`
}

// ─── Color palette ────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  'Petróleo':              '#2B6CB0',
  'Gas':                   '#38A169',
  'Impuestos':             '#D69E2E',
  'Ajuste de precio área': '#805AD5',
  'Diferencia de Cambio':  '#A0AEC0',
  'Intereses':             '#DD6B20',
  'Venta de materiales':   '#9F7AEA',
  'Recupero de gastos':    '#718096',
  'Otros':                 '#CBD5E0',
}

const CAT_ORDER  = ['Petróleo','Gas','Impuestos','Ajuste de precio área','Diferencia de Cambio','Intereses','Venta de materiales','Recupero de gastos','Otros']
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
    const isNeg = catTotal < 0
    const color = isNeg ? ' style="color:#C53030"' : ''

    html += `<tr class="cat-header"${color}>` +
      `<td class="cat-label" colspan="2">${enc(cat)}</td>` +
      meses.map(m => `<td class="num subtotal">${fN(catTotals[m])}</td>`).join('') +
      `<td class="num subtotal total-col">${fN(catTotal)}</td></tr>`

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
          meses.map(m => `<td class="num">${fN(r.por_mes[m] ?? 0)}</td>`).join('') +
          `<td class="num total-col">${fN(rowTotal)}</td></tr>`
      }
    }
  }

  html += `<tr class="grand-total"><td colspan="2">TOTAL NETO</td>` +
    meses.map(m => `<td class="num">${fN(grandTotals[m])}</td>`).join('') +
    `<td class="num total-col">${fN(grandTotal)}</td></tr>`
  return html
}

// ─── Fiscal detail table (SSR) ────────────────────────────────────────────────

function buildFiscalTableHTML(
  meses: string[],
  mes_labels: Record<string, string>,
  lineas: DatosFacturacion['lineas']
): string {
  let html = ''
  let globalIdx = 0

  for (const mes of meses) {
    const grupo = lineas.filter(l => l.mes === mes)
    if (grupo.length === 0) continue

    const label = mes_labels[mes] ?? mes
    const totalUSD = grupo.reduce((s, l) => s + l.importe_usd, 0)
    const totalARS = grupo.reduce((s, l) => s + l.importe_ars, 0)

    html += `<tr class="fiscal-mes-header"><td colspan="17">${enc(label)}</td></tr>`

    for (const l of grupo) {
      const idx = lineas.indexOf(l)
      const isNeg = l.importe_usd < 0
      const ncStyle = isNeg ? ' style="color:#C53030"' : ''
      const precio = precioDerivado(l)
      const catColor = CAT_COLORS[l.categoria] ?? '#7A8099'

      html += `<tr class="fiscal-row" data-idx="${idx}"${ncStyle}>` +
        `<td class="dt">${fechaCorta(l.fecha)}</td>` +
        `<td class="comp mono">${enc(l.comprobante)}</td>` +
        `<td class="cli" title="${enc(l.cliente)}">${enc(l.cliente)}</td>` +
        `<td class="art mono">${enc(l.art_codigo)}</td>` +
        `<td class="desc" title="${enc(l.art_desc)}">${enc(l.art_desc)}</td>` +
        `<td class="tipo-col" style="color:${catColor}">${enc(l.categoria)}</td>` +
        `<td class="blq">${enc(l.bloque)}</td>` +
        `<td class="num">${fN(l.cantidad)}</td>` +
        `<td class="num">${fD(l.precio_neto_usd_u, 4)}</td>` +
        `<td class="num precio-col">${enc(precio)}</td>` +
        `<td class="num${isNeg ? ' nc-val' : ''}">${fN(l.importe_usd)}</td>` +
        `<td class="num ars-col">${fN(l.importe_ars)}</td>` +
        `<td class="num tc-col">${l.tc > 0 ? fN(l.tc) : ''}</td>` +
        (l.es_petroleo
          ? `<td class="manual-val"></td><td class="manual-val"></td><td class="manual-val"></td><td class="manual-val"></td>`
          : `<td class="na-cell">—</td><td class="na-cell">—</td><td class="na-cell">—</td><td class="na-cell">—</td>`) +
        `</tr>`
      globalIdx++
    }

    html += `<tr class="fiscal-subtotal">` +
      `<td colspan="9">Subtotal ${enc(label)}</td>` +
      `<td></td>` +
      `<td class="num">${fN(totalUSD)}</td>` +
      `<td class="num ars-col">${fN(totalARS)}</td>` +
      `<td colspan="5"></td>` +
      `</tr>`
  }

  return html
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generarReporteFacturacionHTML(datos: DatosFacturacion): string {
  const { meses, mes_labels, pivot, resumen, periodo, lineas, periodo_desde, periodo_hasta } = datos

  const fechaGen = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const filterChips = meses
    .map(m => `<button class="chip active" data-mes="${m}" onclick="toggleMes('${enc(m)}',this)">${enc(mes_labels[m] ?? m)}</button>`)
    .join('')

  const mesHeaders = meses
    .map(m => `<th class="num-h mes-col" data-mes="${m}">${enc(mes_labels[m] ?? m)}</th>`)
    .join('')

  const pivotRows  = buildPivotHTML(meses, mes_labels, pivot)
  const fiscalRows = buildFiscalTableHTML(meses, mes_labels, lineas)

  // Client summary
  const clienteMap: Record<string, number> = {}
  for (const l of lineas) clienteMap[l.cliente] = (clienteMap[l.cliente] ?? 0) + l.importe_usd
  const clienteRows = Object.entries(clienteMap)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `<tr><td>${enc(c || '—')}</td><td class="num">${fN(v)}</td></tr>`)
    .join('')
  const showClientes = Object.keys(clienteMap).length > 1

  // Chart data
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

  const ncLineas = lineas.filter(l => l.importe_usd < 0)

  // All unique clients, bloques, articles and categories for datalist / selects
  const allClientes   = [...new Set(lineas.map(l => l.cliente).filter(Boolean))].sort()
  const allBloques    = [...new Set(lineas.map(l => l.bloque).filter(Boolean))].sort()
  const allCategorias = [...new Set(lineas.map(l => l.categoria))].sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  const allArticulos = [...new Map(lineas.map(l => [l.art_codigo, l.art_desc])).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))

  // Pre-compute manual data rows
  const petManualRows = lineas.map((l, i) => ({ l, i })).filter(({ l }) => l.es_petroleo)
  const ncManualRows  = lineas.map((l, i) => ({ l, i })).filter(({ l }) => l.importe_usd < 0)

  const petManualHTML = petManualRows.map(({ l, i }) =>
    `<tr>` +
    `<td class="manual-info">${fechaCorta(l.fecha)}</td>` +
    `<td class="manual-info mono">${enc(l.comprobante)}</td>` +
    `<td class="manual-info" title="${enc(l.cliente)}">${enc(l.cliente)}</td>` +
    `<td class="manual-info mono">${enc(l.art_codigo)}</td>` +
    `<td><input class="m-input" type="text" data-idx="${i}" data-field="cert" placeholder="Certificado"></td>` +
    `<td><input class="m-input" type="text" data-idx="${i}" data-field="api" placeholder="°API"></td>` +
    `<td><input class="m-input" type="text" data-idx="${i}" data-field="buque" placeholder="Nombre buque"></td>` +
    `<td><input class="m-input" type="text" data-idx="${i}" data-field="fecha_emb" placeholder="DD/MM/AAAA"></td>` +
    `</tr>`
  ).join('')

  const ncManualHTML = ncManualRows.map(({ l, i }) =>
    `<tr>` +
    `<td class="manual-info">${fechaCorta(l.fecha)}</td>` +
    `<td class="manual-info mono">${enc(l.comprobante)}</td>` +
    `<td class="manual-info mono">${enc(l.art_codigo)}</td>` +
    `<td class="manual-info num">${fN(l.importe_usd)}</td>` +
    `<td><input class="m-input" type="text" data-idx="${i}" data-field="aplica_a" placeholder="FA 0009-…"></td>` +
    `</tr>`
  ).join('')

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
.page{max-width:1540px;margin:0 auto;padding:28px 20px}
/* KPIs */
.kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{background:#fff;border-radius:10px;padding:18px 20px;border:1px solid #E8EAEF}
.kpi-label{font-size:11px;color:#7A8099;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px}
.kpi-value{font-size:17px;font-family:'Lora',serif;font-weight:700;letter-spacing:-.02em;color:#14172E;line-height:1.2}
.kpi-value.negative{color:#C53030}
.kpi-sub{font-size:11px;color:#7A8099;margin-top:3px}
/* Filter bar */
.filter-bar{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:14px 20px;margin-bottom:20px;display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.filter-label{font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em;margin-right:4px}
.chip{font-size:12px;padding:5px 12px;border-radius:20px;border:1.5px solid #E8EAEF;background:#F4F5F8;color:#7A8099;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.chip.active{background:#14172E;color:#fff;border-color:#14172E}
.chip-ctrl{font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid #E8EAEF;background:#fff;color:#7A8099;cursor:pointer;margin-left:4px}
/* Section */
.section{background:#fff;border:1px solid #E8EAEF;border-radius:10px;padding:20px 24px;margin-bottom:20px}
.section-title{font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #E8EAEF;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.section-badge{font-size:10px;background:#F0F2F6;border-radius:10px;padding:2px 8px;text-transform:none;letter-spacing:0;color:#A0A8C0;font-weight:500}
/* Pivot table */
table.pivot{border-collapse:collapse;width:100%;font-size:12px}
table.pivot th{padding:7px 10px;text-align:left;font-weight:600;font-size:11px;color:#7A8099;background:#F8F9FB;border-bottom:2px solid #E8EAEF;white-space:nowrap}
table.pivot td{padding:6px 10px;border-bottom:1px solid #F0F2F6;vertical-align:middle}
table.pivot .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
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
/* Fiscal filters */
.fiscal-filter-bar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #E8EAEF}
.fiscal-filter-bar input[type=text]{font-family:'DM Sans',sans-serif;font-size:12px;padding:6px 10px;border:1.5px solid #E8EAEF;border-radius:6px;min-width:220px;color:#14172E;outline:none}
.fiscal-filter-bar input[type=text]:focus{border-color:#14172E}
.fiscal-filter-bar select{font-family:'DM Sans',sans-serif;font-size:12px;padding:6px 10px;border:1.5px solid #E8EAEF;border-radius:6px;color:#14172E;outline:none;background:#fff}
.btn-clear{font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #E8EAEF;background:#fff;color:#7A8099;cursor:pointer}
.fiscal-count{font-size:11px;color:#7A8099;margin-left:auto}
/* Tipo multi-select dropdown */
.tipo-dd{position:relative;display:inline-block}
.tipo-dd-btn{font-family:'DM Sans',sans-serif;font-size:12px;padding:6px 10px;border:1.5px solid #E8EAEF;border-radius:6px;color:#14172E;background:#fff;cursor:pointer;white-space:nowrap;min-width:150px;text-align:left}
.tipo-dd-btn:hover,.tipo-dd-btn.open{border-color:#14172E}
.tipo-dd-panel{display:none;position:absolute;top:calc(100% + 4px);left:0;background:#fff;border:1.5px solid #E8EAEF;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:200;min-width:210px;padding:4px 0}
.tipo-dd-panel.open{display:block}
.tipo-dd-item{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:12px;color:#14172E}
.tipo-dd-item:hover{background:#F4F5F8}
.tipo-dd-item input[type=checkbox]{width:13px;height:13px;cursor:pointer;accent-color:#14172E;flex-shrink:0}
.tipo-dd-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.tipo-dd-footer{display:flex;gap:6px;padding:6px 12px;border-top:1px solid #E8EAEF;margin-top:2px}
.tipo-dd-footer button{font-size:11px;padding:3px 8px;border-radius:4px;border:1px solid #E8EAEF;background:#F4F5F8;color:#7A8099;cursor:pointer}
/* Fiscal detail table */
table.fiscal{border-collapse:collapse;width:100%;font-size:11.5px}
table.fiscal th{padding:7px 8px;text-align:left;font-weight:600;font-size:10.5px;color:#7A8099;background:#F8F9FB;border-bottom:2px solid #E8EAEF;white-space:nowrap;position:sticky;top:0;z-index:1}
table.fiscal th.sortable{cursor:pointer;user-select:none}
table.fiscal th.sortable:hover{background:#EFF1F5;color:#14172E}
table.fiscal th .sort-icon{display:inline-block;margin-left:3px;opacity:.4;font-size:9px}
table.fiscal th.sort-asc .sort-icon::after{content:'▲';opacity:1}
table.fiscal th.sort-desc .sort-icon::after{content:'▼';opacity:1}
table.fiscal th.num-h{text-align:right}
table.fiscal td{padding:5px 8px;border-bottom:1px solid #F3F4F8;vertical-align:middle}
table.fiscal .num{text-align:right;font-variant-numeric:tabular-nums;font-family:'DM Sans',sans-serif;white-space:nowrap}
table.fiscal .mono{font-family:monospace;font-size:11px;letter-spacing:-.01em}
table.fiscal .dt{white-space:nowrap;color:#7A8099}
table.fiscal .cli{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
table.fiscal .desc{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#4A5568}
table.fiscal .blq{font-weight:600;font-size:11px;white-space:nowrap}
table.fiscal .tipo-col{font-size:11px;font-weight:500;white-space:nowrap}
table.fiscal .ars-col{color:#7A8099}
table.fiscal .tc-col{color:#7A8099;font-size:11px}
table.fiscal .precio-col{color:#2B6CB0;font-size:11px;white-space:nowrap}
table.fiscal .nc-val{color:#C53030}
table.fiscal .editable-cell{background:#FFFBEB;border:1px dashed #D69E2E;border-radius:3px;min-width:70px;cursor:text;color:#744210}
table.fiscal .editable-cell:empty::before{content:attr(data-placeholder);color:#C8CCDA;font-style:italic}
table.fiscal .editable-cell:focus{outline:2px solid #D69E2E;background:#FFF9E6;border-color:transparent}
table.fiscal .na-cell{color:#C8CCDA;text-align:center}
/* Manual data section */
.m-input{font-family:'DM Sans',sans-serif;font-size:11.5px;padding:4px 7px;border:1.5px solid #E8EAEF;border-radius:4px;width:100%;background:#FFFBEB;color:#744210}
.m-input:focus{outline:none;border-color:#D69E2E;background:#FFF9E6}
.manual-info{color:#4A5568;font-size:11.5px}
.manual-val{color:#744210;font-size:11.5px;white-space:nowrap}
.aplica-tag{font-size:10px;color:#7A8099;background:#F0F2F6;border-radius:3px;padding:1px 5px;margin-left:4px;white-space:nowrap}
.manual-section-header{cursor:pointer;user-select:none}
.manual-section-header:hover{opacity:.85}
table.fiscal .fiscal-mes-header td{background:#14172E;color:#fff;font-weight:700;font-size:12px;letter-spacing:.04em;padding:8px 10px;text-transform:uppercase}
table.fiscal .fiscal-subtotal td{background:#F8F9FB;font-weight:700;font-size:12px;border-top:2px solid #E8EAEF;border-bottom:2px solid #E8EAEF}
table.fiscal .fiscal-subtotal .num{color:#14172E}
/* Other tables */
table.detail{border-collapse:collapse;width:100%;font-size:12px}
table.detail th{padding:6px 10px;text-align:left;font-size:11px;color:#7A8099;background:#F8F9FB;border-bottom:1.5px solid #E8EAEF}
table.detail td{padding:5px 10px;border-bottom:1px solid #F0F2F6}
table.detail .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
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
  .filter-bar,.fiscal-filter-bar,.export-bar,.manual-section-header+*{display:none!important}
  .section,.kpi{break-inside:avoid}
  .charts-grid{break-inside:avoid}
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
    <span class="filter-label">Mes</span>
    ${filterChips}
    <button class="chip-ctrl" onclick="toggleAll(true)">Todos</button>
    <button class="chip-ctrl" onclick="toggleAll(false)">Ninguno</button>
  </div>

  <!-- Pivot -->
  <div class="section">
    <div class="section-title">
      Resumen por Categoría y Bloque · us$
      <span class="section-badge">responde al filtro de mes</span>
    </div>
    <div style="overflow-x:auto">
      <table class="pivot" id="pivot-table">
        <thead>
          <tr>
            <th style="min-width:130px">Categoría</th>
            <th style="min-width:70px">Bloque</th>
            ${mesHeaders}
            <th class="num-h total-col" style="min-width:110px">Total</th>
          </tr>
        </thead>
        <tbody id="pivot-body">${pivotRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Charts -->
  <div class="charts-grid">
    <div class="chart-card">
      <div class="section-title">Facturación mensual · us$</div>
      <canvas id="barChart" height="190"></canvas>
    </div>
    <div class="chart-card">
      <div class="section-title">Mix por categoría</div>
      <canvas id="donutChart" height="190"></canvas>
    </div>
  </div>

  <!-- Datos Manuales -->
  <div class="section" id="manual-section">
    <div class="section-title manual-section-header" onclick="toggleManualSection()">
      Datos Manuales
      <span class="section-badge" id="manual-toggle-badge">▶ expandir</span>
    </div>
    <div id="manual-body" style="display:none">
      ${petManualHTML.length > 0 ? `
      <div style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Embarques (Petróleo)</div>
        <div style="overflow-x:auto">
          <table class="fiscal" id="manual-pet-table">
            <thead><tr>
              <th style="min-width:46px">Fecha</th>
              <th style="min-width:140px">Comprobante</th>
              <th style="min-width:150px">Cliente</th>
              <th style="min-width:85px">Artículo</th>
              <th style="min-width:90px;background:#FFFBEB">Certificado</th>
              <th style="min-width:55px;background:#FFFBEB">°API</th>
              <th style="min-width:120px;background:#FFFBEB">Buque</th>
              <th style="min-width:100px;background:#FFFBEB">Fecha Emb.</th>
            </tr></thead>
            <tbody>${petManualHTML}</tbody>
          </table>
        </div>
      </div>` : ''}
      ${ncManualHTML.length > 0 ? `
      <div style="margin-bottom:18px">
        <div style="font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Notas de Crédito / Débito</div>
        <div style="overflow-x:auto">
          <table class="fiscal" id="manual-nc-table">
            <thead><tr>
              <th style="min-width:46px">Fecha</th>
              <th style="min-width:140px">Comprobante</th>
              <th style="min-width:85px">Artículo</th>
              <th class="num-h" style="min-width:115px">Importe USD</th>
              <th style="min-width:180px;background:#FFFBEB">Aplica a</th>
            </tr></thead>
            <tbody>${ncManualHTML}</tbody>
          </table>
        </div>
      </div>` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-top:12px">
        <button id="save-manual-btn" class="btn-exp btn-primary" style="padding:8px 20px;font-size:13px" onclick="guardarManual()">Guardar y aplicar</button>
      </div>
    </div>
  </div>

  <!-- Fiscal detail -->
  <div class="section">
    <div class="section-title">
      Detalle Fiscal por Comprobante
      <span class="section-badge">Certificado · °API · Buque editables en Datos Manuales</span>
      <span class="section-badge">Un comprobante puede tener múltiples artículos</span>
    </div>

    <div class="fiscal-filter-bar">
      <span class="filter-label">Filtrar</span>
      <input type="text" id="clienteSearch" placeholder="Buscar cliente…" oninput="renderFiscal()" list="clientes-list">
      <datalist id="clientes-list">
        ${allClientes.map(c => `<option value="${enc(c)}">`).join('')}
      </datalist>
      <select id="bloqueSelect" onchange="renderFiscal()">
        <option value="">Todos los bloques</option>
        ${allBloques.map(b => `<option value="${enc(b)}">${enc(b)}</option>`).join('')}
      </select>
      <div class="tipo-dd" id="tipoDd">
        <button class="tipo-dd-btn" id="tipoBtn" onclick="toggleTipoDd(event)">Todos los tipos ▾</button>
        <div class="tipo-dd-panel" id="tipoDdPanel">
          ${allCategorias.map(c => `<label class="tipo-dd-item"><input type="checkbox" class="tipo-cb" value="${enc(c)}" checked onchange="onTipoCbChange()"><span class="tipo-dd-dot" style="background:${CAT_COLORS[c] ?? '#CBD5E0'}"></span>${enc(c)}</label>`).join('')}
          <div class="tipo-dd-footer">
            <button onclick="toggleAllTipos(true)">Todos</button>
            <button onclick="toggleAllTipos(false)">Ninguno</button>
          </div>
        </div>
      </div>
      <select id="articuloSelect" onchange="renderFiscal()">
        <option value="">Todos los artículos</option>
        ${allArticulos.map(([cod, desc]) => `<option value="${enc(cod)}">${enc(cod)}${desc ? ' — ' + enc(desc.slice(0,40)) : ''}</option>`).join('')}
      </select>
      <select id="mesSelect" onchange="renderFiscal()">
        <option value="">Todos los meses</option>
        ${meses.map(m => `<option value="${m}">${enc(mes_labels[m] ?? m)}</option>`).join('')}
      </select>
      <button class="btn-clear" onclick="clearFiscalFilters()">Limpiar</button>
      <span class="fiscal-count" id="fiscal-count"></span>
    </div>

    <div style="overflow-x:auto">
      <table class="fiscal" id="fiscal-table">
        <thead>
          <tr>
            <th class="sortable" data-col="fecha" style="min-width:46px">Fecha<span class="sort-icon"></span></th>
            <th class="sortable" data-col="comprobante" style="min-width:140px">Comprobante<span class="sort-icon"></span></th>
            <th class="sortable" data-col="cliente" style="min-width:150px">Cliente<span class="sort-icon"></span></th>
            <th style="min-width:85px">Artículo</th>
            <th style="min-width:200px">Descripción</th>
            <th style="min-width:100px">Tipo</th>
            <th style="min-width:50px">Bloque</th>
            <th class="num-h sortable" data-col="cantidad" style="min-width:80px">Cantidad<span class="sort-icon"></span></th>
            <th class="num-h" style="min-width:80px">P.Neto USD/u</th>
            <th class="num-h" style="min-width:95px">Precio</th>
            <th class="num-h sortable" data-col="importe_usd" style="min-width:115px">Total Neto USD<span class="sort-icon"></span></th>
            <th class="num-h ars-col sortable" data-col="importe_ars" style="min-width:125px">Total Neto ARS<span class="sort-icon"></span></th>
            <th class="num-h tc-col sortable" data-col="tc" style="min-width:60px">TC<span class="sort-icon"></span></th>
            <th style="min-width:90px;background:#FFFBEB">Certificado</th>
            <th style="min-width:55px;background:#FFFBEB">°API</th>
            <th style="min-width:120px;background:#FFFBEB">Buque</th>
            <th style="min-width:100px;background:#FFFBEB">Fecha emb.</th>
          </tr>
        </thead>
        <tbody id="fiscal-body">${fiscalRows}</tbody>
      </table>
    </div>
  </div>

  ${showClientes ? `
  <div class="section">
    <div class="section-title">Resumen por Cliente · us$</div>
    <table class="detail">
      <thead><tr><th>Cliente</th><th class="num">Importe neto us$</th></tr></thead>
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
var CAT_ORDER       = ${j(CAT_ORDER)};
var CAT_COLORS      = ${j(CAT_COLORS)};
var ALL_CATEGORIAS  = ${j(allCategorias)};

var activeMeses = new Set(MESES);
var activeTipos = new Set(ALL_CATEGORIAS);
var sortState   = { col: null, dir: 1 };
var manualData  = {};
var PERIODO_DESDE = '${periodo_desde}';
var MANUAL_KEY    = 'cpe_fm_' + PERIODO_DESDE;

// ── Formatters ────────────────────────────────────────────────────────────────
function fN(n) {
  if (!n && n !== 0) return '';
  var v = Math.round(n);
  if (v === 0) return '';
  return v.toLocaleString('es-AR');
}
function fD(n, d) { return n.toFixed(d||2).replace('.',','); }
function fechaCorta(iso) { var p=iso.split('-'); return p[2]+'/'+p[1]; }
function enc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function computarPrecio(l) {
  if (l.es_petroleo && l.cantidad !== 0)
    return fD(l.importe_usd / (l.cantidad * 6.28981), 2) + ' $/bbl';
  if (l.es_gas && l.cantidad !== 0)
    return fD(l.importe_usd / (l.cantidad / 1000 * 35.314), 2) + ' $/MMBTU';
  return '';
}

// ── Tipo multi-select dropdown ────────────────────────────────────────────────
function toggleTipoDd(e) {
  e.stopPropagation();
  var panel = document.getElementById('tipoDdPanel');
  var btn   = document.getElementById('tipoBtn');
  var open  = panel.classList.toggle('open');
  btn.classList.toggle('open', open);
}
document.addEventListener('click', function(e) {
  var dd = document.getElementById('tipoDd');
  if (dd && !dd.contains(e.target)) {
    document.getElementById('tipoDdPanel').classList.remove('open');
    document.getElementById('tipoBtn').classList.remove('open');
  }
});
function onTipoCbChange() {
  activeTipos = new Set();
  document.querySelectorAll('.tipo-cb:checked').forEach(function(cb){ activeTipos.add(cb.value); });
  updateTipoBtn();
  renderFiscal();
  updateDonutChart();
}
function toggleAllTipos(checked) {
  document.querySelectorAll('.tipo-cb').forEach(function(cb){ cb.checked = checked; });
  activeTipos = checked ? new Set(ALL_CATEGORIAS) : new Set();
  updateTipoBtn();
  renderFiscal();
  updateDonutChart();
}
function updateTipoBtn() {
  var btn = document.getElementById('tipoBtn');
  if (!btn) return;
  var allChecked = activeTipos.size === ALL_CATEGORIAS.length;
  btn.textContent = (allChecked ? 'Todos los tipos' : activeTipos.size + ' tipo' + (activeTipos.size !== 1 ? 's' : '')) + ' ▾';
}

// ── Month filter (global chips) ───────────────────────────────────────────────
function toggleMes(mes, btn) {
  if (activeMeses.has(mes)) { activeMeses.delete(mes); btn.classList.remove('active'); }
  else                      { activeMeses.add(mes);    btn.classList.add('active'); }
  renderPivot(); renderFiscal(); updateBarChart(); updateDonutChart();
}
function toggleAll(show) {
  MESES.forEach(function(m){ show ? activeMeses.add(m) : activeMeses.delete(m); });
  document.querySelectorAll('.chip[data-mes]').forEach(function(c){
    show ? c.classList.add('active') : c.classList.remove('active');
  });
  renderPivot(); renderFiscal(); updateBarChart(); updateDonutChart();
}

// ── Pivot re-render ───────────────────────────────────────────────────────────
function renderPivot() {
  var filtered = MESES.filter(function(m){ return activeMeses.has(m); });
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
  var byCat={};
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
    var isNeg=catTotal<0, col=isNeg?' style="color:#C53030"':'';
    html+='<tr class="cat-header"'+col+'><td class="cat-label" colspan="2">'+cat+'</td>'+
      filtered.map(function(m){return '<td class="num subtotal">'+fN(catTotals[m])+'</td>';}).join('')+
      '<td class="num subtotal total-col">'+fN(catTotal)+'</td></tr>';
    if(rows.length>1||rows[0].bloque!=='Varios'){
      rows.forEach(function(r){
        var rTotal=filtered.reduce(function(s,m){return s+(r.por_mes[m]||0);},0);
        if(!rTotal) return;
        html+='<tr class="detail-row"'+col+'><td></td><td class="bloque-label">'+r.bloque+'</td>'+
          filtered.map(function(m){return '<td class="num">'+(r.por_mes[m]?fN(r.por_mes[m]):'')+'</td>';}).join('')+
          '<td class="num total-col">'+fN(rTotal)+'</td></tr>';
      });
    }
  });
  html+='<tr class="grand-total"><td colspan="2">TOTAL NETO</td>'+
    filtered.map(function(m){return '<td class="num">'+fN(gTotals[m])+'</td>';}).join('')+
    '<td class="num total-col">'+fN(gTotal)+'</td></tr>';
  document.getElementById('pivot-body').innerHTML=html;
}

// ── Manual data helpers ───────────────────────────────────────────────────────
function collectManualFromForm() {
  document.querySelectorAll('#manual-pet-table .m-input').forEach(function(inp) {
    var idx   = inp.getAttribute('data-idx');
    var field = inp.getAttribute('data-field');
    if (idx === null || !field) return;
    if (!manualData[idx]) manualData[idx] = {};
    manualData[idx][field] = inp.value.trim();
  });
  document.querySelectorAll('#manual-nc-table .m-input').forEach(function(inp) {
    var idx   = inp.getAttribute('data-idx');
    var field = inp.getAttribute('data-field');
    if (idx === null || !field) return;
    if (!manualData[idx]) manualData[idx] = {};
    manualData[idx][field] = inp.value.trim();
  });
}

function saveManualData() {
  collectManualFromForm();
}

function guardarManual() {
  collectManualFromForm();
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify(manualData)); } catch(e) {}
  renderFiscal();
  var btn = document.getElementById('save-manual-btn');
  if (btn) {
    btn.textContent = '✓ Guardado';
    setTimeout(function(){ btn.textContent = 'Guardar y aplicar'; }, 2000);
  }
}

function loadManualFromStorage() {
  try {
    var raw = localStorage.getItem(MANUAL_KEY);
    if (!raw) return;
    var saved = JSON.parse(raw);
    if (typeof saved !== 'object' || !saved) return;
    manualData = saved;
    // Pre-fill petroleum inputs
    document.querySelectorAll('#manual-pet-table .m-input').forEach(function(inp) {
      var idx   = inp.getAttribute('data-idx');
      var field = inp.getAttribute('data-field');
      if (idx && field && manualData[idx] && manualData[idx][field]) {
        inp.value = manualData[idx][field];
      }
    });
    // Pre-fill NC inputs
    document.querySelectorAll('#manual-nc-table .m-input').forEach(function(inp) {
      var idx   = inp.getAttribute('data-idx');
      var field = inp.getAttribute('data-field');
      if (idx && field && manualData[idx] && manualData[idx][field]) {
        inp.value = manualData[idx][field];
      }
    });
  } catch(e) {}
}

function toggleManualSection() {
  var body  = document.getElementById('manual-body');
  var badge = document.getElementById('manual-toggle-badge');
  if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (badge) badge.textContent = open ? '▶ expandir' : '▼ colapsar';
}

// ── Fiscal table filters ──────────────────────────────────────────────────────
function clearFiscalFilters() {
  document.getElementById('clienteSearch').value = '';
  document.getElementById('bloqueSelect').value = '';
  document.getElementById('articuloSelect').value = '';
  document.getElementById('mesSelect').value = '';
  activeTipos = new Set(ALL_CATEGORIAS);
  document.querySelectorAll('.tipo-cb').forEach(function(cb){ cb.checked = true; });
  updateTipoBtn();
  sortState = { col: null, dir: 1 };
  document.querySelectorAll('#fiscal-table th.sortable').forEach(function(th){
    th.classList.remove('sort-asc','sort-desc');
  });
  renderFiscal();
  updateDonutChart();
}

// ── Sorting ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('#fiscal-table th.sortable').forEach(function(th) {
    th.addEventListener('click', function() {
      var col = th.getAttribute('data-col');
      if (sortState.col === col) {
        sortState.dir *= -1;
      } else {
        sortState.col = col;
        sortState.dir = 1;
      }
      document.querySelectorAll('#fiscal-table th.sortable').forEach(function(h){
        h.classList.remove('sort-asc','sort-desc');
      });
      th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
      renderFiscal();
    });
  });
});

// ── Fiscal render ─────────────────────────────────────────────────────────────
function renderFiscal() {
  saveManualData();

  var clienteQ  = (document.getElementById('clienteSearch').value || '').toLowerCase().trim();
  var bloqueQ   = document.getElementById('bloqueSelect').value || '';
  var articuloQ = document.getElementById('articuloSelect').value || '';
  var mesQ      = document.getElementById('mesSelect').value || '';

  // Determine active months: both global chips AND local dropdown
  var mesesActivos = MESES.filter(function(m){
    if (!activeMeses.has(m)) return false;
    if (mesQ && m !== mesQ) return false;
    return true;
  });

  // Gather matching lines
  var lineas = LINEAS.filter(function(l) {
    if (mesesActivos.indexOf(l.mes) < 0) return false;
    if (!activeTipos.has(l.categoria)) return false;
    if (clienteQ && l.cliente.toLowerCase().indexOf(clienteQ) < 0) return false;
    if (bloqueQ && l.bloque !== bloqueQ) return false;
    if (articuloQ && l.art_codigo !== articuloQ) return false;
    return true;
  });

  // Sort if needed
  if (sortState.col) {
    lineas = lineas.slice().sort(function(a, b) {
      var va = a[sortState.col], vb = b[sortState.col];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * sortState.dir;
      if (va > vb) return  1 * sortState.dir;
      return 0;
    });
  }

  // Update count
  var countEl = document.getElementById('fiscal-count');
  if (countEl) countEl.textContent = lineas.length + ' línea' + (lineas.length!==1?'s':'');

  // If sorting, render flat (no month groups); otherwise group by month
  var html = '';
  if (sortState.col) {
    // Flat sorted view
    var totalUSD = 0, totalARS = 0;
    lineas.forEach(function(l) {
      var idx = LINEAS.indexOf(l);
      var isNeg = l.importe_usd < 0;
      var ncS  = isNeg ? ' style="color:#C53030"' : '';
      var saved = manualData[idx]||{};
      totalUSD += l.importe_usd; totalARS += l.importe_ars;
      html += rowHTML(l, idx, ncS, saved);
    });
    if (lineas.length > 0) {
      html += '<tr class="fiscal-subtotal"><td colspan="9">Total filtrado</td>' +
        '<td></td>' +
        '<td class="num">'+fN(totalUSD)+'</td>' +
        '<td class="num ars-col">'+fN(totalARS)+'</td>' +
        '<td colspan="5"></td></tr>';
    }
  } else {
    // Grouped by month
    var byMes = {};
    mesesActivos.forEach(function(m){ byMes[m] = []; });
    lineas.forEach(function(l){ if(byMes[l.mes]) byMes[l.mes].push(l); });
    mesesActivos.forEach(function(mes) {
      var grupo = byMes[mes];
      if (!grupo || !grupo.length) return;
      var label = MES_LABELS[mes]||mes;
      var totalUSD = grupo.reduce(function(s,l){return s+l.importe_usd;},0);
      var totalARS = grupo.reduce(function(s,l){return s+l.importe_ars;},0);
      html += '<tr class="fiscal-mes-header"><td colspan="17">'+enc(label)+'</td></tr>';
      grupo.forEach(function(l) {
        var idx = LINEAS.indexOf(l);
        var isNeg = l.importe_usd < 0;
        var ncS  = isNeg ? ' style="color:#C53030"' : '';
        var saved = manualData[idx]||{};
        html += rowHTML(l, idx, ncS, saved);
      });
      html += '<tr class="fiscal-subtotal"><td colspan="9">Subtotal '+enc(label)+'</td>' +
        '<td></td>' +
        '<td class="num">'+fN(totalUSD)+'</td>' +
        '<td class="num ars-col">'+fN(totalARS)+'</td>' +
        '<td colspan="5"></td></tr>';
    });
  }

  document.getElementById('fiscal-body').innerHTML = html;
}

function rowHTML(l, idx, ncS, saved) {
  var precio = computarPrecio(l);
  var catColor = CAT_COLORS[l.categoria] || '#7A8099';
  var aplicaTag = (saved.aplica_a) ? '<small class="aplica-tag">→ '+enc(saved.aplica_a)+'</small>' : '';
  return '<tr class="fiscal-row" data-idx="'+idx+'"'+ncS+'>'+
    '<td class="dt">'+fechaCorta(l.fecha)+'</td>'+
    '<td class="comp mono">'+enc(l.comprobante)+aplicaTag+'</td>'+
    '<td class="cli" title="'+enc(l.cliente)+'">'+enc(l.cliente)+'</td>'+
    '<td class="art mono">'+enc(l.art_codigo)+'</td>'+
    '<td class="desc" title="'+enc(l.art_desc)+'">'+enc(l.art_desc)+'</td>'+
    '<td class="tipo-col" style="color:'+catColor+'">'+enc(l.categoria)+'</td>'+
    '<td class="blq">'+enc(l.bloque)+'</td>'+
    '<td class="num">'+fN(l.cantidad)+'</td>'+
    '<td class="num">'+fD(l.precio_neto_usd_u,4)+'</td>'+
    '<td class="num precio-col">'+enc(precio)+'</td>'+
    '<td class="num'+(l.importe_usd<0?' nc-val':'')+'">'+fN(l.importe_usd)+'</td>'+
    '<td class="num ars-col">'+fN(l.importe_ars)+'</td>'+
    '<td class="num tc-col">'+(l.tc>0?fN(l.tc):'')+'</td>'+
    (l.es_petroleo
      ? '<td class="manual-val">'+(saved.cert||'')+'</td>'+
        '<td class="manual-val">'+(saved.api||'')+'</td>'+
        '<td class="manual-val">'+(saved.buque||'')+'</td>'+
        '<td class="manual-val">'+(saved.fecha_emb||'')+'</td>'
      : '<td class="na-cell">—</td><td class="na-cell">—</td><td class="na-cell">—</td><td class="na-cell">—</td>')+
    '</tr>';
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
        y:{ticks:{font:{size:11},callback:function(v){
          if(Math.abs(v)>=1000000) return (v/1000000).toFixed(1)+'M';
          if(Math.abs(v)>=1000) return (v/1000).toFixed(0)+'k';
          return v;
        }},grid:{color:'rgba(0,0,0,.06)'}},
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
var donutChart;
(function(){
  var ctx = document.getElementById('donutChart').getContext('2d');
  donutChart = new Chart(ctx,{
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

function updateDonutChart() {
  if (!donutChart) return;
  var filtered = MESES.filter(function(m){ return activeMeses.has(m); });
  var labels = [], data = [], colors = [];
  ALL_CATEGORIAS.forEach(function(cat) {
    if (!activeTipos.has(cat)) return;
    var val = 0;
    LINEAS.forEach(function(l){
      if (l.categoria === cat && filtered.indexOf(l.mes) >= 0) val += l.importe_usd;
    });
    if (val === 0) return;
    labels.push(cat);
    data.push(Math.abs(val));
    colors.push(CAT_COLORS[cat] || '#A0AEC0');
  });
  donutChart.data.labels = labels;
  donutChart.data.datasets[0].data = data;
  donutChart.data.datasets[0].backgroundColor = colors;
  donutChart.update();
}

// ── Excel export ──────────────────────────────────────────────────────────────
function exportarExcel() {
  saveManualData();
  var filtered = new Set(MESES.filter(function(m){ return activeMeses.has(m); }));
  var wb = XLSX.utils.book_new();

  // Sheet 1: Resumen pivot
  var fMeses = MESES.filter(function(m){return filtered.has(m);});
  var pivHdr = ['Categoría','Bloque'].concat(fMeses.map(function(m){return MES_LABELS[m]||m;})).concat(['Total']);
  var pivRows = [pivHdr];
  var byCat={};
  PIVOT_DATA.forEach(function(r){if(!byCat[r.categoria])byCat[r.categoria]=[];byCat[r.categoria].push(r);});
  Object.keys(byCat).forEach(function(cat){
    var rows=byCat[cat];
    pivRows.push([cat,''].concat(fMeses.map(function(m){return rows.reduce(function(s,r){return s+(r.por_mes[m]||0);},0);})).concat([rows.reduce(function(s,r){return s+r.total;},0)]));
    rows.forEach(function(r){
      pivRows.push(['',r.bloque].concat(fMeses.map(function(m){return r.por_mes[m]||0;})).concat([r.total]));
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pivRows), 'Resumen');

  // Sheet 2: Detalle fiscal
  var detHdr = ['Fecha','Mes','Comprobante','Cliente','Artículo','Descripción','Bloque','Categoría','Cantidad','P.Neto USD/u','Precio','Total Neto USD','Total Neto ARS','TC','Certificado','°API','Buque','Fecha emb.'];
  var detRows = [detHdr];
  var clienteQx  = (document.getElementById('clienteSearch').value||'').toLowerCase().trim();
  var bloqueQx   = document.getElementById('bloqueSelect').value||'';
  var articuloQx = document.getElementById('articuloSelect').value||'';
  LINEAS.filter(function(l){
    if (!filtered.has(l.mes)) return false;
    if (!activeTipos.has(l.categoria)) return false;
    if (clienteQx && l.cliente.toLowerCase().indexOf(clienteQx)<0) return false;
    if (bloqueQx && l.bloque !== bloqueQx) return false;
    if (articuloQx && l.art_codigo !== articuloQx) return false;
    return true;
  }).forEach(function(l){
    var idx = LINEAS.indexOf(l);
    var saved = manualData[idx]||{};
    detRows.push([l.fecha,MES_LABELS[l.mes]||l.mes,l.comprobante,l.cliente,l.art_codigo,l.art_desc,l.bloque,l.categoria,l.cantidad,l.precio_neto_usd_u,computarPrecio(l),l.importe_usd,l.importe_ars,l.tc>0?l.tc:'',saved.cert||'',saved.api||'',saved.buque||'',saved.fecha_emb||'']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detRows), 'Detalle Fiscal');

  var tag = Array.from(filtered).sort()[0]||'';
  XLSX.writeFile(wb, 'Facturacion_'+tag.replace('-','')+'.xlsx');
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Show initial count + load manual data from localStorage
(function(){
  var c = document.getElementById('fiscal-count');
  if(c) c.textContent = LINEAS.length + ' líneas';
  loadManualFromStorage();
  if (Object.keys(manualData).length > 0) renderFiscal();
})();
<\/script>
</body>
</html>`
}

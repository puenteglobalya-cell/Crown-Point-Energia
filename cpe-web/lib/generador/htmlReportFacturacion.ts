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
function precioDerivado(l: Linea): { val: string; unit: string } {
  if (/AJUSTE/i.test(l.art_codigo)) return { val: '', unit: '' }
  if (l.es_petroleo && l.cantidad !== 0)
    return { val: fD(l.importe_usd / (l.cantidad * 6.28981), 2), unit: '$/bbl' }
  if (l.es_gas && l.cantidad !== 0)
    return { val: fD(l.importe_usd / (l.cantidad / 1000 * 35.314), 2), unit: '$/MMBTU' }
  return { val: '', unit: '' }
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
      const pc = precioDerivado(l)
      const precioHTML = pc.val ? `<span class="pv">${pc.val}</span> <small class="pu">${enc(pc.unit)}</small>` : ''
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
        `<td class="num precio-col">${precioHTML}</td>` +
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
  // FA/FQ/F-type invoices + CL (liquidaciones) — CA/DA/DQ go to Otros section
  const petManualRows   = lineas.map((l, i) => ({ l, i })).filter(({ l }) => l.es_petroleo && (l.tipo_comp.startsWith('F') || l.tipo_comp === 'CL'))
  const ncManualRows    = lineas.map((l, i) => ({ l, i })).filter(({ l }) => l.importe_usd < 0)
  const otrosManualRows = lineas.map((l, i) => ({ l, i })).filter(({ l }) => l.tipo_comp === 'DA' || l.tipo_comp === 'DQ')
  const defaultManualOpen = petManualRows.length > 0 || ncManualRows.length > 0 || otrosManualRows.length > 0

  const petManualHTML = petManualRows.map(({ l }) => {
    const mk = enc(l.art_codigo + '|' + l.comprobante)
    const apiOnly = /YPF|PAN AMERICAN|PAE\b/i.test(l.cliente)
    const dimCls  = apiOnly ? ' api-dim' : ''
    const noTab   = apiOnly ? ' tabindex="-1"' : ''
    return `<tr data-cliente="${enc(l.cliente)}" data-api-only="${apiOnly ? '1' : '0'}" data-tipo="${enc(l.tipo_comp)}" data-comprobante="${enc(l.comprobante)}">` +
    `<td class="manual-info">${fechaCorta(l.fecha)}</td>` +
    `<td class="manual-info mono">${enc(l.comprobante)}<div class="m-neto-cell"></div></td>` +
    `<td class="manual-info cli" title="${enc(l.cliente)}">${enc(l.cliente)}</td>` +
    `<td class="manual-info mono">${enc(l.art_codigo)}</td>` +
    `<td class="${dimCls}"><input class="m-input" type="text" data-mkey="${mk}" data-field="cert" placeholder="Certificado"${noTab}></td>` +
    `<td><input class="m-input" type="text" data-mkey="${mk}" data-field="api" placeholder="°API"></td>` +
    `<td class="${dimCls}"><input class="m-input" type="text" data-mkey="${mk}" data-field="buque" placeholder="Nombre buque"${noTab}></td>` +
    `<td class="${dimCls}"><input class="m-input" type="text" data-mkey="${mk}" data-field="fecha_emb" placeholder="DD/MM/AAAA"${noTab}></td>` +
    `<td><input class="m-input" type="text" data-mkey="${mk}" data-field="ajustes" placeholder="CQ, DQ vinculados (sep. coma)…"></td>` +
    `<td style="text-align:center"><input type="checkbox" class="m-check" data-mkey="${mk}" data-field="completo" onchange="autoSaveManual()"></td>` +
    `</tr>`
  }).join('')

  const ncManualHTML = ncManualRows.map(({ l }) => {
    const mk = enc(l.art_codigo + '|' + l.comprobante)
    return `<tr data-cliente="${enc(l.cliente)}">` +
    `<td class="manual-info">${fechaCorta(l.fecha)}</td>` +
    `<td class="manual-info mono">${enc(l.comprobante)}</td>` +
    `<td class="manual-info cli" title="${enc(l.cliente)}">${enc(l.cliente)}</td>` +
    `<td class="manual-info mono">${enc(l.art_codigo)}</td>` +
    `<td class="manual-info num">${fN(l.importe_usd)}</td>` +
    `<td><input class="m-input" type="text" data-mkey="${mk}" data-field="aplica_a" placeholder="FA 0009-…"></td>` +
    `<td style="text-align:center"><input type="checkbox" class="m-check" data-mkey="${mk}" data-field="sin_volumen"></td>` +
    `</tr>`
  }).join('')

  const otrosManualHTML = otrosManualRows.map(({ l }) => {
    const mk = enc(l.art_codigo + '|' + l.comprobante)
    const catColor = CAT_COLORS[l.categoria] ?? '#7A8099'
    return `<tr data-cliente="${enc(l.cliente)}">` +
    `<td class="manual-info">${fechaCorta(l.fecha)}</td>` +
    `<td class="manual-info mono">${enc(l.comprobante)}</td>` +
    `<td class="manual-info cli" title="${enc(l.cliente)}">${enc(l.cliente)}</td>` +
    `<td class="manual-info mono">${enc(l.art_codigo)}</td>` +
    `<td class="manual-info" style="font-size:11px;font-weight:600;color:${catColor}">${enc(l.tipo_comp)}</td>` +
    `<td class="manual-info num">${fN(l.importe_usd)}</td>` +
    `<td><input class="m-input m-input-ref" type="text" data-mkey="${mk}" data-field="aplica_a" placeholder="Comp. original…"></td>` +
    `<td style="text-align:center"><input type="checkbox" class="m-check" data-mkey="${mk}" data-field="completo" onchange="autoSaveManual()"></td>` +
    `</tr>`
  }).join('')

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
.aplica-tag{display:inline-block;font-size:10px;font-weight:600;color:#2B6CB0;background:#EBF8FF;border:1px solid #BEE3F8;border-radius:3px;padding:1px 6px;margin-left:4px;white-space:nowrap}
.manual-section-header{cursor:pointer;user-select:none}
.manual-section-header:hover{opacity:.85}
.m-row-done{background:rgba(72,187,120,.07)!important;border-left:3px solid #48BB78}
.m-row-hidden{display:none!important}
.m-row-filter{display:none!important}
.m-hide-btn{font-size:11px;padding:3px 10px;border-radius:5px;border:1px solid #C6F6D5;background:#F0FFF4;color:#276749;cursor:pointer;white-space:nowrap}
.m-hide-btn:hover{background:#C6F6D5}
.m-done-badge{font-size:11px;color:#48BB78;font-weight:600;margin-left:8px}
.api-dim{opacity:.25;pointer-events:none}
.m-neto-cell{font-size:10px;color:#276749;font-weight:600;margin-top:2px;white-space:nowrap}
.m-input-ref{background:#EBF8FF!important;border-color:#BEE3F8!important;color:#2B6CB0!important}
.pet-filter-bar{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.pet-filter-bar input{font-family:'DM Sans',sans-serif;font-size:12px;padding:5px 10px;border:1.5px solid #E8EAEF;border-radius:6px;width:220px;color:#14172E;outline:none;background:#fff}
.pet-filter-bar input:focus{border-color:#14172E}
.sort-th{cursor:pointer;user-select:none}
.sort-th:hover{background:#EFF1F5!important;color:#14172E}
.sort-arrow{display:inline-block;margin-left:3px;font-size:9px;opacity:.4}
.sort-arrow.asc{opacity:1}
.sort-arrow.desc{opacity:1}
.fiscal-grouped{background:rgba(72,187,120,.06)!important;border-left:3px solid #48BB78;cursor:pointer}
.fiscal-grouped:hover td{background:rgba(72,187,120,.13)!important}
.adj-badge{font-size:9.5px;color:#7A8099;margin-top:2px;white-space:nowrap}
.group-toggle{font-size:9px;color:#48BB78;font-weight:700;margin-right:3px;vertical-align:middle;display:inline-block;width:8px}
table.fiscal .fiscal-breakdown td{background:#F6F8FC;color:#7A8099;font-size:11px;padding:3px 8px;border-bottom:1px solid #F0F2F6}
table.fiscal .fiscal-breakdown .nc-val{color:#C53030}
table.fiscal .fiscal-mes-header{cursor:pointer;user-select:none}
table.fiscal .fiscal-mes-header:hover td{background:#1e2340}
table.fiscal .fiscal-mes-header td{background:#14172E;color:#fff;font-weight:700;font-size:12px;letter-spacing:.04em;padding:8px 10px;text-transform:uppercase}
#fiscal-table.hide-manual-cols [data-mc]{display:none}
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
.pv{font-variant-numeric:tabular-nums}
.pu{font-size:10px;color:#7A8099;letter-spacing:.02em}
/* Manual subsection collapse */
.ms-hdr{display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;padding:4px 0}
.ms-hdr:hover{opacity:.8}
.ms-caret{font-size:9px;font-weight:700;margin-right:5px;display:inline-block;color:#48BB78}
/* Price table */
table.precios{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:12px}
table.precios th{padding:6px 10px;font-weight:600;font-size:11px;color:#7A8099;background:#F8F9FB;border-bottom:1.5px solid #E8EAEF;text-align:right;white-space:nowrap}
table.precios th:first-child{text-align:left}
table.precios td{padding:5px 10px;border-bottom:1px solid #F3F4F8;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
table.precios td:first-child{text-align:left;font-weight:600}
table.precios .ptot td{font-weight:700;border-top:1.5px solid #E8EAEF;background:#F8F9FB}
.precios-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:900px){.precios-grid{grid-template-columns:1fr}}
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
      <div class="kpi-value" id="kpi-total-fact">${fMM(resumen.total_facturas)}</div>
      <div class="kpi-sub">Facturas acumuladas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Notas de Crédito</div>
      <div class="kpi-value negative" id="kpi-total-nc">(${fMM(Math.abs(resumen.total_nc))})</div>
      <div class="kpi-sub" id="kpi-nc-sub">${ncLineas.length} ajuste${ncLineas.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Neto Facturado</div>
      <div class="kpi-value" id="kpi-neto">${fMM(resumen.neto)}</div>
      <div class="kpi-sub">Acumulado ${enc(periodo)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Meses cubiertos</div>
      <div class="kpi-value" id="kpi-meses">${meses.length}</div>
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
      <span class="section-badge">responde a todos los filtros</span>
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

  <!-- Precios Promedio -->
  <div class="section" id="precios-section" style="display:none">
    <div class="section-title">Precio Promedio por Bloque · us$</div>
    <div class="precios-grid" id="precios-body"></div>
  </div>

  <!-- Datos Manuales -->
  <div class="section" id="manual-section">
    <div class="section-title manual-section-header" onclick="toggleManualSection()">
      Datos Manuales
      <span class="section-badge" id="manual-toggle-badge">${defaultManualOpen ? '▼ colapsar' : '▶ expandir'}</span>
    </div>
    <div id="manual-body" style="display:${defaultManualOpen ? 'block' : 'none'}">
      ${petManualHTML.length > 0 ? `
      <div style="margin-bottom:18px">
        <div class="ms-hdr" onclick="toggleManualSubsection('pet')">
          <div style="font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em">
            <span class="ms-caret" id="ms-icon-pet">▶</span>Embarques (Petróleo)<span class="m-done-badge" id="pet-done-badge"></span>
          </div>
          <button class="m-hide-btn" id="pet-hide-btn" data-hiding="1" onclick="event.stopPropagation();toggleHideDone('manual-pet-table','pet-hide-btn')">Mostrar todos</button>
        </div>
        <div id="ms-body-pet" style="display:none">
        <div class="pet-filter-bar">
          <input type="text" id="pet-filter" placeholder="Filtrar por cliente…" oninput="filterPetTable()">
        </div>
        <div style="overflow-x:auto">
          <table class="fiscal" id="manual-pet-table">
            <thead><tr>
              <th class="sort-th" style="min-width:46px" onclick="sortPetTable(0)">Fecha<span class="sort-arrow" id="pet-sa-0"></span></th>
              <th class="sort-th" style="min-width:140px" onclick="sortPetTable(1)">Comprobante<span class="sort-arrow" id="pet-sa-1"></span></th>
              <th class="sort-th" style="min-width:150px" onclick="sortPetTable(2)">Cliente<span class="sort-arrow" id="pet-sa-2"></span></th>
              <th class="sort-th" style="min-width:85px" onclick="sortPetTable(3)">Artículo<span class="sort-arrow" id="pet-sa-3"></span></th>
              <th class="sort-th" style="min-width:90px;background:#FFFBEB" onclick="sortPetTable(4)">Certificado<span class="sort-arrow" id="pet-sa-4"></span></th>
              <th class="sort-th" style="min-width:55px;background:#FFFBEB" onclick="sortPetTable(5)">°API<span class="sort-arrow" id="pet-sa-5"></span></th>
              <th class="sort-th" style="min-width:120px;background:#FFFBEB" onclick="sortPetTable(6)">Buque<span class="sort-arrow" id="pet-sa-6"></span></th>
              <th class="sort-th" style="min-width:100px;background:#FFFBEB" onclick="sortPetTable(7)">Fecha Emb.<span class="sort-arrow" id="pet-sa-7"></span></th>
              <th class="sort-th" style="min-width:170px;background:#EBF8FF" onclick="sortPetTable(8)">Ajustes / Ref.<span class="sort-arrow" id="pet-sa-8"></span></th>
              <th class="sort-th" style="min-width:52px;background:#F0FFF4;text-align:center" onclick="sortPetTable(9)">Completo<span class="sort-arrow" id="pet-sa-9"></span></th>
            </tr></thead>
            <tbody>${petManualHTML}</tbody>
          </table>
        </div>
        </div>
      </div>` : ''}
      ${ncManualHTML.length > 0 ? `
      <div style="margin-bottom:18px">
        <div class="ms-hdr" onclick="toggleManualSubsection('nc')">
          <div style="font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em">
            <span class="ms-caret" id="ms-icon-nc">▶</span>Notas de Crédito / Débito<span class="m-done-badge" id="nc-done-badge"></span>
          </div>
          <button class="m-hide-btn" id="nc-hide-btn" data-hiding="1" onclick="event.stopPropagation();toggleHideDone('manual-nc-table','nc-hide-btn')">Mostrar todos</button>
        </div>
        <div id="ms-body-nc" style="display:none">
        <div class="pet-filter-bar" style="margin-top:10px">
          <input type="text" id="nc-filter" placeholder="Filtrar por comprobante, cliente…" oninput="filterNcTable()">
        </div>
        <div style="overflow-x:auto">
          <table class="fiscal" id="manual-nc-table">
            <thead><tr>
              <th style="min-width:46px">Fecha</th>
              <th style="min-width:140px">Comprobante</th>
              <th style="min-width:150px">Cliente</th>
              <th style="min-width:85px">Artículo</th>
              <th class="num-h" style="min-width:115px">Importe USD</th>
              <th style="min-width:180px;background:#FFFBEB">Aplica a</th>
              <th style="min-width:60px;background:#FFF5F5;text-align:center">Sin vol.</th>
            </tr></thead>
            <tbody>${ncManualHTML}</tbody>
          </table>
        </div>
        </div>
      </div>` : ''}
      ${otrosManualHTML.length > 0 ? `
      <div style="margin-bottom:18px">
        <div class="ms-hdr" onclick="toggleManualSubsection('otros')">
          <div style="font-size:11px;font-weight:600;color:#7A8099;text-transform:uppercase;letter-spacing:.04em">
            <span class="ms-caret" id="ms-icon-otros">▶</span>Otros (DA / DQ)<span class="m-done-badge" id="otros-done-badge"></span>
          </div>
          <button class="m-hide-btn" id="otros-hide-btn" data-hiding="1" onclick="event.stopPropagation();toggleHideDone('manual-otros-table','otros-hide-btn')">Mostrar todos</button>
        </div>
        <div id="ms-body-otros" style="display:none">
        <div class="pet-filter-bar" style="margin-top:10px">
          <input type="text" id="otros-filter" placeholder="Filtrar por comprobante, cliente…" oninput="filterOtrosTable()">
        </div>
        <div style="overflow-x:auto">
          <table class="fiscal" id="manual-otros-table">
            <thead><tr>
              <th style="min-width:46px">Fecha</th>
              <th style="min-width:140px">Comprobante</th>
              <th style="min-width:150px">Cliente</th>
              <th style="min-width:85px">Artículo</th>
              <th style="min-width:55px">Tipo</th>
              <th class="num-h" style="min-width:115px">Importe USD</th>
              <th style="min-width:180px;background:#EBF8FF">Comp. Original</th>
              <th style="min-width:52px;background:#F0FFF4;text-align:center">Completo</th>
            </tr></thead>
            <tbody>${otrosManualHTML}</tbody>
          </table>
        </div>
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
      <button id="manual-cols-btn" class="section-badge" style="cursor:pointer;border:none;background:#F0F2F6;padding:2px 10px;border-radius:10px;font-size:10px;color:#7A8099;font-weight:500" onclick="toggleManualCols()">Ocultar emb. ▴</button>
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
            <th data-mc style="min-width:90px;background:#FFFBEB">Certificado</th>
            <th data-mc style="min-width:55px;background:#FFFBEB">°API</th>
            <th data-mc style="min-width:120px;background:#FFFBEB">Buque</th>
            <th data-mc style="min-width:100px;background:#FFFBEB">Fecha emb.</th>
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
      <tbody id="cliente-tbody">${clienteRows}</tbody>
    </table>
  </div>` : ''}

  <div class="export-bar">
    <button class="btn-exp btn-secondary" onclick="window.print()">Imprimir / PDF</button>
    <button class="btn-exp btn-secondary" onclick="return pedirPDF(this)">Descargar PDF</button>
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

var activeMeses    = new Set(MESES);
var activeTipos    = new Set(ALL_CATEGORIAS);
var collapsedMeses = new Set(MESES);  // start all collapsed
var showManualCols = true;
var sortState      = { col: null, dir: 1 };
var manualData     = {};
var PERIODO_DESDE = '${periodo_desde}';
var MANUAL_KEY    = 'cpe_fm_' + PERIODO_DESDE;
var REPORTE_ID   = '';
var SAVED_MANUAL = {};

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
function encA(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function computarPrecio(l) {
  if (/AJUSTE/i.test(l.art_codigo || '')) return { val: '', unit: '' };
  if (l.es_petroleo && l.cantidad !== 0)
    return { val: fD(l.importe_usd / (l.cantidad * 6.28981), 2), unit: '$/bbl' };
  if (l.es_gas && l.cantidad !== 0)
    return { val: fD(l.importe_usd / (l.cantidad / 1000 * 35.314), 2), unit: '$/MMBTU' };
  return { val: '', unit: '' };
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
}
function toggleAllTipos(checked) {
  document.querySelectorAll('.tipo-cb').forEach(function(cb){ cb.checked = checked; });
  activeTipos = checked ? new Set(ALL_CATEGORIAS) : new Set();
  updateTipoBtn();
  renderFiscal();
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
  renderFiscal();
}
function toggleAll(show) {
  MESES.forEach(function(m){ show ? activeMeses.add(m) : activeMeses.delete(m); });
  document.querySelectorAll('.chip[data-mes]').forEach(function(c){
    show ? c.classList.add('active') : c.classList.remove('active');
  });
  renderFiscal();
}

// ── Pivot re-render ───────────────────────────────────────────────────────────
function renderPivotFromLineas(lineas) {
  var mesQ = document.getElementById('mesSelect').value || '';
  var filtered = MESES.filter(function(m){
    if (!activeMeses.has(m)) return false;
    if (mesQ && m !== mesQ) return false;
    return true;
  });
  // Update header columns
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
  // Build from lineas
  var BLOQUE_ORD = ['ET','PCKK','CH','PPC','ENA','Gas','Financiero','Admin','Varios'];
  var byCat = {};
  lineas.forEach(function(l) {
    if (!byCat[l.categoria]) byCat[l.categoria] = {};
    if (!byCat[l.categoria][l.bloque]) byCat[l.categoria][l.bloque] = {};
    byCat[l.categoria][l.bloque][l.mes] = (byCat[l.categoria][l.bloque][l.mes]||0) + l.importe_usd;
  });
  var cats = Object.keys(byCat).sort(function(a,b){
    return (CAT_ORDER.indexOf(a)<0?99:CAT_ORDER.indexOf(a))-(CAT_ORDER.indexOf(b)<0?99:CAT_ORDER.indexOf(b));
  });
  var html = '', gTotals = {}, gTotal = 0;
  filtered.forEach(function(m){ gTotals[m]=0; });
  cats.forEach(function(cat) {
    var bloques = byCat[cat];
    var catTotals = {}, catTotal = 0;
    filtered.forEach(function(m){
      catTotals[m] = Object.keys(bloques).reduce(function(s,blq){return s+(bloques[blq][m]||0);},0);
      gTotals[m] += catTotals[m];
    });
    catTotal = Object.keys(bloques).reduce(function(s,blq){
      return s + filtered.reduce(function(ss,m){return ss+(bloques[blq][m]||0);},0);
    },0);
    gTotal += catTotal;
    var isNeg = catTotal<0, col = isNeg?' style="color:#C53030"':'';
    html += '<tr class="cat-header"'+col+'><td class="cat-label" colspan="2">'+enc(cat)+'</td>'+
      filtered.map(function(m){return '<td class="num subtotal">'+fN(catTotals[m])+'</td>';}).join('')+
      '<td class="num subtotal total-col">'+fN(catTotal)+'</td></tr>';
    var bList = Object.keys(bloques).sort(function(a,b){return (BLOQUE_ORD.indexOf(a)<0?99:BLOQUE_ORD.indexOf(a))-(BLOQUE_ORD.indexOf(b)<0?99:BLOQUE_ORD.indexOf(b));});
    if (bList.length>1||bList[0]!=='Varios') {
      bList.forEach(function(blq){
        var rTotal = filtered.reduce(function(s,m){return s+(bloques[blq][m]||0);},0);
        if (!rTotal) return;
        html += '<tr class="detail-row"'+col+'><td></td><td class="bloque-label">'+enc(blq)+'</td>'+
          filtered.map(function(m){return '<td class="num">'+(bloques[blq][m]?fN(bloques[blq][m]):'')+'</td>';}).join('')+
          '<td class="num total-col">'+fN(rTotal)+'</td></tr>';
      });
    }
  });
  html += '<tr class="grand-total"><td colspan="2">TOTAL NETO</td>'+
    filtered.map(function(m){return '<td class="num">'+fN(gTotals[m])+'</td>';}).join('')+
    '<td class="num total-col">'+fN(gTotal)+'</td></tr>';
  document.getElementById('pivot-body').innerHTML=html;
}

// ── Manual data helpers ───────────────────────────────────────────────────────
function manualKey(l) { return l.art_codigo + '|' + l.comprobante; }

function collectManualFromForm() {
  document.querySelectorAll('#manual-pet-table .m-input').forEach(function(inp) {
    var key   = inp.getAttribute('data-mkey');
    var field = inp.getAttribute('data-field');
    if (!key || !field) return;
    if (!manualData[key]) manualData[key] = {};
    manualData[key][field] = inp.value.trim();
  });
  document.querySelectorAll('#manual-pet-table .m-check').forEach(function(inp) {
    var key   = inp.getAttribute('data-mkey');
    var field = inp.getAttribute('data-field');
    if (!key || !field) return;
    if (!manualData[key]) manualData[key] = {};
    manualData[key][field] = inp.checked;
  });
  document.querySelectorAll('#manual-nc-table .m-input').forEach(function(inp) {
    var key   = inp.getAttribute('data-mkey');
    var field = inp.getAttribute('data-field');
    if (!key || !field) return;
    if (!manualData[key]) manualData[key] = {};
    manualData[key][field] = inp.value.trim();
  });
  document.querySelectorAll('#manual-nc-table .m-check').forEach(function(inp) {
    var key   = inp.getAttribute('data-mkey');
    var field = inp.getAttribute('data-field');
    if (!key || !field) return;
    if (!manualData[key]) manualData[key] = {};
    manualData[key][field] = inp.checked;
  });
  document.querySelectorAll('#manual-otros-table .m-input').forEach(function(inp) {
    var key   = inp.getAttribute('data-mkey');
    var field = inp.getAttribute('data-field');
    if (!key || !field) return;
    if (!manualData[key]) manualData[key] = {};
    manualData[key][field] = inp.value.trim();
  });
  document.querySelectorAll('#manual-otros-table .m-check').forEach(function(inp) {
    var key   = inp.getAttribute('data-mkey');
    var field = inp.getAttribute('data-field');
    if (!key || !field) return;
    if (!manualData[key]) manualData[key] = {};
    manualData[key][field] = inp.checked;
  });
}

function saveManualData() {
  collectManualFromForm();
}

function guardarManual() {
  collectManualFromForm();
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify(manualData)); } catch(e) {}
  renderFiscal();
  updateManualCompletedState();
  updateNetoDisplay();
  var btn = document.getElementById('save-manual-btn');
  if (!btn) return;
  if (REPORTE_ID) {
    btn.textContent = 'Guardando…';
    btn.disabled = true;
    fetch('/api/admin/reportes/' + REPORTE_ID, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_data: manualData })
    }).then(function(r) {
      btn.disabled = false;
      btn.textContent = r.ok ? '✓ Guardado en servidor' : '✓ Guardado local';
      setTimeout(function(){ btn.textContent = 'Guardar y aplicar'; }, 2500);
    }).catch(function() {
      btn.disabled = false;
      btn.textContent = '✓ Guardado local';
      setTimeout(function(){ btn.textContent = 'Guardar y aplicar'; }, 2500);
    });
  } else {
    btn.textContent = '✓ Guardado';
    setTimeout(function(){ btn.textContent = 'Guardar y aplicar'; }, 2000);
  }
}

function autoSaveManual() {
  collectManualFromForm();
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify(manualData)); } catch(e) {}
  updateManualCompletedState();
  updateNetoDisplay();
  // Re-apply hide state so newly-completed rows disappear immediately if hiding is active
  var btn = document.getElementById('pet-hide-btn');
  if (btn && btn.getAttribute('data-hiding') === '1') {
    document.querySelectorAll('#manual-pet-table tbody tr').forEach(function(tr) {
      tr.classList.toggle('m-row-hidden', tr.getAttribute('data-done') === '1');
    });
  }
  var otrosBtn = document.getElementById('otros-hide-btn');
  if (otrosBtn && otrosBtn.getAttribute('data-hiding') === '1') {
    document.querySelectorAll('#manual-otros-table tbody tr').forEach(function(tr) {
      tr.classList.toggle('m-row-hidden', tr.getAttribute('data-done') === '1');
    });
  }
}

function loadManualFromStorage() {
  try {
    var raw = localStorage.getItem(MANUAL_KEY);
    var fromLocal = (raw ? JSON.parse(raw) : null) || {};
    // Server-saved data (injected at serve time) takes precedence over localStorage
    var fromServer = (typeof SAVED_MANUAL === 'object' && SAVED_MANUAL && Object.keys(SAVED_MANUAL).length > 0)
      ? SAVED_MANUAL : null;
    manualData = fromServer || fromLocal;
    if (typeof manualData !== 'object' || !manualData) return;
    // Keep localStorage in sync with server data
    if (fromServer) { try { localStorage.setItem(MANUAL_KEY, JSON.stringify(manualData)); } catch(e) {} }
    // Pre-fill petroleum inputs
    document.querySelectorAll('#manual-pet-table .m-input').forEach(function(inp) {
      var key   = inp.getAttribute('data-mkey');
      var field = inp.getAttribute('data-field');
      if (key && field && manualData[key] && manualData[key][field]) {
        inp.value = manualData[key][field];
      }
    });
    // Pre-fill petroleum checkboxes
    document.querySelectorAll('#manual-pet-table .m-check').forEach(function(inp) {
      var key   = inp.getAttribute('data-mkey');
      var field = inp.getAttribute('data-field');
      if (key && field && manualData[key] && manualData[key][field]) {
        inp.checked = true;
      }
    });
    // Pre-fill NC inputs
    document.querySelectorAll('#manual-nc-table .m-input').forEach(function(inp) {
      var key   = inp.getAttribute('data-mkey');
      var field = inp.getAttribute('data-field');
      if (key && field && manualData[key] && manualData[key][field]) {
        inp.value = manualData[key][field];
      }
    });
    // Pre-fill NC checkboxes
    document.querySelectorAll('#manual-nc-table .m-check').forEach(function(inp) {
      var key   = inp.getAttribute('data-mkey');
      var field = inp.getAttribute('data-field');
      if (key && field && manualData[key] && manualData[key][field]) {
        inp.checked = true;
      }
    });
    // Pre-fill Otros inputs
    document.querySelectorAll('#manual-otros-table .m-input').forEach(function(inp) {
      var key   = inp.getAttribute('data-mkey');
      var field = inp.getAttribute('data-field');
      if (key && field && manualData[key] && manualData[key][field]) {
        inp.value = manualData[key][field];
      }
    });
    // Pre-fill Otros checkboxes
    document.querySelectorAll('#manual-otros-table .m-check').forEach(function(inp) {
      var key   = inp.getAttribute('data-mkey');
      var field = inp.getAttribute('data-field');
      if (key && field && manualData[key] && manualData[key][field]) {
        inp.checked = true;
      }
    });
    updateManualCompletedState();
    updateNetoDisplay();
  } catch(e) {}
}

function updateNetoDisplay() {
  document.querySelectorAll('#manual-pet-table tbody tr[data-comprobante]').forEach(function(tr) {
    var inp = tr.querySelector('[data-mkey]');
    var netoEl = tr.querySelector('.m-neto-cell');
    if (!inp || !netoEl) return;
    var key = inp.getAttribute('data-mkey');
    var d = manualData[key] || {};
    if (!d.ajustes) { netoEl.textContent = ''; return; }
    var comp = tr.getAttribute('data-comprobante');
    var comps = d.ajustes.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    var total = LINEAS.reduce(function(s, l){ return l.comprobante === comp ? s + l.importe_usd : s; }, 0);
    comps.forEach(function(c) {
      LINEAS.forEach(function(l){ if (l.comprobante === c) total += l.importe_usd; });
    });
    netoEl.textContent = 'neto: ' + fN(total);
  });
}

function toggleManualSection() {
  var body  = document.getElementById('manual-body');
  var badge = document.getElementById('manual-toggle-badge');
  if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (badge) badge.textContent = open ? '▶ expandir' : '▼ colapsar';
}

function toggleManualSubsection(id) {
  var body = document.getElementById('ms-body-' + id);
  var icon = document.getElementById('ms-icon-' + id);
  if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : '';
  if (icon) icon.textContent = open ? '▶' : '▼';
}

function togglePrecios(id) {
  var e = document.getElementById(id);
  var a = document.getElementById(id+'-a');
  if (!e) return;
  var hidden = e.style.display === 'none';
  e.style.display = hidden ? '' : 'none';
  if (a) a.textContent = (hidden ? '▼ ocultar l\xedneas' : '▶ ver l\xedneas ('+e.getAttribute('data-n')+')');
}

function renderPrecios(lineas) {
  var body = document.getElementById('precios-body');
  if (!body) return;
  var mesQ = document.getElementById('mesSelect') ? document.getElementById('mesSelect').value : '';
  var mList = MESES.filter(function(m){
    if (!activeMeses.has(m)) return false;
    if (mesQ && m !== mesQ) return false;
    return true;
  });

  // For oil: add amounts from user-linked ajuste comprobantes (manualData[key].ajustes)
  function effectiveImp(l) {
    var d = manualData[manualKey(l)] || {};
    if (!d.ajustes) return l.importe_usd;
    var extra = 0;
    d.ajustes.split(',').forEach(function(c) {
      c = c.trim(); if (!c) return;
      LINEAS.forEach(function(ll){ if (ll.comprobante === c) extra += ll.importe_usd; });
    });
    return l.importe_usd + extra;
  }

  // impFn: optional override for the amount used in price = imp / vol (oil passes effectiveImp)
  function buildTable(lines, prodLabel, unit, toVol, slug, impFn) {
    if (!lines.length) return '';
    var bloques = [], byBlq = {};
    lines.forEach(function(l) {
      if (!byBlq[l.bloque]) { byBlq[l.bloque] = {}; bloques.push(l.bloque); }
      if (!byBlq[l.bloque][l.mes]) byBlq[l.bloque][l.mes] = { imp: 0, vol: 0, items: [] };
      byBlq[l.bloque][l.mes].imp += impFn ? impFn(l) : l.importe_usd;
      byBlq[l.bloque][l.mes].vol += toVol(l.cantidad);
      byBlq[l.bloque][l.mes].items.push(l);
    });

    // Per-cell tooltip: shows per-art_codigo breakdown of vol, imp, implied price
    function cellTip(items) {
      var byArt = {};
      items.forEach(function(l) {
        if (!byArt[l.art_codigo]) byArt[l.art_codigo] = { imp: 0, vol: 0, n: 0 };
        byArt[l.art_codigo].imp += l.importe_usd;
        byArt[l.art_codigo].vol += toVol(l.cantidad);
        byArt[l.art_codigo].n++;
      });
      var parts = [];
      Object.keys(byArt).forEach(function(art) {
        var g = byArt[art];
        var pr = g.vol > 0 ? fD(g.imp/g.vol,2) : '—';
        parts.push(art+' \xd7'+g.n+': vol='+g.vol.toFixed(0)+' \u2192 '+pr+' '+unit);
      });
      return parts.join('\n');
    }

    var html = '<div style="overflow-x:auto">';
    html += '<div style="font-size:11px;font-weight:700;color:#2B6CB0;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">'+enc(prodLabel)+' \xb7 '+enc(unit)+'</div>';
    html += '<table class="precios"><thead><tr><th>Bloque</th>';
    mList.forEach(function(m){ html += '<th>'+enc(MES_LABELS[m]||m)+'</th>'; });
    html += '<th>Prom.</th></tr></thead><tbody>';
    bloques.forEach(function(blq) {
      html += '<tr><td>'+enc(blq)+'</td>';
      var ai = 0, av = 0;
      mList.forEach(function(m) {
        var g = byBlq[blq][m];
        if (g && g.vol > 0) {
          html += '<td title="'+encA(cellTip(g.items))+'" style="cursor:help">'+fD(g.imp/g.vol,2)+'</td>';
          ai += g.imp; av += g.vol;
        } else {
          html += '<td style="color:#C8CCDA">—</td>';
        }
      });
      html += '<td style="font-weight:600">'+(av>0?fD(ai/av,2):'—')+'</td></tr>';
    });
    html += '<tr class="ptot"><td>TOTAL</td>';
    var gi = 0, gv = 0;
    mList.forEach(function(m) {
      var mImp = 0, mVol = 0;
      bloques.forEach(function(blq) {
        var g = byBlq[blq][m];
        if (g && g.vol > 0) { mImp += g.imp; mVol += g.vol; }
      });
      if (mVol > 0) { html += '<td>'+fD(mImp/mVol,2)+'</td>'; gi += mImp; gv += mVol; }
      else html += '<td style="color:#C8CCDA">—</td>';
    });
    html += '<td>'+(gv>0?fD(gi/gv,2):'—')+'</td></tr>';
    html += '</tbody></table>';

    // Expandable line-by-line detail for formula verification
    var detId = 'pd-'+slug;
    html += '<div style="margin-top:6px">';
    html += '<span id="'+detId+'-a" onclick="togglePrecios(\''+detId+'\')" style="font-size:10px;color:#4A90D9;cursor:pointer">';
    html += '▶ ver l\xedneas ('+lines.length+')</span>';
    html += '<div id="'+detId+'" data-n="'+lines.length+'" style="display:none;margin-top:6px">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:10px">';
    html += '<thead><tr style="background:#F8F9FB;color:#7A8099;font-weight:600">';
    html += '<th style="padding:3px 8px;text-align:left">Bloque</th>';
    html += '<th style="padding:3px 8px;text-align:left">Art\xedculo</th>';
    html += '<th style="padding:3px 8px;text-align:left">Mes</th>';
    html += '<th style="padding:3px 8px;text-align:right">Cant. original</th>';
    html += '<th style="padding:3px 8px;text-align:right">Vol. conv.</th>';
    html += '<th style="padding:3px 8px;text-align:right">Imp. USD</th>';
    html += '<th style="padding:3px 8px;text-align:right;color:#2B6CB0">Precio</th>';
    html += '</tr></thead><tbody>';
    lines.forEach(function(l) {
      var v = toVol(l.cantidad);
      var eff = impFn ? impFn(l) : l.importe_usd;
      var pr = v !== 0 ? fD(eff/v,2) : '—';
      var hasAdj = impFn && eff !== l.importe_usd;
      html += '<tr style="border-bottom:1px solid #F3F4F8">';
      html += '<td style="padding:3px 8px">'+enc(l.bloque)+'</td>';
      html += '<td style="padding:3px 8px;font-family:monospace;font-size:9px">'+enc(l.art_codigo)+'</td>';
      html += '<td style="padding:3px 8px">'+enc(MES_LABELS[l.mes]||l.mes)+'</td>';
      html += '<td style="padding:3px 8px;text-align:right;font-variant-numeric:tabular-nums">'+fD(l.cantidad,0)+'</td>';
      html += '<td style="padding:3px 8px;text-align:right;font-variant-numeric:tabular-nums">'+fD(v,1)+'</td>';
      html += '<td style="padding:3px 8px;text-align:right;font-variant-numeric:tabular-nums"'+(hasAdj?' title="bruto: '+encA(fD(l.importe_usd,2))+'"':'')+'>'+fD(eff,2)+(hasAdj?' <small style="color:#48BB78">+aj</small>':'')+'</td>';
      html += '<td style="padding:3px 8px;text-align:right;font-weight:700;color:#2B6CB0">'+pr+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div></div>';
    return html;
  }

  var oilLines = lineas.filter(function(l){ return l.es_petroleo && !/AJUSTE/i.test(l.art_codigo||'') && l.cantidad !== 0; });
  var gasLines = lineas.filter(function(l){ return l.es_gas && l.cantidad !== 0; });
  var html = '';
  if (oilLines.length) html += buildTable(oilLines, 'Petr\xf3leo', '$/bbl', function(q){ return q*6.28981; }, 'oil', effectiveImp);
  if (gasLines.length) html += buildTable(gasLines, 'Gas', '$/MMBTU', function(q){ return q/1000*35.314; }, 'gas');
  body.innerHTML = html;
  var sec = document.getElementById('precios-section');
  if (sec) sec.style.display = (oilLines.length || gasLines.length) ? '' : 'none';
}

function updateManualCompletedState() {
  // Pet table: per-row criterion (api-only rows need only api; others need cert or buque); completo overrides
  var petTbl = document.getElementById('manual-pet-table');
  var petBadge = document.getElementById('pet-done-badge');
  if (petTbl) {
    var done = 0, total = 0;
    petTbl.querySelectorAll('tbody tr').forEach(function(tr) {
      var inp = tr.querySelector('[data-mkey]');
      if (!inp) return;
      total++;
      var key = inp.getAttribute('data-mkey');
      var d = manualData[key] || {};
      var apiOnly = tr.getAttribute('data-api-only') === '1';
      var isDQ    = tr.getAttribute('data-tipo') === 'DQ';
      var complete = d.completo ||
        (isDQ    ? !!d.ajustes :
         apiOnly ? !!d.api :
                   !!(d.cert || d.buque));
      tr.setAttribute('data-done', complete ? '1' : '0');
      tr.classList.toggle('m-row-done', complete);
      if (complete) done++;
    });
    if (petBadge) petBadge.textContent = total > 0 ? ' · ' + done + '/' + total : '';
  }
  // NC table
  function scanTable(tableId, badgeId, isDone) {
    var tbl = document.getElementById(tableId);
    var badge = document.getElementById(badgeId);
    if (!tbl) return;
    var done = 0, total = 0;
    tbl.querySelectorAll('tbody tr').forEach(function(tr) {
      var inp = tr.querySelector('[data-mkey]');
      if (!inp) return;
      total++;
      var key = inp.getAttribute('data-mkey');
      var d = manualData[key] || {};
      var complete = isDone(d);
      tr.setAttribute('data-done', complete ? '1' : '0');
      tr.classList.toggle('m-row-done', complete);
      if (complete) done++;
    });
    if (badge) badge.textContent = total > 0 ? ' · ' + done + '/' + total : '';
  }
  scanTable('manual-nc-table', 'nc-done-badge', function(d){ return !!(d.aplica_a || d.sin_volumen); });
  scanTable('manual-otros-table', 'otros-done-badge', function(d){ return !!(d.aplica_a || d.completo); });
}

function toggleHideDone(tableId, btnId) {
  var tbl = document.getElementById(tableId);
  var btn = document.getElementById(btnId);
  if (!tbl || !btn) return;
  var hiding = btn.getAttribute('data-hiding') !== '1';
  btn.setAttribute('data-hiding', hiding ? '1' : '0');
  btn.textContent = hiding ? 'Mostrar todos' : 'Ocultar completados';
  tbl.querySelectorAll('tr[data-done="1"]').forEach(function(tr) {
    tr.classList.toggle('m-row-hidden', hiding);
  });
}

// ── Embarques table filter + sort ─────────────────────────────────────────────
function filterPetTable() {
  var q = (document.getElementById('pet-filter').value || '').toLowerCase().trim();
  document.querySelectorAll('#manual-pet-table tbody tr').forEach(function(tr) {
    var cli = (tr.getAttribute('data-cliente') || '').toLowerCase();
    var hiddenByFilter = q !== '' && cli.indexOf(q) < 0;
    tr.classList.toggle('m-row-filter', hiddenByFilter);
  });
}

function filterNcTable() {
  var q = (document.getElementById('nc-filter') ? document.getElementById('nc-filter').value : '').toLowerCase().trim();
  document.querySelectorAll('#manual-nc-table tbody tr').forEach(function(tr) {
    var cli  = (tr.getAttribute('data-cliente') || '').toLowerCase();
    var comp = (tr.cells[1] ? tr.cells[1].textContent : '').toLowerCase();
    var hiddenByFilter = q !== '' && cli.indexOf(q) < 0 && comp.indexOf(q) < 0;
    tr.classList.toggle('m-row-filter', hiddenByFilter);
  });
}

function filterOtrosTable() {
  var q = (document.getElementById('otros-filter') ? document.getElementById('otros-filter').value : '').toLowerCase().trim();
  document.querySelectorAll('#manual-otros-table tbody tr').forEach(function(tr) {
    var cli  = (tr.getAttribute('data-cliente') || '').toLowerCase();
    var comp = (tr.cells[1] ? tr.cells[1].textContent : '').toLowerCase();
    var hiddenByFilter = q !== '' && cli.indexOf(q) < 0 && comp.indexOf(q) < 0;
    tr.classList.toggle('m-row-filter', hiddenByFilter);
  });
}

var petSortCol = -1, petSortAsc = true;
function sortPetTable(col) {
  if (petSortCol === col) { petSortAsc = !petSortAsc; } else { petSortCol = col; petSortAsc = true; }
  for (var c = 0; c < 10; c++) {
    var el = document.getElementById('pet-sa-' + c);
    if (!el) continue;
    el.className = 'sort-arrow' + (c === col ? (petSortAsc ? ' asc' : ' desc') : '');
    el.textContent = c === col ? (petSortAsc ? ' ▲' : ' ▼') : '';
  }
  var tbl = document.getElementById('manual-pet-table');
  if (!tbl) return;
  var rows = Array.from(tbl.querySelectorAll('tbody tr'));
  rows.sort(function(a, b) {
    var av, bv;
    var aCell = a.cells[col], bCell = b.cells[col];
    var aInp = aCell ? aCell.querySelector('input') : null;
    var bInp = bCell ? bCell.querySelector('input') : null;
    if (aInp && aInp.type === 'checkbox') {
      av = aInp.checked ? '1' : '0';
      bv = (bInp && bInp.type === 'checkbox') ? (bInp.checked ? '1' : '0') : '0';
    } else if (aInp) {
      av = aInp.value;
      bv = bInp ? bInp.value : '';
    } else {
      av = (aCell ? aCell.textContent : '').trim();
      bv = (bCell ? bCell.textContent : '').trim();
    }
    return (petSortAsc ? 1 : -1) * String(av).localeCompare(String(bv), 'es', { numeric: true });
  });
  var tbody = tbl.querySelector('tbody');
  rows.forEach(function(r) { tbody.appendChild(r); });
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
}

function toggleMesSection(mes) {
  if (collapsedMeses.has(mes)) { collapsedMeses.delete(mes); } else { collapsedMeses.add(mes); }
  renderFiscal();
}

function toggleGroupBreakdown(comp) {
  if (!comp) return;
  var rows = Array.from(document.querySelectorAll('tr.fiscal-breakdown'));
  var matching = rows.filter(function(r){ return r.getAttribute('data-group') === comp; });
  if (!matching.length) return;
  var isHidden = matching[0].style.display === 'none';
  matching.forEach(function(r){ r.style.display = isHidden ? '' : 'none'; });
  var grpRows = Array.from(document.querySelectorAll('tr.fiscal-grouped'));
  var grp = grpRows.filter(function(r){ return r.getAttribute('data-groupcomp') === comp; })[0];
  if (grp) {
    var tog = grp.querySelector('.group-toggle');
    if (tog) tog.textContent = isHidden ? '▼' : '▶';
  }
}

function toggleManualCols() {
  showManualCols = !showManualCols;
  document.getElementById('fiscal-table').classList.toggle('hide-manual-cols', !showManualCols);
  var btn = document.getElementById('manual-cols-btn');
  if (btn) btn.textContent = showManualCols ? 'Ocultar emb. ▴' : 'Mostrar emb. ▾';
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
  // Month header collapse + grouped-row breakdown — event delegation survives renderFiscal re-renders
  document.getElementById('fiscal-body').addEventListener('click', function(e) {
    var grp = e.target.closest('tr.fiscal-grouped');
    if (grp) { toggleGroupBreakdown(grp.getAttribute('data-groupcomp')); return; }
    var hdr = e.target.closest('tr.fiscal-mes-header');
    if (hdr) toggleMesSection(hdr.getAttribute('data-mes'));
  });

  // Expand all months before printing so no line is hidden in the PDF
  window.addEventListener('beforeprint', function() {
    collapsedMeses.clear();
    renderFiscal();
  });
  window.addEventListener('afterprint', function() {
    MESES.forEach(function(m) { collapsedMeses.add(m); });
    renderFiscal();
  });
});

// ── Fiscal render ─────────────────────────────────────────────────────────────
function renderFiscal() {
  saveManualData();

  var filteredLineas = getFilteredLineas();
  renderPivotFromLineas(filteredLineas);
  renderKPIs(filteredLineas);
  try { renderPrecios(filteredLineas); } catch(e) { console.error('[renderPrecios]', e); }
  renderClienteSummary(filteredLineas);
  updateBarChartFromLineas(filteredLineas);
  updateDonutChartFromLineas(filteredLineas);

  var mesQ      = document.getElementById('mesSelect').value || '';
  var mesesActivos = MESES.filter(function(m){
    if (!activeMeses.has(m)) return false;
    if (mesQ && m !== mesQ) return false;
    return true;
  });

  // Sort if needed
  var lineas = filteredLineas;
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

  var gm = buildGroupMap(lineas);

  // If sorting, render flat (no month groups); otherwise group by month
  var html = '';
  if (sortState.col) {
    // Flat sorted view
    var totalUSD = 0, totalARS = 0;
    lineas.forEach(function(l) {
      totalUSD += l.importe_usd; totalARS += l.importe_ars;
      if (gm.absorbed.has(l.comprobante)) return;
      var idx   = LINEAS.indexOf(l);
      var saved = manualData[manualKey(l)]||{};
      if (gm.groups[l.comprobante]) {
        html += groupedRowHTML(l, gm.groups[l.comprobante], saved);
      } else {
        var ncS = l.importe_usd < 0 ? ' style="color:#C53030"' : '';
        html += rowHTML(l, idx, ncS, saved);
      }
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
      var label    = MES_LABELS[mes]||mes;
      var totalUSD = grupo.reduce(function(s,l){return s+l.importe_usd;},0);
      var totalARS = grupo.reduce(function(s,l){return s+l.importe_ars;},0);
      var isCol    = collapsedMeses.has(mes);
      html += '<tr class="fiscal-mes-header" data-mes="'+mes+'">'+
        '<td colspan="9">'+(isCol?'▶':'▼')+' '+enc(label)+'</td>'+
        '<td></td>'+
        '<td class="num">'+fN(totalUSD)+'</td>'+
        '<td class="num ars-col">'+fN(totalARS)+'</td>'+
        '<td colspan="5"></td>'+
        '</tr>';
      if (!isCol) {
        grupo.forEach(function(l) {
          if (gm.absorbed.has(l.comprobante)) return;
          var idx   = LINEAS.indexOf(l);
          var saved = manualData[manualKey(l)]||{};
          if (gm.groups[l.comprobante]) {
            html += groupedRowHTML(l, gm.groups[l.comprobante], saved);
          } else {
            var ncS = l.importe_usd < 0 ? ' style="color:#C53030"' : '';
            html += rowHTML(l, idx, ncS, saved);
          }
        });
        html += '<tr class="fiscal-subtotal"><td colspan="9">Subtotal '+enc(label)+'</td>' +
          '<td></td>' +
          '<td class="num">'+fN(totalUSD)+'</td>' +
          '<td class="num ars-col">'+fN(totalARS)+'</td>' +
          '<td colspan="5"></td></tr>';
      }
    });
  }

  document.getElementById('fiscal-body').innerHTML = html;
}

function buildGroupMap(lineas) {
  // Index filtered lineas by comprobante for O(1) lookup
  var lineasByComp = {};
  lineas.forEach(function(l) {
    if (!lineasByComp[l.comprobante]) lineasByComp[l.comprobante] = [];
    lineasByComp[l.comprobante].push(l);
  });
  var groups = {}, absorbed = new Set();

  // Pass 1: FQ/CL "ajustes" field — parent links to its children
  lineas.forEach(function(l) {
    var d = manualData[manualKey(l)] || {};
    if (!d.ajustes) return;
    var tipo = l.tipo_comp;
    if (!tipo || (!tipo.startsWith('F') && tipo !== 'CL')) return;
    var comps = d.ajustes.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if (!comps.length) return;
    var adj = [];
    comps.forEach(function(comp) {
      // Use ALL LINEAS for the amounts so the net is always correct
      LINEAS.forEach(function(ll){ if (ll.comprobante === comp) adj.push(ll); });
      // Only absorb if the row is currently visible
      if (lineasByComp[comp]) absorbed.add(comp);
    });
    groups[l.comprobante] = adj;
  });

  // Pass 2: any row's "aplica_a" field — child points back to its parent invoice
  var seenPairs = new Set();
  lineas.forEach(function(l) {
    var d = manualData[manualKey(l)] || {};
    var targetComp = (d.aplica_a || '').trim();
    if (!targetComp) return;
    // Only group if the parent is also visible in this filtered view
    if (!lineasByComp[targetComp]) return;
    var pairKey = l.comprobante + '|' + targetComp;
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);
    if (!groups[targetComp]) groups[targetComp] = [];
    var alreadyAdj = groups[targetComp].some(function(a){ return a.comprobante === l.comprobante; });
    if (!alreadyAdj) {
      LINEAS.forEach(function(ll){ if (ll.comprobante === l.comprobante) groups[targetComp].push(ll); });
    }
    absorbed.add(l.comprobante);
  });

  return { groups: groups, absorbed: absorbed };
}

function groupedRowHTML(l, adjLineas, saved) {
  var netImporte = adjLineas.reduce(function(s, a){ return s + a.importe_usd; }, l.importe_usd);
  var netARS     = adjLineas.reduce(function(s, a){ return s + a.importe_ars; }, l.importe_ars);
  // Price adjustment: volume = FQ's original qty; price reflects net importe
  var pc = computarPrecio({ es_petroleo: l.es_petroleo, es_gas: l.es_gas, cantidad: l.cantidad, importe_usd: netImporte });
  var catColor = CAT_COLORS[l.categoria] || '#7A8099';
  var isNeg    = netImporte < 0;
  var adjBadge = '<div class="adj-badge">' + adjLineas.map(function(a){ return enc(a.comprobante); }).join(' · ') + '</div>';
  var gc = enc(l.comprobante);
  var html = '<tr class="fiscal-row fiscal-grouped" data-groupcomp="'+gc+'">'+
    '<td class="dt"><span class="group-toggle">▶</span> '+fechaCorta(l.fecha)+'</td>'+
    '<td class="comp mono">'+enc(l.comprobante)+adjBadge+'</td>'+
    '<td class="cli" title="'+enc(l.cliente)+'">'+enc(l.cliente)+'</td>'+
    '<td class="art mono">'+enc(l.art_codigo)+'</td>'+
    '<td class="desc" title="'+enc(l.art_desc)+'">'+enc(l.art_desc)+'</td>'+
    '<td class="tipo-col" style="color:'+catColor+'">'+enc(l.categoria)+'</td>'+
    '<td class="blq">'+enc(l.bloque)+'</td>'+
    '<td class="num">'+fN(l.cantidad)+'</td>'+
    '<td class="num">—</td>'+
    '<td class="num precio-col">'+(pc.val?'<span class="pv">'+pc.val+'</span> <small class="pu">'+pc.unit+'</small>':'')+'</td>'+
    '<td class="num'+(isNeg?' nc-val':'')+'">'+fN(netImporte)+'</td>'+
    '<td class="num ars-col">'+fN(netARS)+'</td>'+
    '<td class="num tc-col">'+(l.tc>0?fN(l.tc):'')+'</td>'+
    (l.es_petroleo
      ? '<td class="manual-val" data-mc>'+(saved.cert||'')+'</td>'+
        '<td class="manual-val" data-mc>'+(saved.api||'')+'</td>'+
        '<td class="manual-val" data-mc>'+(saved.buque||'')+'</td>'+
        '<td class="manual-val" data-mc>'+(saved.fecha_emb||'')+'</td>'
      : '<td class="na-cell" data-mc>—</td><td class="na-cell" data-mc>—</td><td class="na-cell" data-mc>—</td><td class="na-cell" data-mc>—</td>')+
    '</tr>';
  // Breakdown sub-rows (all components, collapsed by default)
  [l].concat(adjLineas).forEach(function(ll) {
    var pc2 = computarPrecio(ll);
    var isNeg2 = ll.importe_usd < 0;
    html += '<tr class="fiscal-breakdown" data-group="'+gc+'" style="display:none">'+
      '<td class="dt">'+fechaCorta(ll.fecha)+'</td>'+
      '<td class="comp mono" style="padding-left:20px">'+enc(ll.comprobante)+'</td>'+
      '<td></td><td class="art mono">'+enc(ll.art_codigo)+'</td>'+
      '<td></td><td></td><td></td>'+
      '<td class="num">'+fN(ll.cantidad)+'</td>'+
      '<td class="num">'+fD(ll.precio_neto_usd_u,4)+'</td>'+
      '<td class="num precio-col">'+(pc2.val?'<span class="pv">'+pc2.val+'</span> <small class="pu">'+pc2.unit+'</small>':'')+'</td>'+
      '<td class="num'+(isNeg2?' nc-val':'')+'">'+fN(ll.importe_usd)+'</td>'+
      '<td class="num ars-col">'+fN(ll.importe_ars)+'</td>'+
      '<td class="num tc-col">'+(ll.tc>0?fN(ll.tc):'')+'</td>'+
      '<td colspan="4"></td>'+
      '</tr>';
  });
  return html;
}

function rowHTML(l, idx, ncS, saved) {
  var pc = computarPrecio(l);
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
    '<td class="num">'+(saved.sin_volumen?'<del style="color:#A0AEC0">'+fN(l.cantidad)+'</del>':fN(l.cantidad))+'</td>'+
    '<td class="num">'+fD(l.precio_neto_usd_u,4)+'</td>'+
    '<td class="num precio-col">'+(pc.val?'<span class="pv">'+pc.val+'</span> <small class="pu">'+pc.unit+'</small>':'')+'</td>'+
    '<td class="num'+(l.importe_usd<0?' nc-val':'')+'">'+fN(l.importe_usd)+'</td>'+
    '<td class="num ars-col">'+fN(l.importe_ars)+'</td>'+
    '<td class="num tc-col">'+(l.tc>0?fN(l.tc):'')+'</td>'+
    (l.es_petroleo
      ? '<td class="manual-val" data-mc>'+(saved.cert||'')+'</td>'+
        '<td class="manual-val" data-mc>'+(saved.api||'')+'</td>'+
        '<td class="manual-val" data-mc>'+(saved.buque||'')+'</td>'+
        '<td class="manual-val" data-mc>'+(saved.fecha_emb||'')+'</td>'
      : '<td class="na-cell" data-mc>—</td><td class="na-cell" data-mc>—</td><td class="na-cell" data-mc>—</td><td class="na-cell" data-mc>—</td>')+
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

function updateBarChartFromLineas(lineas) {
  if (!barChart) return;
  var mesQ = document.getElementById('mesSelect').value || '';
  var filtered = MESES.filter(function(m){
    if (!activeMeses.has(m)) return false;
    if (mesQ && m !== mesQ) return false;
    return true;
  });
  barChart.data.labels = filtered.map(function(m){ return MES_LABELS[m]||m; });
  var byCat = {};
  lineas.forEach(function(l){
    if (!byCat[l.categoria]) byCat[l.categoria]={label:l.categoria,data:filtered.map(function(){return 0;}),backgroundColor:CAT_COLORS[l.categoria]||'#A0AEC0',stack:'stack'};
    var i=filtered.indexOf(l.mes);
    if(i>=0) byCat[l.categoria].data[i]+=l.importe_usd;
  });
  barChart.data.datasets=Object.values(byCat);
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

function updateDonutChartFromLineas(lineas) {
  if (!donutChart) return;
  var labels=[], data=[], colors=[];
  ALL_CATEGORIAS.forEach(function(cat){
    var val=lineas.filter(function(l){return l.categoria===cat;}).reduce(function(s,l){return s+l.importe_usd;},0);
    if(!val) return;
    labels.push(cat); data.push(Math.abs(val)); colors.push(CAT_COLORS[cat]||'#A0AEC0');
  });
  donutChart.data.labels=labels;
  donutChart.data.datasets[0].data=data;
  donutChart.data.datasets[0].backgroundColor=colors;
  donutChart.update();
}

function renderKPIs(lineas) {
  var totalFact=lineas.filter(function(l){return l.importe_usd>0;}).reduce(function(s,l){return s+l.importe_usd;},0);
  var totalNC  =lineas.filter(function(l){return l.importe_usd<0;}).reduce(function(s,l){return s+l.importe_usd;},0);
  var neto=lineas.reduce(function(s,l){return s+l.importe_usd;},0);
  var ncCount=lineas.filter(function(l){return l.importe_usd<0;}).length;
  var mesesUnic=new Set(lineas.map(function(l){return l.mes;})).size;
  function _fMM(n){var s=n<0?'−':'';return s+'us$ '+(Math.abs(n)/1e6).toFixed(3).replace('.',',')+' MM';}
  var e0=document.getElementById('kpi-total-fact');
  var e1=document.getElementById('kpi-total-nc');
  var e2=document.getElementById('kpi-neto');
  var e3=document.getElementById('kpi-meses');
  var es1=document.getElementById('kpi-nc-sub');
  if(e0) e0.textContent=_fMM(totalFact);
  if(e1) e1.textContent='('+_fMM(Math.abs(totalNC))+')';
  if(e2) e2.textContent=_fMM(neto);
  if(e3) e3.textContent=String(mesesUnic);
  if(es1) es1.textContent=ncCount+' ajuste'+(ncCount!==1?'s':'');
}

function renderClienteSummary(lineas) {
  var tbody=document.getElementById('cliente-tbody');
  if(!tbody) return;
  var cMap={};
  lineas.forEach(function(l){cMap[l.cliente]=(cMap[l.cliente]||0)+l.importe_usd;});
  var sorted=Object.keys(cMap).sort(function(a,b){return cMap[b]-cMap[a];});
  tbody.innerHTML=sorted.length>0
    ? sorted.map(function(c){return '<tr><td>'+enc(c||'—')+'</td><td class="num">'+fN(cMap[c])+'</td></tr>';}).join('')
    : '<tr><td colspan="2" style="color:#A0AEC0;text-align:center">Sin datos</td></tr>';
}

function getFilteredLineas() {
  var clienteQ =(document.getElementById('clienteSearch').value||'').toLowerCase().trim();
  var bloqueQ  =document.getElementById('bloqueSelect').value||'';
  var articuloQ=document.getElementById('articuloSelect').value||'';
  var mesQ     =document.getElementById('mesSelect').value||'';
  var mesesActivos=MESES.filter(function(m){
    if(!activeMeses.has(m)) return false;
    if(mesQ&&m!==mesQ) return false;
    return true;
  });
  return LINEAS.filter(function(l){
    if(mesesActivos.indexOf(l.mes)<0) return false;
    if(!activeTipos.has(l.categoria)) return false;
    if(clienteQ&&l.cliente.toLowerCase().indexOf(clienteQ)<0) return false;
    if(bloqueQ&&l.bloque!==bloqueQ) return false;
    if(articuloQ&&l.art_codigo!==articuloQ) return false;
    return true;
  });
}

// ── Excel export ──────────────────────────────────────────────────────────────
function fmtSheet(ws, freezeRow, numCols, colWidths) {
  if (colWidths) ws['!cols'] = colWidths.map(function(w){ return {wch:w}; });
  if (freezeRow > 0) ws['!freeze'] = {xSplit:0, ySplit:freezeRow};
  if (!numCols || !numCols.length) return;
  var range = XLSX.utils.decode_range(ws['!ref']||'A1');
  for (var ri = freezeRow; ri <= range.e.r; ri++) {
    numCols.forEach(function(info) {
      var addr = XLSX.utils.encode_cell({r:ri, c:info.c});
      if (ws[addr] && typeof ws[addr].v === 'number') { ws[addr].t = 'n'; ws[addr].z = info.z||'#,##0.00'; }
    });
  }
}

function exportarExcel() {
  saveManualData();
  var mesQ = document.getElementById('mesSelect') ? document.getElementById('mesSelect').value : '';
  var fMeses = MESES.filter(function(m){
    if (!activeMeses.has(m)) return false;
    if (mesQ && m !== mesQ) return false;
    return true;
  });
  var wb = XLSX.utils.book_new();

  // === Hoja 1: Resumen por Categoría ===
  var pivHdr = ['Categoría','Bloque'].concat(fMeses.map(function(m){return MES_LABELS[m]||m;})).concat(['Total']);
  var pivRows = [pivHdr];
  var byCat = {};
  PIVOT_DATA.forEach(function(r){ if (!byCat[r.categoria]) byCat[r.categoria]=[]; byCat[r.categoria].push(r); });
  var gTotM = {}, gTot = 0;
  fMeses.forEach(function(m){ gTotM[m]=0; });
  CAT_ORDER.concat(Object.keys(byCat).filter(function(c){return CAT_ORDER.indexOf(c)<0;})).forEach(function(cat){
    if (!byCat[cat]) return;
    var rows = byCat[cat], cTotM = {}, cTot = 0;
    fMeses.forEach(function(m){ cTotM[m]=rows.reduce(function(s,r){return s+(r.por_mes[m]||0);},0); gTotM[m]+=cTotM[m]; });
    cTot = rows.reduce(function(s,r){return s+r.total;},0); gTot += cTot;
    pivRows.push([cat,''].concat(fMeses.map(function(m){return cTotM[m]||0;})).concat([cTot]));
    rows.forEach(function(r){
      var rTot = fMeses.reduce(function(s,m){return s+(r.por_mes[m]||0);},0);
      pivRows.push(['',r.bloque].concat(fMeses.map(function(m){return r.por_mes[m]||0;})).concat([rTot]));
    });
  });
  pivRows.push(['TOTAL NETO',''].concat(fMeses.map(function(m){return gTotM[m]||0;})).concat([gTot]));
  var pivWs = XLSX.utils.aoa_to_sheet(pivRows);
  var mCols = []; for (var ci=2; ci<pivHdr.length; ci++) mCols.push({c:ci, z:'#,##0'});
  fmtSheet(pivWs, 1, mCols, [28,16].concat(fMeses.map(function(){return 14;})).concat([16]));
  XLSX.utils.book_append_sheet(wb, pivWs, 'Resumen');

  // === Hoja 2: Detalle Fiscal ===
  var clienteQx = (document.getElementById('clienteSearch') ? document.getElementById('clienteSearch').value : '').toLowerCase().trim();
  var bloqueQx  = document.getElementById('bloqueSelect') ? document.getElementById('bloqueSelect').value : '';
  var articuloQx = document.getElementById('articuloSelect') ? document.getElementById('articuloSelect').value : '';
  var detLineas = LINEAS.filter(function(l){
    if (fMeses.indexOf(l.mes) < 0) return false;
    if (!activeTipos.has(l.categoria)) return false;
    if (clienteQx && l.cliente.toLowerCase().indexOf(clienteQx)<0) return false;
    if (bloqueQx && l.bloque !== bloqueQx) return false;
    if (articuloQx && l.art_codigo !== articuloQx) return false;
    return true;
  });
  var detHdr = ['Fecha','Mes','Comprobante','Cliente','Artículo','Descripción','Bloque','Categoría','Cantidad','P.Neto USD/u','Precio','Unidad','Total Neto USD','Total Neto ARS','TC','Certificado','°API','Buque','Fecha emb.'];
  var detRows = [detHdr];
  detLineas.forEach(function(l){
    var saved = manualData[manualKey(l)]||{};
    var pc = computarPrecio(l);
    var pcVal = pc.val ? parseFloat(pc.val.replace(',','.')) : '';
    detRows.push([l.fecha, MES_LABELS[l.mes]||l.mes, l.comprobante, l.cliente, l.art_codigo, l.art_desc,
      l.bloque, l.categoria, l.cantidad||0, l.precio_neto_usd_u||0, pcVal, pc.unit,
      l.importe_usd, l.importe_ars, l.tc>0?l.tc:0, saved.cert||'', saved.api||'', saved.buque||'', saved.fecha_emb||'']);
  });
  var detWs = XLSX.utils.aoa_to_sheet(detRows);
  fmtSheet(detWs, 1,
    [{c:8,z:'#,##0.000'},{c:9,z:'#,##0.0000'},{c:10,z:'#,##0.00'},{c:12,z:'#,##0.00'},{c:13,z:'#,##0.00'},{c:14,z:'#,##0'}],
    [12,8,24,32,20,44,10,22,12,14,10,8,16,16,8,14,6,22,12]);
  XLSX.utils.book_append_sheet(wb, detWs, 'Detalle Fiscal');

  // === Hoja 3: Precios Promedio ===
  var priceHdr = ['Producto','Bloque'].concat(fMeses.map(function(m){return MES_LABELS[m]||m;})).concat(['Promedio']);
  var priceRows = [priceHdr];
  function addPriceRows(label, filterFn, toVol) {
    var lines = LINEAS.filter(function(l){ return filterFn(l) && fMeses.indexOf(l.mes)>=0 && l.cantidad!==0; });
    if (!lines.length) return;
    var bloques=[], byBlq={};
    lines.forEach(function(l){
      if (!byBlq[l.bloque]) { byBlq[l.bloque]={}; bloques.push(l.bloque); }
      if (!byBlq[l.bloque][l.mes]) byBlq[l.bloque][l.mes]={imp:0,vol:0};
      byBlq[l.bloque][l.mes].imp+=l.importe_usd; byBlq[l.bloque][l.mes].vol+=toVol(l.cantidad);
    });
    var totM={}; fMeses.forEach(function(m){totM[m]={imp:0,vol:0};});
    lines.forEach(function(l){ if(totM[l.mes]){totM[l.mes].imp+=l.importe_usd;totM[l.mes].vol+=toVol(l.cantidad);} });
    bloques.forEach(function(blq){
      var row=[label,blq], ai=0,av=0;
      fMeses.forEach(function(m){
        var g=byBlq[blq][m];
        if(g&&g.vol>0){row.push(g.imp/g.vol);ai+=g.imp;av+=g.vol;}else row.push('');
      });
      row.push(av>0?ai/av:''); priceRows.push(row);
    });
    var trow=[label+' — Total',''], gi=0,gv=0;
    fMeses.forEach(function(m){
      var g=totM[m];
      if(g&&g.vol>0){trow.push(g.imp/g.vol);gi+=g.imp;gv+=g.vol;}else trow.push('');
    });
    trow.push(gv>0?gi/gv:''); priceRows.push(trow);
    priceRows.push(new Array(priceHdr.length).fill(''));
  }
  addPriceRows('Petróleo $/bbl', function(l){return l.es_petroleo&&!/AJUSTE/i.test(l.art_codigo||'');}, function(q){return q*6.28981;});
  addPriceRows('Gas $/MMBTU',    function(l){return l.es_gas;}, function(q){return q/1000*35.314;});
  var priceWs = XLSX.utils.aoa_to_sheet(priceRows);
  var pmCols=[]; for (var pi=2;pi<priceHdr.length;pi++) pmCols.push({c:pi,z:'#,##0.00'});
  fmtSheet(priceWs, 1, pmCols, [24,14].concat(fMeses.map(function(){return 12;})).concat([12]));
  XLSX.utils.book_append_sheet(wb, priceWs, 'Precios');

  var tag = fMeses[0]||'';
  XLSX.writeFile(wb, 'Facturacion_'+(tag.replace('-','')||'export')+'.xlsx');
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Show initial count + load manual data from localStorage
(function(){
  var c = document.getElementById('fiscal-count');
  if(c) c.textContent = LINEAS.length + ' líneas';
  loadManualFromStorage();
  // Apply initial hide-done for each manual subsection (they start collapsed)
  ['manual-pet-table','manual-nc-table','manual-otros-table'].forEach(function(tid){
    document.querySelectorAll('#'+tid+' tr[data-done="1"]').forEach(function(tr){
      tr.classList.add('m-row-hidden');
    });
  });
  renderFiscal();
})();

function pedirPDF(btn){
  var id=window.location.pathname.split('/').filter(Boolean).pop();
  if(!id||id.length<10){alert('No se pudo determinar el ID del reporte.');return false;}
  btn.textContent='Generando… (~30s)';
  btn.style.opacity='0.6';
  btn.style.pointerEvents='none';
  window.open('/api/admin/reportes/'+id+'/pdf','_blank');
  setTimeout(function(){
    btn.textContent='Descargar PDF';
    btn.style.opacity='1';
    btn.style.pointerEvents='';
  },62000);
  return false;
}
<\/script>

<!-- ── TUTORIAL ─────────────────────────────────────────────────── -->
<style>
#cpt-ov{position:fixed;inset:0;z-index:99990;pointer-events:all;background:transparent}
#cpt-spl{position:fixed;z-index:99991;border-radius:8px;pointer-events:none;
  box-shadow:0 0 0 9999px rgba(15,17,40,.68);
  transition:top .35s,left .35s,width .35s,height .35s}
#cpt-pop{position:fixed;z-index:99999;background:#fff;border-radius:14px;
  padding:22px 24px;
  box-shadow:0 12px 48px rgba(15,17,40,.20),0 2px 8px rgba(15,17,40,.08);
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
  var KEY = 'cpe_tour_fac_v1';
  if (localStorage.getItem(KEY)) return;

  var STEPS = [
    {sel: null,
     title: 'Reporte de Facturación',
     desc:  'Te guiamos por las secciones principales en 5 pasos. Podés saltar el tutorial en cualquier momento usando el botón "Saltar".'},
    {sel: '.filter-bar',
     title: 'Filtros de período',
     desc:  'Seleccioná el bloque y el mes. Todos los KPIs, gráficos y tablas se actualizan automáticamente al aplicar el filtro.'},
    {sel: '#pivot-table',
     title: 'Resumen mensual',
     desc:  'Facturación agrupada por mes y categoría (petróleo, gas, regalías…). Los subtotales responden al filtro de bloque seleccionado.'},
    {sel: '#manual-section',
     title: 'Datos manuales',
     desc:  'Cargá aquí embarques, notas de crédito y otros ajustes que no figuran en el Excel. Presioná "Guardar" para sincronizarlos con el servidor.'},
    {sel: '.fiscal-filter-bar',
     title: 'Detalle por comprobante',
     desc:  'Buscá un comprobante por texto libre o filtrá por bloque y artículo. La tabla de abajo se actualiza en tiempo real.'},
    {sel: '.export-bar',
     title: 'Exportar',
     desc:  'Descargá el Excel completo (incluye datos manuales en hoja separada) o generá un PDF del reporte directamente desde el servidor.'},
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

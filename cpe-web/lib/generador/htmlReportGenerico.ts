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
  .no-print{}
  @media print{
    body{background:#fff;padding:16px}
    .no-print{display:none!important}
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
<script>
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
  var KEY = 'cpe_tour_generico_v1';
  if (localStorage.getItem(KEY)) return;

  var STEPS = [
    {sel: null,
     title: 'Bienvenido al Reporte',
     desc:  'Te mostramos cómo navegar las secciones de este reporte. Podés saltar el tutorial en cualquier momento.'},
    {sel: 'header',
     title: 'Encabezado',
     desc:  'Identificá el tipo de reporte, el período cubierto y el nombre del archivo original cargado.'},
    {sel: '.toc',
     title: 'Índice de hojas',
     desc:  'Usá el índice para saltar directamente a cualquier hoja del reporte sin necesidad de hacer scroll.'},
    {sel: '#hoja-0',
     title: 'Primera hoja de datos',
     desc:  'Cada hoja corresponde a una pestaña del Excel original. Las tablas muestran los datos tal como fueron procesados.'},
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

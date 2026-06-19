// Self-contained HTML infographic generator for Crown Point Energía.
// Output is screenshotted by puppeteer in /api/infografia/png.

export type InfografiaData = {
  stats: { pozos: string; inyectores: string; cuencas: string; ha: string; anios: string }
  production: { val: string; unit: string; mix: string; periodo: string }
  blocks: { slug: string; titulo: string; subtitulo: string; commodity: 'oil' | 'gas' | 'mixed'; wi?: string }[]
  stock: { price: string; delta: string; deltaP: string; high52: string; low52: string; cap: string; shares: string; isUp: boolean }
  ratings: { concepto: string; isin: string; rating: string }[]
  date: string
  url: string
}

const COMM_COLOR: Record<string, string> = {
  oil:   '#1F2566',
  gas:   '#4a8a3a',
  mixed: '#6CAE52',
}

const COMM_LABEL: Record<string, string> = {
  oil: 'Petróleo', gas: 'Gas natural', mixed: 'Petróleo + Gas',
}

export function generateInfografiaHtml(d: InfografiaData): string {
  const ratingColor = (r: string) => r.startsWith('A') ? '#6CAE52' : '#4a8a3a'

  const blockCards = d.blocks.map((b, i) => `
    <div style="background:rgba(31,37,102,0.55);border:1px solid rgba(108,174,82,0.22);border-radius:10px;padding:18px 20px;">
      <div style="font-size:9px;letter-spacing:0.2em;color:#6CAE52;font-weight:700;text-transform:uppercase;margin-bottom:6px;">
        BLOQUE 0${i + 1}
      </div>
      <div style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;color:#fff;line-height:1.25;margin-bottom:4px;">
        ${b.titulo}
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:10px;">${b.subtitulo}</div>
      <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;
        padding:3px 10px;border-radius:999px;color:#fff;background:${COMM_COLOR[b.commodity]};">
        ${COMM_LABEL[b.commodity]}${b.wi ? ' · ' + b.wi : ''}
      </span>
    </div>
  `).join('')

  const ratingRows = d.ratings.map(r => `
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:#031636;
        background:${ratingColor(r.rating)};padding:4px 12px;border-radius:6px;flex-shrink:0;min-width:90px;text-align:center;">
        ${r.rating}
      </div>
      <div>
        <div style="font-size:12px;color:#fff;font-weight:600;margin-bottom:2px;">${r.concepto}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);">${r.isin}</div>
      </div>
    </div>
  `).join('')

  const deltaColor = d.stock.isUp ? '#6CAE52' : '#C94A4A'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1080px; background: #031636; color: #fff; font-family: 'Inter', system-ui, sans-serif; }
</style>
</head>
<body>
<div id="ig" style="width:1080px;background:#031636;display:flex;flex-direction:column;min-height:1350px;">

  <!-- Header -->
  <div style="background:#0d1a4a;padding:28px 48px;display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #6CAE52;">
    <div style="display:flex;align-items:center;gap:18px;">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <polygon points="24,2 46,44 2,44" fill="#6CAE52"/>
        <polygon points="24,13 40,44 8,44" fill="#031636" opacity="0.5"/>
        <polygon points="24,2 46,44 2,44" fill="none" stroke="#6CAE52" stroke-width="1"/>
      </svg>
      <div>
        <div style="font-family:'Montserrat',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.01em;line-height:1.1;color:#fff;">
          CROWN POINT ENERGÍA S.A.
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:0.18em;text-transform:uppercase;margin-top:4px;">
          Exploración &amp; Producción · Argentina
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;color:#6CAE52;letter-spacing:0.06em;">TSX.V: CWV</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;letter-spacing:0.1em;">${d.date.toUpperCase()}</div>
    </div>
  </div>

  <!-- Headline -->
  <div style="padding:36px 48px 28px;border-bottom:1px solid rgba(108,174,82,0.22);">
    <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#6CAE52;font-weight:700;margin-bottom:12px;">
      PERFIL CORPORATIVO
    </div>
    <div style="font-family:'Montserrat',sans-serif;font-size:42px;font-weight:900;letter-spacing:-0.03em;line-height:1.02;color:#fff;">
      Upstream argentino<br>con alcance internacional.
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.55);margin-top:14px;line-height:1.6;max-width:620px;">
      Con más de ${d.stats.anios} años de operación ininterrumpida, Crown Point opera seis bloques
      en cuatro cuencas históricamente productoras de Argentina.
    </div>
  </div>

  <!-- Stats strip -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid rgba(108,174,82,0.22);">
    ${[
      { val: d.stats.pozos,      label: 'Pozos\nproductivos' },
      { val: d.stats.inyectores, label: 'Pozos\ninyectores' },
      { val: d.stats.cuencas,    label: 'Cuencas\nproductoras' },
      { val: d.stats.ha,         label: 'Hectáreas\noperadas' },
      { val: d.stats.anios,      label: 'Años en upstream\nargentino' },
    ].map((s, i) => `
      <div style="padding:26px 22px;${i < 4 ? 'border-right:1px solid rgba(108,174,82,0.18);' : ''}">
        <div style="font-family:'Montserrat',sans-serif;font-size:36px;font-weight:900;color:#6CAE52;letter-spacing:-0.04em;line-height:1;">
          ${s.val}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:7px;line-height:1.4;white-space:pre-line;">
          ${s.label}
        </div>
      </div>
    `).join('')}
  </div>

  <!-- Production KPI -->
  <div style="padding:28px 48px;border-bottom:1px solid rgba(108,174,82,0.22);background:rgba(31,37,102,0.25);">
    <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:14px;">
      PRODUCCIÓN ${d.production.periodo}
    </div>
    <div style="display:flex;align-items:baseline;gap:20px;flex-wrap:wrap;">
      <div style="font-family:'Montserrat',sans-serif;font-size:68px;font-weight:900;color:#fff;letter-spacing:-0.05em;line-height:1;">
        ${d.production.val}
      </div>
      <div>
        <div style="font-size:22px;color:rgba(255,255,255,0.55);font-weight:300;">${d.production.unit}</div>
        <div style="margin-top:6px;">
          <span style="display:inline-block;font-size:12px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;
            padding:4px 14px;border-radius:999px;color:#031636;background:#6CAE52;">
            ${d.production.mix}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Blocks -->
  <div style="padding:28px 48px;border-bottom:1px solid rgba(108,174,82,0.22);">
    <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:16px;">
      6 BLOQUES EN 4 CUENCAS
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
      ${blockCards}
    </div>
  </div>

  <!-- Stock + Ratings -->
  <div style="display:grid;grid-template-columns:1fr 1fr;flex:1;">
    <div style="padding:28px 48px;border-right:1px solid rgba(108,174,82,0.22);border-bottom:1px solid rgba(108,174,82,0.22);">
      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:16px;">
        MERCADO DE CAPITALES · TSXV
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:48px;font-weight:500;color:#fff;letter-spacing:-0.03em;line-height:1;">
        ${d.stock.price}
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:${deltaColor};margin-top:8px;">
        ${d.stock.delta} (${d.stock.deltaP}) al cierre
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px;">
        ${[
          { label: 'Cap. de mercado', val: d.stock.cap },
          { label: 'Acciones', val: d.stock.shares },
          { label: 'Máx. 52 sem.', val: d.stock.high52 },
          { label: 'Mín. 52 sem.', val: d.stock.low52 },
        ].map(m => `
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:500;color:#fff;">${m.val}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:3px;letter-spacing:0.06em;">${m.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="padding:28px 48px;border-bottom:1px solid rgba(108,174,82,0.22);">
      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:16px;">
        CALIFICACIONES FIX SCR · MAY 2026
      </div>
      <!-- Company rating -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(108,174,82,0.2);">
        <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#031636;
          background:#6CAE52;padding:8px 18px;border-radius:8px;letter-spacing:-0.02em;">
          BBB<span style="font-size:18px;">(arg)</span>
        </div>
        <div>
          <div style="font-size:13px;color:#fff;font-weight:600;">Largo Plazo</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Perspectiva Estable · Confirma</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:2px;">Calificación emisor</div>
        </div>
      </div>
      <!-- ON ratings -->
      ${ratingRows}
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:18px 48px;background:rgba(0,0,0,0.25);display:flex;justify-content:space-between;align-items:center;margin-top:auto;">
    <div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#6CAE52;letter-spacing:0.04em;">${d.url}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:3px;">Relaciones con Inversores · inversores@crownpointenergia.com</div>
    </div>
    <div style="font-size:9px;color:rgba(255,255,255,0.25);max-width:360px;text-align:right;line-height:1.5;">
      Datos orientativos. No constituyen asesoramiento de inversión. Fuentes: CMS, Yahoo Finance, FIX SCR.
    </div>
  </div>

</div>
</body>
</html>`
}

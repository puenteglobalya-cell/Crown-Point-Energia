import React from 'react'

// Piezas del informe: tarjetas de KPI, gráficos y hoja de estilos. Viven
// aparte del cliente para poder renderizarlas fuera de Next y revisar cómo
// quedan impresas sin depender de la base ni del login.

export type Fila = Record<string, any>

const AZUL = '#1f2566'
const VERDE = '#2d7a4a'
const AMBAR = '#d69e2e'

export const mm = (v: number) => `US$ ${(v / 1e6).toFixed(2)} MM`
export const n0 = (v: number) => Math.round(v).toLocaleString('es-AR')

export function Kpi({ label, val, nota, destacado }: { label: string; val: string; nota?: string; destacado?: boolean }) {
  return (
    <div className={`kpi${destacado ? ' kpi-destacado' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{val}</div>
      {nota && <div className="kpi-nota">{nota}</div>}
    </div>
  )
}

// Barras apiladas: petróleo en BOE y gas en BOE por año.
export function GraficoProduccion({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return <p className="pie">Sin datos.</p>
  const W = 760, H = 240, PAD_L = 66, PAD_B = 34, PAD_T = 12
  const datos = filas.map(f => ({
    anio: Number(f.anio),
    oil: Number(f.produccion_petroleo_bbl),
    gas: Number(f.produccion_gas_mcf) / 6,
  }))
  const max = Math.max(...datos.map(d => d.oil + d.gas), 1)
  const bw = (W - PAD_L - 16) / datos.length
  const y = (v: number) => H - PAD_B - (v / max) * (H - PAD_B - PAD_T)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line x1={PAD_L} y1={y(max * t)} x2={W - 16} y2={y(max * t)} stroke="#e2e2e8" />
          <text x={PAD_L - 6} y={y(max * t) + 3} className="eje" textAnchor="end">{n0(max * t)}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const x = PAD_L + i * bw + bw * 0.15
        const w = bw * 0.7
        const hOil = H - PAD_B - y(d.oil)
        const hGas = H - PAD_B - y(d.gas)
        return (
          <g key={d.anio}>
            <rect x={x} y={y(d.oil)} width={w} height={hOil} fill={AZUL} />
            <rect x={x} y={y(d.oil) - hGas} width={w} height={hGas} fill={AMBAR} />
            {(datos.length <= 14 || i % 2 === 0) && (
              <text x={x + w / 2} y={H - PAD_B + 13} className="eje" textAnchor="middle">{d.anio}</text>
            )}
          </g>
        )
      })}
      <rect x={PAD_L} y={H - 12} width={9} height={9} fill={AZUL} />
      <text x={PAD_L + 13} y={H - 4} className="eje">Petróleo (BOE)</text>
      <rect x={PAD_L + 100} y={H - 12} width={9} height={9} fill={AMBAR} />
      <text x={PAD_L + 113} y={H - 4} className="eje">Gas (BOE)</text>
    </svg>
  )
}

// Barras del flujo anual + línea del acumulado, con el cruce de payback.
export function GraficoFlujo({ filas }: { filas: { anio: number; neto_usd: number; acumulado_usd: number }[] }) {
  if (filas.length === 0) return <p className="pie">Sin datos.</p>
  const W = 760, H = 250, PAD_L = 70, PAD_B = 34, PAD_T = 12
  const vals = [...filas.map(f => f.neto_usd), ...filas.map(f => f.acumulado_usd), 0]
  const min = Math.min(...vals), max = Math.max(...vals)
  const rango = max - min || 1
  const bw = (W - PAD_L - 16) / filas.length
  const y = (v: number) => H - PAD_B - ((v - min) / rango) * (H - PAD_B - PAD_T)
  const cx = (i: number) => PAD_L + i * bw + bw / 2

  const linea = filas.map((f, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${y(f.acumulado_usd).toFixed(1)}`).join(' ')
  const cruce = filas.findIndex(f => f.acumulado_usd >= 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      {[0, 0.5, 1].map(t => {
        const v = min + rango * t
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y(v)} x2={W - 16} y2={y(v)} stroke="#e2e2e8" />
            <text x={PAD_L - 6} y={y(v) + 3} className="eje" textAnchor="end">{(v / 1e6).toFixed(1)}MM</text>
          </g>
        )
      })}
      <line x1={PAD_L} y1={y(0)} x2={W - 16} y2={y(0)} stroke="#9a9aa5" strokeWidth={1} />
      {filas.map((f, i) => {
        const x = PAD_L + i * bw + bw * 0.2
        const w = bw * 0.6
        const y0 = y(0), yv = y(f.neto_usd)
        return (
          <g key={f.anio}>
            <rect x={x} y={Math.min(y0, yv)} width={w} height={Math.abs(yv - y0)}
              fill={f.neto_usd >= 0 ? '#8f97c9' : '#d99b91'} />
            {(filas.length <= 14 || i % 2 === 0) && (
              <text x={x + w / 2} y={H - PAD_B + 13} className="eje" textAnchor="middle">{f.anio}</text>
            )}
          </g>
        )
      })}
      <path d={linea} fill="none" stroke={AZUL} strokeWidth={2} />
      {cruce >= 0 && (
        <g>
          <circle cx={cx(cruce)} cy={y(filas[cruce].acumulado_usd)} r={4} fill={VERDE} />
          <text x={cx(cruce)} y={y(filas[cruce].acumulado_usd) - 8} className="eje" textAnchor="middle" fill={VERDE}>
            payback {filas[cruce].anio}
          </text>
        </g>
      )}
      <rect x={PAD_L} y={H - 12} width={9} height={9} fill="#8f97c9" />
      <text x={PAD_L + 13} y={H - 4} className="eje">Flujo del año</text>
      <line x1={PAD_L + 100} y1={H - 8} x2={PAD_L + 118} y2={H - 8} stroke={AZUL} strokeWidth={2} />
      <text x={PAD_L + 123} y={H - 4} className="eje">Acumulado</text>
    </svg>
  )
}

export const cssImpresion = `
.informe-barra {
  position: sticky; top: 0; z-index: 10; display: flex; gap: 16px; align-items: center;
  justify-content: space-between; padding: 12px 24px; background: #1f2566; color: #fff; font-size: 13px;
}
.informe {
  max-width: 860px; margin: 0 auto; padding: 32px 28px 60px;
  background: #fff; color: #16161a;
  font-family: var(--font-sans, system-ui, sans-serif); font-size: 12px; line-height: 1.5;
}
.informe .portada { border-bottom: 3px solid ${AZUL}; padding-bottom: 20px; margin-bottom: 26px; }
.informe .marca { font-size: 11px; letter-spacing: 0.16em; color: ${AZUL}; font-weight: 700; }
.informe h1 { font-size: 27px; margin: 10px 0 2px; color: ${AZUL}; font-weight: 700; letter-spacing: -0.02em; }
.informe h2 { font-size: 17px; margin: 0 0 10px; font-weight: 500; color: #44444e; }
.informe h3 {
  font-size: 13px; text-transform: uppercase; letter-spacing: 0.07em; color: ${AZUL};
  border-bottom: 1px solid #d8d8e0; padding-bottom: 5px; margin: 26px 0 12px; font-weight: 700;
}
.informe .sub { margin: 2px 0; color: #55555f; font-size: 12px; }
.informe .nota-portada { margin-top: 14px; font-size: 10.5px; color: #66666f; line-height: 1.45; }
.informe .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.informe .kpi { border: 1px solid #dededf; border-radius: 6px; padding: 10px 12px; }
.informe .kpi-destacado { border-color: ${AZUL}; border-width: 2px; background: #f6f7fb; }
.informe .kpi-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #6a6a74; }
.informe .kpi-val { font-size: 17px; font-weight: 700; color: ${AZUL}; margin-top: 3px; }
.informe .kpi-nota { font-size: 9.5px; color: #7a7a84; margin-top: 1px; }
.informe table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 6px; }
.informe th {
  text-align: left; background: ${AZUL}; color: #fff; padding: 6px 7px; font-weight: 600; font-size: 9.5px;
}
.informe td { padding: 4px 7px; border-bottom: 1px solid #e6e6ec; }
.informe tbody tr:nth-child(even) td { background: #fafafc; }
.informe .der { text-align: right; }
.informe .mono { font-variant-numeric: tabular-nums; font-family: var(--font-mono, ui-monospace, monospace); }
.informe .fuerte { font-weight: 700; }
.informe .pie { font-size: 10px; color: #6a6a74; margin: 2px 0 8px; }
.informe .grafico { width: 100%; height: auto; }
.informe .eje { font-size: 9px; fill: #6a6a74; }
.informe .pie-informe {
  margin-top: 34px; padding-top: 12px; border-top: 1px solid #d8d8e0;
  font-size: 9.5px; color: #7a7a84;
}
.informe .salto { break-before: page; }
.informe .evitar-corte { break-inside: avoid; }

@media print {
  @page { size: A4 portrait; margin: 14mm 12mm; }
  .no-print, .portal-nav { display: none !important; }
  body, .portal-main { background: #fff !important; padding: 0 !important; margin: 0 !important; }
  .informe { max-width: none; padding: 0; font-size: 10.5px; }
  .informe section { break-inside: avoid; }
  .informe thead { display: table-header-group; }
  .informe tr { break-inside: avoid; }
  .informe h1 { font-size: 23px; }
  .informe .kpi-val { font-size: 15px; }
}
`

// Waterfall del año o del total: de dónde sale el ingreso bruto y qué se lo
// va comiendo hasta llegar al resultado. Responde "¿por qué el EBITDA es ése?"
// mucho más rápido que una fila de tabla.
export type PasoWaterfall = { etiqueta: string; monto: number; tipo: 'base' | 'resta' | 'total' }

export function GraficoWaterfall({ pasos }: { pasos: PasoWaterfall[] }) {
  if (pasos.length === 0) return <p className="pie">Sin datos.</p>
  const W = 760, H = 260, PAD_L = 54, PAD_B = 56, PAD_T = 16

  // Acumulado para saber a qué altura arranca cada barra
  let acum = 0
  const barras = pasos.map(p => {
    if (p.tipo === 'total') return { ...p, desde: 0, hasta: p.monto }
    const desde = acum
    acum += p.tipo === 'resta' ? -Math.abs(p.monto) : p.monto
    return { ...p, desde, hasta: acum }
  })

  const vals = barras.flatMap(b => [b.desde, b.hasta]).concat(0)
  const min = Math.min(...vals), max = Math.max(...vals)
  const rango = max - min || 1
  const bw = (W - PAD_L - 16) / barras.length
  const y = (v: number) => H - PAD_B - ((v - min) / rango) * (H - PAD_B - PAD_T)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      {[0, 0.5, 1].map(t => {
        const v = min + rango * t
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y(v)} x2={W - 16} y2={y(v)} stroke="#e2e2e8" />
            <text x={PAD_L - 6} y={y(v) + 3} className="eje" textAnchor="end">{(v / 1e6).toFixed(0)}MM</text>
          </g>
        )
      })}
      <line x1={PAD_L} y1={y(0)} x2={W - 16} y2={y(0)} stroke="#9a9aa5" />
      {barras.map((b, i) => {
        const x = PAD_L + i * bw + bw * 0.18
        const w = bw * 0.64
        const y1 = y(Math.max(b.desde, b.hasta)), y2 = y(Math.min(b.desde, b.hasta))
        const color = b.tipo === 'total' ? AZUL : b.tipo === 'resta' ? '#d99b91' : '#8f97c9'
        return (
          <g key={b.etiqueta}>
            <rect x={x} y={y1} width={w} height={Math.max(y2 - y1, 1.5)} rx={2} fill={color} />
            <text x={x + w / 2} y={y1 - 4} className="eje" textAnchor="middle">
              {(Math.abs(b.monto) / 1e6).toFixed(1)}
            </text>
            {/* Etiquetas en dos líneas: los nombres no entran en una sola */}
            {b.etiqueta.split(' ').reduce<string[][]>((lineas, palabra) => {
              const ult = lineas[lineas.length - 1]
              if (ult && (ult.join(' ') + ' ' + palabra).length <= 12) ult.push(palabra)
              else lineas.push([palabra])
              return lineas
            }, []).slice(0, 2).map((linea, j) => (
              <text key={j} x={x + w / 2} y={H - PAD_B + 14 + j * 11} className="eje" textAnchor="middle">
                {linea.join(' ')}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

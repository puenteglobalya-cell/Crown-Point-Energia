'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { DatosIngresos } from '@/lib/parsers/ingresos'

const C = {
  navy:    '#1F2566',
  green:   '#6CAE52',
  naranja: '#E07B30',
  violeta: '#6B5EA8',
  azul:    '#3B82C4',
  warm:    '#C4873B',
  muted:   '#8e91b0',
}

const TYPE_LABELS: Record<string, string> = {
  ingresos:    'Ingresos Estimados',
  accionista:  'Reporte Accionista',
  facturacion: 'Facturación',
  produccion:  'Producción',
  financiero:  'Financiero',
}

const TYPE_COLORS: Record<string, string> = {
  ingresos:    C.navy,
  accionista:  C.violeta,
  facturacion: C.naranja,
  produccion:  C.green,
  financiero:  C.azul,
}

function fmt(n: number | null | undefined, d = 1): string {
  if (n == null || isNaN(n as number)) return '—'
  return (n as number).toFixed(d).replace('.', ',')
}

interface RecentRow {
  id: string
  type_id: string | null
  titulo: string | null
  periodo: string | null
  created_at: string
}

interface Props {
  latest: DatosIngresos | null
  latestId: string | null
  recientes: RecentRow[]
}

export default function DashboardClient({ latest, latestId, recientes }: Props) {
  const refBar   = useRef<HTMLCanvasElement>(null)
  const refDonut = useRef<HTMLCanvasElement>(null)
  const refPrice = useRef<HTMLCanvasElement>(null)

  const hist      = latest?.mensual_historico ?? []
  const hasCharts = hist.length >= 2

  // KPIs
  const mes       = latest?.mes ?? null
  const totalMM   = latest?.ventas_MM ?? null
  const prod      = latest?.vol_producido_boed ?? null
  const precio    = latest?.precio_neto_oil ?? null
  const precioGas = latest?.precio_neto_gas ?? null
  const dias      = latest?.dias ?? null
  const brent     = latest?.brent_prom ?? null
  const medanito  = latest?.medanito_prom ?? null
  const stock     = latest?.stock_MM ?? null
  const oilPct    = latest?.oil_pct_prod ?? null
  const gasPct    = latest?.gas_pct_prod ?? null

  // Deltas from history
  const curMes  = hist.at(-1)
  const prevMes = hist.at(-2)
  const deltaRev = curMes && prevMes && prevMes.total_MM
    ? ((curMes.total_MM - prevMes.total_MM) / Math.abs(prevMes.total_MM)) * 100
    : null

  // Donut: area contributions
  const areas   = latest?.areas
  const ingET   = areas?.ET.ingreso   ?? 0
  const ingPCKK = areas?.PCKK.ingreso ?? 0
  const ingCH   = areas?.CH.ingreso   ?? 0
  const ingRCLV = areas?.RCLV.ingreso ?? 0
  const ingGas  = (latest?.gas.ET.ingreso ?? 0) + (latest?.gas.RCLV.ingreso ?? 0)
  const totalUS = ingET + ingPCKK + ingCH + ingRCLV + ingGas

  // Area production table rows
  const areaRows = latest ? [
    { name: 'ET / LT',   color: C.naranja, prodM3: areas?.ET.prod_100_m3d,   precio: areas?.ET.precio_neto,   ingMM: ingET / 1e6 },
    { name: 'PC-KK',     color: C.azul,    prodM3: areas?.PCKK.prod_100_m3d, precio: areas?.PCKK.precio_neto, ingMM: ingPCKK / 1e6 },
    { name: 'CH / PPCO', color: C.violeta, prodM3: areas?.CH.prod_100_m3d,   precio: areas?.CH.precio_neto,   ingMM: ingCH / 1e6 },
    { name: 'RCLV',      color: C.green,   prodM3: areas?.RCLV.prod_100_m3d, precio: areas?.RCLV.precio_neto, ingMM: ingRCLV / 1e6 },
  ].filter(r => (r.ingMM ?? 0) !== 0) : []

  const gasRows = latest ? [
    { name: 'Gas ET',   color: C.warm, prodMcfd: latest.gas.ET.prod_mcfd,   precioMcf: latest.gas.ET.precio_mcf,   ingMM: latest.gas.ET.ingreso / 1e6 },
    { name: 'Gas RCLV', color: C.warm, prodMcfd: latest.gas.RCLV.prod_mcfd, precioMcf: latest.gas.RCLV.precio_mcf, ingMM: latest.gas.RCLV.ingreso / 1e6 },
  ].filter(r => (r.ingMM ?? 0) !== 0) : []

  useEffect(() => {
    if (!hasCharts) return

    let cancelled = false
    const instances: { destroy(): void }[] = []

    import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled) return

      // Stacked bar — revenue evolution
      if (refBar.current) {
        instances.push(new Chart(refBar.current, {
          type: 'bar',
          data: {
            labels: hist.map(m => m.mes),
            datasets: [
              { label: 'ET/LT',   data: hist.map(m => m.ET_MM),   backgroundColor: C.naranja, borderRadius: 3, borderSkipped: false },
              { label: 'PC-KK',   data: hist.map(m => m.PCKK_MM), backgroundColor: C.azul,    borderRadius: 3, borderSkipped: false },
              { label: 'CH/PPCO', data: hist.map(m => m.CH_MM),   backgroundColor: C.violeta, borderRadius: 3, borderSkipped: false },
              { label: 'RCLV',    data: hist.map(m => m.RCLV_MM), backgroundColor: C.green,   borderRadius: 3, borderSkipped: false },
              { label: 'Gas',     data: hist.map(m => m.gas_MM),  backgroundColor: C.warm,    borderRadius: 3, borderSkipped: false },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, color: C.muted } },
              tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: US$ ${Number(c.raw).toFixed(2)}MM` } },
            },
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: C.muted, maxRotation: 45 } },
              y: { stacked: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { callback: (v) => `$${v}MM`, font: { size: 10 }, color: C.muted } },
            },
          },
        }))
      }

      // Donut — area composition
      if (refDonut.current && totalUS > 0) {
        const totalMM_d = totalUS / 1_000_000
        instances.push(new Chart(refDonut.current, {
          type: 'doughnut',
          data: {
            labels: ['ET/LT', 'PC-KK', 'CH/PPCO', 'RCLV', 'Gas'],
            datasets: [{
              data: [ingET, ingPCKK, ingCH, ingRCLV, ingGas].map(v => parseFloat((v / 1_000_000).toFixed(4))),
              backgroundColor: [C.naranja, C.azul, C.violeta, C.green, C.warm],
              borderWidth: 0,
              hoverOffset: 8,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, color: C.muted } },
              tooltip: {
                callbacks: {
                  label: (c) => {
                    const raw = Number(c.raw)
                    const pct = totalMM_d > 0 ? (raw / totalMM_d * 100).toFixed(1) : '0'
                    return ` ${c.label}: US$ ${raw.toFixed(2)}MM (${pct}%)`
                  },
                },
              },
            },
          },
        }))
      }

      // Line — price evolution
      if (refPrice.current) {
        instances.push(new Chart(refPrice.current, {
          type: 'line',
          data: {
            labels: hist.map(m => m.mes),
            datasets: [
              { label: 'ET/LT',   data: hist.map(m => m.precio_ET),   borderColor: C.naranja, backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderWidth: 2.5 },
              { label: 'PC-KK',   data: hist.map(m => m.precio_PCKK), borderColor: C.azul,    backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderWidth: 2.5 },
              { label: 'CH/PPCO', data: hist.map(m => m.precio_CH),   borderColor: C.violeta, backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderWidth: 2.5 },
              { label: 'RCLV',    data: hist.map(m => m.precio_RCLV), borderColor: C.green,   backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderWidth: 2.5 },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, color: C.muted } },
              tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: US$ ${Number(c.parsed).toFixed(2)}/bbl` } },
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 }, color: C.muted, maxRotation: 45 } },
              y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { callback: (v) => `$${v}`, font: { size: 10 }, color: C.muted } },
            },
          },
        }))
      }
    })

    return () => {
      cancelled = true
      instances.forEach(c => c.destroy())
    }
  }, [latest]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1080, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.muted, margin: '0 0 4px' }}>
          Dashboard Ejecutivo
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: 0 }}>
            {mes ?? 'Crown Point Energía'}
          </h1>
          {latestId && (
            <Link href={`/api/admin/reportes/${latestId}`} target="_blank"
              style={{ fontSize: 12, color: C.navy, textDecoration: 'none', fontWeight: 600 }}>
              Ver reporte completo →
            </Link>
          )}
        </div>
        {(brent != null || medanito != null) && (
          <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
            {brent != null && <>Brent: US$ {fmt(brent, 2)}/bbl</>}
            {brent != null && medanito != null && <span style={{ margin: '0 8px' }}>·</span>}
            {medanito != null && <>Medanito: US$ {fmt(medanito, 2)}/bbl</>}
            {(oilPct != null || gasPct != null) && (
              <span style={{ marginLeft: 12 }}>
                Mix: {oilPct != null ? `${fmt(oilPct, 0)}% petróleo` : ''}
                {oilPct != null && gasPct != null && ' / '}
                {gasPct != null ? `${fmt(gasPct, 0)}% gas` : ''}
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── KPI Cards ── */}
      {latest ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard
            label="Ingresos del período"
            value={totalMM != null ? `US$ ${fmt(totalMM, 2)}MM` : '—'}
            delta={deltaRev}
          />
          <KpiCard
            label="Producción total"
            value={prod != null ? `${Math.round(prod).toLocaleString('es-AR')} BOED` : '—'}
          />
          <KpiCard
            label="Precio neto petróleo"
            value={precio != null ? `US$ ${fmt(precio, 2)}/bbl` : '—'}
          />
          <KpiCard
            label="Precio neto gas"
            value={precioGas != null && precioGas > 0 ? `US$ ${fmt(precioGas, 3)}/MCF` : '—'}
          />
          <KpiCard
            label="Stock en tierra"
            value={stock != null && stock > 0 ? `US$ ${fmt(stock, 2)}MM` : '—'}
          />
          <KpiCard
            label="Días del período"
            value={dias != null ? `${dias} días` : '—'}
          />
        </div>
      ) : (
        <EmptyState />
      )}

      {/* ── Charts ── */}
      {hasCharts && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            <ChartCard title="Evolución de Ingresos" sub="MM USD · por área">
              <canvas ref={refBar} />
            </ChartCard>
            <ChartCard title="Composición del Período" sub={totalUS > 0 ? `US$ ${fmt(totalUS / 1_000_000, 2)}MM total` : 'por área'}>
              <canvas ref={refDonut} />
            </ChartCard>
          </div>
          <ChartCard title="Precio Neto por Área" sub="US$/bbl · evolución mensual" style={{ marginBottom: 24, height: 260 }}>
            <canvas ref={refPrice} />
          </ChartCard>
        </>
      )}

      {/* ── Area breakdown table ── */}
      {latest && (areaRows.length > 0 || gasRows.length > 0) && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 6px rgba(15,17,40,.07)', border: '1px solid var(--rule)', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: '0 0 2px' }}>Desglose por Área</p>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 14px' }}>producción y precios del período</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: C.muted }}>Área</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: C.muted }}>Producción</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: C.muted }}>Precio neto</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: C.muted }}>Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {areaRows.map(r => (
                  <tr key={r.name} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{r.name}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', color: 'var(--fg-soft)' }}>
                      {r.prodM3 != null && r.prodM3 > 0 ? `${fmt(r.prodM3, 1)} m³/d` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', color: 'var(--fg-soft)' }}>
                      {r.precio != null && r.precio > 0 ? `US$ ${fmt(r.precio, 2)}/bbl` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>
                      {r.ingMM != null ? `US$ ${fmt(r.ingMM, 3)}MM` : '—'}
                    </td>
                  </tr>
                ))}
                {gasRows.map(r => (
                  <tr key={r.name} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{r.name}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', color: 'var(--fg-soft)' }}>
                      {r.prodMcfd != null && r.prodMcfd > 0 ? `${fmt(r.prodMcfd, 0)} MCFD` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', color: 'var(--fg-soft)' }}>
                      {r.precioMcf != null && r.precioMcf > 0 ? `US$ ${fmt(r.precioMcf, 3)}/MCF` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>
                      {r.ingMM != null ? `US$ ${fmt(r.ingMM, 3)}MM` : '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-alt)' }}>
                  <td style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--fg)' }} colSpan={3}>Total</td>
                  <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg)' }}>
                    US$ {fmt(totalUS / 1e6, 3)}MM
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent reports ── */}
      {recientes.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 6px rgba(15,17,40,.07)', border: '1px solid var(--rule)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: '0 0 2px' }}>
            Últimos Reportes Publicados
          </p>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 14px' }}>acceso directo</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recientes.map((r, i) => (
              <li key={r.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < recientes.length - 1 ? '1px solid var(--rule)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[r.type_id ?? ''] ?? C.muted, flexShrink: 0 }} />
                  <div>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                      {TYPE_LABELS[r.type_id ?? ''] ?? r.type_id}
                    </span>
                    <span style={{ fontSize: 11, color: C.muted }}>
                      {r.periodo ?? r.titulo ?? '—'}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/api/admin/reportes/${r.id}`}
                  target="_blank"
                  style={{ fontSize: 12, fontWeight: 600, color: C.navy, textDecoration: 'none', padding: '5px 14px', background: 'var(--bg)', borderRadius: 20, border: '1px solid var(--rule)', whiteSpace: 'nowrap' }}
                >
                  Ver →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  const sign  = delta != null && delta > 0 ? '+' : ''
  const color = delta == null ? C.muted : delta > 0 ? '#22a05b' : delta < 0 ? '#e03f3f' : C.muted
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 6px rgba(15,17,40,.07)', border: '1px solid var(--rule)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.muted, margin: '0 0 8px' }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0, lineHeight: 1.2 }}>
        {value}
      </p>
      {delta != null && (
        <p style={{ fontSize: 12, color, margin: '4px 0 0', fontWeight: 600 }}>
          {sign}{delta.toFixed(1)}% vs mes anterior
        </p>
      )}
    </div>
  )
}

function ChartCard({ title, sub, children, style }: { title: string; sub?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 6px rgba(15,17,40,.07)', border: '1px solid var(--rule)', ...style }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{title}</p>
      {sub && <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 12px' }}>{sub}</p>}
      <div style={{ height: 220, position: 'relative' }}>
        {children}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '48px 24px', marginBottom: 24, textAlign: 'center', border: '1px solid var(--rule)' }}>
      <p style={{ fontSize: 32, margin: '0 0 12px' }}>📊</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px' }}>Sin reportes cargados</p>
      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
        Subí un reporte de{' '}
        <Link href="/portal/subir" style={{ color: C.navy, fontWeight: 600 }}>Ingresos Estimados</Link>
        {' '}para ver el dashboard ejecutivo.
      </p>
    </div>
  )
}

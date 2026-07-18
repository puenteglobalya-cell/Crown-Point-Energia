'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { DatosIngresos } from '@/lib/parsers/ingresos'
import { AdminPageHeader } from '@/components/AdminPageHeader'

export type ReporteConDatos = {
  id: string
  titulo: string
  periodo: string
  estado: string
  datos: DatosIngresos
}

type MetricDef = {
  key: string
  label: string
  group: string
  unit: string
  get: (d: DatosIngresos) => number | null | undefined
  /** decimals for display */
  dp?: number
  /** true when a lower value is the "better"/positive direction (none here, but kept for clarity) */
}

const METRICS: MetricDef[] = [
  { key: 'ventas_MM', label: 'Ventas', group: 'Resultado', unit: 'MM US$', get: d => d.ventas_MM, dp: 2 },
  { key: 'stock_MM', label: 'Stock valorizado', group: 'Resultado', unit: 'MM US$', get: d => d.stock_MM, dp: 2 },
  { key: 'vol_producido_boed', label: 'Volumen producido', group: 'Volúmenes', unit: 'boe/d', get: d => d.vol_producido_boed, dp: 0 },
  { key: 'vol_vendido_boed', label: 'Volumen vendido', group: 'Volúmenes', unit: 'boe/d', get: d => d.vol_vendido_boed, dp: 0 },
  { key: 'precio_neto_oil', label: 'Precio neto petróleo', group: 'Precios', unit: 'US$/bbl', get: d => d.precio_neto_oil, dp: 1 },
  { key: 'precio_neto_gas', label: 'Precio neto gas', group: 'Precios', unit: 'US$/MMBTU', get: d => d.precio_neto_gas, dp: 2 },
  { key: 'brent_prom', label: 'Brent promedio', group: 'Precios', unit: 'US$/bbl', get: d => d.brent_prom, dp: 1 },
  { key: 'medanito_prom', label: 'Medanito promedio', group: 'Precios', unit: 'US$/bbl', get: d => d.medanito_prom, dp: 1 },
  { key: 'oil_pct_prod', label: 'Mix petróleo (prod.)', group: 'Mix', unit: '%', get: d => d.oil_pct_prod, dp: 1 },
  { key: 'gas_pct_prod', label: 'Mix gas (prod.)', group: 'Mix', unit: '%', get: d => d.gas_pct_prod, dp: 1 },
  { key: 'oil_pct_vend', label: 'Mix petróleo (vend.)', group: 'Mix', unit: '%', get: d => d.oil_pct_vend, dp: 1 },
  { key: 'gas_pct_vend', label: 'Mix gas (vend.)', group: 'Mix', unit: '%', get: d => d.gas_pct_vend, dp: 1 },
  { key: 'dias', label: 'Días del período', group: 'Período', unit: 'días', get: d => d.dias, dp: 0 },
]

const GROUP_ORDER = ['Resultado', 'Volúmenes', 'Precios', 'Mix', 'Período']

function fmt(v: number | null | undefined, dp: number): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString('es-AR', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

function pct(base: number | null | undefined, comp: number | null | undefined): number | null {
  if (base === null || base === undefined || comp === null || comp === undefined) return null
  if (base === 0) return null
  return ((comp - base) / Math.abs(base)) * 100
}

export function CompararClient({ reportes }: { reportes: ReporteConDatos[] }) {
  // Default: newest as B (comparado), second-newest as A (base)
  const [idA, setIdA] = useState<string>(reportes[1]?.id ?? '')
  const [idB, setIdB] = useState<string>(reportes[0]?.id ?? '')

  const repA = useMemo(() => reportes.find(r => r.id === idA), [reportes, idA])
  const repB = useMemo(() => reportes.find(r => r.id === idB), [reportes, idB])

  const rows = useMemo(() => {
    if (!repA || !repB) return []
    return METRICS.map(m => {
      const a = m.get(repA.datos)
      const b = m.get(repB.datos)
      return { m, a, b, delta: pct(a, b), abs: (a != null && b != null) ? b - a : null }
    })
  }, [repA, repB])

  const enoughReports = reportes.length >= 2

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <AdminPageHeader
          title="Comparar reportes de ingresos"
          subtitle="Variación período contra período de las métricas clave."
          right={
            <Link href="/admin/reportes" className="btn" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: 13 }}>
              ← Volver a reportes
            </Link>
          }
        />

        {!enoughReports ? (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', padding: '32px 24px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 14 }}>
            Se necesitan al menos dos reportes de tipo <strong>Ingresos</strong> publicados o en borrador para comparar.
          </div>
        ) : (
          <>
            {/* Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'end', marginBottom: 22 }}>
              <Selector label="Base (A)" value={idA} onChange={setIdA} reportes={reportes} exclude={idB} accent="var(--fg-muted)" />
              <div style={{ fontSize: 18, color: 'var(--fg-muted)', paddingBottom: 8, textAlign: 'center' }}>vs</div>
              <Selector label="Comparado (B)" value={idB} onChange={setIdB} reportes={reportes} exclude={idA} accent="var(--accent)" />
            </div>

            {repA && repB && (
              <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--rule)' }}>
                        <th style={thStyle('left')}>Métrica</th>
                        <th style={thStyle('right')}>{repA.periodo}<br /><span style={subHead}>base</span></th>
                        <th style={thStyle('right')}>{repB.periodo}<br /><span style={subHead}>comparado</span></th>
                        <th style={thStyle('right')}>Δ abs.</th>
                        <th style={thStyle('right')}>Δ %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GROUP_ORDER.map(group => {
                        const groupRows = rows.filter(r => r.m.group === group)
                        if (groupRows.length === 0) return null
                        return (
                          <GroupBlock key={group} group={group} groupRows={groupRows} />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 12 }}>
              Δ % = variación relativa de B respecto de A. El color indica el sentido del cambio, no si es favorable.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function GroupBlock({ group, groupRows }: { group: string; groupRows: Array<{ m: MetricDef; a: number | null | undefined; b: number | null | undefined; delta: number | null; abs: number | null }> }) {
  return (
    <>
      <tr>
        <td colSpan={5} style={{ padding: '9px 16px 5px', fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--fg-muted)', background: 'var(--bg-alt)' }}>
          {group}
        </td>
      </tr>
      {groupRows.map((r, i) => {
        const dp = r.m.dp ?? 2
        const up = r.delta != null && r.delta > 0.05
        const down = r.delta != null && r.delta < -0.05
        const color = up ? '#276749' : down ? '#9B2C2C' : 'var(--fg-muted)'
        return (
          <tr key={r.m.key} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--rule)' }}>
            <td style={{ padding: '10px 16px', color: 'var(--fg)' }}>
              {r.m.label}
              <span style={{ color: 'var(--fg-muted)', fontSize: 11, marginLeft: 6 }}>{r.m.unit}</span>
            </td>
            <td style={tdNum}>{fmt(r.a, dp)}</td>
            <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(r.b, dp)}</td>
            <td style={{ ...tdNum, color }}>{r.abs == null ? '—' : `${r.abs > 0 ? '+' : ''}${fmt(r.abs, dp)}`}</td>
            <td style={{ ...tdNum, color, fontWeight: 600 }}>
              {r.delta == null ? '—' : `${r.delta > 0 ? '▲ +' : r.delta < 0 ? '▼ ' : ''}${r.delta.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
            </td>
          </tr>
        )
      })}
    </>
  )
}

function Selector({ label, value, onChange, reportes, exclude, accent }: {
  label: string
  value: string
  onChange: (v: string) => void
  reportes: ReporteConDatos[]
  exclude: string
  accent: string
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: accent, marginBottom: 5 }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', fontSize: 13, padding: '9px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', background: 'var(--surface)', color: 'var(--fg)' }}
      >
        {reportes.map(r => (
          <option key={r.id} value={r.id} disabled={r.id === exclude}>
            {r.periodo} — {r.titulo}{r.estado !== 'publicado' ? ' (borrador)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

const thStyle = (align: 'left' | 'right'): React.CSSProperties => ({
  padding: '11px 16px', textAlign: align, fontWeight: 600, color: 'var(--fg-soft)',
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap',
})
const subHead: React.CSSProperties = { fontSize: 9, fontWeight: 500, color: 'var(--fg-muted)', letterSpacing: '.04em' }
const tdNum: React.CSSProperties = { padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--fg)', whiteSpace: 'nowrap' }

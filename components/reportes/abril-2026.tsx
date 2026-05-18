'use client'

import ReporteShell from '@/components/ReporteShell'
import styles from './reporte.module.css'

const kpis = [
  { label: 'Ventas del Período',   valor: '26,04', unit: 'MM us$',   color: 'naranja', sub: 'Stock mes sig.: 5,39MM us$' },
  { label: 'Vol. Producido',       valor: '8.212', unit: 'BOE/d',    color: 'azul',    sub: 'Oil 86,9% · Gas 13,1%' },
  { label: 'Vol. Vendido',         valor: '10.348',unit: 'BOE/d',    color: 'verde',   sub: 'Oil 87,0% · Gas 13,0%' },
  { label: 'Precio Neto Oil',      valor: '93,43', unit: 'us$/bbl',  color: 'warm',    sub: 'BRENT ref: 99,05 us$/bbl' },
  { label: 'Precio Neto Gas',      valor: '3,30',  unit: 'us$/mcf',  color: 'muted',   sub: 'ET + RCLV promedio' },
]

export default function ReporteAbril2026() {
  return (
    <ReporteShell titulo="Ingresos Estimados — Abril 2026" periodo="2026-04-30 · 30 días">

      <section className={styles.sec}>Indicadores Clave</section>
      <div className={styles.kpiGrid}>
        {kpis.map(k => (
          <div key={k.label} className={`${styles.kpi} ${styles['kpi_' + k.color]}`}>
            <div className={styles.kpiLbl}>{k.label}</div>
            <div className={styles.kpiVal}>{k.valor}<span className={styles.kpiUnit}>{k.unit}</span></div>
            <div className={styles.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 32, color: 'var(--muted)', fontSize: 14 }}>
        Detalle completo disponible próximamente.
      </p>

    </ReporteShell>
  )
}

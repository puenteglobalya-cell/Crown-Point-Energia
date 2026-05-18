'use client'

import ReporteShell from '@/components/ReporteShell'
import styles from './reporte.module.css'

// KPIs del mes
const kpis = [
  { label: 'Ventas del Período',   valor: '24,04', unit: 'MM us$',   color: 'naranja', sub: 'Stock mes sig.: 2,49MM us$' },
  { label: 'Vol. Producido',       valor: '8.241', unit: 'BOE/d',    color: 'azul',    sub: 'Oil 85,8% · Gas 14,2%' },
  { label: 'Vol. Vendido',         valor: '8.270', unit: 'BOE/d',    color: 'verde',   sub: 'Oil 88,6% · Gas 11,4%' },
  { label: 'Precio Neto Oil',      valor: '101,42',unit: 'us$/bbl',  color: 'warm',    sub: 'BRENT ref: 107,63 us$/bbl' },
  { label: 'Precio Neto Gas',      valor: '5,78',  unit: 'us$/mcf',  color: 'muted',   sub: 'ET + RCLV promedio' },
]

// Áreas petróleo
const areas = [
  {
    nombre: 'ET / LT-PQ', color: 'naranja',
    filas: [
      ['Producción 100% (m³/d)', '701'],
      ['Producción neta (m³/d)', '665,95'],
      ['Vol. venta (m³)', '23.000'],
      ['Vol. Petrominera (m³)', '(879)', true],
      ['m³ entregados', '22.121'],
      ['Volumen (bbl)', '139.136'],
      ['BRENT ref. (us$/bbl)', '107,63'],
      ['Descuento (us$/bbl)', '(1,60)', true],
      ['DDEE', '(7,41%)', true],
      ['IIBB', '(3,00%)', true],
      ['Precio neto (us$/bbl)', '101,22', false, true],
      ['Ingreso periodo (us$)', '14.082.693', false, true],
      ['Stock → mes siguiente', '955m³ / 1,4d', false, false, true],
      ['Stock valorizado (us$)', '607.975', false, false, true],
    ],
    barra: 58.6,
  },
  {
    nombre: 'PC-KK', color: 'azul',
    filas: [
      ['Producción neta (m³/d)', '409'],
      ['In Kind (m³)', '(493)', true],
      ['m³ entregados', '10.851'],
      ['Volumen (bbl)', '68.253'],
      ['BRENT 1° Quinc. (us$/bbl) *', '104,32'],
      ['BRENT 2° Quinc. (us$/bbl) *', '105,84'],
      ['BRENT prom. mes (us$/bbl)', '105,08'],
      ['Desc. Cañadón Seco (us$/bbl)', '(1,00)', true],
      ['Desc. calidad (us$/bbl)', '(4,25)', true],
      ['DDEE', '(7,41%)', true],
      ['IIBB', '(3,00%)', true],
      ['Precio estimado (us$/bbl)', '103,23', false, true],
      ['Ingreso periodo (us$)', '7.045.977', false, true],
      ['Stock → mes siguiente', '2.900m³ / 7,1d', false, false, true],
      ['Stock valorizado (us$)', '1.882.857', false, false, true],
    ],
    nota: '* Precio basado en las 2 semanas anteriores a la quincena de entrega',
    barra: 29.3,
  },
  {
    nombre: 'CH / PPC', color: 'verde',
    filas: [
      ['Producción 100% (m³/d)', '130,9'],
      ['Producción neta (m³/d)', '65,45'],
      ['m³ entregados', '2.029'],
      ['Volumen (bbl)', '12.762'],
      ['MEDANITO ref. (us$/bbl)', '104,72'],
      ['Descuento (% s/MEDANITO)', '(90,00%)', true],
      ['Premio (us$/bbl)', '+ 4,38', false, false, false, true],
      ['Precio neto (us$/bbl)', '98,63', false, true],
      ['Ingreso periodo (us$)', '1.258.687', false, true],
    ],
    barra: 5.2,
  },
  {
    nombre: 'RCLV — Petróleo', color: 'violeta',
    filas: [
      ['Producción neta (m³/d)', '35,28'],
      ['m³ entregados', '1.094'],
      ['Volumen (bbl)', '6.879'],
      ['BRENT ref. (us$/bbl)', '107,63'],
      ['Descuento (us$/bbl)', '(15,00)', true],
      ['Precio neto (us$/bbl)', '92,63', false, true],
      ['Ingreso periodo (us$)', '637.208', false, true],
    ],
    barra: 2.7,
  },
]

const gasAreas = [
  {
    nombre: 'Gas — ET-LT-PQ', color: 'warm',
    filas: [
      ['Producción 100% (Mcf/d)', '93.000'],
      ['Producción neta (Mcf/d)', '88.350'],
      ['Volumen mes (Mcf)', '2.738.850'],
      ['Precio (us$/mcf) **', '7,23', false, true],
      ['Ingreso periodo (us$)', '700.000', false, true],
    ],
    nota: '** El 52% del volumen se comercializa a precio Plan Gas',
    barra: 50,
  },
  {
    nombre: 'Gas — RCLV', color: 'muted',
    filas: [
      ['Producción 100% (Mcf/d)', '150.000'],
      ['Producción neta (Mcf/d)', '72.491'],
      ['Volumen mes (Mcf)', '2.247.229'],
      ['Precio (us$/mcf)', '4,00', false, true],
      ['Ingreso periodo (us$)', '317.435', false, true],
    ],
    barra: 50,
  },
]

export default function ReporteMayo2026() {
  return (
    <ReporteShell titulo="Ingresos Estimados — Mayo 2026" periodo="2026-05-31 · 31 días">

      {/* KPIs */}
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

      {/* Áreas Petróleo */}
      <section className={styles.sec}>Petróleo — Detalle por Área</section>
      <div className={styles.areasGrid}>
        {areas.map(a => (
          <div key={a.nombre} className={`${styles.acard} ${styles['ac_' + a.color]}`}>
            <div className={styles.aname}>
              <div className={`${styles.adot} ${styles['dot_' + a.color]}`} />
              {a.nombre}
            </div>
            {a.filas.map(([lbl, val, neg, hi, dim, pos]) => (
              <div key={lbl as string} className={styles.arow}>
                <span className={styles.albl}>{lbl}</span>
                <span className={[styles.aval, neg && styles.neg, hi && styles.hi, dim && styles.dim, pos && styles['pos_' + a.color]].filter(Boolean).join(' ')}>
                  {val}
                </span>
              </div>
            ))}
            {a.nota && <p className={styles.anota}>{a.nota}</p>}
            <div className={styles.abr}>
              <div className={`${styles.abrF} ${styles['abrF_' + a.color]}`} style={{ width: `${a.barra}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Gas */}
      <section className={styles.sec}>Gas — Detalle por Área</section>
      <div className={styles.gasGrid}>
        {gasAreas.map(a => (
          <div key={a.nombre} className={`${styles.acard} ${styles['ac_' + a.color]}`}>
            <div className={styles.aname}>
              <div className={`${styles.adot} ${styles['dot_' + a.color]}`} />
              {a.nombre}
            </div>
            {a.filas.map(([lbl, val, neg, hi]) => (
              <div key={lbl as string} className={styles.arow}>
                <span className={styles.albl}>{lbl}</span>
                <span className={[styles.aval, neg && styles.neg, hi && styles['hi_' + a.color]].filter(Boolean).join(' ')}>
                  {val}
                </span>
              </div>
            ))}
            {a.nota && <p className={styles.anota}>{a.nota}</p>}
            <div className={styles.abr}>
              <div className={`${styles.abrF} ${styles['abrF_' + a.color]}`} style={{ width: `${a.barra}%` }} />
            </div>
          </div>
        ))}
      </div>

    </ReporteShell>
  )
}

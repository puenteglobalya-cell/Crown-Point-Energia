'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// ─── Informe final para presentar ────────────────────────────────────────
// Página pensada para imprimirse a PDF: fondo blanco, tinta oscura, saltos de
// página controlados y sin nada de la interfaz de edición. Los gráficos son
// SVG inline y no canvas, porque el canvas se imprime mal y a veces sale en
// blanco según el navegador.

type Informe = {
  escenario: { id: number; nombre: string; descripcion: string | null }
  proyecto: { nombre: string; tipo: string } | null
  generado: string
  metrica: Fila | null
  npv_por_tasa: { tasa: number; npv_antes_impuestos_usd: number; npv_despues_impuestos_usd: number }[]
  kpis: {
    capex_total_usd: number; eur_bbl: number; eur_mcf: number; eur_boe: number
    ebitda_total_usd: number; netback_usd_boe: number | null; cash_flow_total_usd: number
    primer_anio: number | null; ultimo_anio: number | null
  }
  flujo_anual: { anio: number; neto_usd: number; acumulado_usd: number }[]
  anual: Fila[]
  depletion: Fila[]
}

import { Kpi, GraficoProduccion, GraficoFlujo, cssImpresion, mm, n0, type Fila } from './piezas'

const ROJO = '#b33b2e'

export default function InformeClient() {
  const params = useSearchParams()
  const escenarioId = params.get('escenario_id') ?? ''
  const [d, setD] = useState<Informe | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!escenarioId) { setErr('Falta el escenario en la dirección.'); return }
    fetch(`/api/portal/reservas/informe?escenario_id=${escenarioId}`, { cache: 'no-store' })
      .then(async r => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? 'Error')
        setD(j)
      })
      .catch(e => setErr((e as Error).message))
  }, [escenarioId])

  if (err) return <div style={{ padding: 40, color: ROJO }}>{err}</div>
  if (!d) return <div style={{ padding: 40 }}>Preparando el informe…</div>

  const consolidado = d.anual.filter(a => a.yacimiento_id == null)
  const porYacimiento = d.anual.filter(a => a.yacimiento_id != null)
  const fecha = new Date(d.generado).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{cssImpresion}</style>

      <div className="informe-barra no-print">
        <span>Vista de informe — usá <strong>Imprimir → Guardar como PDF</strong>, tamaño A4, márgenes por defecto.</span>
        <button onClick={() => window.print()} className="btn btn-primary">Imprimir / Guardar PDF</button>
      </div>

      <div className="informe">
        {/* ─── Portada ─── */}
        <header className="portada">
          <div className="marca">CROWN POINT ENERGÍA</div>
          <h1>Valuación de reservas</h1>
          <h2>{d.escenario.nombre}</h2>
          {d.proyecto && <p className="sub">Proyecto: {d.proyecto.nombre} · {d.proyecto.tipo}</p>}
          {d.escenario.descripcion && <p className="sub">{d.escenario.descripcion}</p>}
          <p className="sub">Generado el {fecha}</p>
          <p className="nota-portada">
            Cifras <strong>netas a Crown Point</strong>: los inputs se cargan al 100% del proyecto y se afectan por
            la participación vigente en cada mes. Reservas y depleción en volumen físico al 100%.
            Valor presente informado según el formato del Form 51-101F1 (NI 51-101).
          </p>
        </header>

        {/* ─── Dashboard ─── */}
        <section>
          <h3>Resumen ejecutivo</h3>
          <div className="kpis">
            <Kpi label="VAN (después de impuestos)" val={d.metrica ? mm(Number(d.metrica.npv_usd)) : '—'}
              nota={d.metrica ? `@ ${(Number(d.metrica.tasa_descuento) * 100).toFixed(1)}%` : ''} destacado />
            <Kpi label="TIR" val={d.metrica?.irr_pct != null ? `${Number(d.metrica.irr_pct).toFixed(1)}%` : '—'} />
            <Kpi label="Payback" val={d.metrica?.payback_anios != null ? `${Number(d.metrica.payback_anios).toFixed(1)} años` : 'no se recupera'} />
            <Kpi label="CAPEX total" val={mm(d.kpis.capex_total_usd)} />
            <Kpi label="EUR" val={`${n0(d.kpis.eur_boe)} BOE`} nota={`${n0(d.kpis.eur_bbl)} bbl + ${n0(d.kpis.eur_mcf)} Mcf`} />
            <Kpi label="Netback" val={d.kpis.netback_usd_boe != null ? `US$ ${d.kpis.netback_usd_boe.toFixed(2)}/BOE` : '—'} />
            <Kpi label="Cash flow total" val={mm(d.kpis.cash_flow_total_usd)} />
            <Kpi label="Horizonte" val={d.kpis.primer_anio && d.kpis.ultimo_anio ? `${d.kpis.primer_anio}–${d.kpis.ultimo_anio}` : '—'} />
          </div>
        </section>

        <section className="evitar-corte">
          <h3>Perfil de producción neto a CPE</h3>
          <GraficoProduccion filas={consolidado} />
        </section>

        <section className="evitar-corte">
          <h3>Flujo de caja anual y acumulado</h3>
          <GraficoFlujo filas={d.flujo_anual} />
        </section>

        <div className="salto" />

        {/* ─── VAN NI 51-101 ─── */}
        <section className="evitar-corte">
          <h3>Valor presente del flujo neto futuro</h3>
          <p className="pie">
            Form 51-101F1: sin descontar y a 5%, 10%, 15% y 20%, antes y después de deducir el impuesto a las ganancias.
          </p>
          <table>
            <thead>
              <tr><th>Tasa de descuento</th><th className="der">Antes de impuestos</th><th className="der">Después de impuestos</th></tr>
            </thead>
            <tbody>
              {d.npv_por_tasa.map(r => (
                <tr key={r.tasa}>
                  <td>{r.tasa === 0 ? 'Sin descontar' : `${(r.tasa * 100).toFixed(0)}%`}</td>
                  <td className="der mono">{mm(r.npv_antes_impuestos_usd)}</td>
                  <td className="der mono fuerte">{mm(r.npv_despues_impuestos_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ─── Resumen anual ─── */}
        <section>
          <h3>Resumen anual consolidado</h3>
          <table>
            <thead>
              <tr>
                <th>Año</th><th className="der">Petróleo (bbl)</th><th className="der">Gas (Mcf)</th>
                <th className="der">Ingresos</th><th className="der">EBITDA</th><th className="der">EBIT</th>
                <th className="der">Resultado neto</th><th className="der">Netback</th>
              </tr>
            </thead>
            <tbody>
              {consolidado.map(a => (
                <tr key={a.anio}>
                  <td className="mono">{a.anio}</td>
                  <td className="der mono">{n0(Number(a.produccion_petroleo_bbl))}</td>
                  <td className="der mono">{n0(Number(a.produccion_gas_mcf))}</td>
                  <td className="der mono">{n0(Number(a.ingresos_usd))}</td>
                  <td className="der mono">{n0(Number(a.ebitda_usd))}</td>
                  <td className="der mono">{n0(Number(a.ebit_usd))}</td>
                  <td className="der mono">{n0(Number(a.resultado_neto_usd))}</td>
                  <td className="der mono">{a.netback_usd_boe != null ? Number(a.netback_usd_boe).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {porYacimiento.length > 0 && (
          <section>
            <h3>Detalle por yacimiento</h3>
            <table>
              <thead>
                <tr><th>Yacimiento</th><th>Año</th><th className="der">BOE</th><th className="der">Ingresos</th><th className="der">EBITDA</th><th className="der">Netback</th></tr>
              </thead>
              <tbody>
                {porYacimiento.map(a => (
                  <tr key={`${a.yacimiento_id}-${a.anio}`}>
                    <td>{a.yacimiento}</td>
                    <td className="mono">{a.anio}</td>
                    <td className="der mono">{n0(Number(a.produccion_petroleo_bbl) + Number(a.produccion_gas_mcf) / 6)}</td>
                    <td className="der mono">{n0(Number(a.ingresos_usd))}</td>
                    <td className="der mono">{n0(Number(a.ebitda_usd))}</td>
                    <td className="der mono">{a.netback_usd_boe != null ? Number(a.netback_usd_boe).toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {d.depletion.length > 0 && (
          <section>
            <h3>Depleción de reservas</h3>
            <p className="pie">
              Reconciliación de NI 51-101: <strong>apertura + movimientos − producción = cierre</strong>.
              P1/P2/P3 son Probadas / Probables / Posibles incrementales, así que la producción agota primero las
              probadas y sólo el excedente pasa a probables y después a posibles. Volumen físico al 100%.
              Las seis columnas de movimiento salen del informe del evaluador.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Yacimiento</th><th>Cat.</th><th>Año</th>
                  <th className="der">Apertura</th>
                  <th className="der">Revis.</th><th className="der">Extens.</th><th className="der">Descub.</th>
                  <th className="der">Adquis.</th><th className="der">Cesion.</th><th className="der">Fact.ec.</th>
                  <th className="der">Producción</th><th className="der">Cierre</th>
                </tr>
              </thead>
              <tbody>
                {d.depletion.map(r => (
                  <tr key={r.id}>
                    <td>{r.yacimiento}</td><td>{r.categoria}</td><td className="mono">{r.anio}</td>
                    <td className="der mono">{n0(Number(r.apertura_boe))}</td>
                    {(['revision_tecnica_boe', 'extension_boe', 'descubrimiento_boe', 'adquisicion_boe', 'cesion_boe', 'factores_economicos_boe'] as const).map(k => (
                      <td key={k} className="der mono">{r[k] == null || Number(r[k]) === 0 ? '—' : n0(Number(r[k]))}</td>
                    ))}
                    <td className="der mono">{n0(Number(r.depletion_boe))}</td>
                    <td className="der mono fuerte">{n0(Number(r.cierre_boe))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="pie-informe">
          Crown Point Energía S.A. · Simulador de reservas · {fecha} · Escenario "{d.escenario.nombre}".
          Documento de trabajo interno — no constituye una certificación de reservas.
        </footer>
      </div>
    </>
  )
}

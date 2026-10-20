'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type CargamentoConMetricas = {
  cargamento: {
    id: string; fechaBl: string; puerto: string; crudo: string; volumenBbl: number
    comprador: string | null; destino: string | null; buque: string | null; clase: string
    precioFobUsdBbl: number | null; descuentoPactadoUsdBbl: number | null; notas: string | null
  }
  flete: { tipo: string; costoTotalUsd: number; proveedorBroker: string | null } | null
  fleteUsdBbl: number | null
  fleteMercadoUsdBbl: number | null
  desvioUsdBbl: number | null
  desvioPct: number | null
  semaforo: 'verde' | 'amarillo' | 'rojo' | null
  brentDelDia: number | null
  spreadBrentFob: number | null
  spreadCalidadUsdBbl: number | null
  spreadResiduoUsdBbl: number | null
  avisos: string[]
}

const SEMAFORO_COLOR: Record<string, string> = { verde: '#2e8b57', amarillo: '#c9a227', rojo: '#b33b2e' }
const SEMAFORO_LABEL: Record<string, string> = { verde: 'Razonable', amarillo: 'Revisar', rojo: 'Fuera de mercado' }

function fmt(n: number | null, dec = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export default function FletesPage() {
  const [data, setData] = useState<{ cargamentos: CargamentoConMetricas[]; config: { umbralVerdePct: number; umbralAmarilloPct: number } } | null>(null)
  const [err, setErr] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  async function cargar() {
    setErr('')
    const res = await fetch('/api/comercial/fletes')
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Error al cargar'); return }
    setData(await res.json())
  }

  useEffect(() => { cargar() }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormErr('')
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const num = (k: string) => { const v = fd.get(k); return v && String(v).trim() !== '' ? Number(v) : null }
    const str = (k: string) => { const v = fd.get(k); return v && String(v).trim() !== '' ? String(v) : null }

    const cargamento = {
      fechaBl: str('fechaBl'), puerto: str('puerto'), crudo: str('crudo'), volumenBbl: num('volumenBbl'),
      comprador: str('comprador'), destino: str('destino'), buque: str('buque'), clase: str('clase'),
      precioFobUsdBbl: num('precioFobUsdBbl'), descuentoPactadoUsdBbl: num('descuentoPactadoUsdBbl'),
      notas: str('notas'),
    }
    const costoTotalUsd = num('costoTotalUsd')
    const flete = costoTotalUsd != null ? {
      tipo: str('tipo'), tarifaWs: num('tarifaWs'), tarifaLumpSumUsd: num('tarifaLumpSumUsd'),
      flatRateUsado: num('flatRateUsado'), costoTotalUsd, demorasUsd: num('demorasUsd') ?? 0,
      combustibleUsd: num('combustibleUsd') ?? 0, canalOtrosUsd: num('canalOtrosUsd') ?? 0,
      proveedorBroker: str('proveedorBroker'),
    } : null

    try {
      const res = await fetch('/api/comercial/fletes', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cargamento, flete }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Error al guardar')
      setShowForm(false)
      await cargar()
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cargamento y su flete asociado?')) return
    const res = await fetch(`/api/comercial/fletes/${id}`, { method: 'DELETE' })
    if (res.ok) cargar()
  }

  const rojos = (data?.cargamentos ?? []).filter(c => c.semaforo === 'rojo')

  return (
    <div className="portal-page">
      <div className="portal-header">
        <div>
          <h1 className="portal-header__title">Fletes — Razonabilidad vs. Mercado</h1>
          <p className="portal-header__subtitle">
            Flete real vs. esperado por cargamento, y apertura del spread Brent–FOB entre flete y calidad.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/portal/comercial" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 14 }}>Volver</Link>
          <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancelar' : '+ Nuevo cargamento'}
          </button>
        </div>
      </div>

      {err && <p style={{ color: '#b33b2e' }}>{err}</p>}

      {showForm && (
        <section className="portal-section">
          <h2 className="portal-section__title">Nuevo cargamento + flete</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <label>Fecha B/L<input name="fechaBl" type="date" required /></label>
            <label>Puerto<input name="puerto" required placeholder="Caleta Córdova" /></label>
            <label>Crudo<select name="crudo" required><option value="Escalante">Escalante</option><option value="Medanito">Medanito</option></select></label>
            <label>Volumen (bbl)<input name="volumenBbl" type="number" step="any" min="0.01" required /></label>
            <label>Comprador<input name="comprador" /></label>
            <label>Destino<input name="destino" /></label>
            <label>Buque<input name="buque" /></label>
            <label>Clase<select name="clase" required><option value="Aframax">Aframax</option><option value="Suezmax">Suezmax</option><option value="otra">Otra</option></select></label>
            <label>Precio FOB realizado (US$/bbl)<input name="precioFobUsdBbl" type="number" step="any" /></label>
            <label>Descuento pactado (US$/bbl)<input name="descuentoPactadoUsdBbl" type="number" step="any" /></label>
            <label style={{ gridColumn: 'span 2' }}>Notas<input name="notas" /></label>

            <div style={{ gridColumn: 'span 4', borderTop: '1px solid #ddd', paddingTop: 12, marginTop: 4, fontWeight: 600 }}>Flete (opcional — dejalo vacío si todavía no lo tenés)</div>
            <label>Tipo<select name="tipo"><option value="spot">Spot</option><option value="time_charter">Time charter</option></select></label>
            <label>Tarifa Worldscale (WS)<input name="tarifaWs" type="number" step="any" /></label>
            <label>Lump sum (US$)<input name="tarifaLumpSumUsd" type="number" step="any" /></label>
            <label>Flat rate usado<input name="flatRateUsado" type="number" step="any" /></label>
            <label>Costo total (US$)<input name="costoTotalUsd" type="number" step="any" /></label>
            <label>Demoras (US$)<input name="demorasUsd" type="number" step="any" /></label>
            <label>Combustible (US$)<input name="combustibleUsd" type="number" step="any" /></label>
            <label>Canal y otros (US$)<input name="canalOtrosUsd" type="number" step="any" /></label>
            <label style={{ gridColumn: 'span 2' }}>Proveedor / broker<input name="proveedorBroker" /></label>

            {formErr && <p style={{ gridColumn: 'span 4', color: '#b33b2e' }}>{formErr}</p>}
            <div style={{ gridColumn: 'span 4' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </section>
      )}

      {rojos.length > 0 && (
        <section className="portal-section">
          <h2 className="portal-section__title" style={{ color: SEMAFORO_COLOR.rojo }}>Cargamentos fuera de mercado ({rojos.length})</h2>
          <ul>
            {rojos.map(c => (
              <li key={c.cargamento.id}>
                {c.cargamento.fechaBl} · {c.cargamento.puerto} · {c.cargamento.crudo} — desvío {fmt(c.desvioPct, 1)}%
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="portal-section">
        <h2 className="portal-section__title">Cargamentos</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="t" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>B/L</th><th>Puerto</th><th>Crudo</th><th>Clase</th><th>Vol. (bbl)</th>
                <th>Flete propio (US$/bbl)</th><th>Flete mercado (US$/bbl)</th><th>Desvío</th>
                <th>Brent del día</th><th>Spread Brent–FOB</th><th>Calidad</th><th>Residuo</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(data?.cargamentos ?? []).map(c => (
                <tr key={c.cargamento.id} title={c.avisos.join(' · ')}>
                  <td>{c.cargamento.fechaBl}</td>
                  <td>{c.cargamento.puerto}</td>
                  <td>{c.cargamento.crudo}</td>
                  <td>{c.cargamento.clase}</td>
                  <td>{c.cargamento.volumenBbl.toLocaleString('es-AR')}</td>
                  <td>{fmt(c.fleteUsdBbl)}</td>
                  <td>{fmt(c.fleteMercadoUsdBbl)}</td>
                  <td>
                    {c.semaforo
                      ? <span style={{ color: SEMAFORO_COLOR[c.semaforo], fontWeight: 700 }}>
                          {fmt(c.desvioPct, 1)}% · {SEMAFORO_LABEL[c.semaforo]}
                        </span>
                      : <span style={{ color: '#999' }}>Sin datos</span>}
                  </td>
                  <td>{fmt(c.brentDelDia)}</td>
                  <td>{fmt(c.spreadBrentFob)}</td>
                  <td>{fmt(c.spreadCalidadUsdBbl)}</td>
                  <td>{fmt(c.spreadResiduoUsdBbl)}</td>
                  <td><button onClick={() => handleDelete(c.cargamento.id)} style={{ color: '#b33b2e', background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button></td>
                </tr>
              ))}
              {data && data.cargamentos.length === 0 && (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 20, color: '#888' }}>Sin cargamentos cargados todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: '#888', marginTop: 10 }}>
          Semáforo: verde ≤ {data?.config.umbralVerdePct ?? 10}% de desvío, amarillo hasta {data?.config.umbralAmarilloPct ?? 25}%, rojo por encima.
          Pasá el mouse sobre una fila para ver avisos de datos faltantes.
        </p>
      </section>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ENTITIES, type Data, type Row, type EntityConfig, type FieldConfig } from './entityConfig'

const box: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--rule)',
  borderRadius: 'var(--r-lg)', padding: '20px 24px', marginBottom: 16,
}
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 'var(--r-md)',
  border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 13,
}
const label: React.CSSProperties = { fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4, display: 'block' }
const field: React.CSSProperties = { marginBottom: 12 }

function Field({ children }: { children: React.ReactNode }) {
  return <div style={field}>{children}</div>
}

export default function ReservasClient() {
  const [tab, setTab] = useState<'cargar' | 'calcular' | 'resultados' | 'pareto'>('cargar')
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function reload() {
    const r = await fetch('/api/portal/reservas/data')
    if (r.ok) setData(await r.json())
  }
  useEffect(() => { reload() }, [])

  if (!data) return <div style={{ padding: 40 }}>Cargando…</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <Link href="/portal" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>← Portal</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 20px' }}>
          Simulador de reservas
        </h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--rule)' }}>
          {(['cargar', 'calcular', 'resultados', 'pareto'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', padding: '10px 4px', marginRight: 16,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: tab === t ? 'var(--accent)' : 'var(--fg-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              {t === 'cargar' ? 'Cargar datos' : t === 'calcular' ? 'Calcular escenario' : t === 'resultados' ? 'Resultados' : 'Pareto de escenarios'}
            </button>
          ))}
        </div>

        {err && <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 8, marginBottom: 16 }}>{err}</div>}
        {msg && <div style={{ fontSize: 13, color: 'var(--cp-positive, #2d7a4a)', padding: '10px 14px', background: 'rgba(45,122,74,0.08)', borderRadius: 8, marginBottom: 16 }}>{msg}</div>}

        {tab === 'cargar' && (
          <>
            {ENTITIES.map(cfg => (
              <EntitySection
                key={cfg.tabla}
                cfg={cfg}
                data={data}
                setErr={setErr}
                setMsg={setMsg}
                reload={reload}
              />
            ))}
          </>
        )}
        {tab === 'calcular' && <CalcularTab data={data} />}
        {tab === 'resultados' && <ResultadosTab data={data} />}
        {tab === 'pareto' && <ParetoTab />}
      </div>
    </div>
  )
}

function Seccion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={box}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: 'var(--fg)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Select({ opts, ...props }: { opts: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={input}>
      <option value="">— elegir —</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function fieldOpts(f: FieldConfig, data: Data): { value: string; label: string }[] {
  if (f.staticOptions) return f.staticOptions
  if (f.optionsFrom) return (data[f.optionsFrom] ?? []).map(r => ({ value: String(r.id), label: String(r.nombre ?? r.id) }))
  return []
}

function parseValue(f: FieldConfig, raw: FormDataEntryValue | null): unknown {
  if (f.type === 'checkbox') return raw === 'on'
  if (raw === null || raw === '') return f.required ? '' : null
  if (f.type === 'number') return Number(raw)
  return raw
}

function EntitySection({ cfg, data, setErr, setMsg, reload }: {
  cfg: EntityConfig; data: Data; setErr: (s: string) => void; setMsg: (s: string) => void; reload: () => void
}) {
  const [editing, setEditing] = useState<Row | null>(null)
  const rows = data[cfg.tabla] ?? []

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(''); setMsg('')
    const f = new FormData(e.currentTarget)
    const valores: Record<string, unknown> = {}
    for (const field of cfg.fields) valores[field.name] = parseValue(field, f.get(field.name))

    const isEdit = editing !== null
    const res = await fetch('/api/portal/reservas/data', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(isEdit ? { tabla: cfg.tabla, id: editing!.id, valores } : { tabla: cfg.tabla, valores }),
    })
    if (!res.ok) {
      setErr((await res.json()).error ?? 'Error al guardar')
      return
    }
    setMsg(`${cfg.tabla}: ${isEdit ? 'registro actualizado' : 'registro creado'} ✓`)
    setEditing(null)
    e.currentTarget.reset()
    reload()
  }

  async function onDelete(row: Row) {
    if (!confirm('¿Eliminar este registro? Si otros registros dependen de él, la base va a rechazar el borrado.')) return
    setErr(''); setMsg('')
    const res = await fetch('/api/portal/reservas/data', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tabla: cfg.tabla, id: row.id }),
    })
    if (!res.ok) {
      setErr((await res.json()).error ?? 'Error al eliminar')
      return
    }
    setMsg(`${cfg.tabla}: registro eliminado ✓`)
    if (editing?.id === row.id) setEditing(null)
    reload()
  }

  return (
    <Seccion title={cfg.title}>
      {cfg.helpText && <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>{cfg.helpText}</p>}

      {cfg.tabla === 'curvas_produccion' && (
        <ImportarCurvaExcel data={data} setErr={setErr} setMsg={setMsg} reload={reload} />
      )}

      {rows.length > 0 && (
        <div style={{ marginBottom: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map(r => (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--rule)' }}>
                  {cfg.displayCols(r, data).map((c, i) => (
                    <td key={i} style={{ padding: '6px 8px', color: 'var(--fg-soft)' }}>
                      <span style={{ color: 'var(--fg-muted)', marginRight: 4 }}>{c.label}:</span>{c.value}
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" onClick={() => setEditing(r)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, marginRight: 10 }}>Editar</button>
                    <button type="button" onClick={() => onDelete(r)} style={{ background: 'none', border: 'none', color: 'var(--cp-negative)', cursor: 'pointer', fontSize: 12 }}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form key={String(editing?.id ?? 'new')} onSubmit={onSubmit}>
        {editing && (
          <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10 }}>
            Editando registro #{String(editing.id)} —{' '}
            <button type="button" onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
              cancelar y cargar uno nuevo
            </button>
          </div>
        )}
        {cfg.fields.map(f => (
          <Field key={f.name}>
            <label style={label}>{f.label}</label>
            {f.type === 'select' ? (
              <Select name={f.name} required={f.required} defaultValue={editing ? String(editing[f.name] ?? '') : ''} opts={fieldOpts(f, data)} />
            ) : f.type === 'checkbox' ? (
              <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" name={f.name} defaultChecked={editing ? Boolean(editing[f.name]) : Boolean(f.defaultValue)} /> {f.label}
              </label>
            ) : (
              <input
                name={f.name}
                type={f.type}
                step={f.step}
                min={f.min}
                max={f.max}
                required={f.required}
                defaultValue={editing ? String(editing[f.name] ?? '') : (f.defaultValue !== undefined ? String(f.defaultValue) : undefined)}
                style={input}
              />
            )}
          </Field>
        ))}
        <button className="btn btn-primary" type="submit">{editing ? 'Guardar cambios' : 'Guardar'}</button>
      </form>
    </Seccion>
  )
}

function CalcularTab({ data }: { data: Data }) {
  const [escenarioId, setEscenarioId] = useState('')
  const [tasa, setTasa] = useState('0.10')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Record<string, number | null> | null>(null)
  const [err, setErr] = useState('')

  async function calcular() {
    setLoading(true); setErr(''); setResultado(null)
    try {
      const res = await fetch('/api/portal/reservas/calcular', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ escenario_id: Number(escenarioId), tasa_anual: Number(tasa) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setResultado(json)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Seccion title="Correr el motor de cálculo">
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
        Recorre mes a mes cada pozo del escenario elegido y puebla el cash flow (ventas, regalías, OPEX, CAPEX/amortización, IIBB, Imp. D&amp;C, impuesto a las ganancias). Vuelve a correrse desde cero cada vez — reemplaza el resultado anterior de ese escenario.
      </p>
      <Field><label style={label}>Escenario</label>
        <Select name="escenario_id" value={escenarioId} onChange={e => setEscenarioId(e.target.value)} opts={data.escenarios.map(e => ({ value: String(e.id), label: String(e.nombre) }))} />
      </Field>
      <Field><label style={label}>Tasa de descuento anual (ej. 0.10 = 10%)</label>
        <input value={tasa} onChange={e => setTasa(e.target.value)} type="number" step="0.001" style={input} />
      </Field>
      <button className="btn btn-primary" disabled={!escenarioId || loading} onClick={calcular}>
        {loading ? 'Calculando…' : 'Calcular'}
      </button>
      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13, marginTop: 12 }}>{err}</p>}
      {resultado && (
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
          <Kv label="Pozos simulados" val={String(resultado.pozos)} />
          <Kv label="Filas mensuales generadas" val={String(resultado.filas)} />
          <Kv label="Años agregados (por yacimiento + consolidado)" val={String(resultado.anios)} />
          <Kv label="Cash flow total (neto)" val={`US$ ${((resultado.total_cashflow ?? 0) / 1e6).toFixed(2)} MM`} />
          <Kv label={`NPV @ ${((resultado.tasa_descuento ?? 0) * 100).toFixed(1)}%`} val={`US$ ${((resultado.npv_usd ?? 0) / 1e6).toFixed(2)} MM`} />
          <Kv label="IRR" val={resultado.irr_pct != null ? `${resultado.irr_pct.toFixed(1)}%` : '— (sin cambio de signo detectable)'} />
          <Kv label="Payback" val={resultado.payback_anios != null ? `${resultado.payback_anios.toFixed(1)} años` : '— (no se recupera en el horizonte)'} />
        </div>
      )}
    </Seccion>
  )
}

function Kv({ label: l, val }: { label: string; val: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}>
      <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{l}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>{val}</span>
    </div>
  )
}

function ResultadosTab({ data }: { data: Data }) {
  const [escenarioId, setEscenarioId] = useState('')
  const [vista, setVista] = useState<'mensual' | 'anual' | 'depletion'>('mensual')
  const [rows, setRows] = useState<Row[]>([])
  const [rowsAnual, setRowsAnual] = useState<Row[]>([])
  const [rowsDepletion, setRowsDepletion] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function cargar(id: string) {
    setEscenarioId(id)
    if (!id) { setRows([]); setRowsAnual([]); setRowsDepletion([]); return }
    setLoading(true)
    const [rMensual, rAnual, rDepletion] = await Promise.all([
      fetch(`/api/portal/reservas/resultados?escenario_id=${id}`),
      fetch(`/api/portal/reservas/resultados?escenario_id=${id}&vista=anual`),
      fetch(`/api/portal/reservas/resultados?escenario_id=${id}&vista=depletion`),
    ])
    setRows(rMensual.ok ? await rMensual.json() : [])
    setRowsAnual(rAnual.ok ? await rAnual.json() : [])
    setRowsDepletion(rDepletion.ok ? await rDepletion.json() : [])
    setLoading(false)
  }

  const pozoNombre = (id: unknown) => data.pozos.find(p => p.id === id)?.nombre ?? id
  const yacimientoNombre = (id: unknown) => id == null ? 'Consolidado' : (data.yacimientos.find(y => y.id === id)?.nombre ?? id)

  return (
    <Seccion title="Resultados por escenario">
      <Field><label style={label}>Escenario</label>
        <Select name="escenario_id" value={escenarioId} onChange={e => cargar(e.target.value)} opts={data.escenarios.map(e => ({ value: String(e.id), label: String(e.nombre) }))} />
      </Field>
      {escenarioId && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['mensual', 'anual', 'depletion'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0,
              color: vista === v ? 'var(--accent)' : 'var(--fg-muted)',
              textDecoration: vista === v ? 'underline' : 'none',
            }}>
              {v === 'mensual' ? 'Cash flow mensual (por pozo)' : v === 'anual' ? 'Resumen anual (por yacimiento + consolidado)' : 'Depleción de reservas P1/P2/P3'}
            </button>
          ))}
        </div>
      )}
      {loading && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>}
      {!loading && escenarioId && vista === 'mensual' && rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero en la pestaña anterior.</p>}
      {!loading && escenarioId && vista === 'anual' && rowsAnual.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero en la pestaña anterior.</p>}
      {!loading && escenarioId && vista === 'depletion' && rowsDepletion.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — necesita reservas cargadas (sección 15) y haber corrido el cálculo.</p>}

      {vista === 'depletion' && rowsDepletion.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Yacimiento</th>
                <th style={{ padding: '6px 8px' }}>Categoría</th>
                <th style={{ padding: '6px 8px' }}>Año</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Apertura (BOE)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Depleción (BOE)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cierre (BOE)</th>
              </tr>
            </thead>
            <tbody>
              {rowsDepletion.map(r => (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '6px 8px' }}>{String(yacimientoNombre(r.yacimiento_id))}</td>
                  <td style={{ padding: '6px 8px' }}>{String(r.categoria)}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{String(r.anio)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.apertura_boe).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.depletion_boe).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Number(r.cierre_boe).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'anual' && rowsAnual.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Yacimiento</th>
                <th style={{ padding: '6px 8px' }}>Año</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ingresos</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>EBITDA</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>D&amp;A</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>EBIT</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Resultado neto</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Netback (USD/BOE)</th>
              </tr>
            </thead>
            <tbody>
              {rowsAnual.map(r => (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--rule)', fontWeight: r.yacimiento_id == null ? 700 : 400 }}>
                  <td style={{ padding: '6px 8px' }}>{String(yacimientoNombre(r.yacimiento_id))}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{String(r.anio)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.ingresos_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.ebitda_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.depreciacion_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.ebit_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.resultado_neto_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.netback_usd_boe != null ? Number(r.netback_usd_boe).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'mensual' && rows.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Pozo</th>
                <th style={{ padding: '6px 8px' }}>Fecha</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ingreso bruto</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Regalías</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>OPEX</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Imp. ganancias</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cash flow neto</th>
                <th style={{ padding: '6px 8px' }}>Activo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '6px 8px' }}>{String(pozoNombre(r.pozo_id))}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{String(r.fecha)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.ingreso_bruto_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.regalias_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(Number(r.opex_fijo_usd) + Number(r.opex_variable_usd)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.impuesto_ganancias_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Number(r.cash_flow_neto_usd).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px' }}>{r.economicamente_activo ? '✓' : '✕'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  )
}

type ParetoPunto = {
  escenario_id: number; nombre: string; es_base: boolean
  capex_total_usd: number; npv_usd: number; irr_pct: number | null
  payback_anios: number | null; tasa_descuento: number | null; es_eficiente: boolean
}

function ParetoTab() {
  const [puntos, setPuntos] = useState<ParetoPunto[] | null>(null)
  const [err, setErr] = useState('')

  async function cargar() {
    setErr(''); setPuntos(null)
    const res = await fetch('/api/portal/reservas/pareto')
    if (!res.ok) { setErr((await res.json()).error ?? 'Error'); return }
    setPuntos(await res.json())
  }
  useEffect(() => { cargar() }, [])

  return (
    <Seccion title="NPV vs. CAPEX total — comparación entre escenarios">
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
        Cada punto es un escenario ya calculado (pestaña "Calcular escenario"). Los marcados en verde son
        eficientes en el sentido de Pareto — ningún otro escenario tiene más NPV con igual o menor CAPEX.
        Se recalcula automáticamente con lo que tengas cargado, no hay nada fijo.
      </p>
      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}
      {puntos === null && !err && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>}
      {puntos !== null && puntos.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Todavía no hay escenarios calculados — corré al menos dos en la pestaña "Calcular escenario" para poder comparar.</p>
      )}
      {puntos && puntos.length > 0 && (
        <>
          <ParetoScatter puntos={puntos} />
          <div style={{ overflowX: 'auto', marginTop: 20 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ padding: '6px 8px' }}>Escenario</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>CAPEX total</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>NPV</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>IRR</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Payback</th>
                  <th style={{ padding: '6px 8px' }}>Pareto-eficiente</th>
                </tr>
              </thead>
              <tbody>
                {[...puntos].sort((a, b) => b.npv_usd - a.npv_usd).map(p => (
                  <tr key={p.escenario_id} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 8px' }}>{p.nombre}{p.es_base ? ' (base)' : ''}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>US$ {(p.capex_total_usd / 1e6).toFixed(2)} MM</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>US$ {(p.npv_usd / 1e6).toFixed(2)} MM</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.irr_pct != null ? `${p.irr_pct.toFixed(1)}%` : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.payback_anios != null ? `${p.payback_anios.toFixed(1)} a.` : '—'}</td>
                    <td style={{ padding: '6px 8px', color: p.es_eficiente ? '#2d7a4a' : 'var(--fg-muted)', fontWeight: p.es_eficiente ? 700 : 400 }}>{p.es_eficiente ? '✓ eficiente' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Seccion>
  )
}

function ParetoScatter({ puntos }: { puntos: ParetoPunto[] }) {
  const W = 560, H = 320, PAD = 48
  const capexMax = Math.max(...puntos.map(p => p.capex_total_usd), 1)
  const npvMin = Math.min(...puntos.map(p => p.npv_usd), 0)
  const npvMax = Math.max(...puntos.map(p => p.npv_usd), 1)
  const npvRange = npvMax - npvMin || 1

  const x = (v: number) => PAD + (v / capexMax) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - npvMin) / npvRange) * (H - PAD * 2)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 600, background: 'var(--bg)', borderRadius: 8 }}>
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--rule)" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--rule)" />
      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--fg-muted)">CAPEX total (USD)</text>
      <text x={14} y={H / 2} textAnchor="middle" fontSize="11" fill="var(--fg-muted)" transform={`rotate(-90 14 ${H / 2})`}>NPV (USD)</text>
      {npvMin < 0 && (
        <line x1={PAD} y1={y(0)} x2={W - PAD} y2={y(0)} stroke="var(--rule)" strokeDasharray="4 3" />
      )}
      {puntos.map(p => (
        <g key={p.escenario_id}>
          <circle cx={x(p.capex_total_usd)} cy={y(p.npv_usd)} r={p.es_eficiente ? 6 : 4.5}
            fill={p.es_eficiente ? '#2d7a4a' : 'var(--fg-muted)'} stroke="var(--bg)" strokeWidth={1.5} />
          <text x={x(p.capex_total_usd) + 8} y={y(p.npv_usd) + 3} fontSize="10" fill="var(--fg-soft)">{p.nombre}</text>
        </g>
      ))}
    </svg>
  )
}

function ImportarCurvaExcel({ data, setErr, setMsg, reload }: {
  data: Data; setErr: (s: string) => void; setMsg: (s: string) => void; reload: () => void
}) {
  const [destino, setDestino] = useState<'pozo' | 'pozo_tipo'>('pozo')
  const [destinoId, setDestinoId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ meses: number; primerMes: string; ultimoMes: string; totalBblAnio1: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const opts = destino === 'pozo'
    ? data.pozos.map(p => ({ value: String(p.id), label: String(p.nombre) }))
    : data.pozos_tipo.map(p => ({ value: String(p.id), label: String(p.nombre) }))

  async function handleFile(f: File) {
    setFile(f); setErr(''); setMsg(''); setPreview(null)
    try {
      const { parseCurvaExcel } = await import('@/lib/reservas/parseCurvaExcel')
      const filas = await parseCurvaExcel(f)
      const anio1 = filas.slice(0, 12).reduce((s, x) => s + x.bbl_petroleo, 0)
      setPreview({ meses: filas.length, primerMes: filas[0].fecha, ultimoMes: filas[filas.length - 1].fecha, totalBblAnio1: anio1 })
      ;(f as unknown as { __filas?: unknown }).__filas = filas
    } catch (e) {
      setErr((e as Error).message)
      setFile(null)
    }
  }

  async function importar() {
    if (!file || !destinoId) return
    setLoading(true); setErr(''); setMsg('')
    try {
      const filas = (file as unknown as { __filas: unknown }).__filas
      const res = await fetch('/api/portal/reservas/curva-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(destino === 'pozo'
          ? { pozo_id: Number(destinoId), filas }
          : { pozo_tipo_id: Number(destinoId), filas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al importar')
      setMsg(`Curva importada: ${json.filas} meses cargados ✓`)
      setFile(null); setPreview(null); setDestinoId('')
      reload()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', border: '1px dashed var(--rule)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', margin: '0 0 10px' }}>Importar curva desde Excel</p>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 10px' }}>
        Busca automáticamente una fila con columnas "Fecha", "Pet" y "Gas" (m3/d y Mm3/d) y convierte a bbl/mes y Mcf/mes.
        Reemplaza toda la curva existente del pozo/pozo tipo elegido.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={label}>Destino</label>
          <select value={destino} onChange={e => { setDestino(e.target.value as 'pozo' | 'pozo_tipo'); setDestinoId('') }} style={{ ...input, width: 140 }}>
            <option value="pozo">Pozo</option>
            <option value="pozo_tipo">Pozo tipo</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={label}>{destino === 'pozo' ? 'Pozo' : 'Pozo tipo'}</label>
          <Select opts={opts} value={destinoId} onChange={e => setDestinoId(e.target.value)} />
        </div>
        <div>
          <label style={label}>Archivo .xlsx</label>
          <input type="file" accept=".xlsx,.xls" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ fontSize: 12 }} />
        </div>
      </div>
      {preview && (
        <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginBottom: 10 }}>
          {preview.meses} meses detectados ({preview.primerMes} a {preview.ultimoMes}) — año 1: {Math.round(preview.totalBblAnio1).toLocaleString('es-AR')} bbl de petróleo.
        </div>
      )}
      <button className="btn btn-primary" disabled={!file || !destinoId || loading} onClick={importar} style={{ padding: '8px 20px', fontSize: 12 }}>
        {loading ? 'Importando…' : 'Importar curva'}
      </button>
    </div>
  )
}

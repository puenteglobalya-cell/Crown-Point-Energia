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
  const [tab, setTab] = useState<'cargar' | 'calcular' | 'resultados'>('cargar')
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
          {(['cargar', 'calcular', 'resultados'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', padding: '10px 4px', marginRight: 16,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: tab === t ? 'var(--accent)' : 'var(--fg-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              {t === 'cargar' ? 'Cargar datos' : t === 'calcular' ? 'Calcular escenario' : 'Resultados'}
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
  const [vista, setVista] = useState<'mensual' | 'anual'>('mensual')
  const [rows, setRows] = useState<Row[]>([])
  const [rowsAnual, setRowsAnual] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function cargar(id: string) {
    setEscenarioId(id)
    if (!id) { setRows([]); setRowsAnual([]); return }
    setLoading(true)
    const [rMensual, rAnual] = await Promise.all([
      fetch(`/api/portal/reservas/resultados?escenario_id=${id}`),
      fetch(`/api/portal/reservas/resultados?escenario_id=${id}&vista=anual`),
    ])
    setRows(rMensual.ok ? await rMensual.json() : [])
    setRowsAnual(rAnual.ok ? await rAnual.json() : [])
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
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          {(['mensual', 'anual'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0,
              color: vista === v ? 'var(--accent)' : 'var(--fg-muted)',
              textDecoration: vista === v ? 'underline' : 'none',
            }}>
              {v === 'mensual' ? 'Cash flow mensual (por pozo)' : 'Resumen anual (por yacimiento + consolidado)'}
            </button>
          ))}
        </div>
      )}
      {loading && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>}
      {!loading && escenarioId && vista === 'mensual' && rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero en la pestaña anterior.</p>}
      {!loading && escenarioId && vista === 'anual' && rowsAnual.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero en la pestaña anterior.</p>}

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

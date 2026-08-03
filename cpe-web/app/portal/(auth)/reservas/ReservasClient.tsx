'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ENTITIES, type Data, type Row, type EntityConfig, type FieldConfig } from './entityConfig'
import { GraficoProduccion, GraficoFlujo, GraficoWaterfall, cssImpresion, type PasoWaterfall } from './informe/piezas'

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

// Una curva de pozo tipo son 240 filas y hay varias por escenario: renderizar
// una <tr> por registro dejaba la pantalla de carga pesadísima.
const MAX_FILAS_LISTA = 100

const GRUPOS_CARGA: { titulo: string; tablas: string[] }[] = [
  { titulo: 'Estructura', tablas: ['provincias', 'yacimientos', 'concesiones', 'concesion_participacion'] },
  { titulo: 'Pozos y producción', tablas: ['pozos', 'pozos_tipo', 'curvas_produccion', 'campanas', 'intervenciones'] },
  { titulo: 'Precios', tablas: ['formulas_precio', 'price_decks', 'price_deck_puntos', 'precios_referencia', 'precios_mensuales'] },
  { titulo: 'Costos e impuestos', tablas: ['opex_fijo', 'opex_variable', 'opex_fijo_pozo', 'regalias'] },
  { titulo: 'Proyectos y escenarios', tablas: ['proyectos', 'costos_proyecto', 'escenarios'] },
  { titulo: 'Reservas', tablas: ['reservas_anuales', 'reservas_movimientos', 'parametros_certeza_reservas'] },
  { titulo: 'Financiero', tablas: ['supuestos_generales', 'costos_corporativos', 'deuda_notas', 'comparables_mercado'] },
]

export default function ReservasClient() {
  const [tab, setTab] = useState<'cargar' | 'cronograma' | 'calcular' | 'resultados' | 'consolidado' | 'comparables' | 'pareto'>('cargar')
  const [seccionActiva, setSeccionActiva] = useState(ENTITIES[0].tabla)
  const [data, setData] = useState<Data | null>(null)

  async function reload() {
    const r = await fetch('/api/portal/reservas/data', { cache: 'no-store' })
    if (r.ok) setData(await r.json())
  }
  useEffect(() => { reload() }, [])

  if (!data) return <div style={{ padding: 40 }}>Cargando…</div>

  const activa = ENTITIES.find(e => e.tabla === seccionActiva) ?? ENTITIES[0]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: tab === 'cargar' ? 1180 : 920, margin: '0 auto' }}>
        <Link href="/portal" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>← Portal</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 20px' }}>
          Simulador de reservas
        </h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--rule)' }}>
          {(['cargar', 'cronograma', 'calcular', 'resultados', 'consolidado', 'comparables', 'pareto'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', padding: '10px 4px', marginRight: 16,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: tab === t ? 'var(--accent)' : 'var(--fg-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              {t === 'cargar' ? 'Cargar datos' : t === 'cronograma' ? 'Cronograma' : t === 'calcular' ? 'Calcular escenario' : t === 'resultados' ? 'Resultados' : t === 'consolidado' ? 'Consolidado' : t === 'comparables' ? 'Comparables' : 'Pareto de escenarios'}
            </button>
          ))}
        </div>

        {tab === 'cargar' && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <nav style={{
              width: 220, flexShrink: 0, position: 'sticky', top: 24,
              background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)',
              padding: '12px 8px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
            }}>
              <PlantillaMasiva reload={reload} />
              <ImportarResumenYacimiento reload={reload} />
              {GRUPOS_CARGA.map(grupo => (
                <div key={grupo.titulo} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)', padding: '6px 10px 4px' }}>
                    {grupo.titulo}
                  </div>
                  {grupo.tablas.map(tabla => {
                    const cfg = ENTITIES.find(e => e.tabla === tabla)
                    if (!cfg) return null
                    const isActive = cfg.tabla === seccionActiva
                    return (
                      <button
                        key={tabla}
                        onClick={() => setSeccionActiva(tabla)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', background: isActive ? 'var(--accent-pale, rgba(31,37,102,0.08))' : 'none',
                          border: 'none', borderRadius: 'var(--r-md)', padding: '8px 10px', marginBottom: 2,
                          fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent)' : 'var(--fg-soft)',
                          cursor: 'pointer',
                        }}
                      >
                        {cfg.title.replace(/^\d+[a-z]?\.\s*/, '')}
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>
            <div style={{ flex: 1, minWidth: 0 }}>
              <EntitySection key={activa.tabla} cfg={activa} data={data} reload={reload} />
            </div>
          </div>
        )}
        {tab === 'cronograma' && <CronogramaTab data={data} reload={reload} />}
        {tab === 'calcular' && <CalcularTab data={data} />}
        {tab === 'resultados' && <ResultadosTab data={data} />}
        {tab === 'consolidado' && <ConsolidadoTab />}
        {tab === 'comparables' && <ComparablesTab data={data} />}
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

function EntitySection({ cfg, data, reload }: {
  cfg: EntityConfig; data: Data; reload: () => void
}) {
  const [editing, setEditing] = useState<Row | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
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
      {err && <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 8, marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ fontSize: 13, color: 'var(--cp-positive, #2d7a4a)', padding: '10px 14px', background: 'rgba(45,122,74,0.08)', borderRadius: 8, marginBottom: 12 }}>{msg}</div>}

      {cfg.tabla !== 'curvas_produccion' && <PegarDesdeExcel cfg={cfg} data={data} reload={reload} />}

      {cfg.tabla === 'curvas_produccion' && (
        <>
          <ImportarCurvaExcel data={data} reload={reload} />
          <GenerarCurvaArps data={data} reload={reload} />
        </>
      )}

      {rows.length > MAX_FILAS_LISTA && (
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
          {rows.length.toLocaleString('es-AR')} registros cargados — se muestran los últimos {MAX_FILAS_LISTA}.
          {cfg.tabla === 'curvas_produccion' && ' Para reemplazar una curva completa, usá el importador de Excel de arriba.'}
        </p>
      )}
      {rows.length > 0 && (
        <div style={{ marginBottom: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {rows.slice(-MAX_FILAS_LISTA).map(r => (
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

type Diagnostico = { tipo: string; detalle: string; pozos_mes: number }
type NpvPorTasa = { tasa: number; npv_antes_impuestos_usd: number; npv_despues_impuestos_usd: number }
type Resultado = {
  pozos?: number; filas?: number; anios?: number; total_cashflow?: number
  npv_usd?: number; tasa_descuento?: number; irr_pct?: number | null
  payback_anios?: number | null; diagnosticos?: Diagnostico[]
  npv_por_tasa?: NpvPorTasa[]
  cuadre_amortizacion?: {
    capex_amortizable_usd: number; amortizacion_total_usd: number
    abandono_usd: number; diferencia_usd: number; cuadra: boolean
  }
}

const mm = (v: number) => `US$ ${(v / 1e6).toFixed(2)} MM`

function CalcularTab({ data }: { data: Data }) {
  const [escenarioId, setEscenarioId] = useState('')
  const [tasa, setTasa] = useState('0.10')
  const [horizonte, setHorizonte] = useState('20')
  const [loading, setLoading] = useState(false)
  const [panel, setPanel] = useState<'validar' | 'tornado' | 'incremental' | 'clonar' | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [err, setErr] = useState('')

  async function calcular() {
    setLoading(true); setErr(''); setResultado(null)
    try {
      const res = await fetch('/api/portal/reservas/calcular', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          escenario_id: Number(escenarioId),
          tasa_anual: Number(tasa),
          horizonte_anios: Number(horizonte),
        }),
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
      <Field><label style={label}>Horizonte en años (máximo 20)</label>
        <input value={horizonte} onChange={e => setHorizonte(e.target.value)} type="number" step="1" min="1" max="20" style={input} />
      </Field>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={!escenarioId || loading} onClick={calcular}>
          {loading ? 'Calculando…' : 'Calcular'}
        </button>
        <button className="btn" disabled={!escenarioId} onClick={() => setPanel(panel === 'validar' ? null : 'validar')}>
          Validar antes de calcular
        </button>
        <button className="btn" disabled={!escenarioId} onClick={() => setPanel(panel === 'tornado' ? null : 'tornado')}>
          Sensibilidad (tornado)
        </button>
        <button className="btn" disabled={!escenarioId} onClick={() => setPanel(panel === 'incremental' ? null : 'incremental')}>
          Economía incremental
        </button>
        <button className="btn" disabled={!escenarioId} onClick={() => setPanel(panel === 'clonar' ? null : 'clonar')}>
          Duplicar escenario
        </button>
      </div>
      {panel === 'validar' && escenarioId && <PanelValidacion escenarioId={escenarioId} />}
      {panel === 'tornado' && escenarioId && <PanelTornado escenarioId={escenarioId} tasa={tasa} horizonte={horizonte} />}
      {panel === 'incremental' && escenarioId && <PanelIncremental escenarioId={escenarioId} tasa={tasa} data={data} />}
      {panel === 'clonar' && escenarioId && <PanelClonar escenarioId={escenarioId} data={data} />}
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
      {resultado?.cuadre_amortizacion && (
        <div style={{
          marginTop: 18, padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: 12,
          border: `1px solid ${resultado.cuadre_amortizacion.cuadra ? '#2d7a4a' : 'var(--cp-negative)'}`,
          background: resultado.cuadre_amortizacion.cuadra ? 'rgba(45,122,74,0.06)' : 'rgba(179,59,46,0.06)',
        }}>
          <strong style={{ color: resultado.cuadre_amortizacion.cuadra ? '#2d7a4a' : 'var(--cp-negative)' }}>
            {resultado.cuadre_amortizacion.cuadra ? '✓ La amortización cuadra con el CAPEX' : '✕ La amortización no cuadra con el CAPEX'}
          </strong>
          <div style={{ color: 'var(--fg-soft)', marginTop: 4 }}>
            Amortizado {mm(resultado.cuadre_amortizacion.amortizacion_total_usd)} sobre un CAPEX amortizable de{' '}
            {mm(resultado.cuadre_amortizacion.capex_amortizable_usd)}
            {resultado.cuadre_amortizacion.abandono_usd > 0 && <> · abandono {mm(resultado.cuadre_amortizacion.abandono_usd)} (no amortizable, es costo de cierre)</>}
            {!resultado.cuadre_amortizacion.cuadra && <> · <strong>diferencia {mm(resultado.cuadre_amortizacion.diferencia_usd)}</strong></>}
          </div>
        </div>
      )}
      {resultado && (resultado.npv_por_tasa?.length ?? 0) > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: 'var(--fg)' }}>
            Valor presente del flujo neto futuro — formato NI 51-101
          </p>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 10px' }}>
            El Form 51-101F1 pide el valor presente sin descontar y a 5%, 10%, 15% y 20%,
            antes y después de deducir el impuesto a las ganancias. Base: participación de CPE en cada concesión.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ padding: '6px 8px' }}>Tasa de descuento</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Antes de impuestos</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Después de impuestos</th>
                </tr>
              </thead>
              <tbody>
                {resultado.npv_por_tasa!.map(r => (
                  <tr key={r.tasa} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>
                      {r.tasa === 0 ? 'Sin descontar' : `${(r.tasa * 100).toFixed(0)}%`}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(r.npv_antes_impuestos_usd)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{mm(r.npv_despues_impuestos_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {resultado && (resultado.diagnosticos?.length ?? 0) > 0 && (
        <div style={{ marginTop: 20, border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '14px 16px', background: 'rgba(214,158,46,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 4px', color: 'var(--fg)' }}>
            Revisar — {resultado.diagnosticos!.length} {resultado.diagnosticos!.length === 1 ? 'aviso' : 'avisos'} sobre los datos
          </p>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 10px' }}>
            El cálculo corrió igual, pero donde falta un dato el motor asume cero (o 100% de participación).
            Estos huecos son la causa más común de un NPV que no cierra.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--fg-soft)' }}>
            {resultado.diagnosticos!.slice(0, 12).map((d, i) => (
              <li key={i} style={{ marginBottom: 3 }}>
                {d.detalle}
                {d.pozos_mes > 1 && <span style={{ color: 'var(--fg-muted)' }}> · {d.pozos_mes.toLocaleString('es-AR')} pozos-mes</span>}
              </li>
            ))}
          </ul>
          {resultado.diagnosticos!.length > 12 && (
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '8px 0 0' }}>
              …y {resultado.diagnosticos!.length - 12} avisos más.
            </p>
          )}
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
  const [vista, setVista] = useState<'graficos' | 'mensual' | 'anual' | 'oneline' | 'depletion' | 'fdc'>('graficos')
  const [rows, setRows] = useState<Row[]>([])
  const [rowsAnual, setRowsAnual] = useState<Row[]>([])
  const [rowsDepletion, setRowsDepletion] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [pagina, setPagina] = useState(0)
  const [paginas, setPaginas] = useState(1)
  const [totalMensual, setTotalMensual] = useState(0)

  // La vista mensual se pagina en el servidor (500 filas por página): un
  // escenario real son decenas de miles de filas y traerlas todas de una
  // colgaba el navegador.
  async function cargarMensual(id: string, p: number) {
    const r = await fetch(`/api/portal/reservas/resultados?escenario_id=${id}&pagina=${p}`)
    if (!r.ok) { setRows([]); setTotalMensual(0); setPaginas(1); return }
    const json = await r.json()
    setRows(json.filas ?? [])
    setTotalMensual(json.total ?? 0)
    setPaginas(json.paginas ?? 1)
    setPagina(json.pagina ?? 0)
  }

  async function cargar(id: string) {
    setEscenarioId(id)
    setPagina(0)
    if (!id) { setRows([]); setRowsAnual([]); setRowsDepletion([]); setTotalMensual(0); return }
    setLoading(true)
    const [, rAnual, rDepletion] = await Promise.all([
      cargarMensual(id, 0),
      fetch(`/api/portal/reservas/resultados?escenario_id=${id}&vista=anual`),
      fetch(`/api/portal/reservas/resultados?escenario_id=${id}&vista=depletion`),
    ])
    setRowsAnual(rAnual.ok ? await rAnual.json() : [])
    setRowsDepletion(rDepletion.ok ? await rDepletion.json() : [])
    setLoading(false)
  }

  async function irAPagina(p: number) {
    if (!escenarioId || p < 0 || p >= paginas) return
    setLoading(true)
    await cargarMensual(escenarioId, p)
    setLoading(false)
  }

  const pozoNombre = (id: unknown) => data.pozos.find(p => p.id === id)?.nombre ?? id
  const yacimientoNombre = (id: unknown) => id == null ? 'Consolidado' : (data.yacimientos.find(y => y.id === id)?.nombre ?? id)

  return (
    <Seccion title="Resultados por escenario">
      <Field><label style={label}>Escenario</label>
        <Select name="escenario_id" value={escenarioId} onChange={e => cargar(e.target.value)} opts={data.escenarios.map(e => ({ value: String(e.id), label: String(e.nombre) }))} />
      </Field>
      {escenarioId && <BadgeEstado escenarioId={escenarioId} />}
      {escenarioId && (
        <div style={{ marginBottom: 14 }}>
          <a className="btn" href={`/api/portal/reservas/export?escenario_id=${escenarioId}`}
            style={{ padding: '7px 16px', fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>
            ↓ Descargar Excel (con fórmulas)
          </a>
          <a className="btn" href={`/portal/reservas/informe?escenario_id=${escenarioId}`} target="_blank" rel="noopener"
            style={{ padding: '7px 16px', fontSize: 12, textDecoration: 'none', display: 'inline-block', marginLeft: 8 }}>
            ↗ Informe para PDF (con dashboard)
          </a>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 10 }}>
            Las columnas derivadas van como fórmulas de Excel, no como valores — para poder auditar el cálculo
            y cruzarlo contra el Excel de referencia.
          </span>
        </div>
      )}
      {escenarioId && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['graficos', 'mensual', 'anual', 'oneline', 'depletion', 'fdc'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0,
              color: vista === v ? 'var(--accent)' : 'var(--fg-muted)',
              textDecoration: vista === v ? 'underline' : 'none',
            }}>
              {v === 'graficos' ? 'Gráficos' : v === 'mensual' ? 'Cash flow mensual (por pozo)' : v === 'anual' ? 'Resumen anual (por yacimiento + consolidado)' : v === 'oneline' ? 'One-line por pozo' : v === 'depletion' ? 'Depleción de reservas P1/P2/P3' : 'Capital de desarrollo futuro (FDC)'}
            </button>
          ))}
        </div>
      )}
      {loading && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>}
      {!loading && escenarioId && vista === 'mensual' && rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero en la pestaña anterior.</p>}
      {!loading && escenarioId && vista === 'anual' && rowsAnual.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero en la pestaña anterior.</p>}
      {!loading && escenarioId && vista === 'depletion' && rowsDepletion.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — necesita reservas cargadas (sección 15) y haber corrido el cálculo.</p>}

      {vista === 'graficos' && escenarioId && <PanelGraficos rowsAnual={rowsAnual} />}
      {vista === 'fdc' && escenarioId && <PanelFdc escenarioId={escenarioId} />}
      {vista === 'oneline' && escenarioId && <PanelOneLine escenarioId={escenarioId} />}

      {vista === 'depletion' && rowsDepletion.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 12, marginBottom: 0 }}>
          P1/P2/P3 son Probadas / Probables / Posibles <strong>incrementales</strong>: la producción de cada año
          agota primero las probadas y sólo el excedente pasa a probables y después a posibles.
          El cierre en BOE es volumen físico; la última columna lo pondera por el grado de certeza de la categoría.
          Las columnas intermedias son las seis categorías de movimiento que exige NI 51-101 y se cargan del informe
          del evaluador: <strong>apertura + movimientos − producción = cierre</strong>.
        </p>
      )}
      {vista === 'depletion' && rowsDepletion.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Yacimiento</th>
                <th style={{ padding: '6px 8px' }}>Categoría</th>
                <th style={{ padding: '6px 8px' }}>Año</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Apertura (BOE)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Revisiones</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Extensiones</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Descub.</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Adquis.</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cesiones</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Fact. econ.</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Producción</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cierre (BOE)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cierre ponderado por certeza</th>
              </tr>
            </thead>
            <tbody>
              {rowsDepletion.map(r => (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '6px 8px' }}>{String(yacimientoNombre(r.yacimiento_id))}</td>
                  <td style={{ padding: '6px 8px' }}>{String(r.categoria)}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{String(r.anio)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.apertura_boe).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  {(['revision_tecnica_boe', 'extension_boe', 'descubrimiento_boe', 'adquisicion_boe', 'cesion_boe', 'factores_economicos_boe'] as const).map(k => (
                    <td key={k} style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(r[k] ?? 0) < 0 ? 'var(--cp-negative)' : 'var(--fg-muted)' }}>
                      {r[k] == null || Number(r[k]) === 0 ? '—' : Number(r[k]).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(r.depletion_boe).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Number(r.cierre_boe).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>
                    {r.cierre_riesgo_boe != null
                      ? `${Number(r.cierre_riesgo_boe).toLocaleString('es-AR', { maximumFractionDigits: 0 })}${r.factor_certeza != null ? ` (${(Number(r.factor_certeza) * 100).toFixed(0)}%)` : ''}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'anual' && rowsAnual.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <caption style={{ captionSide: 'top', textAlign: 'left', fontSize: 11, color: 'var(--fg-muted)', paddingBottom: 6 }}>
              Todas las líneas <strong>netas a CPE</strong>: los inputs se cargan al 100% del proyecto y el motor
              las afecta por la participación vigente en cada mes, incluidos los volúmenes.
            </caption>
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
            <caption style={{ captionSide: 'top', textAlign: 'left', fontSize: 11, color: 'var(--fg-muted)', paddingBottom: 6 }}>
              Las líneas están <strong>al 100% del proyecto</strong> (es la pista de auditoría); sólo el cash flow
              neto está afectado por la participación del mes.
            </caption>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--fg-muted)' }}>
            <button onClick={() => irAPagina(pagina - 1)} disabled={pagina === 0 || loading}
              className="btn" style={{ padding: '4px 12px', fontSize: 12 }}>← Anterior</button>
            <span>
              Página {pagina + 1} de {paginas} · {totalMensual.toLocaleString('es-AR')} filas mensuales
            </span>
            <button onClick={() => irAPagina(pagina + 1)} disabled={pagina + 1 >= paginas || loading}
              className="btn" style={{ padding: '4px 12px', fontSize: 12 }}>Siguiente →</button>
          </div>
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

// Carga inicial completa: una plantilla con las 28 hojas, en vez de recorrer
// tabla por tabla. El botón vive en la barra lateral porque no es un caso más
// de EntitySection — toca todas las tablas a la vez.
function PlantillaMasiva({ reload }: { reload: () => void }) {
  const [subiendo, setSubiendo] = useState(false)
  const [err, setErr] = useState('')
  const [reporte, setReporte] = useState<{ hoja: string; fila: number; error: string }[] | null>(null)
  const [msg, setMsg] = useState('')

  async function descargar() {
    setErr('')
    const r = await fetch('/api/portal/reservas/plantilla-masiva')
    if (!r.ok) { setErr((await r.json().catch(() => ({})))?.error ?? 'No se pudo generar la plantilla'); return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_completa_cpe.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function subir(file: File) {
    setSubiendo(true); setErr(''); setMsg(''); setReporte(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/portal/reservas/import-masivo', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) {
        if (j.reporte) setReporte(j.reporte)
        throw new Error(j.error ?? 'Error al importar')
      }
      setMsg(`${j.total} filas cargadas en ${Object.keys(j.insertadasPorTabla).length} tablas ✓`)
      reload()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div style={{ padding: '4px 10px 12px', marginBottom: 8, borderBottom: '1px solid var(--rule)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '2px 0 8px' }}>
        Carga inicial completa
      </p>
      <button type="button" onClick={descargar} style={{
        display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
        borderRadius: 'var(--r-md)', padding: '6px 10px', fontSize: 12, color: 'var(--fg-soft)', cursor: 'pointer',
      }}>
        ⇓ Descargar plantilla completa
      </button>
      <label style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 12,
        color: 'var(--fg-soft)', cursor: subiendo ? 'default' : 'pointer',
      }}>
        {subiendo ? 'Importando…' : '⇈ Subir plantilla completa'}
        <input type="file" accept=".xlsx" disabled={subiendo} style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && subir(e.target.files[0])} />
      </label>
      {msg && <p style={{ fontSize: 11, color: 'var(--cp-positive, #2d7a4a)', padding: '0 10px' }}>{msg}</p>}
      {err && <p style={{ fontSize: 11, color: 'var(--cp-negative)', padding: '0 10px' }}>{err}</p>}
      {reporte && (
        <div style={{ fontSize: 11, color: 'var(--fg-soft)', padding: '4px 10px', maxHeight: 200, overflowY: 'auto' }}>
          {reporte.map((r, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <b>{r.hoja}</b>, fila {r.fila}: {r.error}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Fila ancha por yacimiento (provincia + tipo de recuperación + IIBB +
// participación en la concesión + regalía todo junto), como lo tiene armado
// el equipo técnico en su Excel de gestión, en vez de las 4 hojas
// normalizadas separadas. Requiere que la concesión (mismo nombre que el
// yacimiento) ya exista, con sus fechas — esta fila no las trae.
function ImportarResumenYacimiento({ reload }: { reload: () => void }) {
  const [hoja, setHoja] = useState('provincias')
  const [subiendo, setSubiendo] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [reporte, setReporte] = useState<{ fila: number; error: string }[] | null>(null)

  async function subir(file: File) {
    setSubiendo(true); setErr(''); setMsg(''); setReporte(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('hoja', hoja)
      const r = await fetch('/api/portal/reservas/importar-resumen-yacimiento', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Error al importar')
      setMsg(`Provincias +${j.provincias} · Yacimientos +${j.yacimientos} · Participaciones +${j.participaciones} · Regalías +${j.regalias}`)
      if (j.reporte?.length > 0) setReporte(j.reporte)
      reload()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div style={{ padding: '4px 10px 12px', marginBottom: 8, borderBottom: '1px solid var(--rule)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '2px 0 8px' }}>
        Resumen por yacimiento
      </p>
      <input value={hoja} onChange={e => setHoja(e.target.value)} placeholder="Nombre de la hoja"
        style={{ ...input, width: '100%', marginBottom: 6, fontSize: 11 }} />
      <label style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 12,
        color: 'var(--fg-soft)', cursor: subiendo ? 'default' : 'pointer',
      }}>
        {subiendo ? 'Importando…' : '⇈ Subir hoja (provincia+yacimiento+participación+regalía)'}
        <input type="file" accept=".xlsx" disabled={subiendo} style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && subir(e.target.files[0])} />
      </label>
      {msg && <p style={{ fontSize: 11, color: 'var(--cp-positive, #2d7a4a)', padding: '0 10px' }}>{msg}</p>}
      {err && <p style={{ fontSize: 11, color: 'var(--cp-negative)', padding: '0 10px' }}>{err}</p>}
      {reporte && (
        <div style={{ fontSize: 11, color: 'var(--fg-soft)', padding: '4px 10px', maxHeight: 160, overflowY: 'auto' }}>
          {reporte.map((r, i) => <div key={i} style={{ marginBottom: 4 }}>Fila {r.fila}: {r.error}</div>)}
        </div>
      )}
    </div>
  )
}

type RepartoUI = { destinoId: string; pct: string; pctGas: string }

function ImportarCurvaExcel({ data, reload }: {
  data: Data; reload: () => void
}) {
  const [destino, setDestino] = useState<'pozo' | 'pozo_tipo'>('pozo')
  const [destinoId, setDestinoId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // Las filas parseadas viven en el estado. Antes se colgaban del objeto File
  // como propiedad (`__filas`), y si el usuario volvía a elegir un archivo se
  // podía importar la curva del anterior.
  const [filasParseadas, setFilasParseadas] = useState<{ mes_offset: number; fecha: string; bbl_petroleo: number; mcf_gas: number }[] | null>(null)
  const [preview, setPreview] = useState<{ meses: number; primerMes: string; ultimoMes: string; totalBblAnio1: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  // Modo reparto: el archivo trae una curva agregada (toda la concesión, sin
  // apertura por yacimiento todavía) y hay que repartirla por porcentaje
  // entre varios pozos tipo — siempre a pozo tipo, porque son destinos
  // virtuales, no pozos reales. Un solo % por fila (aplica a petróleo y gas
  // salvo que se active "separar gas"), sin volver a leer el archivo.
  const [repartoActivo, setRepartoActivo] = useState(false)
  const [separarGas, setSepararGas] = useState(false)
  const [repartos, setRepartos] = useState<RepartoUI[]>([
    { destinoId: '', pct: '100', pctGas: '100' },
  ])

  const opts = destino === 'pozo'
    ? data.pozos.map(p => ({ value: String(p.id), label: String(p.nombre) }))
    : data.pozos_tipo.map(p => ({ value: String(p.id), label: String(p.nombre) }))

  const optsReparto = data.pozos_tipo.map(p => ({ value: String(p.id), label: String(p.nombre) }))

  const sumaPetroleo = repartos.reduce((s, r) => s + (Number(r.pct) || 0), 0)
  const sumaGas = repartos.reduce((s, r) => s + (Number(separarGas ? r.pctGas : r.pct) || 0), 0)

  function actualizarReparto(i: number, cambio: Partial<RepartoUI>) {
    setRepartos(rs => rs.map((r, idx) => idx === i ? { ...r, ...cambio } : r))
  }

  async function handleFile(f: File) {
    setFile(f); setErr(''); setMsg(''); setPreview(null); setFilasParseadas(null)
    try {
      const { parseCurvaExcel } = await import('@/lib/reservas/parseCurvaExcel')
      const filas = await parseCurvaExcel(f)
      const anio1 = filas.slice(0, 12).reduce((s, x) => s + x.bbl_petroleo, 0)
      setPreview({ meses: filas.length, primerMes: filas[0].fecha, ultimoMes: filas[filas.length - 1].fecha, totalBblAnio1: anio1 })
      setFilasParseadas(filas)
    } catch (e) {
      setErr((e as Error).message)
      setFile(null)
      setFilasParseadas(null)
    }
  }

  async function importar() {
    if (!file || !filasParseadas) return
    if (repartoActivo && repartos.some(r => !r.destinoId)) { setErr('Faltan destinos sin elegir en el reparto'); return }
    if (!repartoActivo && !destinoId) return

    setLoading(true); setErr(''); setMsg('')
    try {
      const filas = filasParseadas
      const body = repartoActivo
        ? {
            filas,
            repartos: repartos.map(r => ({
              pozo_tipo_id: Number(r.destinoId),
              pct_petroleo: Number(r.pct) || 0,
              pct_gas: Number(separarGas ? r.pctGas : r.pct) || 0,
            })),
          }
        : (destino === 'pozo' ? { pozo_id: Number(destinoId), filas } : { pozo_tipo_id: Number(destinoId), filas })

      const res = await fetch('/api/portal/reservas/curva-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al importar')
      setMsg(repartoActivo
        ? `Curva repartida entre ${json.destinos} destinos: ${json.filas} filas cargadas en total ✓`
        : `Curva importada: ${json.filas} meses cargados ✓`)
      setFile(null); setPreview(null); setDestinoId(''); setFilasParseadas(null)
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
        Si el archivo tiene varios grupos de columnas (Curva Base, Perforación, Workover, Total…) toma el primero de
        izquierda a derecha — por convención, la curva básica sin los incrementales mezclados.
        El agua no se carga: el motor no la usa en ningún cálculo.
      </p>
      {err && <div style={{ fontSize: 12, color: 'var(--cp-negative)', padding: '8px 12px', background: 'rgba(179,59,46,0.08)', borderRadius: 8, marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ fontSize: 12, color: 'var(--cp-positive, #2d7a4a)', padding: '8px 12px', background: 'rgba(45,122,74,0.08)', borderRadius: 8, marginBottom: 10 }}>{msg}</div>}

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-soft)', marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={repartoActivo} onChange={e => setRepartoActivo(e.target.checked)} />
        Repartir por % entre varios pozos/yacimientos (archivo agregado sin apertura todavía)
      </label>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {!repartoActivo && (
          <>
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
          </>
        )}
        <div>
          <label style={label}>Archivo .xlsx</label>
          <input type="file" accept=".xlsx,.xls" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ fontSize: 12 }} />
        </div>
      </div>

      {preview && (
        <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginBottom: 10 }}>
          {preview.meses} meses detectados ({preview.primerMes} a {preview.ultimoMes}) — año 1 al 100%: {Math.round(preview.totalBblAnio1).toLocaleString('es-AR')} bbl de petróleo.
        </div>
      )}

      {repartoActivo && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={separarGas} onChange={e => setSepararGas(e.target.checked)} />
            El % de gas es distinto al de petróleo (si no, usa el mismo % para los dos)
          </label>
          {repartos.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={label}>Pozo tipo destino</label>
                <Select opts={optsReparto} value={r.destinoId} onChange={e => actualizarReparto(i, { destinoId: e.target.value })} />
              </div>
              <div>
                <label style={label}>{separarGas ? '% petróleo' : '%'}</label>
                <input type="number" min={0} max={100} step="0.1" value={r.pct}
                  onChange={e => actualizarReparto(i, { pct: e.target.value })} style={{ ...input, width: 90 }} />
              </div>
              {separarGas && (
                <div>
                  <label style={label}>% gas</label>
                  <input type="number" min={0} max={100} step="0.1" value={r.pctGas}
                    onChange={e => actualizarReparto(i, { pctGas: e.target.value })} style={{ ...input, width: 90 }} />
                </div>
              )}
              {repartos.length > 1 && (
                <button type="button" onClick={() => setRepartos(rs => rs.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', color: 'var(--cp-negative)', cursor: 'pointer', fontSize: 16, padding: '0 6px' }}>×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setRepartos(rs => [...rs, { destinoId: '', pct: '0', pctGas: '0' }])}
            style={{ background: 'none', border: '1px dashed var(--rule)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--fg-soft)', cursor: 'pointer' }}>
            + agregar destino
          </button>
          <p style={{ fontSize: 11, margin: '8px 0 0', color: (sumaPetroleo !== 100 || sumaGas !== 100) ? 'var(--cp-negative)' : 'var(--fg-muted)' }}>
            Suma: {sumaPetroleo}% petróleo{separarGas && ` · ${sumaGas}% gas`}
            {(sumaPetroleo !== 100 || sumaGas !== 100) && ' — normalmente tendría que dar 100%, revisá si es intencional'}
          </p>
        </div>
      )}

      <button className="btn btn-primary" disabled={!file || !filasParseadas || (repartoActivo ? repartos.some(r => !r.destinoId) : !destinoId) || loading} onClick={importar} style={{ padding: '8px 20px', fontSize: 12 }}>
        {loading ? 'Importando…' : repartoActivo ? 'Repartir e importar' : 'Importar curva'}
      </button>
    </div>
  )
}

// Generador de curva por declinación de Arps. Alternativa a cargar 240 filas a
// mano o a depender de un Excel: con caudal inicial, declinación efectiva
// anual y factor b queda definida la curva completa. Es el método
// convencional de análisis de declinación, apropiado para los yacimientos
// convencionales de CPE.
function GenerarCurvaArps({ data, reload }: { data: Data; reload: () => void }) {
  const [destino, setDestino] = useState<'pozo' | 'pozo_tipo'>('pozo_tipo')
  const [destinoId, setDestinoId] = useState('')
  const [qiOil, setQiOil] = useState('50')
  const [qiGas, setQiGas] = useState('0')
  const [decl, setDecl] = useState('0.25')
  const [b, setB] = useState('0.5')
  const [meses, setMeses] = useState('240')
  const [limite, setLimite] = useState('')
  const [preview, setPreview] = useState<{ meses: number; bbl: number; mcf: number; boe: number } | null>(null)
  const [filas, setFilas] = useState<unknown[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const opts = destino === 'pozo'
    ? data.pozos.map(p => ({ value: String(p.id), label: String(p.nombre) }))
    : data.pozos_tipo.map(p => ({ value: String(p.id), label: String(p.nombre) }))

  async function generar() {
    setErr(''); setMsg(''); setPreview(null); setFilas(null)
    try {
      const { generarCurvaArps, eurDeCurva } = await import('@/lib/reservas/arps')
      const curva = generarCurvaArps({
        qiPetroleoBblDia: Number(qiOil),
        qiGasMcfDia: Number(qiGas),
        declinacionEfectivaAnual: Number(decl),
        b: Number(b),
        meses: Number(meses),
        limiteAbandonoBblDia: limite ? Number(limite) : undefined,
      })
      const eur = eurDeCurva(curva)
      setPreview({ meses: curva.length, ...eur })
      setFilas(curva)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function guardar() {
    if (!filas || !destinoId) return
    setLoading(true); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/portal/reservas/curva-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(destino === 'pozo'
          ? { pozo_id: Number(destinoId), filas }
          : { pozo_tipo_id: Number(destinoId), filas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar la curva')
      setMsg(`Curva generada y guardada: ${json.filas} meses ✓`)
      setPreview(null); setFilas(null); setDestinoId('')
      reload()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const num = (titulo: string, value: string, set: (v: string) => void, step: string, extra?: string) => (
    <div style={{ minWidth: 120 }}>
      <label style={label}>{titulo}</label>
      <input value={value} onChange={e => { set(e.target.value); setPreview(null); setFilas(null) }}
        type="number" step={step} style={input} placeholder={extra} />
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', border: '1px dashed var(--rule)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', margin: '0 0 10px' }}>Generar curva por declinación (Arps)</p>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 10px' }}>
        Define la curva completa con tres parámetros en lugar de cargar mes por mes.
        b = 0 exponencial · 0 &lt; b &lt; 1 hiperbólica · b = 1 armónica.
        Reemplaza toda la curva existente del pozo/pozo tipo elegido.
      </p>
      {err && <div style={{ fontSize: 12, color: 'var(--cp-negative)', padding: '8px 12px', background: 'rgba(179,59,46,0.08)', borderRadius: 8, marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ fontSize: 12, color: 'var(--cp-positive, #2d7a4a)', padding: '8px 12px', background: 'rgba(45,122,74,0.08)', borderRadius: 8, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={label}>Destino</label>
          <select value={destino} onChange={e => { setDestino(e.target.value as 'pozo' | 'pozo_tipo'); setDestinoId('') }} style={{ ...input, width: 130 }}>
            <option value="pozo_tipo">Pozo tipo</option>
            <option value="pozo">Pozo</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 170 }}>
          <label style={label}>{destino === 'pozo' ? 'Pozo' : 'Pozo tipo'}</label>
          <Select opts={opts} value={destinoId} onChange={e => setDestinoId(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {num('qi petróleo (bbl/d)', qiOil, setQiOil, '0.1')}
        {num('qi gas (Mcf/d)', qiGas, setQiGas, '0.1')}
        {num('Declinación efect. anual', decl, setDecl, '0.01', '0.25 = 25%/año')}
        {num('Factor b', b, setB, '0.05')}
        {num('Meses', meses, setMeses, '1')}
        {num('Límite abandono (bbl/d)', limite, setLimite, '0.1', 'opcional')}
      </div>

      {preview && (
        <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginBottom: 10 }}>
          {preview.meses} meses generados — EUR {Math.round(preview.bbl).toLocaleString('es-AR')} bbl
          {preview.mcf > 0 && ` + ${Math.round(preview.mcf).toLocaleString('es-AR')} Mcf`}
          {' '}({Math.round(preview.boe).toLocaleString('es-AR')} BOE).
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" type="button" onClick={generar} style={{ padding: '8px 20px', fontSize: 12 }}>
          Previsualizar
        </button>
        <button className="btn btn-primary" type="button" disabled={!filas || !destinoId || loading} onClick={guardar} style={{ padding: '8px 20px', fontSize: 12 }}>
          {loading ? 'Guardando…' : 'Guardar curva'}
        </button>
      </div>
    </div>
  )
}

// ─── Cronograma de campaña ───────────────────────────────────────────────
// El sentido de esta pantalla: la participación de CPE en la concesión cambia
// de porcentaje en el tiempo, así que adelantar o atrasar la campaña cambia el
// cash flow. Acá se mueve el cronograma (equipos y días) y se ve el efecto en
// las fechas de primera producción; después se corre el cálculo y se compara.
type PozoProgramado = {
  intervencionId: number; etiqueta: string; orden: number
  equipoPerforacion: number; equipoTerminacion: number | null
  inicioPerforacion: string; finPerforacion: string; inicioTerminacion: string
  primeraProduccion: string; diasPerforacion: number; diasTerminacion: number
}
type RespuestaCronograma = {
  campana?: Row
  cronograma: PozoProgramado[]
  resumen: { pozos: number; inicio: string; fin: string; diasTotales: number; mesesTotales: number } | null
  aviso: string | null
  aplicado?: number
}

function CronogramaTab({ data, reload }: { data: Data; reload: () => void }) {
  const [campanaId, setCampanaId] = useState('')
  const [resp, setResp] = useState<RespuestaCronograma | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const campanas = data.campanas ?? []

  async function ver(id: string) {
    setCampanaId(id); setResp(null); setErr(''); setMsg('')
    if (!id) return
    setLoading(true)
    try {
      const r = await fetch(`/api/portal/reservas/campana?campana_id=${id}`, { cache: 'no-store' })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Error')
      setResp(json)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function aplicar() {
    if (!campanaId) return
    setLoading(true); setErr(''); setMsg('')
    try {
      const r = await fetch('/api/portal/reservas/campana', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campana_id: Number(campanaId), aplicar: true }),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Error')
      setResp(json)
      setMsg(`Cronograma aplicado a ${json.aplicado} intervenciones ✓ Ya podés correr el cálculo para ver el cash flow.`)
      reload()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Seccion title="Cronograma de campaña — cuándo se perfora cada pozo">
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
        La participación de CPE en cada concesión cambia de porcentaje en el tiempo, así que <strong>cuándo</strong> se
        perfora cambia el cash flow. Acá el cronograma se deriva de la cantidad de equipos y los días por etapa:
        cada pozo se asigna al primer equipo que se libera. Cambiá los equipos o los días en la campaña, volvé a
        previsualizar, aplicá y corré el cálculo para comparar el VAN.
      </p>

      {campanas.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          Todavía no hay campañas. Creá una en <strong>Cargar datos → Campaña de perforación</strong> y asigná
          intervenciones a ella con un orden.
        </p>
      )}

      {campanas.length > 0 && (
        <Field><label style={label}>Campaña</label>
          <Select value={campanaId} onChange={e => ver(e.target.value)}
            opts={campanas.map(c => ({ value: String(c.id), label: String(c.nombre) }))} />
        </Field>
      )}

      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}
      {msg && <div style={{ fontSize: 13, color: 'var(--cp-positive, #2d7a4a)', padding: '10px 14px', background: 'rgba(45,122,74,0.08)', borderRadius: 8, marginBottom: 12 }}>{msg}</div>}
      {loading && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Calculando…</p>}
      {resp?.aviso && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{resp.aviso}</p>}

      {resp && resp.cronograma.length > 0 && (
        <>
          {resp.resumen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 18 }}>
              <Kv label="Pozos en la campaña" val={String(resp.resumen.pozos)} />
              <Kv label="Equipos" val={`${resp.campana?.equipos_perforacion} perf.${resp.campana?.equipos_terminacion ? ` + ${resp.campana.equipos_terminacion} term.` : ' (perfora y termina)'}`} />
              <Kv label="Primera perforación" val={resp.resumen.inicio} />
              <Kv label="Última primera producción" val={resp.resumen.fin} />
              <Kv label="Duración de la campaña" val={`${resp.resumen.diasTotales} días · ${resp.resumen.mesesTotales} meses`} />
            </div>
          )}

          <GanttCampana prog={resp.cronograma} />

          <div style={{ overflowX: 'auto', marginTop: 18 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ padding: '6px 8px' }}>#</th>
                  <th style={{ padding: '6px 8px' }}>Pozo</th>
                  <th style={{ padding: '6px 8px' }}>Equipo</th>
                  <th style={{ padding: '6px 8px' }}>Inicio perforación</th>
                  <th style={{ padding: '6px 8px' }}>Fin perforación</th>
                  <th style={{ padding: '6px 8px' }}>Primera producción</th>
                </tr>
              </thead>
              <tbody>
                {resp.cronograma.map(p => (
                  <tr key={p.intervencionId} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{p.orden}</td>
                    <td style={{ padding: '6px 8px' }}>{p.etiqueta}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>
                      P{p.equipoPerforacion}{p.equipoTerminacion ? ` · T${p.equipoTerminacion}` : ''}
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{p.inicioPerforacion}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{p.finPerforacion}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.primeraProduccion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '12px 0' }}>
            Aplicar escribe estas fechas en las intervenciones de la campaña: la primera producción como fecha de
            arranque de la curva, y el inicio de perforación como mes de imputación del CAPEX.
          </p>
          <button className="btn btn-primary" disabled={loading} onClick={aplicar}>
            {loading ? 'Aplicando…' : 'Aplicar cronograma a las intervenciones'}
          </button>

          <BarridoCampana campanaId={campanaId} />
        </>
      )}
    </Seccion>
  )
}

// Gantt simple en SVG: una fila por pozo, perforación y terminación en colores
// distintos, con el hito de primera producción.
function GanttCampana({ prog }: { prog: PozoProgramado[] }) {
  const dia = (iso: string) => Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 86400000)
  const min = Math.min(...prog.map(p => dia(p.inicioPerforacion)))
  const max = Math.max(...prog.map(p => dia(p.primeraProduccion)))
  const span = Math.max(max - min, 1)

  const FILA = 22, PAD_L = 130, PAD_T = 24, W = 720
  const H = PAD_T + prog.length * FILA + 26
  const x = (d: number) => PAD_L + ((d - min) / span) * (W - PAD_L - 20)

  // Marcas de año
  const anios: { anio: number; d: number }[] = []
  for (let a = new Date(min * 86400000).getUTCFullYear(); a <= new Date(max * 86400000).getUTCFullYear() + 1; a++) {
    anios.push({ anio: a, d: dia(`${a}-01-01`) })
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 560, background: 'var(--bg)', borderRadius: 8 }}>
        {anios.filter(a => a.d >= min && a.d <= max).map(a => (
          <g key={a.anio}>
            <line x1={x(a.d)} y1={PAD_T - 8} x2={x(a.d)} y2={H - 22} stroke="var(--rule)" strokeDasharray="3 3" />
            <text x={x(a.d)} y={PAD_T - 12} fontSize="9" fill="var(--fg-muted)" textAnchor="middle">{a.anio}</text>
          </g>
        ))}
        {prog.map((p, i) => {
          const y = PAD_T + i * FILA
          const xPerf = x(dia(p.inicioPerforacion))
          const xFinPerf = x(dia(p.finPerforacion))
          const xTerm = x(dia(p.inicioTerminacion))
          const xProd = x(dia(p.primeraProduccion))
          return (
            <g key={p.intervencionId}>
              <text x={PAD_L - 8} y={y + 11} fontSize="10" fill="var(--fg-soft)" textAnchor="end">{p.etiqueta}</text>
              <rect x={xPerf} y={y + 2} width={Math.max(xFinPerf - xPerf, 1.5)} height={12} rx={2} fill="var(--accent)" opacity={0.85} />
              {xProd > xTerm && (
                <rect x={xTerm} y={y + 2} width={Math.max(xProd - xTerm, 1.5)} height={12} rx={2} fill="#d69e2e" opacity={0.8} />
              )}
              <circle cx={xProd} cy={y + 8} r={3} fill="#2d7a4a" />
            </g>
          )
        })}
        <g transform={`translate(${PAD_L}, ${H - 8})`}>
          <rect x={0} y={-8} width={10} height={8} rx={2} fill="var(--accent)" opacity={0.85} />
          <text x={14} y={-1} fontSize="9" fill="var(--fg-muted)">Perforación</text>
          <rect x={78} y={-8} width={10} height={8} rx={2} fill="#d69e2e" opacity={0.8} />
          <text x={92} y={-1} fontSize="9" fill="var(--fg-muted)">Terminación</text>
          <circle cx={168} cy={-4} r={3} fill="#2d7a4a" />
          <text x={176} y={-1} fontSize="9" fill="var(--fg-muted)">Primera producción</text>
        </g>
      </svg>
    </div>
  )
}

// ─── Barrido de fechas de inicio ─────────────────────────────────────────
// La pregunta de fondo del simulador: ¿cuándo conviene arrancar la campaña,
// dado que el % de participación en la concesión cambia con el tiempo?
type PuntoBarrido = {
  offset_meses: number; fecha_inicio: string; primera_produccion: string
  ultima_produccion: string; npv_usd: number; capex_total_usd: number
  participacion_primera_produccion: number | null
  pozos_antes_del_cambio: number | null
}
type RespuestaBarrido = {
  campana: { id: number; nombre: string; fecha_inicio: string; equipos_perforacion: number }
  fecha_base_descuento: string
  tasa_descuento: number
  quiebre_participacion: string | null
  puntos: PuntoBarrido[]
  mejor: PuntoBarrido
  por_equipos: { equipos: number; mejor: PuntoBarrido }[]
  cambios_participacion: { fecha: string; porcentaje: number }[]
}

function BarridoCampana({ campanaId }: { campanaId: string }) {
  const [meses, setMeses] = useState('36')
  const [paso, setPaso] = useState('1')
  const [tasa, setTasa] = useState('0.10')
  const [equipos, setEquipos] = useState('1,2,3')
  const [res, setRes] = useState<RespuestaBarrido | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function correr() {
    setLoading(true); setErr(''); setRes(null)
    try {
      const r = await fetch('/api/portal/reservas/campana/barrido', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campana_id: Number(campanaId), meses: Number(meses),
          paso: Number(paso), tasa_anual: Number(tasa),
          equipos_a_comparar: equipos.split(',').map(x => Number(x.trim())).filter(n => n >= 1),
        }),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Error')
      setRes(json)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const base = res?.puntos.find(p => p.offset_meses === 0)
  const delta = res && base ? res.mejor.npv_usd - base.npv_usd : 0

  return (
    <div style={{ borderTop: '1px solid var(--rule)', marginTop: 28, paddingTop: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: 'var(--fg)' }}>
        ¿Cuándo conviene arrancar? — barrido de fechas de inicio
      </p>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 14px' }}>
        Reprograma la campaña completa mes a mes, corre el motor con cada arranque y compara el VAN.
        No escribe nada: es sólo para decidir. Todos los candidatos se descuentan a la <strong>misma fecha base</strong>,
        que es lo que hace que sean comparables — si cada uno se descontara a su propio primer mes,
        postergar siempre parecería mejor.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ minWidth: 120 }}>
          <label style={label}>Meses a barrer</label>
          <input value={meses} onChange={e => setMeses(e.target.value)} type="number" min="1" max="72" style={input} />
        </div>
        <div style={{ minWidth: 100 }}>
          <label style={label}>Paso (meses)</label>
          <input value={paso} onChange={e => setPaso(e.target.value)} type="number" min="1" style={input} />
        </div>
        <div style={{ minWidth: 120 }}>
          <label style={label}>Tasa de descuento</label>
          <input value={tasa} onChange={e => setTasa(e.target.value)} type="number" step="0.01" style={input} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={label}>Equipos a comparar</label>
          <input value={equipos} onChange={e => setEquipos(e.target.value)} type="text" placeholder="1,2,3" style={input} />
        </div>
        <button className="btn btn-primary" disabled={loading} onClick={correr} style={{ padding: '9px 20px', fontSize: 12 }}>
          {loading ? 'Barriendo…' : 'Correr barrido'}
        </button>
      </div>

      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}
      {loading && <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Corriendo el motor una vez por cada fecha candidata…</p>}

      {res && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', margin: '16px 0' }}>
            <Kv label="Mejor fecha de inicio" val={res.mejor.fecha_inicio} />
            <Kv label="VAN en el óptimo" val={mm(res.mejor.npv_usd)} />
            <Kv label="Corrimiento vs. la fecha cargada" val={res.mejor.offset_meses === 0 ? 'ninguno — ya está en el óptimo' : `${res.mejor.offset_meses > 0 ? '+' : ''}${res.mejor.offset_meses} meses`} />
            <Kv label="Ganancia vs. la fecha cargada" val={delta === 0 ? '—' : mm(delta)} />
            <Kv label="Participación en la 1ra producción" val={res.mejor.participacion_primera_produccion != null ? `${(res.mejor.participacion_primera_produccion * 100).toFixed(2)}%` : '—'} />
            <Kv label="Descontado a" val={`${res.fecha_base_descuento} @ ${(res.tasa_descuento * 100).toFixed(1)}%`} />
          </div>

          {res.por_equipos.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 4px', color: 'var(--fg)' }}>
                ¿Cuánto vale sumar equipos?
              </p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 8px' }}>
                Cada fila es la mejor fecha de arranque para esa cantidad de equipos.
                {res.quiebre_participacion && ` La participación cambia el ${res.quiebre_participacion} — la columna de la derecha cuenta cuántos pozos alcanzan a entrar en producción antes de esa fecha.`}
              </p>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                    <th style={{ padding: '6px 8px' }}>Equipos</th>
                    <th style={{ padding: '6px 8px' }}>Mejor arranque</th>
                    <th style={{ padding: '6px 8px' }}>Última 1ra producción</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>VAN</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gana vs. equipo anterior</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Pozos antes del cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {res.por_equipos.map((e, i) => (
                    <tr key={e.equipos} style={{
                      borderBottom: '1px solid var(--rule)',
                      fontWeight: e.equipos === res.campana.equipos_perforacion ? 700 : 400,
                    }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>
                        {e.equipos}{e.equipos === res.campana.equipos_perforacion ? ' (cargado)' : ''}
                      </td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{e.mejor.fecha_inicio}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{e.mejor.ultima_produccion}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(e.mejor.npv_usd)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#2d7a4a' }}>
                        {i === 0 ? '—' : mm(e.mejor.npv_usd - res.por_equipos[i - 1].mejor.npv_usd)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {e.mejor.pozos_antes_del_cambio ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
                La ganancia del equipo extra hay que compararla contra lo que cuesta contratarlo — el simulador no
                conoce esa tarifa.
              </p>
            </div>
          )}

          <BarridoChart res={res} />

          <div style={{ overflowX: 'auto', marginTop: 18 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ padding: '6px 8px' }}>Inicio</th>
                  <th style={{ padding: '6px 8px' }}>Corrim.</th>
                  <th style={{ padding: '6px 8px' }}>1ra producción</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Participación</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>VAN</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>vs. base</th>
                </tr>
              </thead>
              <tbody>
                {res.puntos.map(p => {
                  const esMejor = p.offset_meses === res.mejor.offset_meses
                  return (
                    <tr key={p.offset_meses} style={{
                      borderBottom: '1px solid var(--rule)',
                      background: esMejor ? 'rgba(45,122,74,0.08)' : undefined,
                      fontWeight: esMejor ? 700 : 400,
                    }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{p.fecha_inicio}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{p.offset_meses > 0 ? `+${p.offset_meses}` : p.offset_meses}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{p.primera_produccion}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {p.participacion_primera_produccion != null ? `${(p.participacion_primera_produccion * 100).toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(p.npv_usd)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: base && p.npv_usd > base.npv_usd ? '#2d7a4a' : 'var(--fg-muted)' }}>
                        {base ? mm(p.npv_usd - base.npv_usd) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 10 }}>
            Para dejar fija la fecha elegida: cambiá la fecha de inicio de la campaña en "Cargar datos",
            volvé acá y aplicá el cronograma.
          </p>
        </>
      )}
    </div>
  )
}

function BarridoChart({ res }: { res: RespuestaBarrido }) {
  const p = res.puntos
  if (p.length < 2) return null
  const W = 720, H = 260, PAD_L = 64, PAD_B = 42, PAD_T = 16

  const xs = p.map(d => d.offset_meses)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const ys = p.map(d => d.npv_usd)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangoY = maxY - minY || Math.abs(maxY) || 1

  const x = (v: number) => PAD_L + ((v - minX) / (maxX - minX || 1)) * (W - PAD_L - 16)
  const y = (v: number) => H - PAD_B - ((v - minY) / rangoY) * (H - PAD_B - PAD_T)

  const linea = p.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.offset_meses).toFixed(1)},${y(d.npv_usd).toFixed(1)}`).join(' ')

  // Dónde cae cada cambio de participación dentro del barrido, expresado en
  // meses de corrimiento — es la explicación de los escalones del gráfico.
  const mesesEntre = (a: string, b: string) => {
    const da = new Date(a.slice(0, 7) + '-01T00:00:00Z'), dbb = new Date(b.slice(0, 7) + '-01T00:00:00Z')
    return (dbb.getUTCFullYear() - da.getUTCFullYear()) * 12 + (dbb.getUTCMonth() - da.getUTCMonth())
  }
  const marcas = res.cambios_participacion
    .map(c => ({ ...c, off: mesesEntre(res.campana.fecha_inicio, c.fecha) }))
    .filter(c => c.off > minX && c.off < maxX)

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 560, background: 'var(--bg)', borderRadius: 8 }}>
        <line x1={PAD_L} y1={H - PAD_B} x2={W - 16} y2={H - PAD_B} stroke="var(--rule)" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--rule)" />

        {marcas.map(m => (
          <g key={m.fecha}>
            <line x1={x(m.off)} y1={PAD_T} x2={x(m.off)} y2={H - PAD_B} stroke="#b33b2e" strokeDasharray="4 3" opacity={0.7} />
            <text x={x(m.off) + 4} y={PAD_T + 10} fontSize="9" fill="#b33b2e">
              {(m.porcentaje * 100).toFixed(1)}% · {m.fecha.slice(0, 7)}
            </text>
          </g>
        ))}

        <path d={linea} fill="none" stroke="var(--accent)" strokeWidth={2} />
        <circle cx={x(res.mejor.offset_meses)} cy={y(res.mejor.npv_usd)} r={5} fill="#2d7a4a" stroke="var(--bg)" strokeWidth={2} />
        <text x={x(res.mejor.offset_meses)} y={y(res.mejor.npv_usd) - 10} fontSize="10" fill="#2d7a4a" textAnchor="middle" fontWeight="700">
          óptimo {res.mejor.fecha_inicio.slice(0, 7)}
        </text>

        {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
          <text key={i} x={PAD_L - 6} y={y(v) + 3} fontSize="9" fill="var(--fg-muted)" textAnchor="end">
            {(v / 1e6).toFixed(1)}MM
          </text>
        ))}
        {p.filter((_, i) => i % Math.ceil(p.length / 8) === 0).map(d => (
          <text key={d.offset_meses} x={x(d.offset_meses)} y={H - PAD_B + 14} fontSize="9" fill="var(--fg-muted)" textAnchor="middle">
            {d.fecha_inicio.slice(0, 7)}
          </text>
        ))}
        <text x={(W + PAD_L) / 2} y={H - 6} fontSize="10" fill="var(--fg-muted)" textAnchor="middle">Fecha de inicio de la campaña</text>
        <text x={14} y={H / 2} fontSize="10" fill="var(--fg-muted)" textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`}>VAN (USD)</text>
      </svg>
      <p style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 4 }}>
        Las líneas rojas punteadas son los cambios de participación en la concesión — normalmente ahí están los escalones de la curva.
      </p>
    </div>
  )
}

// ─── Consolidado por proyecto ────────────────────────────────────────────
// La empresa como suma de proyectos. Lo que hace útil esta vista para nuevos
// negocios es separar el VAN operativo del costo de entrada: un área puede
// tener una operación excelente y no cerrar al precio que piden por ella.
type ProyectoConsolidado = {
  proyecto_id: number; nombre: string; tipo: string
  escenario: { id: number; nombre: string } | null
  sin_resultados: boolean; meses: number
  npv_operativo_usd: number; npv_costos_entrada_usd: number; npv_escudo_fiscal_usd: number; npv_total_usd: number
  capex_desarrollo_usd: number; costo_entrada_usd: number; ingresos_totales_usd: number
  costos: { concepto: string; tipo: string; fecha: string; monto_usd: number; aplicar_participacion: boolean }[]
}
type RespuestaConsolidado = {
  tasa_descuento: number
  fecha_base_descuento: string
  proyectos: ProyectoConsolidado[]
  excluidos: string[]
  aviso: string | null
  alicuota_ganancias?: number
  capa_corporativa?: {
    conceptos: { concepto: string; tipo: string; monto_usd_mes: number; deducible: boolean }[]
    series_deuda: { serie: string; saldo_usd: number; tasa_pct: number }[]
  }
  total: {
    proyectos: number; con_resultados: number; fecha_base_descuento: string
    npv_operativo_usd: number; npv_costos_entrada_usd: number; npv_escudo_fiscal_usd: number
    npv_proyectos_usd: number; npv_g_and_a_usd: number; npv_intereses_deuda_usd: number
    npv_total_usd: number; capex_desarrollo_usd: number; costo_entrada_usd: number
    npv_por_tasa: { tasa: number; npv_usd: number }[]
  } | null
}

function ConsolidadoTab() {
  const [tasa, setTasa] = useState('0.10')
  const [res, setRes] = useState<RespuestaConsolidado | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function cargar() {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`/api/portal/reservas/consolidado?tasa=${tasa}`, { cache: 'no-store' })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Error')
      setRes(json)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Seccion title="Consolidado de la empresa — suma de proyectos">
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
        Cada proyecto entra con su escenario base ya calculado, neto a CPE, más los costos que no cuelgan de
        ningún pozo (precio de compra del área, bono de firma, compromiso exploratorio).
        Todos los proyectos se descuentan a la <strong>misma fecha base</strong>, si no la suma no significa nada.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
        <div style={{ minWidth: 130 }}>
          <label style={label}>Tasa de descuento</label>
          <input value={tasa} onChange={e => setTasa(e.target.value)} type="number" step="0.01" style={input} />
        </div>
        <button className="btn btn-primary" disabled={loading} onClick={cargar} style={{ padding: '9px 20px', fontSize: 12 }}>
          {loading ? 'Calculando…' : 'Recalcular'}
        </button>
      </div>

      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}
      {res?.aviso && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{res.aviso}</p>}

      {res?.total && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 20 }}>
            <Kv label="Proyectos en el consolidado" val={`${res.total.con_resultados} de ${res.total.proyectos} con resultados`} />
            <Kv label="Descontado a" val={`${res.total.fecha_base_descuento} @ ${(res.tasa_descuento * 100).toFixed(1)}%`} />
            <Kv label="VAN operativo de los proyectos" val={mm(res.total.npv_operativo_usd)} />
            <Kv label="Costo de entrada (VAN)" val={mm(res.total.npv_costos_entrada_usd)} />
            <Kv label="Escudo fiscal del costo de entrada" val={res.total.npv_escudo_fiscal_usd === 0 ? '—' : mm(res.total.npv_escudo_fiscal_usd)} />
            <Kv label="CAPEX de desarrollo" val={mm(res.total.capex_desarrollo_usd)} />
            <Kv label="Suma de proyectos" val={mm(res.total.npv_proyectos_usd)} />
            <Kv label="G&A corporativo (VAN)" val={res.total.npv_g_and_a_usd === 0 ? '—' : mm(res.total.npv_g_and_a_usd)} />
            <Kv label="Intereses de deuda (VAN)" val={res.total.npv_intereses_deuda_usd === 0 ? '—' : mm(res.total.npv_intereses_deuda_usd)} />
            <Kv label="VALOR DE EMPRESA" val={mm(res.total.npv_total_usd)} />
          </div>

          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ padding: '6px 8px' }}>Proyecto</th>
                  <th style={{ padding: '6px 8px' }}>Tipo</th>
                  <th style={{ padding: '6px 8px' }}>Escenario base</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>VAN operativo</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Costo de entrada</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>VAN total</th>
                </tr>
              </thead>
              <tbody>
                {res.proyectos.map(p => (
                  <tr key={p.proyecto_id} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 8px' }}>
                      {p.nombre}
                      {p.sin_resultados && <span style={{ color: 'var(--cp-negative)', fontSize: 11 }}> · sin resultados, corré el cálculo</span>}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--fg-muted)' }}>{p.tipo}</td>
                    <td style={{ padding: '6px 8px' }}>{p.escenario?.nombre ?? '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(p.npv_operativo_usd)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: p.npv_costos_entrada_usd < 0 ? 'var(--cp-negative)' : undefined }}>
                      {p.npv_costos_entrada_usd === 0 ? '—' : mm(p.npv_costos_entrada_usd)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.npv_total_usd < 0 ? 'var(--cp-negative)' : '#2d7a4a' }}>
                      {mm(p.npv_total_usd)}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--rule)', fontWeight: 700 }}>
                  <td style={{ padding: '8px' }} colSpan={3}>TOTAL EMPRESA</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(res.total.npv_operativo_usd)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(res.total.npv_costos_entrada_usd)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(res.total.npv_total_usd)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 4px', color: 'var(--fg)' }}>
            Consolidado a las cinco tasas de NI 51-101
          </p>
          <table style={{ fontSize: 12, borderCollapse: 'collapse', marginBottom: 16 }}>
            <tbody>
              {res.total.npv_por_tasa.map(t => (
                <tr key={t.tasa} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '5px 24px 5px 8px', fontFamily: 'var(--font-mono)' }}>
                    {t.tasa === 0 ? 'Sin descontar' : `${(t.tasa * 100).toFixed(0)}%`}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{mm(t.npv_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {res.proyectos.some(p => p.costos.length > 0) && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, margin: '12px 0 6px', color: 'var(--fg)' }}>Costos de entrada cargados</p>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                    <th style={{ padding: '6px 8px' }}>Proyecto</th>
                    <th style={{ padding: '6px 8px' }}>Concepto</th>
                    <th style={{ padding: '6px 8px' }}>Fecha</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Monto</th>
                    <th style={{ padding: '6px 8px' }}>Base</th>
                  </tr>
                </thead>
                <tbody>
                  {res.proyectos.flatMap(p => p.costos.map((c, i) => (
                    <tr key={`${p.proyecto_id}-${i}`} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '6px 8px' }}>{p.nombre}</td>
                      <td style={{ padding: '6px 8px' }}>{c.concepto}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{c.fecha}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(c.monto_usd)}</td>
                      <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--fg-muted)' }}>
                        {c.aplicar_participacion ? '100% → se netea' : 'ya es lo que paga CPE'}
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </>
          )}

          {res.excluidos.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 12 }}>
              Excluidos del consolidado: {res.excluidos.join(', ')}.
            </p>
          )}
          {res.capa_corporativa && (res.capa_corporativa.conceptos.length > 0 || res.capa_corporativa.series_deuda.length > 0) ? (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 4px' }}>Capa corporativa descontada</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 8px' }}>
                Los conceptos deducibles se computan netos de impuesto a las ganancias
                ({((res.alicuota_ganancias ?? 0.35) * 100).toFixed(0)}%). Los intereses se derivan de la tabla de deuda
                corporativa (saldo × tasa ÷ 12), no se cargan a mano.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--fg-soft)' }}>
                {res.capa_corporativa.conceptos.map((c, i) => (
                  <li key={i}>{c.concepto} — US$ {c.monto_usd_mes.toLocaleString('es-AR')}/mes{c.deducible ? ' (deducible)' : ''}</li>
                ))}
                {res.capa_corporativa.series_deuda.map((d, i) => (
                  <li key={`d${i}`}>{d.serie} — US$ {(d.saldo_usd / 1e6).toFixed(1)} MM al {d.tasa_pct}%</li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 12 }}>
              Sin costos corporativos ni deuda cargados, el total es la suma de los proyectos.
              Cargalos en "Costo corporativo" y "Deuda corporativa" para llegar a un valor de empresa.
            </p>
          )}
        </>
      )}
    </Seccion>
  )
}

// ─── Validación previa ───────────────────────────────────────────────────
// Los huecos de datos se ven acá, antes de correr, en lugar de aparecer como
// un VAN plausible calculado sobre precios en cero.
type Chequeo = { dimension: string; estado: 'ok' | 'aviso' | 'error'; detalle: string; seccion?: string }
type Validacion = {
  semaforo: 'ok' | 'aviso' | 'error'; errores: number; avisos: number
  chequeos: Chequeo[]; diagnosticos_motor: Diagnostico[]
}

const COLOR_ESTADO = { ok: '#2d7a4a', aviso: '#d69e2e', error: 'var(--cp-negative)' } as const
const ICONO_ESTADO = { ok: '✓', aviso: '!', error: '✕' } as const

function PanelValidacion({ escenarioId }: { escenarioId: string }) {
  const [v, setV] = useState<Validacion | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    setV(null); setErr('')
    fetch(`/api/portal/reservas/validar?escenario_id=${escenarioId}`, { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setV(j) })
      .catch(e => setErr((e as Error).message))
  }, [escenarioId])

  if (err) return <p style={{ color: 'var(--cp-negative)', fontSize: 13, marginTop: 14 }}>{err}</p>
  if (!v) return <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 14 }}>Revisando los datos del escenario…</p>

  const titulo = v.semaforo === 'ok' ? 'Todo en orden para calcular'
    : v.semaforo === 'aviso' ? `${v.avisos} avisos — se puede calcular, pero conviene mirarlos`
    : `${v.errores} problemas que van a distorsionar el resultado`

  return (
    <div style={{ marginTop: 18, border: `1px solid ${COLOR_ESTADO[v.semaforo]}`, borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: COLOR_ESTADO[v.semaforo] }}>
        {ICONO_ESTADO[v.semaforo]} {titulo}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {v.chequeos.map((c, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--rule)' }}>
            <span style={{ color: COLOR_ESTADO[c.estado], fontWeight: 700, width: 12 }}>{ICONO_ESTADO[c.estado]}</span>
            <span style={{ fontWeight: 600, minWidth: 150 }}>{c.dimension}</span>
            <span style={{ color: 'var(--fg-soft)', flex: 1 }}>{c.detalle}</span>
          </li>
        ))}
      </ul>
      {v.diagnosticos_motor.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '14px 0 4px' }}>Huecos mes a mes detectados en la corrida en seco</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--fg-soft)' }}>
            {v.diagnosticos_motor.slice(0, 8).map((d, i) => (
              <li key={i}>{d.detalle}{d.pozos_mes > 1 && <span style={{ color: 'var(--fg-muted)' }}> · {d.pozos_mes} pozos-mes</span>}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// ─── Tornado de sensibilidad ─────────────────────────────────────────────
type Barra = { variable: string; npv_abajo: number; npv_arriba: number; amplitud: number; nota?: string }
type Tornado = { npv_base_usd: number; variacion: number; tasa_descuento: number; barras: Barra[] }

function PanelTornado({ escenarioId, tasa, horizonte }: { escenarioId: string; tasa: string; horizonte: string }) {
  const [variacion, setVariacion] = useState('0.20')
  const [t, setT] = useState<Tornado | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function correr() {
    setLoading(true); setErr(''); setT(null)
    try {
      const r = await fetch('/api/portal/reservas/sensibilidad', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          escenario_id: Number(escenarioId), tasa_anual: Number(tasa),
          horizonte_anios: Number(horizonte), variacion: Number(variacion),
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setT(j)
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }

  return (
    <div style={{ marginTop: 18, border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Sensibilidad del VAN</p>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 12px' }}>
        Mueve una variable por vez hacia arriba y hacia abajo y mide el impacto en el VAN. Ordenado por magnitud
        muestra qué supuesto conviene afinar y cuál da lo mismo. No escribe nada.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ minWidth: 130 }}>
          <label style={label}>Variación (0.20 = ±20%)</label>
          <input value={variacion} onChange={e => setVariacion(e.target.value)} type="number" step="0.05" min="0.01" max="0.99" style={input} />
        </div>
        <button className="btn btn-primary" disabled={loading} onClick={correr} style={{ padding: '9px 20px', fontSize: 12 }}>
          {loading ? 'Corriendo…' : 'Correr sensibilidad'}
        </button>
      </div>
      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}
      {loading && <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Corriendo el motor una vez por cada extremo de cada variable…</p>}
      {t && <TornadoChart t={t} />}
    </div>
  )
}

function TornadoChart({ t }: { t: Tornado }) {
  const W = 620, FILA = 30, PAD_L = 138, PAD_T = 24
  const H = PAD_T + t.barras.length * FILA + 26
  const todos = t.barras.flatMap(b => [b.npv_abajo, b.npv_arriba]).concat(t.npv_base_usd)
  const min = Math.min(...todos), max = Math.max(...todos)
  const rango = max - min || 1
  const x = (v: number) => PAD_L + ((v - min) / rango) * (W - PAD_L - 68)

  return (
    <>
      <p style={{ fontSize: 12, marginBottom: 6 }}>
        VAN base: <strong style={{ fontFamily: 'var(--font-mono)' }}>{mm(t.npv_base_usd)}</strong>
        <span style={{ color: 'var(--fg-muted)' }}> · variando ±{(t.variacion * 100).toFixed(0)}% @ {(t.tasa_descuento * 100).toFixed(1)}%</span>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 520, background: 'var(--bg)', borderRadius: 8 }}>
          <line x1={x(t.npv_base_usd)} y1={PAD_T - 10} x2={x(t.npv_base_usd)} y2={H - 22} stroke="var(--fg-muted)" strokeDasharray="4 3" />
          <text x={x(t.npv_base_usd)} y={PAD_T - 14} fontSize="9" fill="var(--fg-muted)" textAnchor="middle">base</text>
          {t.barras.map((b, i) => {
            const y = PAD_T + i * FILA
            const x1 = x(Math.min(b.npv_abajo, b.npv_arriba))
            const x2 = x(Math.max(b.npv_abajo, b.npv_arriba))
            const xb = x(t.npv_base_usd)
            return (
              <g key={b.variable}>
                <text x={PAD_L - 8} y={y + 14} fontSize="11" fill="var(--fg-soft)" textAnchor="end">{b.variable}</text>
                <rect x={x1} y={y + 4} width={Math.max(xb - x1, 0)} height={16} fill="#d99b91" />
                <rect x={xb} y={y + 4} width={Math.max(x2 - xb, 0)} height={16} fill="#8f97c9" />
                <text x={W - 62} y={y + 16} fontSize="10" fill="var(--fg-muted)">±{(b.amplitud / 2e6).toFixed(1)}MM</text>
              </g>
            )
          })}
          <g transform={`translate(${PAD_L}, ${H - 6})`}>
            <rect x={0} y={-9} width={10} height={9} fill="#d99b91" />
            <text x={14} y={-1} fontSize="9" fill="var(--fg-muted)">Variable a la baja</text>
            <rect x={110} y={-9} width={10} height={9} fill="#8f97c9" />
            <text x={124} y={-1} fontSize="9" fill="var(--fg-muted)">Variable al alza</text>
          </g>
        </svg>
      </div>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 10 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
            <th style={{ padding: '5px 8px' }}>Variable</th>
            <th style={{ padding: '5px 8px', textAlign: 'right' }}>VAN a la baja</th>
            <th style={{ padding: '5px 8px', textAlign: 'right' }}>VAN al alza</th>
            <th style={{ padding: '5px 8px', textAlign: 'right' }}>Amplitud</th>
          </tr>
        </thead>
        <tbody>
          {t.barras.map(b => (
            <tr key={b.variable} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={{ padding: '5px 8px' }}>{b.variable}{b.nota && <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}> · {b.nota}</span>}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(b.npv_abajo)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(b.npv_arriba)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{mm(b.amplitud)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

// ─── ¿Los resultados siguen siendo válidos? ──────────────────────────────
// Sin esto, editar un precio después de calcular deja en pantalla un VAN viejo
// sin ninguna señal — y ese número es el que termina en una presentación.
type Estado = {
  estado: 'al_dia' | 'desactualizado' | 'sin_correr' | 'sin_huella'
  mensaje: string; calculado_en?: string | null; calculado_por?: string | null
  tasa_descuento?: number; horizonte_anios?: number
}

const COLOR_CORRIDA: Record<Estado['estado'], string> = {
  al_dia: '#2d7a4a', desactualizado: 'var(--cp-negative)',
  sin_correr: 'var(--fg-muted)', sin_huella: '#d69e2e',
}

function BadgeEstado({ escenarioId }: { escenarioId: string }) {
  const [e, setE] = useState<Estado | null>(null)
  useEffect(() => {
    setE(null)
    fetch(`/api/portal/reservas/estado?escenario_id=${escenarioId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).then(setE).catch(() => setE(null))
  }, [escenarioId])
  if (!e) return null

  const cuando = e.calculado_en
    ? new Date(e.calculado_en).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
      fontSize: 12, padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--r-md)',
      border: `1px solid ${COLOR_CORRIDA[e.estado]}`,
      background: e.estado === 'desactualizado' ? 'rgba(179,59,46,0.06)' : 'transparent',
    }}>
      <strong style={{ color: COLOR_CORRIDA[e.estado] }}>
        {e.estado === 'al_dia' ? '✓ Al día' : e.estado === 'desactualizado' ? '✕ Desactualizado' : e.estado === 'sin_correr' ? 'Sin calcular' : '! Sin verificar'}
      </strong>
      <span style={{ color: 'var(--fg-soft)' }}>{e.mensaje}</span>
      {cuando && (
        <span style={{ color: 'var(--fg-muted)' }}>
          · corrido el {cuando}{e.calculado_por ? ` por ${e.calculado_por}` : ''}
          {e.tasa_descuento != null && ` · @ ${(e.tasa_descuento * 100).toFixed(1)}%`}
        </span>
      )}
    </div>
  )
}

// ─── Capital de desarrollo futuro (FDC) ──────────────────────────────────
type Fdc = {
  desde: string
  anios: { anio: number; capex_bruto_usd: number; capex_neto_usd: number }[]
  total_bruto_usd: number; total_neto_usd: number; ya_incurrido_neto_usd: number
}

function PanelFdc({ escenarioId }: { escenarioId: string }) {
  const [desde, setDesde] = useState(new Date().toISOString().slice(0, 10))
  const [d, setD] = useState<Fdc | null>(null)
  const [err, setErr] = useState('')

  async function cargar(f: string) {
    setErr(''); setD(null)
    try {
      const r = await fetch(`/api/portal/reservas/resultados?escenario_id=${escenarioId}&vista=fdc&desde=${f}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setD(j)
    } catch (e) { setErr((e as Error).message) }
  }
  useEffect(() => { cargar(desde) }, [escenarioId]) // eslint-disable-line react-hooks/exhaustive-deps

  const max = d ? Math.max(...d.anios.map(a => a.capex_neto_usd), 1) : 1

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
        NI 51-101 pide informar los costos de desarrollo futuro por año. Salen del CAPEX que el motor ya imputó,
        así que respetan el cronograma de la campaña. <strong>Futuro</strong> es desde la fecha efectiva:
        lo gastado antes no es capital por comprometer.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ minWidth: 160 }}>
          <label style={label}>Fecha efectiva</label>
          <input type="date" value={desde} onChange={e => { setDesde(e.target.value); cargar(e.target.value) }} style={input} />
        </div>
      </div>

      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}
      {d && d.anios.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>No hay CAPEX pendiente después de esa fecha.</p>}

      {d && d.anios.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 14 }}>
            <Kv label="FDC total (neto a CPE)" val={mm(d.total_neto_usd)} />
            <Kv label="FDC total (100% proyecto)" val={mm(d.total_bruto_usd)} />
            <Kv label="Ya incurrido antes de la fecha" val={d.ya_incurrido_neto_usd > 0 ? mm(d.ya_incurrido_neto_usd) : '—'} />
            <Kv label="Años con desembolso" val={String(d.anios.length)} />
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Año</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Neto a CPE</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>100% proyecto</th>
                <th style={{ padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {d.anios.map(a => (
                <tr key={a.anio} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{a.anio}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{mm(a.capex_neto_usd)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{mm(a.capex_bruto_usd)}</td>
                  <td style={{ padding: '6px 8px', width: '40%' }}>
                    <div style={{ height: 10, borderRadius: 3, background: 'var(--accent)', opacity: 0.75, width: `${(a.capex_neto_usd / max) * 100}%` }} />
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--rule)', fontWeight: 700 }}>
                <td style={{ padding: '8px' }}>TOTAL</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(d.total_neto_usd)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(d.total_bruto_usd)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

// ─── One-line por pozo ───────────────────────────────────────────────────
// El nivel al que se decide: una fila por pozo con lo que importa. Antes sólo
// había cash flow mes a mes (decenas de miles de filas) o el agregado anual.
type LineaPozo = {
  pozo_id: number; pozo: string; concesion: string; yacimiento: string
  categoria: 'existente' | 'a_perforar'
  npv_usd: number; irr_pct: number | null; payback_anios: number | null
  capex_usd: number; eur_bbl: number; eur_mcf: number; eur_boe: number
  ebitda_usd: number; netback_usd_boe: number | null
  primera_produccion: string | null; ultima_produccion: string | null
  cortado_por_limite: boolean
}
type Resumen = { pozos: number; npv_usd: number; capex_usd: number; eur_boe: number; ebitda_usd: number }
type OneLine = {
  fecha_base_descuento: string; tasa_descuento: number
  lineas: LineaPozo[]; total: Resumen
  por_categoria: { existente: Resumen; a_perforar: Resumen }
}

function PanelOneLine({ escenarioId }: { escenarioId: string }) {
  const [tasa, setTasa] = useState('0.10')
  const [d, setD] = useState<OneLine | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [orden, setOrden] = useState<keyof LineaPozo>('npv_usd')

  async function cargar(t: string) {
    setLoading(true); setErr(''); setD(null)
    try {
      const r = await fetch(`/api/portal/reservas/one-line?escenario_id=${escenarioId}&tasa=${t}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setD(j)
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { cargar(tasa) }, [escenarioId]) // eslint-disable-line react-hooks/exhaustive-deps

  const ordenadas = d ? [...d.lineas].sort((a, b) => {
    const va = a[orden], vb = b[orden]
    if (typeof va === 'number' && typeof vb === 'number') return vb - va
    return String(va ?? '').localeCompare(String(vb ?? ''))
  }) : []

  const th = (k: keyof LineaPozo, txt: string, der = false) => (
    <th onClick={() => setOrden(k)} style={{
      padding: '6px 8px', textAlign: der ? 'right' : 'left', cursor: 'pointer',
      textDecoration: orden === k ? 'underline' : 'none',
    }}>{txt}</th>
  )

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
        Una fila por pozo, todo neto a CPE y descontado a la <strong>misma fecha base</strong> — si cada pozo se
        descontara a su propio primer mes, los tardíos parecerían mejores. Clic en un encabezado para ordenar.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ minWidth: 130 }}>
          <label style={label}>Tasa de descuento</label>
          <input value={tasa} onChange={e => setTasa(e.target.value)} type="number" step="0.01" style={input} />
        </div>
        <button className="btn" disabled={loading} onClick={() => cargar(tasa)} style={{ padding: '9px 18px', fontSize: 12 }}>
          {loading ? 'Calculando…' : 'Recalcular'}
        </button>
      </div>

      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}

      {d && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 20px', marginBottom: 16, fontSize: 12 }}>
            {([['Pozos existentes', d.por_categoria.existente], ['Pozos a perforar', d.por_categoria.a_perforar], ['Total', d.total]] as [string, Resumen][]).map(([t, r]) => (
              <div key={t} style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)' }}>{t}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>{mm(r.npv_usd)}</div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 11 }}>
                  {r.pozos} pozos · CAPEX {mm(r.capex_usd)} · {Math.round(r.eur_boe).toLocaleString('es-AR')} BOE
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 10 }}>
            El corte entre existentes y a perforar es la separación que pide NI 51-101 entre reservas desarrolladas
            y no desarrolladas, vista desde la economía: cuánto del valor ya está en línea y cuánto depende de
            invertir.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                  {th('pozo', 'Pozo')}{th('yacimiento', 'Yacimiento')}{th('categoria', 'Categoría')}
                  {th('npv_usd', 'VAN', true)}{th('irr_pct', 'TIR', true)}{th('payback_anios', 'Payback', true)}
                  {th('capex_usd', 'CAPEX', true)}{th('eur_boe', 'EUR (BOE)', true)}{th('netback_usd_boe', 'Netback', true)}
                  {th('primera_produccion', '1ra prod.')}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map(l => (
                  <tr key={l.pozo_id} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 8px' }}>
                      {l.pozo}{l.cortado_por_limite && <span title="cortado por límite económico" style={{ color: 'var(--cp-negative)' }}> ✕</span>}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--fg-muted)' }}>{l.yacimiento}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11, color: l.categoria === 'a_perforar' ? '#d69e2e' : 'var(--fg-muted)' }}>
                      {l.categoria === 'a_perforar' ? 'a perforar' : 'existente'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: l.npv_usd < 0 ? 'var(--cp-negative)' : undefined }}>{mm(l.npv_usd)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.irr_pct != null ? `${l.irr_pct.toFixed(1)}%` : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.payback_anios != null ? `${l.payback_anios.toFixed(1)} a.` : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.capex_usd > 0 ? mm(l.capex_usd) : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Math.round(l.eur_boe).toLocaleString('es-AR')}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.netback_usd_boe != null ? l.netback_usd_boe.toFixed(2) : '—'}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{l.primera_produccion?.slice(0, 7) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
            ✕ marca los pozos cortados por límite económico. Descontado a {d.fecha_base_descuento} @ {(d.tasa_descuento * 100).toFixed(1)}%.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Economía incremental (base / wedge / total) ─────────────────────────
// El valor de una intervención no es el VAN del escenario que la incluye: es
// la diferencia contra no hacerla. Es la pregunta del workover.
type Agregado = { id?: number; nombre?: string; npv_usd: number; capex_usd: number; ingresos_usd: number; eur_boe: number }
type Incremental = {
  base: Agregado; total: Agregado
  wedge: Agregado & {
    irr_pct: number | null; payback_anios: number | null
    npv_por_tasa: { tasa: number; npv_usd: number }[]
  }
  fecha_base_descuento: string; tasa_descuento: number
  flujo_anual: { anio: number; neto_usd: number }[]
}

function PanelIncremental({ escenarioId, tasa, data }: { escenarioId: string; tasa: string; data: Data }) {
  const [baseId, setBaseId] = useState('')
  const [d, setD] = useState<Incremental | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function correr() {
    setLoading(true); setErr(''); setD(null)
    try {
      const r = await fetch(`/api/portal/reservas/incremental?escenario_id=${escenarioId}&base_id=${baseId}&tasa=${tasa}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setD(j)
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }

  const otros = (data.escenarios ?? []).filter(e => String(e.id) !== escenarioId)

  return (
    <div style={{ marginTop: 18, border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Economía incremental — ¿la intervención paga por sí sola?</p>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 12px' }}>
        Resta el escenario base del elegido y valúa la diferencia. El valor de un workover no es el VAN del
        escenario que lo incluye, es lo que agrega contra no hacerlo. En la jerga de las herramientas del sector:
        <strong> base / wedge / total</strong>. Los dos escenarios tienen que estar calculados.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <label style={label}>Escenario base (el caso SIN la intervención)</label>
          <Select value={baseId} onChange={e => setBaseId(e.target.value)}
            opts={otros.map(e => ({ value: String(e.id), label: String(e.nombre) }))} />
        </div>
        <button className="btn btn-primary" disabled={!baseId || loading} onClick={correr} style={{ padding: '9px 20px', fontSize: 12 }}>
          {loading ? 'Comparando…' : 'Comparar'}
        </button>
      </div>
      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}

      {d && (
        <>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Caso</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>VAN</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>CAPEX</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ingresos</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>EUR (BOE)</th>
              </tr>
            </thead>
            <tbody>
              {([['Base — sin la intervención', d.base], ['Total — con la intervención', d.total]] as [string, Agregado][]).map(([t, a]) => (
                <tr key={t} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '6px 8px' }}>{t}<span style={{ color: 'var(--fg-muted)' }}> · {a.nombre}</span></td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(a.npv_usd)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(a.capex_usd)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(a.ingresos_usd)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Math.round(a.eur_boe).toLocaleString('es-AR')}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--rule)', fontWeight: 700, background: d.wedge.npv_usd >= 0 ? 'rgba(45,122,74,0.06)' : 'rgba(179,59,46,0.06)' }}>
                <td style={{ padding: '8px' }}>WEDGE — lo que agrega</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: d.wedge.npv_usd >= 0 ? '#2d7a4a' : 'var(--cp-negative)' }}>{mm(d.wedge.npv_usd)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(d.wedge.capex_usd)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{mm(d.wedge.ingresos_usd)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Math.round(d.wedge.eur_boe).toLocaleString('es-AR')}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 12 }}>
            <Kv label="TIR del incremento" val={d.wedge.irr_pct != null ? `${d.wedge.irr_pct.toFixed(1)}%` : '— (sin cambio de signo)'} />
            <Kv label="Payback del incremento" val={d.wedge.payback_anios != null ? `${d.wedge.payback_anios.toFixed(1)} años` : 'no se recupera'} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 8px' }}>
            La TIR y el payback son <strong>del flujo diferencial</strong>, no del escenario completo: es lo que
            responde si la intervención se paga sola.
          </p>

          <p style={{ fontSize: 12, fontWeight: 700, margin: '10px 0 4px' }}>VAN del incremento a las cinco tasas</p>
          <table style={{ fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {d.wedge.npv_por_tasa.map(t => (
                <tr key={t.tasa} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '4px 24px 4px 8px', fontFamily: 'var(--font-mono)' }}>{t.tasa === 0 ? 'Sin descontar' : `${(t.tasa * 100).toFixed(0)}%`}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{mm(t.npv_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

// ─── Duplicar escenario ──────────────────────────────────────────────────
function PanelClonar({ escenarioId, data }: { escenarioId: string; data: Data }) {
  const original = (data.escenarios ?? []).find(e => String(e.id) === escenarioId)
  const [nombre, setNombre] = useState(original ? `${original.nombre} — copia` : '')
  const [res, setRes] = useState<{ escenario: { id: number; nombre: string }; copiado: Record<string, number>; aviso: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function clonar() {
    setLoading(true); setErr(''); setRes(null)
    try {
      const r = await fetch('/api/portal/reservas/escenario/clonar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ escenario_id: Number(escenarioId), nombre }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setRes(j)
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }

  return (
    <div style={{ marginTop: 18, border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Duplicar escenario</p>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 12px' }}>
        Copia intervenciones, campañas y costos de proyecto. Es la primera mitad del flujo de economía
        incremental: duplicás el caso base, le agregás la intervención a la copia, y después comparás.
        La copia no arrastra resultados — hay que calcularla.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <label style={label}>Nombre del escenario nuevo</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} style={input} />
        </div>
        <button className="btn btn-primary" disabled={loading || nombre.trim().length < 2} onClick={clonar} style={{ padding: '9px 20px', fontSize: 12 }}>
          {loading ? 'Duplicando…' : 'Duplicar'}
        </button>
      </div>
      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13, marginTop: 10 }}>{err}</p>}
      {res && (
        <div style={{ marginTop: 12, fontSize: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(45,122,74,0.08)' }}>
          <strong style={{ color: '#2d7a4a' }}>Creado "{res.escenario.nombre}"</strong>
          <div style={{ color: 'var(--fg-soft)', marginTop: 4 }}>
            {Object.entries(res.copiado).map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(' · ')}. {res.aviso}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Gráficos ────────────────────────────────────────────────────────────
// El informe PDF ya los tenía; en pantalla todo era tabla. Se reusan las
// mismas piezas, así que lo que se ve acá es exactamente lo que se imprime.
function PanelGraficos({ rowsAnual }: { rowsAnual: Row[] }) {
  const consolidado = rowsAnual.filter(a => a.yacimiento_id == null)
  if (consolidado.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero.</p>
  }

  // El flujo acumulado se arma del resumen anual: resultado neto + amortización
  // (que es no-cash) − CAPEX. Es el mismo criterio que usa el motor.
  let acum = 0
  const flujo = [...consolidado].sort((a, b) => Number(a.anio) - Number(b.anio)).map(a => {
    const neto = Number(a.resultado_neto_usd) + Number(a.depreciacion_usd)
    acum += neto
    return { anio: Number(a.anio), neto_usd: neto, acumulado_usd: acum }
  })

  const tot = (k: string) => consolidado.reduce((s, a) => s + Number(a[k] ?? 0), 0)
  const pasos: PasoWaterfall[] = [
    { etiqueta: 'Ingreso bruto', monto: tot('ingresos_usd'), tipo: 'base' },
    { etiqueta: 'Regalías', monto: tot('regalias_usd'), tipo: 'resta' },
    { etiqueta: 'OPEX', monto: tot('opex_usd'), tipo: 'resta' },
    { etiqueta: 'EBITDA', monto: tot('ebitda_usd'), tipo: 'total' },
    { etiqueta: 'Amortización', monto: tot('depreciacion_usd'), tipo: 'resta' },
    { etiqueta: 'Imp. ganancias', monto: tot('impuesto_ganancias_usd'), tipo: 'resta' },
    { etiqueta: 'Resultado neto', monto: tot('resultado_neto_usd'), tipo: 'total' },
  ]

  return (
    <div style={{ marginTop: 12 }}>
      {/* Las piezas traen su propia hoja de estilos, la misma del informe */}
      <style>{cssImpresion}</style>
      <div className="informe" style={{ padding: 0, maxWidth: 'none', background: 'transparent' }}>
        <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 14 }}>
          Los mismos gráficos que salen en el informe para PDF. Todo neto a CPE.
        </p>

        <h3 style={{ marginTop: 0 }}>Perfil de producción</h3>
        <GraficoProduccion filas={consolidado} />

        <h3>Flujo de caja anual y acumulado</h3>
        <GraficoFlujo filas={flujo} />

        <h3>De dónde sale el resultado</h3>
        <p className="pie">
          Acumulado de todo el horizonte. Las barras claras suman, las rojizas restan y las azules son subtotales.
          Cifras en millones de USD.
        </p>
        <GraficoWaterfall pasos={pasos} />
      </div>
    </div>
  )
}

// ─── Pegar filas desde Excel ─────────────────────────────────────────────
// Cargar precios mensuales de 3 referencias por 20 años eran 720 formularios
// de a uno. Se pega lo copiado de la planilla, se ve qué entra y qué no, y
// recién ahí se guarda.
function PegarDesdeExcel({ cfg, data, reload }: { cfg: EntityConfig; data: Data; reload: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [res, setRes] = useState<Awaited<ReturnType<typeof import('@/lib/reservas/pegarFilas')['parsearPegado']>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function analizar(t: string) {
    setTexto(t); setErr(''); setMsg('')
    if (t.trim() === '') { setRes(null); return }
    const { parsearPegado } = await import('@/lib/reservas/pegarFilas')
    const opciones: Record<string, { id: unknown; nombre?: unknown }[]> = {}
    for (const f of cfg.fields) {
      if (f.optionsFrom) opciones[f.optionsFrom] = (data[f.optionsFrom] ?? []) as { id: unknown; nombre?: unknown }[]
    }
    setRes(parsearPegado(t, cfg.fields as any, opciones))
  }

  async function guardar() {
    if (!res || res.validas === 0) return
    setLoading(true); setErr(''); setMsg('')
    try {
      const r = await fetch('/api/portal/reservas/data', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tabla: cfg.tabla, filas: res.filas.filter(f => f.errores.length === 0).map(f => f.valores) }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setMsg(`${j.insertadas} filas cargadas ✓`)
      setTexto(''); setRes(null)
      reload()
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }

  const columnasEsperadas = cfg.fields.map(f => f.label.split(/[(—-]/)[0].trim()).join(' · ')

  async function descargarPlantilla() {
    const r = await fetch(`/api/portal/reservas/plantilla?tabla=${cfg.tabla}`)
    if (!r.ok) { setErr((await r.json().catch(() => ({})))?.error ?? 'No se pudo generar la plantilla'); return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla_${cfg.tabla}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!abierto) {
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={() => setAbierto(true)} style={{
          background: 'none', border: '1px dashed var(--rule)', borderRadius: 'var(--r-md)',
          padding: '7px 14px', fontSize: 12, color: 'var(--fg-soft)', cursor: 'pointer',
        }}>
          ⇈ Pegar varias filas desde Excel
        </button>
        <button type="button" onClick={descargarPlantilla} style={{
          background: 'none', border: '1px dashed var(--rule)', borderRadius: 'var(--r-md)',
          padding: '7px 14px', fontSize: 12, color: 'var(--fg-soft)', cursor: 'pointer',
        }}>
          ⇓ Descargar plantilla
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', border: '1px dashed var(--rule)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Pegar varias filas desde Excel</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <button type="button" onClick={descargarPlantilla}
            style={{ background: 'none', border: 'none', color: 'var(--fg-soft)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
            ⇓ Descargar plantilla
          </button>
          <button type="button" onClick={() => { setAbierto(false); setTexto(''); setRes(null) }}
            style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 12 }}>cerrar</button>
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 10px' }}>
        Copiá el rango de la planilla y pegalo acá. Si la primera fila son los títulos de las columnas, se usa
        para ordenarlas solas; si no, se toma el orden de los campos del formulario.
        En los campos que apuntan a otra tabla podés poner el <strong>nombre</strong> en lugar del id.
        Las fechas van en aaaa-mm-dd o dd/mm/aaaa, y los números aceptan formato argentino.
      </p>
      <p style={{ fontSize: 10, color: 'var(--fg-muted)', margin: '0 0 8px', fontFamily: 'var(--font-mono)' }}>
        Columnas: {columnasEsperadas}
      </p>

      {err && <div style={{ fontSize: 12, color: 'var(--cp-negative)', padding: '8px 12px', background: 'rgba(179,59,46,0.08)', borderRadius: 8, marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ fontSize: 12, color: 'var(--cp-positive, #2d7a4a)', padding: '8px 12px', background: 'rgba(45,122,74,0.08)', borderRadius: 8, marginBottom: 10 }}>{msg}</div>}

      <textarea value={texto} onChange={e => analizar(e.target.value)} rows={6}
        placeholder="Pegá acá el rango copiado de Excel…"
        style={{ ...input, fontFamily: 'var(--font-mono)', fontSize: 11, resize: 'vertical' }} />

      {res && res.filas.length > 0 && (
        <>
          <p style={{ fontSize: 12, margin: '10px 0 6px' }}>
            <strong style={{ color: res.validas > 0 ? '#2d7a4a' : 'var(--fg-muted)' }}>{res.validas} filas listas</strong>
            {res.invalidas > 0 && <span style={{ color: 'var(--cp-negative)' }}> · {res.invalidas} con problemas</span>}
            <span style={{ color: 'var(--fg-muted)' }}> · {res.usoEncabezado ? 'se detectó una fila de títulos' : 'sin títulos, se usó el orden de los campos'}</span>
          </p>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--rule)', borderRadius: 6 }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <tbody>
                {res.filas.slice(0, 60).map(f => (
                  <tr key={f.linea} style={{ borderBottom: '1px solid var(--rule)', background: f.errores.length ? 'rgba(179,59,46,0.06)' : undefined }}>
                    <td style={{ padding: '3px 6px', color: 'var(--fg-muted)', width: 30 }}>{f.linea}</td>
                    <td style={{ padding: '3px 6px' }}>
                      {f.errores.length === 0
                        ? <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-soft)' }}>
                            {Object.entries(f.valores).filter(([, v]) => v !== null && v !== '').map(([k, v]) => `${k}=${v}`).join('  ')}
                          </span>
                        : <span style={{ color: 'var(--cp-negative)' }}>{f.errores.join(' · ')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {res.filas.length > 60 && <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 0' }}>…y {res.filas.length - 60} filas más.</p>}

          <button className="btn btn-primary" type="button" disabled={loading || res.validas === 0} onClick={guardar}
            style={{ padding: '8px 20px', fontSize: 12, marginTop: 10 }}>
            {loading ? 'Cargando…' : `Cargar ${res.validas} filas`}
          </button>
          {res.invalidas > 0 && (
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 10 }}>
              Las filas con problemas no se cargan; corregilas en la planilla y volvé a pegar.
            </span>
          )}
        </>
      )}
    </div>
  )
}

// ─── Valuación por comparables ───────────────────────────────────────────
// La otra mitad de la valuación: el DCF dice cuánto valen los flujos, los
// comparables a cuánto paga el mercado activos parecidos. Si el DCF da muy
// distinto del múltiplo de los pares, hay algo para explicar.
type Multiplo = { metrica: string; n: number; mediana: number | null; promedio: number | null }
type Implicito = { metrica: string; etiqueta: string; multiplo: number; base: number; ev_implicito_usd_mm: number; equity_implicito_usd_mm: number }
type Comparables = {
  comparables: Record<string, any>[]
  multiplos: Multiplo[] | null
  cpe: { reservas_p1_mmboe: number; reservas_2p_mmboe: number; produccion_kboepd: number; npv10_usd_mm: number | null; deuda_neta_usd_mm: number } | null
  implicito: Implicito[] | null
  rango: { minimo_usd_mm: number; mediana_usd_mm: number | null; maximo_usd_mm: number; equity_mediana_usd_mm: number } | null
  aviso: string | null
}

const NOMBRE_MULTIPLO: Record<string, string> = {
  ev_por_boe_p1: 'EV / boe P1 (USD/boe)',
  ev_por_boe_p2: 'EV / boe P2 (USD/boe)',
  ev_por_kboepd: 'EV / kboe/d (USD MM por mil boe/d)',
  ev_sobre_npv10_p1: 'EV / NPV10 P1 (veces)',
  ev_sobre_npv10_p2: 'EV / NPV10 P2 (veces)',
}
const num = (v: number | null | undefined, dec = 2) =>
  v == null ? '—' : v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

function ComparablesTab({ data }: { data: Data }) {
  const [escenarioId, setEscenarioId] = useState('')
  const [d, setD] = useState<Comparables | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function cargar(id: string) {
    setEscenarioId(id); setD(null); setErr('')
    if (!id) return
    setLoading(true)
    try {
      const r = await fetch(`/api/portal/reservas/comparables?escenario_id=${id}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setD(j)
    } catch (e) { setErr((e as Error).message) } finally { setLoading(false) }
  }

  return (
    <Seccion title="Valuación por comparables de mercado">
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
        Contrasta el valor técnico contra lo que el mercado paga por activos parecidos. Los múltiplos salen de las
        empresas cargadas en "Comparables de mercado" y se aplican a las métricas de CPE que sale del propio
        escenario. Se informa la <strong>mediana</strong> además del promedio: con pocos comparables, uno atípico
        corre el promedio y la mediana no.
      </p>

      <Field><label style={label}>Escenario (de donde salen reservas, producción y NPV10 de CPE)</label>
        <Select value={escenarioId} onChange={e => cargar(e.target.value)}
          opts={(data.escenarios ?? []).map(e => ({ value: String(e.id), label: String(e.nombre) }))} />
      </Field>

      {err && <p style={{ color: 'var(--cp-negative)', fontSize: 13 }}>{err}</p>}
      {loading && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Calculando múltiplos…</p>}
      {d?.aviso && <p style={{ fontSize: 12, color: '#d69e2e' }}>{d.aviso}</p>}

      {d?.rango && (
        <div style={{ border: '2px solid var(--accent)', borderRadius: 'var(--r-md)', padding: '14px 16px', margin: '4px 0 18px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>Valor implícito de CPE según los comparables</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            <Kv label="EV implícito (mediana)" val={`US$ ${num(d.rango.mediana_usd_mm, 1)} MM`} />
            <Kv label="Rango de EV" val={`US$ ${num(d.rango.minimo_usd_mm, 1)} – ${num(d.rango.maximo_usd_mm, 1)} MM`} />
            <Kv label="Deuda neta" val={`US$ ${num(d.cpe?.deuda_neta_usd_mm, 1)} MM`} />
            <Kv label="Equity implícito (mediana)" val={`US$ ${num(d.rango.equity_mediana_usd_mm, 1)} MM`} />
          </div>
          {d.cpe?.npv10_usd_mm != null && d.rango.mediana_usd_mm != null && (
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '10px 0 0' }}>
              El NPV10 del escenario da <strong>US$ {num(d.cpe.npv10_usd_mm, 1)} MM</strong>, o sea{' '}
              {(d.rango.mediana_usd_mm / d.cpe.npv10_usd_mm).toFixed(2)}× contra el EV implícito por múltiplos.
              Una brecha grande en cualquier dirección es algo para explicar, no para promediar.
            </p>
          )}
        </div>
      )}

      {d?.implicito && d.implicito.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>Valor implícito por múltiplo</p>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 18 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Múltiplo</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Mediana pares</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Base CPE</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>EV implícito</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Equity implícito</th>
              </tr>
            </thead>
            <tbody>
              {d.implicito.map(i => (
                <tr key={i.metrica} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '6px 8px' }}>{i.etiqueta}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(i.multiplo)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(i.base)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>US$ {num(i.ev_implicito_usd_mm, 1)} MM</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>US$ {num(i.equity_implicito_usd_mm, 1)} MM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {d?.multiplos && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>Múltiplos de los comparables</p>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 18 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '6px 8px' }}>Métrica</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Empresas con dato</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Mediana</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {d.multiplos.map(m => (
                <tr key={m.metrica} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <td style={{ padding: '6px 8px' }}>{NOMBRE_MULTIPLO[m.metrica] ?? m.metrica}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: m.n < 3 ? '#d69e2e' : undefined }}>{m.n}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{num(m.mediana)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{num(m.promedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 18 }}>
            En ámbar, los múltiplos que salen de menos de 3 empresas: una mediana de dos datos no es una mediana.
          </p>
        </>
      )}

      {d && d.comparables.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>Detalle de los comparables</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ padding: '6px 8px' }}>Empresa</th><th style={{ padding: '6px 8px' }}>País</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>EV (MM)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>EV/boe P1</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>EV/boe P2</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>EV/kboe/d</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>EV/NPV10</th>
                </tr>
              </thead>
              <tbody>
                {d.comparables.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 8px' }}>{c.empresa}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--fg-muted)' }}>{c.pais ?? '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(c.ev_usd_mm, 0)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(c.ev_por_boe_p1)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(c.ev_por_boe_p2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(c.ev_por_kboepd)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{num(c.ev_sobre_npv10_p1)}</td>
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

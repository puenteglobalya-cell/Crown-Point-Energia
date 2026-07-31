'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Row = Record<string, unknown>
type Data = Record<string, Row[]>

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

  async function submit(tabla: string, valores: Record<string, unknown>) {
    setErr(''); setMsg('')
    const res = await fetch('/api/portal/reservas/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tabla, valores }),
    })
    if (!res.ok) {
      setErr((await res.json()).error ?? 'Error al guardar')
      return
    }
    setMsg(`${tabla}: registro creado ✓`)
    reload()
  }

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

        {tab === 'cargar' && <CargarTab data={data} submit={submit} />}
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

function CargarTab({ data, submit }: { data: Data; submit: (t: string, v: Record<string, unknown>) => void }) {
  const yacOpts = data.yacimientos.map(y => ({ value: String(y.id), label: String(y.nombre) }))
  const concOpts = data.concesiones.map(c => ({ value: String(c.id), label: String(c.nombre) }))
  const pozoOpts = data.pozos.map(p => ({ value: String(p.id), label: String(p.nombre) }))
  const pozoTipoOpts = data.pozos_tipo.map(p => ({ value: String(p.id), label: String(p.nombre) }))
  const provOpts = data.provincias.map(p => ({ value: String(p.id), label: String(p.nombre) }))

  return (
    <>
      <Seccion title="1. Provincia">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('provincias', { nombre: f.get('nombre'), alicuota_iibb: Number(f.get('alicuota_iibb')) })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Nombre</label><input name="nombre" required style={input} /></Field>
          <Field><label style={label}>Alícuota IIBB (ej. 0.03 = 3%)</label><input name="alicuota_iibb" type="number" step="0.0001" defaultValue="0.03" style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 10 }}>Cargadas: {data.provincias.map(p => p.nombre).join(', ') || '—'}</p>
      </Seccion>

      <Seccion title="2. Yacimiento">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('yacimientos', { nombre: f.get('nombre'), provincia_id: Number(f.get('provincia_id')), tipo_recuperacion: f.get('tipo_recuperacion') })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Nombre</label><input name="nombre" required style={input} /></Field>
          <Field><label style={label}>Provincia</label><Select name="provincia_id" opts={provOpts} required /></Field>
          <Field><label style={label}>Tipo de recuperación</label>
            <select name="tipo_recuperacion" style={input}><option value="primaria">Primaria</option><option value="secundaria">Secundaria</option></select>
          </Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 10 }}>Cargados: {data.yacimientos.map(y => y.nombre).join(', ') || '—'}</p>
      </Seccion>

      <Seccion title="3. Concesión">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('concesiones', { nombre: f.get('nombre'), yacimiento_id: Number(f.get('yacimiento_id')), fecha_inicio: f.get('fecha_inicio'), fecha_vencimiento: f.get('fecha_vencimiento') })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Nombre</label><input name="nombre" required style={input} /></Field>
          <Field><label style={label}>Yacimiento</label><Select name="yacimiento_id" opts={yacOpts} required /></Field>
          <Field><label style={label}>Fecha inicio</label><input name="fecha_inicio" type="date" required style={input} /></Field>
          <Field><label style={label}>Fecha vencimiento</label><input name="fecha_vencimiento" type="date" required style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 10 }}>Cargadas: {data.concesiones.map(c => c.nombre).join(', ') || '—'}</p>
      </Seccion>

      <Seccion title="4. Participación en la concesión">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('concesion_participacion', { concesion_id: Number(f.get('concesion_id')), fecha_desde: f.get('fecha_desde'), porcentaje: Number(f.get('porcentaje')), motivo: f.get('motivo') || null })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Concesión</label><Select name="concesion_id" opts={concOpts} required /></Field>
          <Field><label style={label}>Vigente desde</label><input name="fecha_desde" type="date" required style={input} /></Field>
          <Field><label style={label}>% participación (0 a 1, ej. 0.5)</label><input name="porcentaje" type="number" step="0.0001" min="0" max="1" required style={input} /></Field>
          <Field><label style={label}>Motivo</label><input name="motivo" style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="5. Pozo">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('pozos', { nombre: f.get('nombre'), concesion_id: Number(f.get('concesion_id')), tipo: f.get('tipo'), fecha_alta: f.get('fecha_alta') })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Nombre</label><input name="nombre" required style={input} /></Field>
          <Field><label style={label}>Concesión</label><Select name="concesion_id" opts={concOpts} required /></Field>
          <Field><label style={label}>Tipo</label>
            <select name="tipo" style={input}>
              <option value="productor_petroleo">Productor petróleo</option>
              <option value="productor_gas">Productor gas</option>
              <option value="inyector_agua">Inyector agua</option>
            </select>
          </Field>
          <Field><label style={label}>Fecha de alta</label><input name="fecha_alta" type="date" required style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 10 }}>Cargados: {data.pozos.map(p => p.nombre).join(', ') || '—'}</p>
      </Seccion>

      <Seccion title="6. Pozo tipo (curva de referencia)">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('pozos_tipo', { nombre: f.get('nombre'), yacimiento_id: Number(f.get('yacimiento_id')), categoria: f.get('categoria') })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Nombre</label><input name="nombre" required style={input} /></Field>
          <Field><label style={label}>Yacimiento</label><Select name="yacimiento_id" opts={yacOpts} required /></Field>
          <Field><label style={label}>Categoría</label>
            <select name="categoria" style={input}>
              <option value="basico">Básico</option><option value="drilling">Drilling</option>
              <option value="workover">Workover</option><option value="pulling">Pulling</option>
            </select>
          </Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="7. Curva de producción (fila mensual)">
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>Elegí pozo O pozo tipo, no ambos. mes_offset = 0 es el primer mes de la curva.</p>
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('curvas_produccion', {
            pozo_id: f.get('pozo_id') ? Number(f.get('pozo_id')) : null,
            pozo_tipo_id: f.get('pozo_tipo_id') ? Number(f.get('pozo_tipo_id')) : null,
            mes_offset: Number(f.get('mes_offset')),
            bbl_petroleo: Number(f.get('bbl_petroleo') || 0),
            mcf_gas: Number(f.get('mcf_gas') || 0),
          })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Pozo (opcional)</label><Select name="pozo_id" opts={pozoOpts} /></Field>
          <Field><label style={label}>Pozo tipo (opcional)</label><Select name="pozo_tipo_id" opts={pozoTipoOpts} /></Field>
          <Field><label style={label}>Mes offset</label><input name="mes_offset" type="number" min="0" required style={input} /></Field>
          <Field><label style={label}>bbl petróleo/mes</label><input name="bbl_petroleo" type="number" step="0.001" style={input} /></Field>
          <Field><label style={label}>mcf gas/mes</label><input name="mcf_gas" type="number" step="0.001" style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="8. Regalías">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('regalias', { concesion_id: Number(f.get('concesion_id')), fecha_desde: f.get('fecha_desde'), porcentaje: Number(f.get('porcentaje')) })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Concesión</label><Select name="concesion_id" opts={concOpts} required /></Field>
          <Field><label style={label}>Vigente desde</label><input name="fecha_desde" type="date" required style={input} /></Field>
          <Field><label style={label}>% regalía (ej. 0.12)</label><input name="porcentaje" type="number" step="0.0001" required style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="9. OPEX fijo (por concesión, mensual)">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('opex_fijo', { concesion_id: Number(f.get('concesion_id')), fecha_desde: f.get('fecha_desde'), monto_usd_mes: Number(f.get('monto_usd_mes')), concepto: f.get('concepto') || null })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Concesión</label><Select name="concesion_id" opts={concOpts} required /></Field>
          <Field><label style={label}>Vigente desde</label><input name="fecha_desde" type="date" required style={input} /></Field>
          <Field><label style={label}>USD/mes</label><input name="monto_usd_mes" type="number" step="0.01" required style={input} /></Field>
          <Field><label style={label}>Concepto</label><input name="concepto" style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="10. OPEX variable (por yacimiento, USD/BOE)">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('opex_variable', { yacimiento_id: Number(f.get('yacimiento_id')), fecha_desde: f.get('fecha_desde'), usd_por_boe: Number(f.get('usd_por_boe')) })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Yacimiento</label><Select name="yacimiento_id" opts={yacOpts} required /></Field>
          <Field><label style={label}>Vigente desde</label><input name="fecha_desde" type="date" required style={input} /></Field>
          <Field><label style={label}>USD/BOE</label><input name="usd_por_boe" type="number" step="0.0001" required style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="11. Fórmula de precio (Brent × (1 − DDE%)/divisor − descuento)">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('formulas_precio', {
            yacimiento_id: Number(f.get('yacimiento_id')), producto: f.get('producto'), fecha_desde: f.get('fecha_desde'),
            referencia: f.get('referencia') || 'brent', dde_pct: Number(f.get('dde_pct') || 0),
            divisor: Number(f.get('divisor') || 1), descuento_adicional_usd: Number(f.get('descuento_adicional_usd') || 0),
          })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Yacimiento</label><Select name="yacimiento_id" opts={yacOpts} required /></Field>
          <Field><label style={label}>Producto</label><select name="producto" style={input}><option value="petroleo">Petróleo</option><option value="gas">Gas</option></select></Field>
          <Field><label style={label}>Vigente desde</label><input name="fecha_desde" type="date" required style={input} /></Field>
          <Field><label style={label}>Referencia (brent, wti…)</label><input name="referencia" defaultValue="brent" style={input} /></Field>
          <Field><label style={label}>DDE %</label><input name="dde_pct" type="number" step="0.01" style={input} /></Field>
          <Field><label style={label}>Divisor (ej. 0.97)</label><input name="divisor" type="number" step="0.0001" defaultValue="1" style={input} /></Field>
          <Field><label style={label}>Descuento adicional USD</label><input name="descuento_adicional_usd" type="number" step="0.01" style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="12. Precio de referencia (ej. Brent mensual)">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('precios_referencia', { referencia: f.get('referencia'), fecha: f.get('fecha'), precio_usd: Number(f.get('precio_usd')) })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Referencia</label><input name="referencia" defaultValue="brent" required style={input} /></Field>
          <Field><label style={label}>Mes</label><input name="fecha" type="date" required style={input} /></Field>
          <Field><label style={label}>Precio USD</label><input name="precio_usd" type="number" step="0.0001" required style={input} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>

      <Seccion title="13. Escenario">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('escenarios', { nombre: f.get('nombre'), descripcion: f.get('descripcion') || null, es_base: f.get('es_base') === 'on' })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Nombre</label><input name="nombre" required style={input} /></Field>
          <Field><label style={label}>Descripción</label><input name="descripcion" style={input} /></Field>
          <Field><label><input type="checkbox" name="es_base" /> Es el escenario base</label></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 10 }}>Cargados: {data.escenarios.map(e => e.nombre).join(', ') || '—'}</p>
      </Seccion>

      <Seccion title="14. Intervención (drilling / workover / pulling / facilities)">
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget)
          submit('intervenciones', {
            pozo_id: f.get('pozo_id') ? Number(f.get('pozo_id')) : null,
            concesion_id: Number(f.get('concesion_id')), tipo: f.get('tipo'), fecha: f.get('fecha'),
            capex_usd: Number(f.get('capex_usd')), vida_util_meses: f.get('vida_util_meses') ? Number(f.get('vida_util_meses')) : null,
            pozo_tipo_id: f.get('pozo_tipo_id') ? Number(f.get('pozo_tipo_id')) : null,
            escenario_id: f.get('escenario_id') ? Number(f.get('escenario_id')) : null,
          })
          e.currentTarget.reset() }}>
          <Field><label style={label}>Pozo (vacío si es drilling de un pozo nuevo)</label><Select name="pozo_id" opts={pozoOpts} /></Field>
          <Field><label style={label}>Concesión</label><Select name="concesion_id" opts={concOpts} required /></Field>
          <Field><label style={label}>Tipo</label>
            <select name="tipo" style={input}>
              <option value="perforacion">Perforación</option><option value="workover">Workover</option>
              <option value="pulling">Pulling</option><option value="facilities">Facilities</option>
            </select>
          </Field>
          <Field><label style={label}>Fecha</label><input name="fecha" type="date" required style={input} /></Field>
          <Field><label style={label}>CAPEX USD</label><input name="capex_usd" type="number" step="0.01" required style={input} /></Field>
          <Field><label style={label}>Vida útil (meses, para amortización)</label><input name="vida_util_meses" type="number" style={input} /></Field>
          <Field><label style={label}>Curva que activa (pozo tipo)</label><Select name="pozo_tipo_id" opts={pozoTipoOpts} /></Field>
          <Field><label style={label}>Escenario (vacío = plan base)</label><Select name="escenario_id" opts={data.escenarios.map(e => ({ value: String(e.id), label: String(e.nombre) }))} /></Field>
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
      </Seccion>
    </>
  )
}

function CalcularTab({ data }: { data: Data }) {
  const [escenarioId, setEscenarioId] = useState('')
  const [tasa, setTasa] = useState('0.10')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Record<string, number> | null>(null)
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
          <Kv label="Cash flow total (neto)" val={`US$ ${(resultado.total_cashflow / 1e6).toFixed(2)} MM`} />
          <Kv label={`NPV @ ${(resultado.tasa_anual * 100).toFixed(1)}%`} val={`US$ ${(resultado.npv / 1e6).toFixed(2)} MM`} />
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
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function cargar(id: string) {
    setEscenarioId(id)
    if (!id) { setRows([]); return }
    setLoading(true)
    const res = await fetch(`/api/portal/reservas/resultados?escenario_id=${id}`)
    setRows(res.ok ? await res.json() : [])
    setLoading(false)
  }

  const pozoNombre = (id: unknown) => data.pozos.find(p => p.id === id)?.nombre ?? id

  return (
    <Seccion title="Cash flow mensual por escenario">
      <Field><label style={label}>Escenario</label>
        <Select name="escenario_id" value={escenarioId} onChange={e => cargar(e.target.value)} opts={data.escenarios.map(e => ({ value: String(e.id), label: String(e.nombre) }))} />
      </Field>
      {loading && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>}
      {!loading && escenarioId && rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sin resultados — corré el cálculo primero en la pestaña anterior.</p>}
      {rows.length > 0 && (
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

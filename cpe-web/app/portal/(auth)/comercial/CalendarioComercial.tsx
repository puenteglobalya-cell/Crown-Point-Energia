'use client'

import { useEffect, useMemo, useState } from 'react'

type Nota = { id: string; fecha: string; texto: string; hecho: boolean; created_at: string }

// Feriados nacionales de Argentina 2026 (Ley 27.399 + Decreto 614/2025 de
// traslados). Si el calendario navega a otro año sin datos acá, simplemente
// no se etiqueta ningún feriado ese mes -- no se inventan fechas.
const FERIADOS_AR: Record<string, string> = {
  '2026-01-01': 'Año Nuevo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-03-23': 'No laborable (turístico)',
  '2026-03-24': 'Día de la Memoria',
  '2026-04-02': 'Malvinas / Jueves Santo',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-05-25': 'Revolución de Mayo',
  '2026-06-15': 'Gral. Güemes (traslado)',
  '2026-06-20': 'Día de la Bandera',
  '2026-07-09': 'Día de la Independencia',
  '2026-07-10': 'No laborable (turístico)',
  '2026-08-17': 'Gral. San Martín',
  '2026-10-12': 'Diversidad Cultural',
  '2026-11-23': 'Soberanía Nacional (traslado)',
  '2026-12-07': 'No laborable (turístico)',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(d: Date) {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

export default function CalendarioComercial() {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [notas, setNotas] = useState<Record<string, Nota[]>>({})
  const [loading, setLoading] = useState(false)
  const [draftFecha, setDraftFecha] = useState<string | null>(null)
  const [draftTexto, setDraftTexto] = useState('')
  const [saving, setSaving] = useState(false)

  const hoy = useMemo(() => startOfDay(new Date()), [])
  const en7dias = useMemo(() => {
    const d = new Date(hoy)
    d.setDate(d.getDate() + 6)
    return d
  }, [hoy])

  // Grilla de semanas lunes-domingo cubriendo el mes visible.
  const semanas = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    // Lunes=0 ... Domingo=6
    const offsetInicio = (primerDia.getDay() + 6) % 7
    const inicioGrilla = new Date(primerDia)
    inicioGrilla.setDate(inicioGrilla.getDate() - offsetInicio)
    const offsetFin = (7 - ((ultimoDia.getDay() + 6) % 7) - 1) % 7
    const finGrilla = new Date(ultimoDia)
    finGrilla.setDate(finGrilla.getDate() + offsetFin)

    const dias: Date[] = []
    const d = new Date(inicioGrilla)
    while (d <= finGrilla) {
      dias.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    const out: Date[][] = []
    for (let i = 0; i < dias.length; i += 7) out.push(dias.slice(i, i + 7))
    return out
  }, [cursor])

  const rangoDesde = toIso(semanas[0][0])
  const rangoHasta = toIso(semanas[semanas.length - 1][6])

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    fetch(`/api/comercial/calendario?desde=${rangoDesde}&hasta=${rangoHasta}`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: Nota[]) => {
        if (cancelado) return
        const byFecha: Record<string, Nota[]> = {}
        for (const n of rows) {
          (byFecha[n.fecha] ??= []).push(n)
        }
        setNotas(byFecha)
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [rangoDesde, rangoHasta])

  async function agregarNota(fecha: string) {
    const texto = draftTexto.trim()
    if (!texto) return
    setSaving(true)
    try {
      const res = await fetch('/api/comercial/calendario', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, texto }),
      })
      if (res.ok) {
        const nota = await res.json() as Nota
        setNotas(prev => ({ ...prev, [fecha]: [...(prev[fecha] ?? []), nota] }))
        setDraftTexto('')
        setDraftFecha(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleHecho(nota: Nota) {
    setNotas(prev => ({
      ...prev,
      [nota.fecha]: prev[nota.fecha].map(n => n.id === nota.id ? { ...n, hecho: !n.hecho } : n),
    }))
    await fetch(`/api/comercial/calendario/${nota.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hecho: !nota.hecho }),
    }).catch(() => {})
  }

  async function borrarNota(nota: Nota) {
    setNotas(prev => ({ ...prev, [nota.fecha]: prev[nota.fecha].filter(n => n.id !== nota.id) }))
    await fetch(`/api/comercial/calendario/${nota.id}`, { method: 'DELETE' }).catch(() => {})
  }

  function cambiarMes(delta: number) {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => cambiarMes(-1)} className="btn" style={{ padding: '6px 12px', fontSize: 13 }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', minWidth: 160, textAlign: 'center' }}>
            {MESES[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button onClick={() => cambiarMes(1)} className="btn" style={{ padding: '6px 12px', fontSize: 13 }}>→</button>
        </div>
        <button onClick={() => setCursor(startOfDay(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))} className="btn" style={{ padding: '6px 14px', fontSize: 12 }}>
          Hoy
        </button>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 18px', fontSize: 11, color: '#8e91b0', borderBottom: '1px solid var(--rule)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(224,85,85,0.12)', border: '1px solid rgba(224,85,85,0.4)', display: 'inline-block' }} />Fin de semana / feriado</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, border: '2px solid #2a8a9e', display: 'inline-block' }} />Próximos 7 días</span>
      </div>

      {/* Encabezado de días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DIAS.map(d => (
          <div key={d} style={{ padding: '8px 6px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#8e91b0', textAlign: 'center', borderBottom: '1px solid var(--rule)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grilla */}
      {semanas.map((semana, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < semanas.length - 1 ? '1px solid var(--rule)' : 'none' }}>
          {semana.map((dia, di) => {
            const iso = toIso(dia)
            const esDelMes = dia.getMonth() === cursor.getMonth()
            const esFinde = di >= 5
            const feriado = FERIADOS_AR[iso]
            const esProximos7 = dia >= hoy && dia <= en7dias
            const esHoy = iso === toIso(hoy)
            const items = notas[iso] ?? []
            const bg = feriado || esFinde ? 'rgba(224,85,85,0.07)' : 'transparent'

            return (
              <div
                key={iso}
                style={{
                  minHeight: 120,
                  padding: '8px 8px 10px',
                  borderRight: di < 6 ? '1px solid var(--rule)' : 'none',
                  background: bg,
                  opacity: esDelMes ? 1 : 0.4,
                  outline: esProximos7 ? '2px solid #2a8a9e' : 'none',
                  outlineOffset: -2,
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: esHoy ? 800 : 600, color: esHoy ? '#2a8a9e' : 'var(--fg)' }}>
                    {dia.getDate()}
                  </span>
                  <button
                    onClick={() => { setDraftFecha(iso); setDraftTexto('') }}
                    style={{ fontSize: 14, lineHeight: 1, background: 'none', border: 'none', color: '#8e91b0', cursor: 'pointer', padding: 2 }}
                    title="Agregar nota"
                  >
                    +
                  </button>
                </div>

                {feriado && (
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#c0392b', marginBottom: 4, lineHeight: 1.3 }}>
                    {feriado}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {items.map(n => (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 11, lineHeight: 1.3 }}>
                      <input
                        type="checkbox"
                        checked={n.hecho}
                        onChange={() => toggleHecho(n)}
                        style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1, textDecoration: n.hecho ? 'line-through' : 'none', color: n.hecho ? '#8e91b0' : 'var(--fg)', wordBreak: 'break-word' }}>
                        {n.texto}
                      </span>
                      <button
                        onClick={() => borrarNota(n)}
                        style={{ background: 'none', border: 'none', color: '#8e91b0', cursor: 'pointer', fontSize: 11, padding: 0, flexShrink: 0 }}
                        title="Borrar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {draftFecha === iso && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      autoFocus
                      value={draftTexto}
                      onChange={e => setDraftTexto(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') agregarNota(iso)
                        if (e.key === 'Escape') { setDraftFecha(null); setDraftTexto('') }
                      }}
                      placeholder="Nueva nota…"
                      maxLength={500}
                      style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--rule)', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        disabled={saving || !draftTexto.trim()}
                        onClick={() => agregarNota(iso)}
                        style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, border: 'none', background: '#2a8a9e', color: 'white', cursor: 'pointer' }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => { setDraftFecha(null); setDraftTexto('') }}
                        style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--rule)', background: 'none', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {loading && (
        <div style={{ padding: '10px 18px', fontSize: 11, color: '#8e91b0' }}>Cargando…</div>
      )}
    </div>
  )
}

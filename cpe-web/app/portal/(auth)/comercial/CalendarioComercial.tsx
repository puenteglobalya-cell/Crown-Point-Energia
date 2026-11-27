'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Adjunto = { id: string; file_name: string; file_size: number | null; created_at: string }
type Nota = { id: string; fecha: string; texto: string; hecho: boolean; created_at: string; comercial_calendario_adjuntos?: Adjunto[] }

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
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(d: Date) {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function CalendarioComercial() {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [notas, setNotas] = useState<Record<string, Nota[]>>({})
  const [loading, setLoading] = useState(false)
  const [draftFecha, setDraftFecha] = useState<string | null>(null)
  const [draftTexto, setDraftTexto] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalNota, setModalNota] = useState<Nota | null>(null)
  const [flash, setFlash] = useState('')

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

  // Rango editable para exportar / imprimir / compartir -- arranca en el
  // mes visible pero se puede ajustar a un día, una semana, o cualquier
  // rango arbitrario sin tener que navegar el calendario.
  const [expDesde, setExpDesde] = useState(() => `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`)
  const [expHasta, setExpHasta] = useState(() => toIso(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)))
  useEffect(() => {
    setExpDesde(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`)
    setExpHasta(toIso(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)))
  }, [cursor])

  function fetchNotas(desde: string, hasta: string) {
    setLoading(true)
    return fetch(`/api/comercial/calendario?desde=${desde}&hasta=${hasta}`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: Nota[]) => {
        const byFecha: Record<string, Nota[]> = {}
        for (const n of rows) (byFecha[n.fecha] ??= []).push(n)
        return byFecha
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelado = false
    fetchNotas(rangoDesde, rangoHasta).then(byFecha => { if (!cancelado) setNotas(byFecha) }).catch(() => {})
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
    if (modalNota?.id === nota.id) setModalNota(null)
    await fetch(`/api/comercial/calendario/${nota.id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function guardarTextoModal(nota: Nota, texto: string) {
    setNotas(prev => ({ ...prev, [nota.fecha]: prev[nota.fecha].map(n => n.id === nota.id ? { ...n, texto } : n) }))
    setModalNota(prev => prev ? { ...prev, texto } : prev)
    await fetch(`/api/comercial/calendario/${nota.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto }),
    }).catch(() => {})
  }

  async function posponerNota(nota: Nota, nuevaFecha: string) {
    if (nuevaFecha === nota.fecha) return
    setNotas(prev => {
      const sinNota = { ...prev, [nota.fecha]: prev[nota.fecha].filter(n => n.id !== nota.id) }
      const moved = { ...nota, fecha: nuevaFecha }
      sinNota[nuevaFecha] = [...(sinNota[nuevaFecha] ?? []), moved]
      return sinNota
    })
    setModalNota(prev => prev ? { ...prev, fecha: nuevaFecha } : prev)
    await fetch(`/api/comercial/calendario/${nota.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fecha: nuevaFecha }),
    }).catch(() => {})
  }

  function cambiarMes(delta: number) {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  function setPreset(tipo: 'dia' | 'semana' | 'mes') {
    if (tipo === 'dia') {
      setExpDesde(toIso(hoy)); setExpHasta(toIso(hoy))
    } else if (tipo === 'semana') {
      const offset = (hoy.getDay() + 6) % 7
      const lunes = new Date(hoy); lunes.setDate(lunes.getDate() - offset)
      const domingo = new Date(lunes); domingo.setDate(domingo.getDate() + 6)
      setExpDesde(toIso(lunes)); setExpHasta(toIso(domingo))
    } else {
      setExpDesde(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`)
      setExpHasta(toIso(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)))
    }
  }

  function descargarExcel() {
    window.open(`/api/comercial/calendario/export?desde=${expDesde}&hasta=${expHasta}`, '_blank')
  }

  async function imprimirRango() {
    const byFecha = await fetchNotas(expDesde, expHasta)
    const fechas = Object.keys(byFecha).sort()
    const filas = fechas.map(fecha => {
      const d = new Date(fecha + 'T00:00:00')
      const label = `${DIAS_LARGO[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
      const items = byFecha[fecha].map(n => `<li style="margin-bottom:4px${n.hecho ? ';text-decoration:line-through;color:#999' : ''}">${n.texto}</li>`).join('')
      return `<div style="margin-bottom:14px"><div style="font-weight:700;font-size:13px;color:#1b3f6e;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:6px">${label}</div><ul style="margin:0;padding-left:18px;font-size:13px">${items}</ul></div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Calendario Comercial ${expDesde} a ${expHasta}</title>
      <style>body{font-family:-apple-system,Arial,sans-serif;padding:32px;color:#1a2235}
      h1{font-size:18px;margin:0 0 4px}p{color:#888;font-size:12px;margin:0 0 24px}</style></head>
      <body><h1>Calendario Comercial</h1><p>${expDesde} a ${expHasta}</p>
      ${filas || '<p>Sin notas en este rango.</p>'}
      <script>window.onload=()=>window.print()</script>
      </body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  async function compartirRango() {
    const byFecha = await fetchNotas(expDesde, expHasta)
    const fechas = Object.keys(byFecha).sort()
    const lineas = fechas.flatMap(fecha => {
      const d = new Date(fecha + 'T00:00:00')
      const label = `${DIAS_LARGO[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
      return [`*${label}*`, ...byFecha[fecha].map(n => `- ${n.hecho ? '✓ ' : ''}${n.texto}`), '']
    })
    const texto = [`Calendario Comercial (${expDesde} a ${expHasta})`, '', ...lineas].join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setFlash('Copiado al portapapeles')
    } catch {
      setFlash('No se pudo copiar')
    }
    setTimeout(() => setFlash(''), 2500)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--rule)', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => cambiarMes(-1)} className="btn" style={{ padding: '6px 12px', fontSize: 13 }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', minWidth: 160, textAlign: 'center' }}>
            {MESES[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button onClick={() => cambiarMes(1)} className="btn" style={{ padding: '6px 12px', fontSize: 13 }}>→</button>
          <button onClick={() => setCursor(startOfDay(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))} className="btn" style={{ padding: '6px 14px', fontSize: 12 }}>
            Hoy
          </button>
        </div>
      </div>

      {/* Barra de exportación / rango */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 18px', borderBottom: '1px solid var(--rule)', background: 'var(--surface-2, #fafbfe)' }}>
        <span style={{ fontSize: 11, color: '#8e91b0', fontWeight: 600 }}>RANGO:</span>
        <button onClick={() => setPreset('dia')} className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>Día</button>
        <button onClick={() => setPreset('semana')} className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>Semana</button>
        <button onClick={() => setPreset('mes')} className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>Mes</button>
        <input type="date" value={expDesde} onChange={e => setExpDesde(e.target.value)} style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--rule)' }} />
        <span style={{ fontSize: 11, color: '#8e91b0' }}>a</span>
        <input type="date" value={expHasta} onChange={e => setExpHasta(e.target.value)} style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--rule)' }} />
        <span style={{ flex: 1 }} />
        <button onClick={descargarExcel} className="btn" style={{ padding: '5px 12px', fontSize: 11 }}>⬇ Excel</button>
        <button onClick={imprimirRango} className="btn" style={{ padding: '5px 12px', fontSize: 11 }}>🖨 Imprimir / PDF</button>
        <button onClick={compartirRango} className="btn" style={{ padding: '5px 12px', fontSize: 11 }}>↗ Compartir</button>
        {flash && <span style={{ fontSize: 11, color: '#2d7a4a', fontWeight: 600 }}>{flash}</span>}
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
                  {items.map(n => {
                    const nAdjuntos = n.comercial_calendario_adjuntos?.length ?? 0
                    return (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 11, lineHeight: 1.3 }}>
                        <input
                          type="checkbox"
                          checked={n.hecho}
                          onChange={() => toggleHecho(n)}
                          style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
                        />
                        <span
                          onClick={() => setModalNota(n)}
                          style={{ flex: 1, textDecoration: n.hecho ? 'line-through' : 'none', color: n.hecho ? '#8e91b0' : 'var(--fg)', wordBreak: 'break-word', cursor: 'pointer' }}
                          title="Ver / editar nota"
                        >
                          {n.texto}
                          {nAdjuntos > 0 && <span style={{ color: '#2a8a9e', marginLeft: 4 }}>📎{nAdjuntos}</span>}
                        </span>
                        <button
                          onClick={() => borrarNota(n)}
                          style={{ background: 'none', border: 'none', color: '#8e91b0', cursor: 'pointer', fontSize: 11, padding: 0, flexShrink: 0 }}
                          title="Borrar"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
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

      {modalNota && (
        <NotaModal
          nota={modalNota}
          onClose={() => setModalNota(null)}
          onGuardarTexto={texto => guardarTextoModal(modalNota, texto)}
          onPosponer={nuevaFecha => posponerNota(modalNota, nuevaFecha)}
          onBorrar={() => borrarNota(modalNota)}
          onAdjuntoSubido={adjunto => {
            setNotas(prev => ({
              ...prev,
              [modalNota.fecha]: prev[modalNota.fecha].map(n => n.id === modalNota.id
                ? { ...n, comercial_calendario_adjuntos: [...(n.comercial_calendario_adjuntos ?? []), adjunto] }
                : n),
            }))
            setModalNota(prev => prev ? { ...prev, comercial_calendario_adjuntos: [...(prev.comercial_calendario_adjuntos ?? []), adjunto] } : prev)
          }}
          onAdjuntoBorrado={adjuntoId => {
            setNotas(prev => ({
              ...prev,
              [modalNota.fecha]: prev[modalNota.fecha].map(n => n.id === modalNota.id
                ? { ...n, comercial_calendario_adjuntos: (n.comercial_calendario_adjuntos ?? []).filter(a => a.id !== adjuntoId) }
                : n),
            }))
            setModalNota(prev => prev ? { ...prev, comercial_calendario_adjuntos: (prev.comercial_calendario_adjuntos ?? []).filter(a => a.id !== adjuntoId) } : prev)
          }}
        />
      )}
    </div>
  )
}

function NotaModal({
  nota, onClose, onGuardarTexto, onPosponer, onBorrar, onAdjuntoSubido, onAdjuntoBorrado,
}: {
  nota: Nota
  onClose: () => void
  onGuardarTexto: (texto: string) => void
  onPosponer: (nuevaFecha: string) => void
  onBorrar: () => void
  onAdjuntoSubido: (a: Adjunto) => void
  onAdjuntoBorrado: (id: string) => void
}) {
  const [texto, setTexto] = useState(nota.texto)
  const [subiendo, setSubiendo] = useState(false)
  const [err, setErr] = useState('')
  const [posponiendo, setPosponiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const d = new Date(nota.fecha + 'T00:00:00')

  function posponerDias(dias: number) {
    const nueva = new Date(nota.fecha + 'T00:00:00')
    nueva.setDate(nueva.getDate() + dias)
    onPosponer(toIso(nueva))
    setPosponiendo(false)
  }

  async function subirArchivo(file: File) {
    setSubiendo(true); setErr('')
    try {
      const fd = new FormData()
      fd.append('nota_id', nota.id)
      fd.append('file', file)
      const res = await fetch('/api/comercial/calendario/adjuntos', { method: 'POST', body: fd })
      if (!res.ok) { setErr((await res.json().catch(() => null))?.error ?? 'Error al subir'); return }
      onAdjuntoSubido(await res.json())
    } finally {
      setSubiendo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function borrarAdjunto(id: string) {
    onAdjuntoBorrado(id)
    await fetch(`/api/comercial/calendario/adjuntos/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2a8a9e' }}>
            {DIAS_LARGO[d.getDay()]} {d.getDate()} de {MESES[d.getMonth()]} {d.getFullYear()}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#8e91b0' }}>×</button>
        </div>

        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onBlur={() => { if (texto.trim() && texto !== nota.texto) onGuardarTexto(texto.trim()) }}
          rows={5}
          maxLength={500}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--rule)', resize: 'vertical', marginBottom: 16, fontFamily: 'inherit' }}
        />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8e91b0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Archivos adjuntos
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {(nota.comercial_calendario_adjuntos ?? []).map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, background: '#f4f6fb', padding: '6px 10px', borderRadius: 6 }}>
              <a href={`/api/comercial/calendario/adjuntos/${a.id}`} target="_blank" style={{ color: 'var(--fg)', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📎 {a.file_name} <span style={{ color: '#8e91b0' }}>({fmtSize(a.file_size)})</span>
              </a>
              <button onClick={() => borrarAdjunto(a.id)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13, marginLeft: 8 }}>×</button>
            </div>
          ))}
          {(nota.comercial_calendario_adjuntos ?? []).length === 0 && (
            <span style={{ fontSize: 12, color: '#8e91b0' }}>Sin archivos adjuntos.</span>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f) }}
          style={{ display: 'none' }}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
        />
        <button
          disabled={subiendo}
          onClick={() => fileRef.current?.click()}
          className="btn"
          style={{ fontSize: 12, padding: '6px 14px', marginBottom: err ? 6 : 16 }}
        >
          {subiendo ? 'Subiendo…' : '+ Adjuntar archivo'}
        </button>
        {err && <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 16 }}>{err}</div>}

        <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: posponiendo ? 8 : 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8e91b0', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Posponer
            </span>
            <button onClick={() => setPosponiendo(v => !v)} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>
              {posponiendo ? 'Cancelar' : '⏰ Posponer'}
            </button>
          </div>
          {posponiendo && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <button onClick={() => posponerDias(1)} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>+1 día</button>
              <button onClick={() => posponerDias(3)} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>+3 días</button>
              <button onClick={() => posponerDias(7)} className="btn" style={{ fontSize: 11, padding: '4px 10px' }}>+1 semana</button>
              <input
                type="date"
                min={toIso(new Date())}
                onChange={e => { if (e.target.value) { onPosponer(e.target.value); setPosponiendo(false) } }}
                style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--rule)' }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onBorrar} style={{ fontSize: 12, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}>
            Eliminar nota
          </button>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 12, padding: '7px 18px' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

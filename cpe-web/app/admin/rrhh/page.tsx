'use client'

import { useCallback, useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────

type Position = {
  id: string; area: string; location: string; tipo: string
  activo: boolean; orden: number
}

type DatosPostulante = {
  nivel_estudios?: string | null
  carrera?: string | null
  anios_experiencia?: string | null
  anios_sector?: string | null
  disponibilidad?: string | null
  relocacion?: string | null
  ingles_nivel?: string | null
  otros_idiomas?: string | null
  pretension?: string | null
}

type Application = {
  id: string; nombre: string; email: string; telefono: string
  linkedin: string; area: string; mensaje: string
  cv_path: string | null; cv_name: string | null; cv_size: number | null
  estado: string; notas: string; created_at: string; updated_at: string
  datos?: DatosPostulante | null
  score?: number | null
  ai_summary?: string | null
  ai_analyzed_at?: string | null
}

type Tab = 'postulaciones' | 'posiciones'

// ── Constants ─────────────────────────────────────────────────────────────

const ESTADOS = ['nueva', 'revisada', 'contactada', 'descartada'] as const
const ESTADO_CONF: Record<string, { label: string; bg: string; fg: string }> = {
  nueva:      { label: 'Nueva',      bg: 'rgba(47,160,138,0.15)', fg: '#2FA08A' },
  revisada:   { label: 'Revisada',   bg: 'rgba(201,162,74,0.15)', fg: 'var(--cp-gold-deep)' },
  contactada: { label: 'Contactada', bg: 'rgba(108,174,82,0.15)', fg: 'var(--cp-green-deep)' },
  descartada: { label: 'Descartada', bg: 'var(--bg-alt)',          fg: 'var(--fg-muted)' },
}

const AREA_LABELS: Record<string, string> = {
  drilling: 'Perforación & completación',
  prodops: 'Producción & operaciones',
  geo: 'Geología & geofísica',
  finance: 'Finance & IR',
  hse: 'HSE & ESG',
  it: 'Tecnología & sistemas',
  other: 'Otro',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// ── Main Component ────────────────────────────────────────────────────────

export default function RrhhPage() {
  const [tab, setTab] = useState<Tab>('postulaciones')
  const [apps, setApps] = useState<Application[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>('todas')
  const [filterArea, setFilterArea] = useState<string>('todas')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'fecha' | 'score'>('fecha')
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  // ── Positions state ───────
  const [editingPos, setEditingPos] = useState<string | null>(null)
  const [newPos, setNewPos] = useState({ area: '', location: '', tipo: 'Full-time' })
  const [showNewPos, setShowNewPos] = useState(false)

  const loadApps = useCallback(async () => {
    const res = await fetch('/api/rrhh/postulaciones')
    if (res.ok) setApps(await res.json())
  }, [])

  const loadPositions = useCallback(async () => {
    const res = await fetch('/api/rrhh/posiciones')
    if (res.ok) setPositions(await res.json())
  }, [])

  useEffect(() => {
    Promise.all([loadApps(), loadPositions()]).then(() => setLoading(false))
  }, [loadApps, loadPositions])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // ── Application actions ───────

  async function updateApp(id: string, patch: { estado?: string; notas?: string }) {
    const res = await fetch('/api/rrhh/postulaciones', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (res.ok) {
      setApps(prev => prev.map(a => a.id === id ? { ...a, ...patch, updated_at: new Date().toISOString() } : a))
      flash('Actualizado')
    }
  }

  async function deleteApp(app: Application) {
    if (!confirm(`¿Eliminar la postulación de "${app.nombre}"? Esta acción es irreversible.`)) return
    const res = await fetch('/api/rrhh/postulaciones', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: app.id }),
    })
    if (res.ok) {
      setApps(prev => prev.filter(a => a.id !== app.id))
      if (selected === app.id) setSelected(null)
      flash('Eliminada')
    }
  }

  // ── Position actions ────────

  async function addPosition() {
    if (!newPos.area.trim()) return
    const res = await fetch('/api/rrhh/posiciones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(newPos),
    })
    if (res.ok) {
      const created = await res.json()
      setPositions(prev => [...prev, created])
      setNewPos({ area: '', location: '', tipo: 'Full-time' })
      setShowNewPos(false)
      flash('Posición creada')
    }
  }

  async function updatePosition(id: string, patch: Partial<Position>) {
    const res = await fetch('/api/rrhh/posiciones', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (res.ok) {
      setPositions(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
      setEditingPos(null)
      flash('Actualizada')
    }
  }

  async function deletePosition(pos: Position) {
    if (!confirm(`¿Eliminar "${pos.area}"?`)) return
    const res = await fetch('/api/rrhh/posiciones', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: pos.id }),
    })
    if (res.ok) {
      setPositions(prev => prev.filter(p => p.id !== pos.id))
      flash('Eliminada')
    }
  }

  // ── AI analysis ──────────

  async function analyzeWithAI(id: string) {
    setAnalyzingId(id)
    try {
      const res = await fetch('/api/rrhh/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (res.ok) {
        setApps(prev => prev.map(a => a.id === id
          ? { ...a, score: d.score, ai_summary: d.resumen, ai_analyzed_at: new Date().toISOString() }
          : a
        ))
        flash('Análisis IA completado')
      } else {
        flash(d.error ?? 'Error al analizar')
      }
    } catch {
      flash('Error de conexión')
    } finally {
      setAnalyzingId(null)
    }
  }

  // ── Derived data ──────────

  const filteredApps = apps
    .filter(a => filterEstado === 'todas' || a.estado === filterEstado)
    .filter(a => filterArea === 'todas' || a.area === filterArea)
    .filter(a => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return a.nombre.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (b.score ?? -1) - (a.score ?? -1)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const sel = selected ? apps.find(a => a.id === selected) : null

  const counts = {
    total: apps.length,
    nueva: apps.filter(a => a.estado === 'nueva').length,
    revisada: apps.filter(a => a.estado === 'revisada').length,
    contactada: apps.filter(a => a.estado === 'contactada').length,
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                Recursos Humanos
              </h1>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
                Gestión de búsquedas y postulaciones
              </p>
            </div>
            {msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total postulaciones', val: counts.total, color: 'var(--fg)' },
            { label: 'Nuevas (sin revisar)', val: counts.nueva, color: '#2FA08A' },
            { label: 'En revisión', val: counts.revisada, color: 'var(--cp-gold-deep)' },
            { label: 'Contactadas', val: counts.contactada, color: 'var(--cp-green-deep)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '16px 20px' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--font-mono)', color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {([['postulaciones', 'Postulaciones'], ['posiciones', 'Búsquedas activas']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="btn"
              style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 600,
                background: tab === key ? 'var(--accent)' : undefined,
                color: tab === key ? '#fff' : undefined,
                borderColor: tab === key ? 'var(--accent)' : undefined,
              }}
            >
              {label}
              {key === 'postulaciones' && counts.nueva > 0 && (
                <span style={{ marginLeft: 6, background: '#2FA08A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--r-pill)' }}>{counts.nueva}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</p>
        ) : tab === 'postulaciones' ? (
          /* ── POSTULACIONES TAB ──────────────────────────────────────── */
          <>
            {/* Search + filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                placeholder="Buscar por nombre o email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: '1 1 200px', minWidth: 180, fontSize: 13, padding: '7px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)' }}
              />
              <select
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)' }}
              >
                <option value="todas">Todas las áreas</option>
                {Object.entries(AREA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'fecha' | 'score')}
                style={{ fontSize: 12, padding: '7px 10px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--fg)' }}
              >
                <option value="fecha">Ordenar: más reciente</option>
                <option value="score">Ordenar: mayor score IA</option>
              </select>
            </div>

            {/* Estado filter bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['todas', ...ESTADOS].map(e => (
                <button
                  key={e}
                  onClick={() => setFilterEstado(e)}
                  className="btn"
                  style={{
                    fontSize: 12, padding: '6px 14px',
                    background: filterEstado === e ? (ESTADO_CONF[e]?.bg ?? 'var(--accent)') : undefined,
                    color: filterEstado === e ? (ESTADO_CONF[e]?.fg ?? '#fff') : undefined,
                    fontWeight: filterEstado === e ? 700 : 400,
                  }}
                >
                  {e === 'todas' ? `Todas (${apps.length})` : `${ESTADO_CONF[e]?.label} (${apps.filter(a => a.estado === e).length})`}
                </button>
              ))}
            </div>

            {filteredApps.length === 0 ? (
              <p style={{ color: 'var(--fg-muted)', fontSize: 14, fontStyle: 'italic' }}>No hay postulaciones{filterEstado !== 'todas' ? ` con estado "${filterEstado}"` : ''}.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1.3fr' : '1fr', gap: 20 }}>
                {/* List */}
                <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)', maxHeight: '70vh', overflowY: 'auto' }}>
                  {filteredApps.map((app, i) => {
                    const ec = ESTADO_CONF[app.estado] ?? ESTADO_CONF.nueva
                    const age = daysSince(app.created_at)
                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelected(app.id === selected ? null : app.id)}
                        style={{
                          padding: '14px 18px', cursor: 'pointer',
                          borderBottom: i < filteredApps.length - 1 ? '1px solid var(--rule)' : 'none',
                          background: app.id === selected ? 'var(--bg-alt)' : 'transparent',
                          borderLeft: app.estado === 'nueva' ? '3px solid #2FA08A' : '3px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{app.nombre}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {app.score != null && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                                padding: '2px 7px', borderRadius: 'var(--r-pill)',
                                background: app.score >= 70 ? 'rgba(108,174,82,0.15)' : app.score >= 40 ? 'rgba(201,162,74,0.15)' : 'rgba(179,59,46,0.12)',
                                color: app.score >= 70 ? 'var(--cp-green-deep)' : app.score >= 40 ? 'var(--cp-gold-deep)' : 'var(--cp-negative)',
                              }}>
                                {app.score}
                              </span>
                            )}
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                              padding: '3px 8px', borderRadius: 'var(--r-pill)', background: ec.bg, color: ec.fg,
                            }}>
                              {ec.label}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, fontFamily: 'var(--font-mono)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span>{AREA_LABELS[app.area] ?? app.area}</span>
                          <span>·</span>
                          <span>hace {age === 0 ? 'hoy' : `${age}d`}</span>
                          {app.cv_path && <><span>·</span><span style={{ color: 'var(--accent)' }}>CV</span></>}
                          {app.ai_analyzed_at && <><span>·</span><span style={{ color: 'var(--fg-muted)' }}>IA ✓</span></>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Detail panel */}
                {sel && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                      <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: 0 }}>{sel.nombre}</h2>
                        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
                          {fmtDate(sel.created_at)} · hace {daysSince(sel.created_at)}d
                        </p>
                      </div>
                      <button onClick={() => setSelected(null)} className="btn" style={{ fontSize: 12, padding: '4px 10px' }}>&times;</button>
                    </div>

                    {/* Status pipeline */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                      {ESTADOS.map(e => {
                        const ec = ESTADO_CONF[e]
                        const active = sel.estado === e
                        return (
                          <button
                            key={e}
                            onClick={() => updateApp(sel.id, { estado: e })}
                            className="btn"
                            style={{
                              flex: 1, fontSize: 11, padding: '8px 4px', fontWeight: active ? 700 : 400,
                              background: active ? ec.bg : undefined,
                              color: active ? ec.fg : 'var(--fg-muted)',
                              borderColor: active ? ec.fg : undefined,
                            }}
                          >
                            {ec.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Contact info */}
                    <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                      <InfoRow label="Email" val={sel.email} href={`mailto:${sel.email}`} />
                      {sel.telefono && <InfoRow label="Teléfono" val={sel.telefono} href={`tel:${sel.telefono}`} />}
                      {sel.linkedin && <InfoRow label="LinkedIn" val={sel.linkedin} href={sel.linkedin} />}
                      <InfoRow label="Área" val={AREA_LABELS[sel.area] ?? sel.area} />
                    </div>

                    {/* Structured experience data */}
                    {sel.datos && Object.values(sel.datos).some(Boolean) && (
                      <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 12 }}>Perfil profesional</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                          {[
                            { label: 'Nivel de estudios',    val: sel.datos.nivel_estudios },
                            { label: 'Carrera',              val: sel.datos.carrera },
                            { label: 'Experiencia total',    val: sel.datos.anios_experiencia },
                            { label: 'En sector O&G',        val: sel.datos.anios_sector },
                            { label: 'Disponibilidad',       val: sel.datos.disponibilidad },
                            { label: 'Relocación',           val: sel.datos.relocacion },
                            { label: 'Inglés',               val: sel.datos.ingles_nivel },
                            { label: 'Otros idiomas',        val: sel.datos.otros_idiomas },
                            { label: 'Pretensión salarial',  val: sel.datos.pretension },
                          ].filter(r => r.val).map(r => (
                            <div key={r.label} style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 6 }}>
                              <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.06em', marginBottom: 2 }}>{r.label}</div>
                              <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{r.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CV download */}
                    {sel.cv_path && (
                      <a
                        href={`${SUPABASE_URL}/storage/v1/object/public/documents/${sel.cv_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6"/>
                          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6"/>
                        </svg>
                        {sel.cv_name ?? 'Descargar CV'}
                        {sel.cv_size ? ` (${fmtSize(sel.cv_size)})` : ''}
                      </a>
                    )}

                    {/* AI Analysis */}
                    <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sel.ai_summary ? 10 : 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                          Análisis IA
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 11, padding: '5px 12px', opacity: analyzingId === sel.id ? 0.6 : 1 }}
                          disabled={analyzingId === sel.id}
                          onClick={() => analyzeWithAI(sel.id)}
                        >
                          {analyzingId === sel.id ? 'Analizando…' : sel.ai_analyzed_at ? 'Re-analizar' : 'Analizar con IA'}
                        </button>
                      </div>
                      {sel.score != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sel.ai_summary ? 8 : 0 }}>
                          <span style={{
                            fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: sel.score >= 70 ? 'var(--cp-green-deep)' : sel.score >= 40 ? 'var(--cp-gold-deep)' : 'var(--cp-negative)',
                          }}>
                            {sel.score}<span style={{ fontSize: 12, fontWeight: 400 }}>/100</span>
                          </span>
                          {sel.ai_analyzed_at && (
                            <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                              {fmtDate(sel.ai_analyzed_at)}
                            </span>
                          )}
                        </div>
                      )}
                      {sel.ai_summary && (
                        <p style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0 }}>{sel.ai_summary}</p>
                      )}
                      {!sel.ai_summary && !sel.ai_analyzed_at && (
                        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>
                          Sin análisis. Presioná "Analizar con IA" para obtener un score y resumen del candidato.
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Mensaje</div>
                      <p style={{ fontSize: 14, color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{sel.mensaje}</p>
                    </div>

                    {/* Internal notes */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Notas internas (solo RRHH)</div>
                      <textarea
                        rows={3}
                        defaultValue={sel.notas}
                        placeholder="Agregar notas sobre el candidato…"
                        onBlur={e => {
                          if (e.target.value !== sel.notas) updateApp(sel.id, { notas: e.target.value })
                        }}
                        style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontSize: 13 }}
                      />
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteApp(sel)}
                      className="btn"
                      style={{ fontSize: 12, padding: '8px 14px', color: 'var(--cp-negative)' }}
                    >
                      Eliminar postulación y CV
                    </button>

                    {/* Data retention notice */}
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 12, lineHeight: 1.5 }}>
                      Ley 25.326 de Protección de Datos Personales: los datos de postulantes deben eliminarse si no son necesarios para el proceso de selección.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── POSICIONES TAB ─────────────────────────────────────────── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
                Las posiciones marcadas como activas aparecen en la página pública /carreras.
              </p>
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '10px 18px' }} onClick={() => setShowNewPos(true)}>
                + Nueva posición
              </button>
            </div>

            {/* New position form */}
            {showNewPos && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--r-md)', padding: '20px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, alignItems: 'end' }}>
                <div className="form-row" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12 }}>Área / puesto</label>
                  <input type="text" value={newPos.area} onChange={e => setNewPos(p => ({ ...p, area: e.target.value }))} placeholder="Ej: Ingeniería de yacimientos" />
                </div>
                <div className="form-row" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12 }}>Ubicación</label>
                  <input type="text" value={newPos.location} onChange={e => setNewPos(p => ({ ...p, location: e.target.value }))} placeholder="Buenos Aires / Chubut" />
                </div>
                <button className="btn btn-primary" style={{ padding: '10px 18px' }} onClick={addPosition}>Crear</button>
                <button className="btn" style={{ padding: '10px 14px' }} onClick={() => setShowNewPos(false)}>Cancelar</button>
              </div>
            )}

            <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              {positions.length === 0 ? (
                <p style={{ padding: 20, color: 'var(--fg-muted)', fontSize: 14 }}>No hay posiciones cargadas.</p>
              ) : positions.map((pos, i) => (
                <div
                  key={pos.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
                    gap: 12, alignItems: 'center', padding: '14px 18px',
                    borderBottom: i < positions.length - 1 ? '1px solid var(--rule)' : 'none',
                  }}
                >
                  {editingPos === pos.id ? (
                    <EditPositionRow pos={pos} onSave={p => updatePosition(pos.id, p)} onCancel={() => setEditingPos(null)} />
                  ) : (
                    <>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{pos.area}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{pos.location} · {pos.tipo}</div>
                      </div>

                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: 'var(--r-pill)',
                        background: pos.activo ? 'rgba(108,174,82,0.15)' : 'var(--bg-alt)',
                        color: pos.activo ? 'var(--cp-green-deep)' : 'var(--fg-muted)',
                      }}>
                        {pos.activo ? 'Activa' : 'Oculta'}
                      </span>

                      {/* Toggle */}
                      <div
                        title={pos.activo ? 'Ocultar de /carreras' : 'Publicar en /carreras'}
                        style={{ width: 36, height: 20, borderRadius: 10, background: pos.activo ? 'var(--accent)' : 'var(--rule)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                        onClick={() => updatePosition(pos.id, { activo: !pos.activo })}
                      >
                        <div style={{ position: 'absolute', top: 2, left: pos.activo ? 17 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                      </div>

                      <button onClick={() => setEditingPos(pos.id)} className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>Editar</button>
                      <button onClick={() => deletePosition(pos)} className="btn" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--cp-negative)' }}>Eliminar</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────

function InfoRow({ label, val, href }: { label: string; val: string; href?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{val}</a>
      ) : (
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{val}</span>
      )}
    </div>
  )
}

function EditPositionRow({ pos, onSave, onCancel }: { pos: Position; onSave: (p: Partial<Position>) => void; onCancel: () => void }) {
  const [area, setArea] = useState(pos.area)
  const [location, setLocation] = useState(pos.location)
  const [tipo, setTipo] = useState(pos.tipo)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, gridColumn: '1 / -1' }}>
        <input type="text" value={area} onChange={e => setArea(e.target.value)} style={{ fontSize: 13 }} />
        <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={{ fontSize: 13 }} />
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ fontSize: 13 }}>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contrato">Contrato</option>
          <option value="Pasantía">Pasantía</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1', justifyContent: 'end' }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => onSave({ area, location, tipo })}>Guardar</button>
        <button className="btn" style={{ fontSize: 12, padding: '6px 14px' }} onClick={onCancel}>Cancelar</button>
      </div>
    </>
  )
}

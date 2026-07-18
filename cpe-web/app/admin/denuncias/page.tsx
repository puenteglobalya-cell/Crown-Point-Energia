'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminPageHeader, AdminSkeletonRows } from '@/components/AdminPageHeader'

type Denuncia = {
  id: string
  categoria: string
  descripcion: string
  fecha_incidente: string | null
  anonimo: boolean
  nombre: string
  email: string
  telefono: string
  evidencia_path: string | null
  evidencia_name: string | null
  estado: string
  notas: string
  created_at: string
}

const CATEGORIA_LABELS: Record<string, string> = {
  anticorrupcion: 'Anticorrupción / soborno',
  informacion_privilegiada: 'Uso de información privilegiada',
  conflicto_interes: 'Conflicto de interés',
  acoso_discriminacion: 'Acoso o discriminación',
  fraude_financiero: 'Fraude o irregularidad financiera',
  seguridad_ambiente: 'Seguridad, salud o medio ambiente',
  otro: 'Otro',
}

const ESTADOS = ['nueva', 'en_revision', 'cerrada'] as const
const ESTADO_LABELS: Record<string, string> = { nueva: 'Nueva', en_revision: 'En revisión', cerrada: 'Cerrada' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DenunciasAdminPage() {
  const [items, setItems] = useState<Denuncia[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState('todas')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/denuncias')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function update(id: string, patch: { estado?: string; notas?: string }) {
    const res = await fetch('/api/denuncias', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...patch }),
    })
    if (res.ok) {
      setItems(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
      flash('Actualizado')
    }
  }

  async function remove(d: Denuncia) {
    if (!confirm(`¿Eliminar esta denuncia (${CATEGORIA_LABELS[d.categoria] ?? d.categoria})? Esta acción es irreversible.`)) return
    const res = await fetch('/api/denuncias', {
      method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: d.id }),
    })
    if (res.ok) {
      setItems(prev => prev.filter(x => x.id !== d.id))
      if (selected === d.id) setSelected(null)
      flash('Eliminada')
    }
  }

  const filtered = items.filter(d => filterEstado === 'todas' || d.estado === filterEstado)
  const sel = selected ? items.find(d => d.id === selected) : null
  const nuevas = items.filter(d => d.estado === 'nueva').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <AdminPageHeader
          title="Línea Ética — Denuncias"
          subtitle="Canal confidencial de denuncias e irregularidades"
          note={nuevas > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>{nuevas} nuevas</span>
          )}
          right={msg && <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>✓ {msg}</span>}
        />

        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Acceso restringido a administradores. Las denuncias anónimas no incluyen ningún dato de contacto —
          respetá esa confidencialidad al tratarlas.
        </p>

        {loading ? (
          <AdminSkeletonRows rows={5} />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['todas', ...ESTADOS].map(e => (
                <button
                  key={e} onClick={() => setFilterEstado(e)} className="btn"
                  style={{
                    fontSize: 12, padding: '6px 14px',
                    background: filterEstado === e ? 'var(--accent)' : undefined,
                    color: filterEstado === e ? '#fff' : undefined,
                    fontWeight: filterEstado === e ? 700 : 400,
                  }}
                >
                  {e === 'todas' ? `Todas (${items.length})` : `${ESTADO_LABELS[e]} (${items.filter(d => d.estado === e).length})`}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p style={{ color: 'var(--fg-muted)', fontSize: 14, fontStyle: 'italic' }}>No hay denuncias{filterEstado !== 'todas' ? ` con estado "${ESTADO_LABELS[filterEstado]}"` : ''}.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1.3fr' : '1fr', gap: 20 }}>
                <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
                  {filtered.map((d, i) => (
                    <div
                      key={d.id}
                      onClick={() => setSelected(d.id === selected ? null : d.id)}
                      style={{
                        padding: '14px 18px', cursor: 'pointer',
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--rule)' : 'none',
                        background: d.id === selected ? 'var(--bg-alt)' : 'transparent',
                        borderLeft: d.estado === 'nueva' ? '3px solid #2FA08A' : '3px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{CATEGORIA_LABELS[d.categoria] ?? d.categoria}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 'var(--r-pill)', background: 'var(--bg-alt)', color: 'var(--fg-muted)' }}>
                          {ESTADO_LABELS[d.estado]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(d.created_at)} · {d.anonimo ? 'Anónima' : 'Con contacto'}
                      </div>
                    </div>
                  ))}
                </div>

                {sel && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: 24, maxHeight: '75vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0 }}>{CATEGORIA_LABELS[sel.categoria] ?? sel.categoria}</h2>
                      <button onClick={() => setSelected(null)} className="btn" style={{ fontSize: 12, padding: '4px 10px' }}>&times;</button>
                    </div>

                    {(sel.categoria === 'fraude_financiero' || sel.categoria === 'anticorrupcion') && (
                      <div style={{ background: 'rgba(201,162,74,0.15)', border: '1px solid var(--cp-gold-deep)', borderRadius: 'var(--r-md)', padding: 12, marginBottom: 16, fontSize: 12, color: 'var(--cp-gold-deep)' }}>
                        ⚠ Categoría sensible. Pendiente de validar con Directorio/Legal: ¿debería escalarse al Comité
                        de Auditoría en vez de (o además de) tratarse solo por este canal interno?
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                      {ESTADOS.map(e => (
                        <button
                          key={e} onClick={() => update(sel.id, { estado: e })} className="btn"
                          style={{
                            flex: 1, fontSize: 11, padding: '8px 4px', fontWeight: sel.estado === e ? 700 : 400,
                            background: sel.estado === e ? 'var(--accent)' : undefined,
                            color: sel.estado === e ? '#fff' : 'var(--fg-muted)',
                          }}
                        >
                          {ESTADO_LABELS[e]}
                        </button>
                      ))}
                    </div>

                    {!sel.anonimo && (sel.nombre || sel.email) && (
                      <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 16, fontSize: 13 }}>
                        {sel.nombre && <div><strong>Nombre:</strong> {sel.nombre}</div>}
                        {sel.email && <div><strong>Email:</strong> <a href={`mailto:${sel.email}`} style={{ color: 'var(--accent)' }}>{sel.email}</a></div>}
                        {sel.telefono && <div><strong>Teléfono:</strong> {sel.telefono}</div>}
                      </div>
                    )}
                    {sel.anonimo && (
                      <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 16, fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                        Denuncia anónima — sin datos de contacto.
                      </div>
                    )}

                    {sel.fecha_incidente && (
                      <p style={{ fontSize: 13, marginBottom: 12 }}><strong>Fecha del hecho:</strong> {fmtDate(sel.fecha_incidente)}</p>
                    )}

                    <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Descripción</div>
                      <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{sel.descripcion}</p>
                    </div>

                    {sel.evidencia_path && (
                      <a href={`/api/denuncias/${sel.id}/evidencia`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-block', fontSize: 13, padding: '10px 18px', textDecoration: 'none', marginBottom: 16 }}>
                        Descargar evidencia ({sel.evidencia_name})
                      </a>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Notas internas</div>
                      <textarea
                        rows={3} defaultValue={sel.notas} placeholder="Notas de seguimiento…"
                        onBlur={e => { if (e.target.value !== sel.notas) update(sel.id, { notas: e.target.value }) }}
                        style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontSize: 13 }}
                      />
                    </div>

                    <button onClick={() => remove(sel)} className="btn" style={{ fontSize: 12, padding: '8px 14px', color: 'var(--cp-negative)' }}>
                      Eliminar denuncia
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

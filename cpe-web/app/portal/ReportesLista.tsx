'use client'

import { useState, useCallback } from 'react'
import { combinarReportesHTML } from '@/lib/generador/htmlReportCombinado'

export type ReporteItem = {
  id: string
  type_id: string | null
  titulo: string
  periodo: string
  estado: string
  file_name: string | null
  file_size: number | null
  created_at: string
}

type Comment = {
  id: string
  texto: string
  created_at: string
  user_id: string
}

const TYPE_LABELS: Record<string, string> = {
  ingresos:   'Ingresos',
  accionista: 'Seguimiento',
  produccion: 'Producción',
  financiero: 'Financiero',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  items: ReporteItem[]
  userCanUpload: boolean
  isAccionista?: boolean
}

export function ReportesLista({ items, userCanUpload, isAccionista }: Props) {
  const [combineMode, setCombineMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [orderModal, setOrderModal] = useState(false)
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState('')

  // Comments state
  const [commentOpen, setCommentOpen] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentText, setCommentText] = useState<Record<string, string>>({})

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function openOrderModal() {
    setOrderedIds(items.filter(it => selected.has(it.id)).map(it => it.id))
    setOrderModal(true)
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= orderedIds.length) return
    setOrderedIds(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const onDragStart = useCallback((i: number) => setDragIdx(i), [])
  const onDrop = useCallback((targetIdx: number) => {
    if (dragIdx == null || dragIdx === targetIdx) return
    moveItem(dragIdx, targetIdx)
    setDragIdx(null)
  }, [dragIdx, orderedIds]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setGenerating(true)
    try {
      const htmls = await Promise.all(
        orderedIds.map(id =>
          fetch(`/api/admin/reportes/${id}`, { credentials: 'include' }).then(r => r.text())
        )
      )
      const combined = combinarReportesHTML(
        orderedIds.map((id, i) => ({
          id,
          titulo: items.find(it => it.id === id)?.titulo ?? '',
          html: htmls[i],
        }))
      )
      const blob = new Blob([combined], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) setTimeout(() => URL.revokeObjectURL(url), 120_000)
    } catch {
      alert('Error al generar el reporte combinado')
    } finally {
      setGenerating(false)
    }
  }

  function exitCombine() {
    setCombineMode(false)
    setSelected(new Set())
    setOrderModal(false)
  }

  async function copyLink(id: string) {
    const url = `${window.location.origin}/api/admin/reportes/${id}`
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 1800)
  }

  async function toggleComments(reporteId: string) {
    setCommentOpen(prev => {
      const s = new Set(prev)
      if (s.has(reporteId)) { s.delete(reporteId); return s }
      s.add(reporteId)
      return s
    })
    if (!comments[reporteId]) {
      const res = await fetch(`/api/portal/comentarios/${reporteId}`)
      if (res.ok) {
        const data = await res.json()
        setComments(prev => ({ ...prev, [reporteId]: data }))
      }
    }
  }

  async function addComment(reporteId: string) {
    const texto = commentText[reporteId]?.trim()
    if (!texto) return
    const res = await fetch(`/api/portal/comentarios/${reporteId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    })
    if (res.ok) {
      const newComment = await res.json()
      setComments(prev => ({ ...prev, [reporteId]: [newComment, ...(prev[reporteId] ?? [])] }))
      setCommentText(prev => ({ ...prev, [reporteId]: '' }))
    }
  }

  async function deleteComment(reporteId: string, commentId: string) {
    const res = await fetch(`/api/portal/comentarios/${reporteId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    })
    if (res.ok) {
      setComments(prev => ({ ...prev, [reporteId]: (prev[reporteId] ?? []).filter(c => c.id !== commentId) }))
    }
  }

  if (items.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderRadius: 'var(--r-lg)', padding: '48px 32px', textAlign: 'center',
      }}>
        <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: 0 }}>
          No hay reportes disponibles.
        </p>
      </div>
    )
  }

  const orderedReportItems = orderedIds.map(id => items.find(it => it.id === id)!)

  return (
    <>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          {items.length} {items.length === 1 ? 'reporte' : 'reportes'}
        </div>
        {items.length > 1 && (
          <button
            onClick={() => combineMode ? exitCombine() : setCombineMode(true)}
            style={{
              fontSize: 12, fontWeight: 500, padding: '6px 14px',
              background: combineMode ? 'var(--accent-pale)' : 'var(--surface)',
              border: `1px solid ${combineMode ? 'var(--accent)' : 'var(--rule)'}`,
              borderRadius: 'var(--r-pill)', cursor: 'pointer', color: combineMode ? 'var(--accent)' : 'var(--fg-soft)',
            }}
          >
            {combineMode ? '✕ Cancelar selección' : '⊕ Combinar reportes'}
          </button>
        )}
      </div>

      {/* Report list */}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${combineMode && selected.has(item.id) ? 'var(--accent)' : 'var(--rule)'}`,
              borderRadius: 'var(--r-lg)',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              outline: combineMode && selected.has(item.id) ? '2px solid var(--accent-pale)' : 'none',
            }}
          >
            {/* Checkbox */}
            {combineMode && (
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                style={{ width: 17, height: 17, cursor: 'pointer', flexShrink: 0, accentColor: 'var(--accent)' }}
              />
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>
                {item.titulo}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                {item.periodo} · {fmtDate(item.created_at)}
                {item.file_size ? ` · ${fmtSize(item.file_size)}` : ''}
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              {item.type_id && item.type_id !== 'ingresos' && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 'var(--r-pill)',
                  background: 'rgba(31,37,102,0.08)', color: 'var(--accent)',
                }}>
                  {TYPE_LABELS[item.type_id] ?? item.type_id}
                </span>
              )}
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 'var(--r-pill)',
                background: item.estado === 'publicado' ? 'rgba(108,174,82,0.15)' : 'var(--bg-alt)',
                color: item.estado === 'publicado' ? 'var(--cp-green-deep)' : 'var(--fg-muted)',
              }}>
                {item.estado}
              </span>

              {/* Actions */}
              <button
                title="Copiar enlace"
                onClick={() => copyLink(item.id)}
                style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: copiedId === item.id ? 'var(--cp-green-deep)' : 'var(--fg-muted)' }}
              >
                {copiedId === item.id ? '✓' : '🔗'}
              </button>
              <a
                href={`/api/admin/reportes/${item.id}/excel`}
                className="btn"
                style={{ fontSize: 11, padding: '6px 12px', textDecoration: 'none' }}
                title="Descargar Excel"
              >
                ↓ Excel
              </a>
              <a
                href={`/api/admin/reportes/${item.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '7px 16px', textDecoration: 'none' }}
              >
                Ver / PDF
              </a>
            </div>

            {/* Comments section for accionistas */}
            {isAccionista && (
              <div style={{ marginTop: 8, borderTop: '1px solid var(--rule)', paddingTop: 8, width: '100%' }}>
                <button onClick={() => toggleComments(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--fg-muted)', padding: 0 }}>
                  {commentOpen.has(item.id) ? '▲ Ocultar notas' : `▼ Notas${comments[item.id]?.length ? ` (${comments[item.id].length})` : ''}`}
                </button>
                {commentOpen.has(item.id) && (
                  <div style={{ marginTop: 10 }}>
                    {(comments[item.id] ?? []).map(c => (
                      <div key={c.id} style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
                        <div style={{ color: 'var(--fg)', whiteSpace: 'pre-wrap' }}>{c.texto}</div>
                        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{fmtDate(c.created_at)}</span>
                          <button onClick={() => deleteComment(item.id, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#E53E3E', padding: 0 }}>Eliminar</button>
                        </div>
                      </div>
                    ))}
                    <textarea
                      value={commentText[item.id] ?? ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Agregar una nota…"
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '8px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--fg)', resize: 'vertical', marginBottom: 6 }}
                    />
                    <button
                      onClick={() => addComment(item.id)}
                      disabled={!commentText[item.id]?.trim()}
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '6px 16px' }}
                    >
                      Agregar nota
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating combine bar */}
      {combineMode && selected.size >= 2 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent, #1F2566)', color: '#fff',
          padding: '14px 24px', borderRadius: 'var(--r-pill)',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(31,37,102,.35)', zIndex: 50,
          fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          <span>{selected.size} seleccionados</span>
          <button
            onClick={openOrderModal}
            style={{
              background: '#fff', color: '#1F2566', border: 'none',
              padding: '8px 18px', borderRadius: 20, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Combinar y ordenar →
          </button>
        </div>
      )}

      {/* Order modal */}
      {orderModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setOrderModal(false) }}
        >
          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--r-lg)',
            padding: 28, width: '100%', maxWidth: 520,
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Ordenar secciones
            </h2>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 20px' }}>
              Arrastrá para reordenar o usá las flechas. El PDF se genera en el orden que ves.
            </p>

            <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
              {orderedReportItems.map((item, i) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  style={{
                    background: dragIdx === i ? 'var(--accent-pale)' : 'var(--surface)',
                    border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'grab', userSelect: 'none',
                    opacity: dragIdx === i ? 0.5 : 1,
                  }}
                >
                  {/* Drag handle */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-muted)', flexShrink: 0 }}>
                    <circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="15" cy="5" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="15" cy="19" r="1.5" fill="currentColor"/>
                  </svg>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.titulo}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {item.periodo}
                      {item.type_id ? ` · ${TYPE_LABELS[item.type_id] ?? item.type_id}` : ''}
                    </div>
                  </div>

                  {/* Arrow controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      onClick={() => moveItem(i, i - 1)}
                      disabled={i === 0}
                      style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 4, padding: '2px 7px', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, fontSize: 11 }}
                    >▲</button>
                    <button
                      onClick={() => moveItem(i, i + 1)}
                      disabled={i === orderedReportItems.length - 1}
                      style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 4, padding: '2px 7px', cursor: i === orderedReportItems.length - 1 ? 'default' : 'pointer', opacity: i === orderedReportItems.length - 1 ? 0.3 : 1, fontSize: 11 }}
                    >▼</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" style={{ padding: '10px 20px' }} onClick={() => setOrderModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '10px 22px', minWidth: 180 }}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Generando…' : 'Generar reporte unificado →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

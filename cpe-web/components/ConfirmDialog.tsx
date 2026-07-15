'use client'

import { useEffect } from 'react'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Modal confirmation gate for irreversible or externally-visible actions (publish, delete, broadcast, ban). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  const accent = tone === 'danger' ? 'var(--cp-negative, #C0392B)' : '#D69E2E'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => !busy && onCancel()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 12, padding: '24px 26px', maxWidth: 420, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>{tone === 'danger' ? '⚠️' : '❗'}</span>
          <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>
            {title}
          </h3>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--rule)',
              background: 'var(--bg)', color: 'var(--fg)', fontSize: 13, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: accent, color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

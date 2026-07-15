'use client'

import { useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function PushPage() {
  const [title, setTitle] = useState('')
  const [body,  setBody]  = useState('')
  const [url,   setUrl]   = useState('/portal')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState<{ sent: number; failed: number; stale: number } | null>(null)
  const [err, setErr] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setConfirmOpen(true)
  }

  async function doSend() {
    setSending(true)
    setResult(null)
    setErr('')
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || '/portal' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar')
      setResult(data)
      setTitle('')
      setBody('')
    } catch (e: unknown) {
      setErr((e as Error).message)
    }
    setSending(false)
    setConfirmOpen(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Notificaciones Push</h1>
      <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '0 0 32px' }}>
        Enviá una notificación a todos los usuarios del portal que activaron las notificaciones.
      </p>

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Título *
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            required
            placeholder="Ej: Nuevo reporte publicado"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Mensaje *
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={200}
            required
            rows={3}
            placeholder="Ej: El reporte de Ingresos Estimados de Mayo ya está disponible en el portal."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
            {body.length}/200 caracteres
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            URL al abrir (opcional)
          </label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/portal"
            style={inputStyle}
          />
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
            Ruta interna que se abre al tocar la notificación.
          </p>
        </div>

        {err && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#B91C1C' }}>
            {err}
          </div>
        )}

        {result && (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803D' }}>
            ✓ Enviado a <strong>{result.sent}</strong> dispositivo{result.sent !== 1 ? 's' : ''}.
            {result.failed > 0 && ` ${result.failed} fallido${result.failed !== 1 ? 's' : ''}.`}
            {result.stale  > 0 && ` ${result.stale} suscripción${result.stale !== 1 ? 'es' : ''} vencida${result.stale !== 1 ? 's' : ''} eliminada${result.stale !== 1 ? 's' : ''}.`}
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !title.trim() || !body.trim()}
          style={{
            padding: '12px 24px',
            background: sending ? 'var(--fg-muted)' : 'var(--accent, #1F2566)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: (!title.trim() || !body.trim()) ? 0.5 : 1,
            transition: 'opacity .15s',
          }}
        >
          {sending ? 'Enviando…' : 'Enviar notificación'}
        </button>
      </form>

      <div style={{ marginTop: 40, padding: '16px 18px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--rule)', fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.6 }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>¿Cómo funciona?</strong>
        Los usuarios del portal que activaron las notificaciones (campana 🔔 en la barra superior)
        recibirán un mensaje en su celular o computadora, incluso con el navegador cerrado.
        Si tocaron "Bloquear" al pedirles permiso, no recibirán la notificación.
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Enviar notificación push"
        message={`Se enviará a todos los dispositivos suscritos: "${title}" — "${body}". No se puede retirar una vez enviada.`}
        confirmLabel="Sí, enviar"
        tone="warning"
        busy={sending}
        onConfirm={doSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid var(--rule)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  background: 'var(--surface)',
  color: 'var(--fg)',
  outline: 'none',
  boxSizing: 'border-box',
}

'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

type State = 'loading' | 'unsupported' | 'blocked' | 'subscribed' | 'unsubscribed'

export default function PushSubscriber() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      setState('unsupported')
      return
    }
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        setState('subscribed')
        return
      }
      const perm = Notification.permission
      if (perm === 'denied') setState('blocked')
      else setState('unsubscribed')
    }).catch(() => setState('unsupported'))
  }, [])

  async function subscribe() {
    setBusy(true)
    try {
      const reg  = await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('blocked'); setBusy(false); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await fetch('/api/portal/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setState('subscribed')
    } catch (e) {
      console.error('[push]', e)
    }
    setBusy(false)
  }

  async function unsubscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/portal/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('unsubscribed')
    } catch (e) {
      console.error('[push]', e)
    }
    setBusy(false)
  }

  // Subscribed: show small indicator + unsubscribe option in a tooltip-style
  if (state === 'subscribed') {
    return (
      <button
        onClick={unsubscribe}
        disabled={busy}
        title="Notificaciones activas — clic para desactivar"
        style={{
          background: 'none', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
          fontSize: 16, opacity: busy ? 0.5 : 0.8, padding: '0 4px',
          lineHeight: 1, color: 'var(--fg-soft)',
        }}
      >
        🔔
      </button>
    )
  }

  if (state === 'unsubscribed') {
    return (
      <button
        onClick={subscribe}
        disabled={busy}
        title="Activar notificaciones push"
        style={{
          background: 'none', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
          fontSize: 16, opacity: busy ? 0.5 : 0.4, padding: '0 4px',
          lineHeight: 1, color: 'var(--fg-soft)',
        }}
      >
        🔔
      </button>
    )
  }

  return null
}

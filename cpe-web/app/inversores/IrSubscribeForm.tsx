'use client'

import { useState } from 'react'
import HoneypotFields from '@/components/HoneypotFields'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'

type State = 'idle' | 'submitting' | 'done' | 'error'

export default function IrSubscribeForm() {
  const [state, setState] = useState<State>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    setErrMsg('')

    const form = e.currentTarget
    const nombre = (form.elements.namedItem('nombre') as HTMLInputElement)?.value ?? ''
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value ?? ''
    const hp = (form.elements.namedItem(HONEYPOT_FIELD) as HTMLInputElement)?.value ?? ''
    const ts = (form.elements.namedItem(TIMESTAMP_FIELD) as HTMLInputElement)?.value ?? ''

    try {
      const res = await fetch('/api/ir-subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre, email, [HONEYPOT_FIELD]: hp, [TIMESTAMP_FIELD]: ts }),
      })
      if (!res.ok) throw new Error('Error')
      setState('done')
    } catch {
      setErrMsg('Error al suscribir. Intenta nuevamente.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ padding: 'var(--s-6)', background: 'rgba(108,174,82,0.12)', border: '1px solid rgba(108,174,82,0.3)', borderRadius: 'var(--r-lg)', textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
        <p style={{ color: '#8BD478', fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>
          <span className="lang-es">Suscripcion confirmada</span>
          <span className="lang-en">Subscription confirmed</span>
        </p>
        <p style={{ color: 'rgba(236,238,251,0.6)', fontSize: 13, margin: 0 }}>
          <span className="lang-es">Recibiras los comunicados de prensa y resultados trimestrales en tu casilla.</span>
          <span className="lang-en">You&apos;ll receive press releases and quarterly results in your inbox.</span>
        </p>
      </div>
    )
  }

  return (
    <form className="ir-subscribe" onSubmit={handleSubmit}>
      <HoneypotFields />
      {errMsg && (
        <div style={{ fontSize: 13, color: '#FF8A80', padding: '8px 12px', background: 'rgba(179,59,46,0.15)', borderRadius: 'var(--r-md)' }}>
          {errMsg}
        </div>
      )}
      <div className="form-row">
        <label style={{ color: 'rgba(236,238,251,0.7)' }}><span className="lang-es">Nombre</span><span className="lang-en">Name</span></label>
        <input type="text" name="nombre" required placeholder="—" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)', color: '#fff' }} />
      </div>
      <div className="form-row">
        <label style={{ color: 'rgba(236,238,251,0.7)' }}>Email</label>
        <input type="email" name="email" required placeholder="you@firm.com" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)', color: '#fff' }} />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={state === 'submitting'}
        style={{ background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', marginTop: 8 }}
      >
        {state === 'submitting' ? (
          <><span className="lang-es">Enviando…</span><span className="lang-en">Sending…</span></>
        ) : (
          <><span className="lang-es">Suscribirme</span><span className="lang-en">Subscribe</span></>
        )}
      </button>
    </form>
  )
}

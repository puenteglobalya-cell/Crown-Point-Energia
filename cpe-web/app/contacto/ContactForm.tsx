'use client'

import Link from 'next/link'
import { useState } from 'react'

type FormState = 'idle' | 'submitting' | 'done' | 'error'

export default function ContactForm() {
  const [state, setState] = useState<FormState>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    setErrMsg('')

    const form = e.currentTarget
    const data = {
      tipo: (form.elements.namedItem('tipo') as HTMLSelectElement)?.value ?? '',
      nombre: (form.elements.namedItem('nombre') as HTMLInputElement)?.value ?? '',
      organizacion: (form.elements.namedItem('organizacion') as HTMLInputElement)?.value ?? '',
      email: (form.elements.namedItem('email') as HTMLInputElement)?.value ?? '',
      telefono: (form.elements.namedItem('telefono') as HTMLInputElement)?.value ?? '',
      mensaje: (form.elements.namedItem('mensaje') as HTMLTextAreaElement)?.value ?? '',
    }

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error al enviar')
      setState('done')
    } catch (err) {
      setErrMsg((err as Error).message)
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ background: 'color-mix(in oklab, var(--cp-green) 14%, var(--surface))', border: '1px solid var(--cp-green)', padding: 'var(--s-8)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', display: 'grid', placeItems: 'center', marginBottom: 'var(--s-4)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 24 }}>
          <span className="lang-es">Gracias!</span><span className="lang-en">Thank you!</span>
        </h3>
        <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6 }}>
          <span className="lang-es">Recibimos tu consulta. Nuestro equipo te respondera en un plazo maximo de 2 dias habiles.</span>
          <span className="lang-en">We&apos;ve received your enquiry. Our team will reply within 2 business days.</span>
        </p>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {errMsg && (
        <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 12 }}>
          {errMsg}
        </div>
      )}
      <div className="form-row">
        <label><span className="lang-es">Tipo de consulta</span><span className="lang-en">Enquiry type</span></label>
        <select name="tipo" required>
          <option value=""></option>
          <option>Investor Relations</option>
          <option>Operations &amp; partnerships</option>
          <option>Procurement &amp; suppliers</option>
          <option>Press &amp; media</option>
          <option>Corporate / general</option>
        </select>
      </div>
      <div className="form-row cols-2">
        <div className="form-row">
          <label><span className="lang-es">Nombre completo</span><span className="lang-en">Full name</span></label>
          <input type="text" name="nombre" required />
        </div>
        <div className="form-row">
          <label><span className="lang-es">Organizacion</span><span className="lang-en">Organization</span></label>
          <input type="text" name="organizacion" required />
        </div>
      </div>
      <div className="form-row cols-2">
        <div className="form-row">
          <label>Email</label>
          <input type="email" name="email" required placeholder="you@firm.com" />
        </div>
        <div className="form-row">
          <label><span className="lang-es">Telefono</span><span className="lang-en">Phone</span></label>
          <input type="tel" name="telefono" placeholder="+54 ..." />
        </div>
      </div>
      <div className="form-row">
        <label><span className="lang-es">Mensaje</span><span className="lang-en">Message</span></label>
        <textarea name="mensaje" required placeholder="…"></textarea>
      </div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 13, color: 'var(--fg-soft)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', lineHeight: 1.5 }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          <span className="lang-es">Acepto recibir comunicaciones de Crown Point Energy y la <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Politica de privacidad</Link>.</span>
          <span className="lang-en">I agree to receive communications from Crown Point Energy and the <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Privacy policy</Link>.</span>
        </span>
      </label>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={state === 'submitting'}
        style={{ justifySelf: 'start', padding: '16px 28px' }}
      >
        {state === 'submitting' ? (
          <><span className="lang-es">Enviando…</span><span className="lang-en">Sending…</span></>
        ) : (
          <><span className="lang-es">Enviar consulta</span><span className="lang-en">Send enquiry</span></>
        )}
      </button>
    </form>
  )
}

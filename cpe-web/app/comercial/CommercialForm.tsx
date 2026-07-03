'use client'

import Link from 'next/link'
import { useState } from 'react'
import HoneypotFields from '@/components/HoneypotFields'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'

type FormState = 'idle' | 'submitting' | 'done' | 'error'

export default function CommercialForm() {
  const [state, setState] = useState<FormState>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    setErrMsg('')

    const form = e.currentTarget
    const data = {
      tipo: 'Comercialización hidrocarburos',
      nombre: (form.elements.namedItem('nombre') as HTMLInputElement)?.value ?? '',
      organizacion: (form.elements.namedItem('organizacion') as HTMLInputElement)?.value ?? '',
      email: (form.elements.namedItem('email') as HTMLInputElement)?.value ?? '',
      telefono: (form.elements.namedItem('telefono') as HTMLInputElement)?.value ?? '',
      mensaje: [
        `Producto: ${(form.elements.namedItem('producto') as HTMLSelectElement)?.value ?? ''}`,
        `Volumen estimado: ${(form.elements.namedItem('volumen') as HTMLInputElement)?.value ?? ''}`,
        '',
        (form.elements.namedItem('mensaje') as HTMLTextAreaElement)?.value ?? '',
      ].join('\n').trim(),
      [HONEYPOT_FIELD]: (form.elements.namedItem(HONEYPOT_FIELD) as HTMLInputElement)?.value ?? '',
      [TIMESTAMP_FIELD]: (form.elements.namedItem(TIMESTAMP_FIELD) as HTMLInputElement)?.value ?? '',
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
          <span className="lang-es">Consulta recibida.</span>
          <span className="lang-en">Enquiry received.</span>
        </h3>
        <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6 }}>
          <span className="lang-es">Nuestro equipo comercial te responderá en un plazo máximo de 2 días hábiles.</span>
          <span className="lang-en">Our commercial team will reply within 2 business days.</span>
        </p>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <HoneypotFields />
      {errMsg && (
        <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 12 }}>
          {errMsg}
        </div>
      )}

      <div className="form-row cols-2">
        <div className="form-row">
          <label><span className="lang-es">Nombre completo</span><span className="lang-en">Full name</span></label>
          <input type="text" name="nombre" required />
        </div>
        <div className="form-row">
          <label><span className="lang-es">Empresa / Organización</span><span className="lang-en">Company / Organization</span></label>
          <input type="text" name="organizacion" required />
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="form-row">
          <label>Email</label>
          <input type="email" name="email" required placeholder="you@firm.com" />
        </div>
        <div className="form-row">
          <label><span className="lang-es">Teléfono</span><span className="lang-en">Phone</span></label>
          <input type="tel" name="telefono" placeholder="+54 ..." />
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="form-row">
          <label><span className="lang-es">Producto de interés</span><span className="lang-en">Product of interest</span></label>
          <select name="producto" required>
            <option value=""></option>
            <option value="Petróleo crudo (Medanito)"><span className="lang-es">Petróleo crudo (Medanito)</span><span className="lang-en">Crude oil (Medanito)</span></option>
            <option value="Gas natural"><span className="lang-es">Gas natural</span><span className="lang-en">Natural gas</span></option>
            <option value="Gas + petróleo"><span className="lang-es">Gas + petróleo</span><span className="lang-en">Gas + crude</span></option>
          </select>
        </div>
        <div className="form-row">
          <label><span className="lang-es">Volumen estimado</span><span className="lang-en">Estimated volume</span></label>
          <input type="text" name="volumen" placeholder="ej. 500 bbl/d / 1 MMcf/d" />
        </div>
      </div>

      <div className="form-row">
        <label><span className="lang-es">Detalles adicionales</span><span className="lang-en">Additional details</span></label>
        <textarea name="mensaje" placeholder="…" style={{ minHeight: 100 }}></textarea>
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 13, color: 'var(--fg-soft)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', lineHeight: 1.5 }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          <span className="lang-es">Acepto la <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Política de privacidad</Link> de Crown Point Energy.</span>
          <span className="lang-en">I accept Crown Point Energy&apos;s <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Privacy policy</Link>.</span>
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
          <><span className="lang-es">Enviar consulta comercial</span><span className="lang-en">Send commercial enquiry</span></>
        )}
      </button>
    </form>
  )
}

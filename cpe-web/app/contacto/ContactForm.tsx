'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div style={{ background: 'color-mix(in oklab, var(--cp-green) 14%, var(--surface))', border: '1px solid var(--cp-green)', padding: 'var(--s-8)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', display: 'grid', placeItems: 'center', marginBottom: 'var(--s-4)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 24 }}>
          <span className="lang-es">¡Gracias!</span><span className="lang-en">Thank you!</span>
        </h3>
        <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6 }}>
          <span className="lang-es">Recibimos tu consulta. Nuestro equipo te responderá en un plazo máximo de 2 días hábiles.</span>
          <span className="lang-en">We&apos;ve received your enquiry. Our team will reply within 2 business days.</span>
        </p>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
      <div className="form-row">
        <label><span className="lang-es">Tipo de consulta</span><span className="lang-en">Enquiry type</span></label>
        <select required>
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
          <input type="text" required />
        </div>
        <div className="form-row">
          <label><span className="lang-es">Organización</span><span className="lang-en">Organization</span></label>
          <input type="text" required />
        </div>
      </div>
      <div className="form-row cols-2">
        <div className="form-row">
          <label>Email</label>
          <input type="email" required placeholder="you@firm.com" />
        </div>
        <div className="form-row">
          <label><span className="lang-es">Teléfono</span><span className="lang-en">Phone</span></label>
          <input type="tel" placeholder="+54 ..." />
        </div>
      </div>
      <div className="form-row">
        <label><span className="lang-es">Mensaje</span><span className="lang-en">Message</span></label>
        <textarea required placeholder="…"></textarea>
      </div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 13, color: 'var(--fg-soft)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', lineHeight: 1.5 }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          <span className="lang-es">Acepto recibir comunicaciones de Crown Point Energy y la <a href="#" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Política de privacidad</a>.</span>
          <span className="lang-en">I agree to receive communications from Crown Point Energy and the <a href="#" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Privacy policy</a>.</span>
        </span>
      </label>
      <button type="submit" className="btn btn-primary" style={{ justifySelf: 'start', padding: '16px 28px' }}>
        <span className="lang-es">Enviar consulta</span>
        <span className="lang-en">Send enquiry</span>
      </button>
    </form>
  )
}

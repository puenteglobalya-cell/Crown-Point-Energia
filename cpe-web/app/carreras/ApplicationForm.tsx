'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ApplicationForm() {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div style={{ background: 'color-mix(in oklab, var(--cp-green) 14%, var(--surface))', border: '1px solid var(--cp-green)', padding: 'var(--s-8)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', display: 'grid', placeItems: 'center', marginBottom: 'var(--s-4)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 24 }}>
          <span className="lang-es">¡Postulación recibida!</span>
          <span className="lang-en">Application received!</span>
        </h3>
        <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6 }}>
          <span className="lang-es">Nuestro equipo de RRHH revisará tu perfil. Si hay una oportunidad que se ajuste, te contactaremos en un plazo máximo de 3 semanas.</span>
          <span className="lang-en">Our HR team will review your profile. If there&apos;s a matching opportunity, we&apos;ll reach out within 3 weeks.</span>
        </p>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={e => { e.preventDefault(); setSubmitted(true) }}>
      <div className="form-row cols-2">
        <div className="form-row">
          <label><span className="lang-es">Nombre completo</span><span className="lang-en">Full name</span></label>
          <input type="text" required />
        </div>
        <div className="form-row">
          <label>Email</label>
          <input type="email" required placeholder="you@domain.com" />
        </div>
      </div>
      <div className="form-row cols-2">
        <div className="form-row">
          <label><span className="lang-es">Teléfono</span><span className="lang-en">Phone</span></label>
          <input type="tel" placeholder="+54 …" />
        </div>
        <div className="form-row">
          <label>LinkedIn</label>
          <input type="url" placeholder="linkedin.com/in/…" />
        </div>
      </div>
      <div className="form-row">
        <label><span className="lang-es">Área de interés</span><span className="lang-en">Area of interest</span></label>
        <select required>
          <option value=""></option>
          <option value="drilling">Perforación &amp; completación / Drilling &amp; completion</option>
          <option value="prodops">Producción &amp; operaciones / Production &amp; operations</option>
          <option value="geo">Geología &amp; geofísica / Geology &amp; geophysics</option>
          <option value="finance">Finance &amp; IR</option>
          <option value="hse">HSE &amp; ESG</option>
          <option value="it">Tecnología &amp; sistemas / Technology &amp; IT</option>
          <option value="other">Otro / Other</option>
        </select>
      </div>
      <div className="form-row">
        <label><span className="lang-es">Mensaje / motivación</span><span className="lang-en">Message / motivation</span></label>
        <textarea required placeholder="…" style={{ minHeight: 120 }}></textarea>
      </div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 13, color: 'var(--fg-soft)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', lineHeight: 1.5 }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          <span className="lang-es">Acepto el tratamiento de mis datos personales según la <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Política de privacidad</Link>.</span>
          <span className="lang-en">I agree to the processing of my personal data per the <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Privacy policy</Link>.</span>
        </span>
      </label>
      <button type="submit" className="btn btn-primary" style={{ justifySelf: 'start', padding: '16px 28px' }}>
        <span className="lang-es">Enviar postulación</span>
        <span className="lang-en">Submit application</span>
      </button>
    </form>
  )
}

'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

type FormState = 'idle' | 'submitting' | 'done' | 'error'

export default function ApplicationForm() {
  const [state, setState] = useState<FormState>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [cvName, setCvName] = useState('')
  const cvRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    setErrMsg('')

    const form = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/carreras', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al enviar')
      }
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
          <span className="lang-es">Postulacion recibida!</span>
          <span className="lang-en">Application received!</span>
        </h3>
        <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6 }}>
          <span className="lang-es">Nuestro equipo de RRHH revisara tu perfil. Si hay una oportunidad que se ajuste, te contactaremos en un plazo maximo de 3 semanas.</span>
          <span className="lang-en">Our HR team will review your profile. If there&apos;s a matching opportunity, we&apos;ll reach out within 3 weeks.</span>
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
      <div className="form-row cols-2">
        <div className="form-row">
          <label><span className="lang-es">Nombre completo</span><span className="lang-en">Full name</span></label>
          <input type="text" name="nombre" required />
        </div>
        <div className="form-row">
          <label>Email</label>
          <input type="email" name="email" required placeholder="you@domain.com" />
        </div>
      </div>
      <div className="form-row cols-2">
        <div className="form-row">
          <label><span className="lang-es">Telefono</span><span className="lang-en">Phone</span></label>
          <input type="tel" name="telefono" placeholder="+54 …" />
        </div>
        <div className="form-row">
          <label>LinkedIn</label>
          <input type="url" name="linkedin" placeholder="linkedin.com/in/…" />
        </div>
      </div>
      <div className="form-row">
        <label><span className="lang-es">Area de interes</span><span className="lang-en">Area of interest</span></label>
        <select name="area" required>
          <option value=""></option>
          <option value="drilling">Perforacion &amp; completacion / Drilling &amp; completion</option>
          <option value="prodops">Produccion &amp; operaciones / Production &amp; operations</option>
          <option value="geo">Geologia &amp; geofisica / Geology &amp; geophysics</option>
          <option value="finance">Finance &amp; IR</option>
          <option value="hse">HSE &amp; ESG</option>
          <option value="it">Tecnologia &amp; sistemas / Technology &amp; IT</option>
          <option value="other">Otro / Other</option>
        </select>
      </div>
      <div className="form-row">
        <label>
          <span className="lang-es">CV / Resume</span>
          <span className="lang-en">CV / Resume</span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 6 }}>PDF, DOC, DOCX (max 10 MB)</span>
        </label>
        <div
          style={{
            border: '2px dashed var(--rule)', borderRadius: 'var(--r-md)', padding: '20px 16px',
            textAlign: 'center', cursor: 'pointer', background: 'var(--bg-alt)',
            transition: 'border-color var(--t-fast)',
          }}
          onClick={() => cvRef.current?.click()}
          onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
          onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '' }}
          onDrop={e => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).style.borderColor = ''
            const f = e.dataTransfer.files[0]
            if (f && cvRef.current) {
              const dt = new DataTransfer()
              dt.items.add(f)
              cvRef.current.files = dt.files
              setCvName(f.name)
            }
          }}
        >
          <input
            ref={cvRef}
            type="file"
            name="cv"
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => setCvName(e.target.files?.[0]?.name ?? '')}
          />
          {cvName ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="var(--accent)" strokeWidth="1.6"/>
                <polyline points="14 2 14 8 20 8" stroke="var(--accent)" strokeWidth="1.6"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{cvName}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setCvName(''); if (cvRef.current) cvRef.current.value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--fg-muted)', fontSize: 16 }}
              >
                &times;
              </button>
            </div>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 8px', color: 'var(--fg-muted)' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                <span className="lang-es">Arrastra tu CV o hace clic para seleccionar</span>
                <span className="lang-en">Drag your CV or click to select</span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="form-row">
        <label><span className="lang-es">Mensaje / motivacion</span><span className="lang-en">Message / motivation</span></label>
        <textarea name="mensaje" required placeholder="…" style={{ minHeight: 120 }}></textarea>
      </div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 13, color: 'var(--fg-soft)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', lineHeight: 1.5 }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          <span className="lang-es">Acepto el tratamiento de mis datos personales segun la <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Politica de privacidad</Link>.</span>
          <span className="lang-en">I agree to the processing of my personal data per the <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Privacy policy</Link>.</span>
        </span>
      </label>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={state === 'submitting'}
        style={{ justifySelf: 'start', padding: '16px 28px' }}
      >
        {state === 'submitting' ? (
          <><span className="lang-es">Enviando…</span><span className="lang-en">Submitting…</span></>
        ) : (
          <><span className="lang-es">Enviar postulacion</span><span className="lang-en">Submit application</span></>
        )}
      </button>
    </form>
  )
}

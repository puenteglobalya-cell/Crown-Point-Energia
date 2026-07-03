'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'

// ── Types ─────────────────────────────────────────────────────────────────

type FormState = 'idle' | 'submitting' | 'done' | 'error'
type Step = 1 | 2 | 3

interface StepData {
  // Step 1 — Datos personales
  nombre: string
  email: string
  telefono: string
  linkedin: string
  area: string
  // Step 2 — Perfil profesional
  nivel_estudios: string
  carrera: string
  anios_experiencia: string
  anios_sector: string
  disponibilidad: string
  relocacion: string
  ingles_nivel: string
  otros_idiomas: string
  pretension: string
  // Step 3 — CV + mensaje
  mensaje: string
}

const EMPTY: StepData = {
  nombre: '', email: '', telefono: '', linkedin: '', area: '',
  nivel_estudios: '', carrera: '', anios_experiencia: '', anios_sector: '',
  disponibilidad: '', relocacion: '', ingles_nivel: '', otros_idiomas: '', pretension: '',
  mensaje: '',
}

// ── Progress bar ──────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Datos personales' },
    { n: 2, label: 'Perfil profesional' },
    { n: 3, label: 'CV y mensaje' },
  ]
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 32, position: 'relative' }}>
      {steps.map((s, i) => {
        const done = step > s.n
        const active = step === s.n
        return (
          <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: i === 0 ? 'flex-start' : i === 2 ? 'flex-end' : 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{
                position: 'absolute', left: '-50%', right: '50%', top: 14, height: 2,
                background: done || active ? 'var(--accent)' : 'var(--rule)',
                zIndex: 0,
              }} />
            )}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', border: '2px solid',
              borderColor: done || active ? 'var(--accent)' : 'var(--rule)',
              background: done ? 'var(--accent)' : active ? 'var(--surface)' : 'var(--bg-alt)',
              display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
              color: done ? '#fff' : active ? 'var(--accent)' : 'var(--fg-muted)',
              position: 'relative', zIndex: 1,
            }}>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : s.n}
            </div>
            <div style={{ fontSize: 11, color: active ? 'var(--fg)' : 'var(--fg-muted)', marginTop: 6, fontWeight: active ? 600 : 400, textAlign: 'center' }}>
              {s.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Select helper ─────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label>
        {label}
        {hint && <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function ApplicationForm() {
  const [step, setStep] = useState<Step>(1)
  const [data, setData] = useState<StepData>(EMPTY)
  const [state, setState] = useState<FormState>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [cvName, setCvName] = useState('')
  const cvRef = useRef<HTMLInputElement>(null)
  const [hp, setHp] = useState('')            // honeypot — must stay empty
  const formTs = useRef(Date.now())           // form render time for timing check

  function set(field: keyof StepData, val: string) {
    setData(prev => ({ ...prev, [field]: val }))
  }

  // ── Step validation ───────

  function step1Valid() {
    return data.nombre.trim() && data.email.trim() && data.area
  }

  function step2Valid() {
    return data.nivel_estudios && data.anios_experiencia && data.disponibilidad
  }

  // ── Submit ────────────────

  async function submit() {
    setState('submitting')
    setErrMsg('')

    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => form.append(k, v))
    form.append(HONEYPOT_FIELD, hp)
    form.append(TIMESTAMP_FIELD, String(formTs.current))
    const cvFile = cvRef.current?.files?.[0]
    if (cvFile) form.append('cv', cvFile)

    try {
      const res = await fetch('/api/carreras', { method: 'POST', body: form })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al enviar')
      }
      setState('done')
    } catch (err) {
      setErrMsg((err as Error).message)
      setState('error')
    }
  }

  // ── Done screen ───────────

  if (state === 'done') {
    return (
      <div style={{ background: 'color-mix(in oklab, var(--cp-green) 10%, var(--surface))', border: '1px solid var(--cp-green)', padding: 'var(--s-8)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', display: 'grid', placeItems: 'center', marginBottom: 'var(--s-4)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 22 }}>
          <span className="lang-es">¡Postulación recibida!</span>
          <span className="lang-en">Application received!</span>
        </h3>
        <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6, margin: '0 0 6px' }}>
          <span className="lang-es">Nuestro equipo de RRHH revisará tu perfil. Si hay una oportunidad que se ajuste, te contactaremos en un plazo máximo de 3 semanas.</span>
          <span className="lang-en">Our HR team will review your profile. If there's a matching opportunity, we'll reach out within 3 weeks.</span>
        </p>
        <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
          <span className="lang-es">Confirmación enviada a </span>
          <span className="lang-en">Confirmation sent to </span>
          <strong>{data.email}</strong>
        </p>
      </div>
    )
  }

  return (
    <div>
      <StepBar step={step} />

      {/* Honeypot — hidden from humans; bots that fill it are rejected */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={e => setHp(e.target.value)}
        />
      </div>

      {errMsg && (
        <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
          {errMsg}
        </div>
      )}

      {/* ── STEP 1 — Datos personales ───────────────────────────────── */}
      {step === 1 && (
        <div className="contact-form" style={{ display: 'contents' }}>
          <div className="form-row cols-2">
            <Field label="Nombre completo">
              <input type="text" value={data.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="Juan Pérez" />
            </Field>
            <Field label="Email">
              <input type="email" value={data.email} onChange={e => set('email', e.target.value)} required placeholder="you@domain.com" />
            </Field>
          </div>
          <div className="form-row cols-2">
            <Field label="Teléfono" hint="opcional">
              <input type="tel" value={data.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+54 …" />
            </Field>
            <Field label="LinkedIn" hint="opcional">
              <input type="url" value={data.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/…" />
            </Field>
          </div>
          <Field label="Área de interés">
            <select value={data.area} onChange={e => set('area', e.target.value)} required>
              <option value=""></option>
              <option value="drilling">Perforación &amp; completación</option>
              <option value="prodops">Producción &amp; operaciones</option>
              <option value="geo">Geología &amp; geofísica</option>
              <option value="ingenieria">Ingeniería de yacimientos</option>
              <option value="hse">HSE &amp; ESG</option>
              <option value="finance">Finance &amp; IR</option>
              <option value="legal">Legal &amp; compliance</option>
              <option value="it">Tecnología &amp; sistemas</option>
              <option value="admin">Administración &amp; RRHH</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!step1Valid()}
              onClick={() => setStep(2)}
              style={{ padding: '14px 28px' }}
            >
              <span className="lang-es">Continuar</span>
              <span className="lang-en">Continue</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6 }}><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 — Perfil profesional ─────────────────────────────── */}
      {step === 2 && (
        <div className="contact-form" style={{ display: 'contents' }}>
          <div className="form-row cols-2">
            <Field label="Nivel de estudios">
              <select value={data.nivel_estudios} onChange={e => set('nivel_estudios', e.target.value)} required>
                <option value=""></option>
                <option value="Secundario completo">Secundario completo</option>
                <option value="Terciario / técnico">Terciario / técnico</option>
                <option value="Universitario en curso">Universitario en curso</option>
                <option value="Universitario completo">Universitario completo</option>
                <option value="Posgrado / maestría">Posgrado / maestría</option>
                <option value="Doctorado">Doctorado</option>
              </select>
            </Field>
            <Field label="Carrera / especialización" hint="opcional">
              <input type="text" value={data.carrera} onChange={e => set('carrera', e.target.value)} placeholder="Ing. Petróleo, Geología, CPN…" />
            </Field>
          </div>

          <div className="form-row cols-2">
            <Field label="Años de experiencia total">
              <select value={data.anios_experiencia} onChange={e => set('anios_experiencia', e.target.value)} required>
                <option value=""></option>
                <option value="Sin experiencia laboral">Sin experiencia laboral</option>
                <option value="Menos de 2 años">Menos de 2 años</option>
                <option value="2 – 5 años">2 – 5 años</option>
                <option value="6 – 10 años">6 – 10 años</option>
                <option value="11 – 20 años">11 – 20 años</option>
                <option value="Más de 20 años">Más de 20 años</option>
              </select>
            </Field>
            <Field label="Años en sector energético / O&G">
              <select value={data.anios_sector} onChange={e => set('anios_sector', e.target.value)}>
                <option value=""></option>
                <option value="Sin experiencia en el sector">Sin experiencia en el sector</option>
                <option value="Menos de 2 años">Menos de 2 años</option>
                <option value="2 – 5 años">2 – 5 años</option>
                <option value="6 – 10 años">6 – 10 años</option>
                <option value="Más de 10 años">Más de 10 años</option>
              </select>
            </Field>
          </div>

          <div className="form-row cols-2">
            <Field label="Disponibilidad para iniciar">
              <select value={data.disponibilidad} onChange={e => set('disponibilidad', e.target.value)} required>
                <option value=""></option>
                <option value="Inmediata">Inmediata</option>
                <option value="1 mes">1 mes</option>
                <option value="2 – 3 meses">2 – 3 meses</option>
                <option value="Más de 3 meses">Más de 3 meses</option>
              </select>
            </Field>
            <Field label="Disponibilidad para relocarse">
              <select value={data.relocacion} onChange={e => set('relocacion', e.target.value)}>
                <option value=""></option>
                <option value="Sí, sin restricciones">Sí, sin restricciones</option>
                <option value="Sí, con restricciones">Sí, con restricciones</option>
                <option value="No">No</option>
              </select>
            </Field>
          </div>

          <div className="form-row cols-2">
            <Field label="Nivel de inglés">
              <select value={data.ingles_nivel} onChange={e => set('ingles_nivel', e.target.value)}>
                <option value=""></option>
                <option value="Básico / A1-A2">Básico / A1-A2</option>
                <option value="Intermedio / B1-B2">Intermedio / B1-B2</option>
                <option value="Avanzado / C1">Avanzado / C1</option>
                <option value="Nativo / bilingüe">Nativo / bilingüe</option>
              </select>
            </Field>
            <Field label="Otros idiomas" hint="opcional">
              <input type="text" value={data.otros_idiomas} onChange={e => set('otros_idiomas', e.target.value)} placeholder="Portugués (intermedio), Francés (básico)…" />
            </Field>
          </div>

          <Field label="Pretensión salarial bruta" hint="opcional — en AR$ o USD, período mensual">
            <input type="text" value={data.pretension} onChange={e => set('pretension', e.target.value)} placeholder="Ej: USD 2.000 – 2.500 / mes, a convenir…" />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button type="button" className="btn" onClick={() => setStep(1)} style={{ padding: '14px 22px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Volver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!step2Valid()}
              onClick={() => setStep(3)}
              style={{ padding: '14px 28px' }}
            >
              Continuar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6 }}><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 — CV y mensaje ────────────────────────────────────── */}
      {step === 3 && (
        <div className="contact-form" style={{ display: 'contents' }}>
          <Field label="CV / Resume" hint="PDF, DOC, DOCX · máx. 5 MB (opcional)">
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
                  if (f.size > 5 * 1024 * 1024) {
                    alert('El archivo supera el límite de 5 MB. Elegí un archivo más pequeño.')
                    return
                  }
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
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f && f.size > 5 * 1024 * 1024) {
                    e.target.value = ''
                    setCvName('')
                    alert('El archivo supera el límite de 5 MB. Elegí un archivo más pequeño.')
                    return
                  }
                  setCvName(f?.name ?? '')
                }}
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--fg-muted)', fontSize: 18, lineHeight: 1 }}
                  >&times;</button>
                </div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 8px', color: 'var(--fg-muted)' }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    <span className="lang-es">Arrastrá tu CV o hacé clic para seleccionar</span>
                    <span className="lang-en">Drag your CV or click to select</span>
                  </span>
                </>
              )}
            </div>
          </Field>

          <Field label="Mensaje / motivación" hint="opcional">
            <textarea
              value={data.mensaje}
              onChange={e => set('mensaje', e.target.value)}
              placeholder="Contanos brevemente por qué te interesa sumar a Crown Point…"
              style={{ minHeight: 100 }}
            />
          </Field>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--fg-soft)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', lineHeight: 1.5 }}>
            <input type="checkbox" required style={{ marginTop: 3 }} />
            <span>
              <span className="lang-es">Acepto el tratamiento de mis datos personales según la <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Política de privacidad</Link>.</span>
              <span className="lang-en">I agree to the processing of my personal data per the <Link href="/legal/privacidad" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Privacy policy</Link>.</span>
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button type="button" className="btn" onClick={() => setStep(2)} style={{ padding: '14px 22px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Volver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={state === 'submitting'}
              onClick={submit}
              style={{ padding: '16px 32px' }}
            >
              {state === 'submitting' ? (
                <><span className="lang-es">Enviando…</span><span className="lang-en">Submitting…</span></>
              ) : (
                <><span className="lang-es">Enviar postulación</span><span className="lang-en">Submit application</span></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step summary (editable chips when on step 3) */}
      {step === 3 && (
        <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.8 }}>
          <span style={{ fontWeight: 600, color: 'var(--fg-soft)', display: 'block', marginBottom: 4 }}>Resumen de tu perfil</span>
          {[
            { k: 'Área', v: data.area },
            { k: 'Estudios', v: data.nivel_estudios },
            { k: 'Carrera', v: data.carrera },
            { k: 'Experiencia total', v: data.anios_experiencia },
            { k: 'En sector O&G', v: data.anios_sector },
            { k: 'Disponibilidad', v: data.disponibilidad },
            { k: 'Relocación', v: data.relocacion },
            { k: 'Inglés', v: data.ingles_nivel },
          ].filter(r => r.v).map(r => (
            <span key={r.k} style={{ display: 'inline-flex', gap: 4, marginRight: 10 }}>
              <span style={{ color: 'var(--fg-muted)' }}>{r.k}:</span>
              <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{r.v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

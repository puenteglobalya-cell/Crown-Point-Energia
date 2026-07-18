'use client'

import { useRef, useState } from 'react'
import HoneypotFields from '@/components/HoneypotFields'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'

type FormState = 'idle' | 'submitting' | 'done' | 'error'

const CATEGORIAS = [
  { value: 'anticorrupcion', label: 'Anticorrupción / soborno' },
  { value: 'informacion_privilegiada', label: 'Uso de información privilegiada' },
  { value: 'conflicto_interes', label: 'Conflicto de interés' },
  { value: 'acoso_discriminacion', label: 'Acoso o discriminación' },
  { value: 'fraude_financiero', label: 'Fraude o irregularidad financiera' },
  { value: 'seguridad_ambiente', label: 'Seguridad, salud o medio ambiente' },
  { value: 'otro', label: 'Otro' },
]

export default function DenunciaForm() {
  const [state, setState] = useState<FormState>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [anonimo, setAnonimo] = useState(true)
  const [hp, setHp] = useState('')
  const formTs = useRef(Date.now())
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    setErrMsg('')

    const form = e.currentTarget
    const fd = new FormData()
    fd.append('categoria', (form.elements.namedItem('categoria') as HTMLSelectElement).value)
    fd.append('descripcion', (form.elements.namedItem('descripcion') as HTMLTextAreaElement).value)
    fd.append('fecha_incidente', (form.elements.namedItem('fecha_incidente') as HTMLInputElement)?.value ?? '')
    fd.append('anonimo', String(anonimo))
    if (!anonimo) {
      fd.append('nombre', (form.elements.namedItem('nombre') as HTMLInputElement)?.value ?? '')
      fd.append('email', (form.elements.namedItem('email') as HTMLInputElement)?.value ?? '')
      fd.append('telefono', (form.elements.namedItem('telefono') as HTMLInputElement)?.value ?? '')
    }
    const file = fileRef.current?.files?.[0]
    if (file) fd.append('evidencia', file)
    fd.append(HONEYPOT_FIELD, hp)
    fd.append(TIMESTAMP_FIELD, String(formTs.current))

    try {
      const res = await fetch('/api/denuncias', { method: 'POST', body: fd })
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

  if (state === 'done') {
    return (
      <div style={{ background: 'color-mix(in oklab, var(--cp-green) 14%, var(--surface))', border: '1px solid var(--cp-green)', padding: 'var(--s-8)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--cp-green)', color: 'var(--cp-navy-darker)', display: 'grid', placeItems: 'center', marginBottom: 'var(--s-4)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 22 }}>Denuncia recibida</h3>
        <p style={{ color: 'var(--fg-soft)', lineHeight: 1.6, margin: 0 }}>
          Gracias por reportarlo. Nuestro equipo de cumplimiento la va a revisar con confidencialidad.
          {anonimo ? ' Como enviaste la denuncia de forma anónima, no vamos a poder contactarte para pedir más información.' : ' Te vamos a contactar si necesitamos más información.'}
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

      <div className="form-row">
        <label>Categoría *</label>
        <select name="categoria" required defaultValue="">
          <option value="" disabled>Seleccioná una categoría</option>
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="form-row">
        <label>¿Qué pasó? *</label>
        <textarea name="descripcion" required minLength={20} rows={6} placeholder="Describí la situación con la mayor precisión posible: qué, quién, cuándo, dónde." />
      </div>

      <div className="form-row">
        <label>Fecha aproximada del hecho (opcional)</label>
        <input type="date" name="fecha_incidente" max={new Date().toISOString().slice(0, 10)} />
      </div>

      <div className="form-row">
        <label>Evidencia adjunta (opcional — PDF, imagen o Word, máx. 20 MB)</label>
        <input
          type="file" ref={fileRef} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
        />
        {fileName && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{fileName}</span>}
      </div>

      <div className="form-row" style={{ background: 'var(--bg-alt)', padding: 16, borderRadius: 'var(--r-md)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
          <input type="checkbox" checked={anonimo} onChange={e => setAnonimo(e.target.checked)} />
          Quiero enviar esta denuncia de forma anónima
        </label>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '8px 0 0' }}>
          Si dejás esto marcado, no vamos a pedirte ni guardar ningún dato de contacto tuyo — ni siquiera lo vemos nosotros.
        </p>
      </div>

      {!anonimo && (
        <>
          <div className="form-row">
            <label>Nombre</label>
            <input type="text" name="nombre" />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input type="email" name="email" />
          </div>
          <div className="form-row">
            <label>Teléfono (opcional)</label>
            <input type="tel" name="telefono" />
          </div>
        </>
      )}

      <button type="submit" className="btn btn-primary" disabled={state === 'submitting'} style={{ marginTop: 8 }}>
        {state === 'submitting' ? 'Enviando…' : 'Enviar denuncia'}
      </button>
    </form>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Credential = {
  id: string
  device_name: string | null
  created_at: string
  last_used_at: string | null
}

export default function PasskeyManager() {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading]         = useState(true)
  const [registering, setRegistering] = useState(false)
  const [err, setErr]                 = useState('')
  const [ok, setOk]                   = useState('')
  const [supported, setSupported]     = useState(true)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!window.PublicKeyCredential)
    load()
  }, [])

  async function load() {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('webauthn_credentials')
      .select('id, device_name, created_at, last_used_at')
      .order('created_at', { ascending: false })
    setCredentials(data ?? [])
    setLoading(false)
  }

  async function handleRegister() {
    setRegistering(true)
    setErr('')
    setOk('')
    try {
      const optionsRes = await fetch('/api/auth/webauthn/register-options', { method: 'POST' })
      if (!optionsRes.ok) throw new Error()
      const options = await optionsRes.json()

      const response = await startRegistration({ optionsJSON: options })

      const deviceName = window.prompt('Nombre para esta llave (ej: "Mi celular")', 'Mi dispositivo') || 'Dispositivo'

      const verifyRes = await fetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, deviceName }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error)

      setOk('Llave de acceso agregada correctamente.')
      await load()
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : 'No se pudo registrar la llave de acceso. Verificá que tu dispositivo soporte huella/Face ID.')
    } finally {
      setRegistering(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta llave de acceso?')) return
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from('webauthn_credentials').delete().eq('id', id)
    if (!error) setCredentials(prev => prev.filter(c => c.id !== id))
  }

  if (!supported) return null

  return (
    <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--rule)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
        </svg>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
          Llave de acceso (huella / Face ID)
        </h2>
      </div>
      <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 20 }}>
        Registrá tu huella digital o reconocimiento facial para ingresar al portal sin escribir
        la contraseña cada vez. Funciona con el sensor de tu propio celular o computadora.
      </p>

      {ok && (
        <div style={{ fontSize: 13, color: 'var(--cp-green-deep)', padding: '10px 14px', background: 'rgba(108,174,82,0.08)', border: '1px solid rgba(108,174,82,0.3)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
          {ok}
        </div>
      )}
      {err && (
        <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
          {err}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>
      ) : (
        <>
          {credentials.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
              {credentials.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
                  fontSize: 13,
                }}>
                  <div>
                    <strong style={{ color: 'var(--fg)' }}>{c.device_name || 'Dispositivo'}</strong>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                      Agregada el {new Date(c.created_at).toLocaleDateString('es-AR')}
                      {c.last_used_at && ` · Usada por última vez el ${new Date(c.last_used_at).toLocaleDateString('es-AR')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{ fontSize: 12, color: 'var(--cp-negative)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleRegister}
            disabled={registering}
            style={{ justifyContent: 'center', opacity: registering ? 0.7 : 1 }}
          >
            {registering ? 'Registrando…' : '+ Agregar llave de acceso'}
          </button>
        </>
      )}
    </div>
  )
}

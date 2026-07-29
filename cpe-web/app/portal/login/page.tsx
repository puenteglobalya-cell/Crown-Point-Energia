'use client'

import { useState, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const SESSION_START_PREFIX = 'cpe_session_start_'

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [expired, setExpired] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)

  // Password reset flow
  const [showPwd, setShowPwd] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [resetErr, setResetErr] = useState('')

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get('expirada') === '1')
    setPasskeySupported(!!window.PublicKeyCredential)
  }, [])

  async function afterLogin(supabase: ReturnType<typeof createSupabaseBrowserClient>, userId?: string) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      window.location.href = '/portal/mfa'
      return
    }
    if (userId) localStorage.removeItem(SESSION_START_PREFIX + userId)
    window.location.href = '/portal'
  }

  async function handlePasskeyLogin() {
    if (!email) { setError('Ingresá tu email para continuar con la llave de acceso.'); return }
    setPasskeyLoading(true)
    setError('')
    try {
      const optionsRes = await fetch('/api/auth/webauthn/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const { options, hasPasskey } = await optionsRes.json()
      if (!hasPasskey) {
        setError('No hay una llave de acceso registrada para este email. Ingresá con tu contraseña.')
        setPasskeyLoading(false)
        return
      }

      const response = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error || 'No se pudo verificar la llave de acceso')

      const supabase = createSupabaseBrowserClient()
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        email: verifyData.email,
        token_hash: verifyData.tokenHash,
      })
      if (otpError) throw new Error('No se pudo iniciar sesión')

      await afterLogin(supabase, data.user?.id)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo ingresar con la llave de acceso.')
      setPasskeyLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Goes through our own API route (not the browser SDK directly) so
    // failed attempts count toward per-IP rate limiting and per-account
    // lockout — the browser SDK call alone can't be throttled server-side.
    const res = await fetch('/api/auth/portal-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json()

    if (!res.ok) {
      setError(body.error || 'Email o contraseña inválidos.')
      setLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    await afterLogin(supabase, body.userId ?? undefined)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetErr('')
    setResetMsg('')

    const supabase = createSupabaseBrowserClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${siteUrl}/portal/reset-password`,
    })

    if (error) {
      setResetErr('No se pudo enviar el link. Verificá el email.')
    } else {
      setResetMsg('Link enviado. Revisá tu bandeja de entrada.')
    }
    setResetLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderRadius: 'var(--r-lg)', padding: '40px 36px',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Portal · Crown Point
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', marginBottom: expired ? 16 : 28 }}>
          Acceso interno — ingresá con tu cuenta corporativa.
        </p>

        {expired && (
          <div style={{
            fontSize: 13, padding: '10px 14px', marginBottom: 20,
            background: 'rgba(205,150,30,0.12)', border: '1px solid rgba(205,150,30,0.35)',
            borderRadius: 'var(--r-md)', color: 'var(--fg)',
          }}>
            Tu sesión expiró luego de 1 hora. Ingresá nuevamente.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div className="form-row">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>
          <div className="form-row">
            <label>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--fg-muted)', display: 'flex', alignItems: 'center',
                }}
              >
                {showPwd ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>

          {passkeySupported && (
            <button
              type="button"
              className="btn"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading}
              style={{ justifyContent: 'center', opacity: passkeyLoading ? 0.7 : 1 }}
            >
              {passkeyLoading ? 'Verificando…' : '🔑 Ingresar con huella / Face ID'}
            </button>
          )}
        </form>

        {/* Password reset section */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
          {!showReset ? (
            <button
              onClick={() => setShowReset(true)}
              style={{ fontSize: 13, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Olvidé mi contraseña
            </button>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'grid', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
                Ingresá tu email para recibir un link de restablecimiento.
              </p>
              <div className="form-row">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>

              {resetErr && (
                <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)' }}>
                  {resetErr}
                </div>
              )}
              {resetMsg && (
                <div style={{ fontSize: 13, color: 'var(--cp-green-deep)', padding: '10px 14px', background: 'rgba(108,174,82,0.08)', borderRadius: 'var(--r-md)' }}>
                  {resetMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetLoading}
                  style={{ justifyContent: 'center', opacity: resetLoading ? 0.7 : 1, flex: 1 }}
                >
                  {resetLoading ? 'Enviando…' : 'Enviar link'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => { setShowReset(false); setResetMsg(''); setResetErr('') }}
                  style={{ padding: '10px 16px' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

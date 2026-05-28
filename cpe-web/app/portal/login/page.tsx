'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password reset flow
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [resetErr, setResetErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      window.location.href = '/portal'
    }
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
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', marginBottom: 28 }}>
          Acceso interno — ingresá con tu cuenta corporativa.
        </p>

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
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
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

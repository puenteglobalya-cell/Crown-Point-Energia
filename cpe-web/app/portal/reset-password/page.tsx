'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function PortalResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    // If Supabase redirected here directly with a PKCE code, exchange it first
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) setReady(true)
        else setError('El link expiró o ya fue usado. Solicitá uno nuevo.')
      })
      // Clean the code from the URL so it can't be reused accidentally
      window.history.replaceState({}, '', '/portal/reset-password')
      return
    }

    // Fallback: detect session from auth state (PASSWORD_RECOVERY / SIGNED_IN)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setReady(true)
      }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres.'); return }
    setLoading(true)
    setError('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => { window.location.href = '/portal/login' }, 2000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderRadius: 'var(--r-lg)', padding: '40px 36px',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Nueva contraseña
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', marginBottom: 28 }}>
          Elegí una contraseña para tu cuenta del portal.
        </p>

        {success ? (
          <div style={{
            background: 'rgba(108,174,82,0.1)', border: '1px solid rgba(108,174,82,0.4)',
            padding: 16, borderRadius: 'var(--r-md)', fontSize: 14, color: 'var(--cp-green-deep)',
          }}>
            ✓ Contraseña actualizada. Redirigiendo al portal…
          </div>
        ) : !ready ? (
          <p style={{ fontSize: 14, color: 'var(--fg-soft)' }}>Verificando token…</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div className="form-row">
              <label>Nueva contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoFocus autoComplete="new-password" />
            </div>
            <div className="form-row">
              <label>Confirmar contraseña</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
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
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

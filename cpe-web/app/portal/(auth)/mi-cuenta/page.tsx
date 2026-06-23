'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function MiCuentaPage() {
  const [current, setCurrent]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')
  const [ok, setOk]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setErr('Las contraseñas no coinciden.'); return }
    if (password.length < 8)  { setErr('Mínimo 8 caracteres.'); return }

    setLoading(true)
    setErr('')

    const supabase = createSupabaseBrowserClient()

    // Re-authenticate with current password first to prevent session hijacking
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email && current) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      })
      if (signInErr) {
        setErr('La contraseña actual es incorrecta.')
        setLoading(false)
        return
      }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErr(error.message)
    } else {
      setOk(true)
      setCurrent('')
      setPassword('')
      setConfirm('')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 6px' }}>
        Mi cuenta
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: '0 0 32px', letterSpacing: '-0.02em' }}>
        Cambiar contraseña
      </h1>

      {ok ? (
        <div style={{ background: 'rgba(108,174,82,0.1)', border: '1px solid rgba(108,174,82,0.4)', padding: '16px 20px', borderRadius: 'var(--r-md)', fontSize: 14, color: 'var(--cp-green-deep)' }}>
          ✓ Contraseña actualizada correctamente.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div className="form-row">
            <label>Contraseña actual</label>
            <input
              type="password"
              required
              value={current}
              onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="form-row">
            <label>Nueva contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className="form-row">
            <label>Confirmar contraseña</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {err && (
            <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)' }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ justifyContent: 'center', opacity: loading ? 0.7 : 1, marginTop: 4 }}
          >
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}

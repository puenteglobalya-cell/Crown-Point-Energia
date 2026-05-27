'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      window.location.href = '/admin'
    }
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
          Admin — Crown Point
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', marginBottom: 28 }}>
          Ingresá con tu cuenta autorizada.
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
      </div>
    </div>
  )
}

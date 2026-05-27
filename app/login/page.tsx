'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError('No pudimos enviarte el link. Verificá el email.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>

        <div className={styles.logo}>
          <span className={styles.logoText}>Revenue</span>
          <span className={styles.logoDot}>.</span>
        </div>

        <h1 className={styles.title}>Acceder a reportes</h1>
        <p className={styles.sub}>
          Ingresá tu email y te enviamos un link de acceso.
        </p>

        {sent ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <p>Link enviado a <strong>{email}</strong></p>
            <p className={styles.successNote}>
              Revisá tu bandeja de entrada y hacé click en el link para entrar.
            </p>
            <button className={styles.again} onClick={() => { setSent(false); setEmail('') }}>
              Usar otro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className={styles.form}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
              className={styles.input}
              required
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar link de acceso'}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          Solo usuarios autorizados pueden acceder.
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>

        <div className={styles.logo}>
          <span className={styles.logoText}>Crown Point Energía</span>
        </div>

        <h1 className={styles.title}>Acceder a reportes</h1>
        <p className={styles.sub}>
          Ingresá tu email y contraseña para entrar.
        </p>

        <form onSubmit={handleLogin} className={styles.form}>
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

          <label className={styles.label} htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className={styles.input}
            required
          />

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className={styles.footer}>
          Solo usuarios autorizados pueden acceder.
        </p>
      </div>
    </div>
  )
}

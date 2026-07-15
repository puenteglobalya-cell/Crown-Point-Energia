'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function MiCuentaPage() {
  const [current, setCurrent]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')
  const [ok, setOk]             = useState(false)

  // ── 2FA state ────────────────────────────────────────────────────────────
  const [mfaStatus, setMfaStatus]   = useState<'loading' | 'enrolled' | 'unenrolled'>('loading')
  const [enrollStep, setEnrollStep] = useState<'idle' | 'qr' | 'confirm'>('idle')
  const [qrUrl, setQrUrl]           = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [factorId, setFactorId]     = useState<string | null>(null)
  const [totpCode, setTotpCode]     = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaErr, setMfaErr]         = useState('')
  const [mfaOk, setMfaOk]           = useState('')
  const codeRef                     = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadMfa() {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase.auth.mfa.listFactors()
      const hasVerified = data?.totp?.some(f => f.status === 'verified')
      setMfaStatus(hasVerified ? 'enrolled' : 'unenrolled')
    }
    loadMfa()
  }, [])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setErr('Las contraseñas no coinciden.'); return }
    if (password.length < 8)  { setErr('Mínimo 8 caracteres.'); return }

    setLoading(true)
    setErr('')

    const supabase = createSupabaseBrowserClient()

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

  async function handleEnroll() {
    setMfaLoading(true)
    setMfaErr('')
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Crown Point',
    })
    if (error || !data) {
      setMfaErr('No se pudo iniciar el registro. Intentá de nuevo.')
      setMfaLoading(false)
      return
    }
    setFactorId(data.id)
    setQrUrl(data.totp.qr_code)
    setTotpSecret(data.totp.secret)
    setEnrollStep('qr')
    setMfaLoading(false)
    setTimeout(() => codeRef.current?.focus(), 200)
  }

  async function handleConfirmMfa(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setMfaLoading(true)
    setMfaErr('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: totpCode.replace(/\s/g, ''),
    })
    if (error) {
      setMfaErr('Código incorrecto. Verificá tu app e intentá de nuevo.')
      setTotpCode('')
      setMfaLoading(false)
      setTimeout(() => codeRef.current?.focus(), 100)
      return
    }
    setQrUrl(null)
    setTotpSecret(null)
    setFactorId(null)
    setTotpCode('')
    setEnrollStep('idle')
    setMfaStatus('enrolled')
    setMfaOk('Verificación en dos pasos activada correctamente.')
    setMfaLoading(false)
  }

  async function handleUnenroll() {
    if (!window.confirm('¿Desactivar la verificación en dos pasos? Esto reduce la seguridad de tu cuenta.')) return
    setMfaLoading(true)
    setMfaErr('')
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.find(f => f.status === 'verified')
    if (!factor) { setMfaLoading(false); return }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (error) {
      setMfaErr('No se pudo desactivar el 2FA. Intentá de nuevo.')
      setMfaLoading(false)
      return
    }
    setMfaStatus('unenrolled')
    setMfaOk('Verificación en dos pasos desactivada.')
    setMfaLoading(false)
  }

  function cancelEnroll() {
    setEnrollStep('idle')
    setQrUrl(null)
    setTotpSecret(null)
    setFactorId(null)
    setTotpCode('')
    setMfaErr('')
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
          Contraseña actualizada correctamente.
        </div>
      ) : (
        <form onSubmit={handlePasswordSubmit} style={{ display: 'grid', gap: 18 }}>
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

      {/* ── 2FA Section ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
            Verificación en dos pasos
          </h2>
          {mfaStatus === 'enrolled' && (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--cp-green-deep)', background: 'rgba(108,174,82,0.12)', border: '1px solid rgba(108,174,82,0.35)', borderRadius: 20, padding: '2px 10px' }}>
              Activa
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 8 }}>
          Protegé tu cuenta con una aplicación autenticadora (Google Authenticator, Microsoft
          Authenticator, Authy, etc.). Cada vez que inicies sesión, se te pedirá un código de 6 dígitos.
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 20 }}>
          Las cuentas de administrador la tienen obligatoria: si la desactivás, se te va a
          pedir configurarla de nuevo la próxima vez que entres al panel de administración.
        </p>

        {mfaOk && (
          <div style={{ fontSize: 13, color: 'var(--cp-green-deep)', padding: '10px 14px', background: 'rgba(108,174,82,0.08)', border: '1px solid rgba(108,174,82,0.3)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
            {mfaOk}
          </div>
        )}
        {mfaErr && (
          <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '10px 14px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
            {mfaErr}
          </div>
        )}

        {mfaStatus === 'loading' && (
          <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>
        )}

        {mfaStatus === 'unenrolled' && enrollStep === 'idle' && (
          <button
            className="btn btn-primary"
            onClick={handleEnroll}
            disabled={mfaLoading}
            style={{ justifyContent: 'center', opacity: mfaLoading ? 0.7 : 1 }}
          >
            {mfaLoading ? 'Iniciando…' : 'Activar verificación en dos pasos'}
          </button>
        )}

        {enrollStep === 'qr' && qrUrl && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ background: 'var(--surface-raised, var(--surface))', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 16, margin: '0 0 16px' }}>
                <strong>Paso 1:</strong> Escaneá este código QR con tu aplicación autenticadora.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR code 2FA" width={180} height={180} style={{ imageRendering: 'pixelated', border: '1px solid var(--rule)', borderRadius: 8 }} />
              </div>
              {totpSecret && (
                <details style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Ingresar código manualmente</summary>
                  <code style={{ display: 'block', marginTop: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: 6, letterSpacing: '0.1em', wordBreak: 'break-all' }}>
                    {totpSecret}
                  </code>
                </details>
              )}
            </div>

            <form onSubmit={handleConfirmMfa} style={{ display: 'grid', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
                <strong>Paso 2:</strong> Ingresá el código de 6 dígitos que muestra tu app para confirmar.
              </p>
              <div className="form-row">
                <label>Código de verificación</label>
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  style={{ fontSize: 22, letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={mfaLoading || totpCode.length < 6}
                  style={{ flex: 1, justifyContent: 'center', opacity: mfaLoading || totpCode.length < 6 ? 0.7 : 1 }}
                >
                  {mfaLoading ? 'Verificando…' : 'Confirmar activación'}
                </button>
                <button type="button" className="btn" onClick={cancelEnroll} style={{ padding: '10px 16px' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {mfaStatus === 'enrolled' && (
          <button
            className="btn"
            onClick={handleUnenroll}
            disabled={mfaLoading}
            style={{ fontSize: 13, color: 'var(--cp-negative)', borderColor: 'rgba(179,59,46,0.35)', opacity: mfaLoading ? 0.7 : 1 }}
          >
            {mfaLoading ? 'Desactivando…' : 'Desactivar verificación en dos pasos'}
          </button>
        )}
      </div>
    </div>
  )
}

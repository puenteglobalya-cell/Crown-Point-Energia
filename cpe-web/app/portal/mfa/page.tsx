'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

function MfaVerifyInner() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/portal'

  const [factorId, setFactorId]     = useState<string | null>(null)
  const [code, setCode]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [initializing, setInit]     = useState(true)
  const inputRef                    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient()

      // If already at aal2, no need for MFA challenge
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') {
        window.location.href = next
        return
      }

      // Find the enrolled TOTP factor
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find(f => f.status === 'verified')
      if (!totp) {
        // No verified factor — shouldn't be on this page
        window.location.href = next
        return
      }

      setFactorId(totp.id)
      setInit(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    init()
  }, [next])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()

    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeErr || !challenge) {
      setError('No se pudo iniciar la verificación. Intentá de nuevo.')
      setLoading(false)
      return
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ''),
    })

    if (verifyErr) {
      setError('Código incorrecto. Verificá tu app autenticadora e intentá de nuevo.')
      setCode('')
      setLoading(false)
      inputRef.current?.focus()
      return
    }

    window.location.href = next
  }

  if (initializing) return null

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
        {/* Shield icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(31,37,102,0.08)', border: '1px solid rgba(31,37,102,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em', textAlign: 'center' }}>
          Verificación en dos pasos
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', marginBottom: 28, textAlign: 'center' }}>
          Ingresá el código de 6 dígitos de tu aplicación autenticadora.
        </p>

        <form onSubmit={handleVerify} style={{ display: 'grid', gap: 16 }}>
          <div className="form-row">
            <label>Código de verificación</label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000 000"
              autoComplete="one-time-code"
              style={{ fontSize: 24, letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
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
            disabled={loading || code.length < 6}
            style={{ justifyContent: 'center', opacity: loading || code.length < 6 ? 0.7 : 1 }}
          >
            {loading ? 'Verificando…' : 'Verificar'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--rule)', textAlign: 'center' }}>
          <button
            onClick={async () => {
              const supabase = createSupabaseBrowserClient()
              await supabase.auth.signOut()
              window.location.href = '/portal/login'
            }}
            style={{ fontSize: 13, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MfaVerifyPage() {
  return (
    <Suspense fallback={null}>
      <MfaVerifyInner />
    </Suspense>
  )
}

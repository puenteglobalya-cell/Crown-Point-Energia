'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

function MfaSetupInner() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/portal'

  const [qrUrl, setQrUrl]           = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [factorId, setFactorId]     = useState<string | null>(null)
  const [totpCode, setTotpCode]     = useState('')
  const [loading, setLoading]       = useState(true)
  const [verifying, setVerifying]   = useState(false)
  const [err, setErr]               = useState('')
  const codeRef                     = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function start() {
      const supabase = createSupabaseBrowserClient()

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Crown Point',
      })
      if (error || !data) {
        setErr('No se pudo iniciar el registro. Recargá la página e intentá de nuevo.')
        setLoading(false)
        return
      }
      setFactorId(data.id)
      setQrUrl(data.totp.qr_code)
      setTotpSecret(data.totp.secret)
      setLoading(false)
      setTimeout(() => codeRef.current?.focus(), 200)
    }
    start()
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setVerifying(true)
    setErr('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: totpCode.replace(/\s/g, ''),
    })
    if (error) {
      setErr('Código incorrecto. Verificá tu app autenticadora e intentá de nuevo.')
      setTotpCode('')
      setVerifying(false)
      setTimeout(() => codeRef.current?.focus(), 100)
      return
    }
    window.location.href = next
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderRadius: 'var(--r-lg)', padding: '40px 36px',
      }}>
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

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em', textAlign: 'center' }}>
          Verificación en dos pasos requerida
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--fg-soft)', marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}>
          Tu cuenta tiene acceso de administrador. Configurá una app autenticadora
          (Google Authenticator, Microsoft Authenticator, Authy) antes de continuar.
        </p>

        {loading ? (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>Generando código QR…</p>
        ) : (
          <>
            {qrUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Código QR para configurar 2FA" width={180} height={180} style={{ borderRadius: 8, background: '#fff', padding: 8 }} />
              </div>
            )}
            {totpSecret && (
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'center', marginBottom: 20, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                ¿No podés escanear? Ingresá manualmente: <strong style={{ color: 'var(--fg)' }}>{totpSecret}</strong>
              </p>
            )}

            <form onSubmit={handleVerify} style={{ display: 'grid', gap: 16 }}>
              <div className="form-row">
                <label>Código de 6 dígitos</label>
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  required
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000 000"
                  autoComplete="one-time-code"
                  style={{ fontSize: 22, letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
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
                disabled={verifying || totpCode.length < 6}
                style={{ justifyContent: 'center', opacity: verifying || totpCode.length < 6 ? 0.7 : 1 }}
              >
                {verifying ? 'Verificando…' : 'Activar y continuar'}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--rule)', textAlign: 'center' }}>
          <button
            onClick={async () => {
              const supabase = createSupabaseBrowserClient()
              await supabase.auth.signOut()
              window.location.href = '/portal/login'
            }}
            style={{ fontSize: 13, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MfaSetupPage() {
  return (
    <Suspense fallback={null}>
      <MfaSetupInner />
    </Suspense>
  )
}

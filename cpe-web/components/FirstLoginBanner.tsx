'use client'

import { useEffect, useState } from 'react'

export default function FirstLoginBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cpe_password_help_seen')) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem('cpe_password_help_seen', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9000, background: 'var(--fg)', color: 'var(--bg)',
      borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center',
      gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,.25)', fontSize: 13,
      maxWidth: 'calc(100vw - 40px)', width: 460,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🔑</span>
      <div style={{ flex: 1, lineHeight: 1.4 }}>
        <strong style={{ display: 'block', fontSize: 13 }}>Cambiá tu contraseña provisoria</strong>
        <span style={{ opacity: 0.7, fontSize: 12 }}>
          Si ingresaste con una contraseña temporal, cambiala ahora en Mi Cuenta.{' '}
          <a href="/portal/ayuda" onClick={dismiss} style={{ color: 'var(--bg)', textDecoration: 'underline' }}>Ver instructivo</a>
        </span>
      </div>
      <a
        href="/portal/mi-cuenta"
        onClick={dismiss}
        style={{
          background: 'var(--bg)', color: 'var(--fg)', borderRadius: 8,
          padding: '7px 14px', fontWeight: 700, fontSize: 12,
          whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none',
        }}
      >
        Cambiar ahora
      </a>
      <button
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', color: 'var(--bg)', opacity: 0.5,
          cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0,
        }}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

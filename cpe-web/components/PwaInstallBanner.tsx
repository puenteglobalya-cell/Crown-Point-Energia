'use client'

import { useEffect, useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('cpe_pwa_dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') localStorage.setItem('cpe_pwa_dismissed', '1')
    setDismissed(true)
  }

  function dismiss() {
    localStorage.setItem('cpe_pwa_dismissed', '1')
    setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9000,
      background: 'var(--fg)',
      color: 'var(--bg)',
      borderRadius: 14,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,.25)',
      fontSize: 13,
      maxWidth: 'calc(100vw - 40px)',
      width: 380,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>📲</span>
      <div style={{ flex: 1, lineHeight: 1.4 }}>
        <strong style={{ display: 'block', fontSize: 13 }}>Instalá la app</strong>
        <span style={{ opacity: 0.7, fontSize: 12 }}>Accedé más rápido desde el inicio</span>
      </div>
      <button
        onClick={install}
        style={{
          background: 'var(--bg)',
          color: 'var(--fg)',
          border: 'none',
          borderRadius: 8,
          padding: '7px 14px',
          fontWeight: 700,
          fontSize: 12,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Instalar
      </button>
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--bg)',
          opacity: 0.5,
          cursor: 'pointer',
          fontSize: 18,
          padding: '0 2px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

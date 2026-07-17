'use client'

import { useState } from 'react'

// Small copy-to-clipboard button with an inline "¡Copiado!" toast. Used on
// links that people want to share directly (policy PDFs, hechos relevantes,
// biblioteca items) instead of just middle-click-copying the address bar.
export function CopyLinkButton({ url, label = 'Copiar enlace' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard API unavailable (e.g. insecure context) — silently no-op
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        color: copied ? 'var(--cp-green-deep)' : 'var(--fg-muted)', fontSize: 12, flexShrink: 0,
      }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Copiado
        </>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.6"/></svg>
      )}
    </button>
  )
}

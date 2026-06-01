'use client'

import { useState } from 'react'

type Props = {
  docName: string
  docPath: string
  signedUrl: string
}

export default function DocActions({ docName, docPath, signedUrl }: Props) {
  const [copied, setCopied]     = useState(false)
  const [loadingShare, setLoadingShare] = useState(false)

  async function getShareUrl(): Promise<string> {
    const res = await fetch(`/api/biblioteca/share?path=${encodeURIComponent(docPath)}`)
    if (!res.ok) throw new Error('Error generando link')
    const { url } = await res.json()
    return url
  }

  async function handleCopy() {
    setLoadingShare(true)
    try {
      const url = await getShareUrl()
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
    finally { setLoadingShare(false) }
  }

  async function handleEmail() {
    setLoadingShare(true)
    try {
      const url = await getShareUrl()
      const subject = encodeURIComponent(`Crown Point — ${docName}`)
      const body = encodeURIComponent(
        `Te comparto el siguiente documento:\n\n${docName}\n\nDescargar: ${url}\n\n(Este link es válido por 7 días)`
      )
      window.location.href = `mailto:?subject=${subject}&body=${body}`
    } catch { /* ignore */ }
    finally { setLoadingShare(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {/* Download */}
      <a
        href={signedUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 18px',
          background: 'var(--cp-green)', color: '#fff',
          borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Descargar
      </a>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        disabled={loadingShare}
        title="Copiar link (válido 7 días)"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
          background: copied ? 'rgba(130,188,0,0.1)' : 'var(--surface)',
          color: copied ? 'var(--cp-green)' : 'var(--fg-soft)',
        }}
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copiado
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
            Copiar link
          </>
        )}
      </button>

      {/* Send by email */}
      <button
        onClick={handleEmail}
        disabled={loadingShare}
        title="Enviar por mail"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
          background: 'var(--surface)', color: 'var(--fg-soft)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            stroke="currentColor" strokeWidth="1.8"/>
          <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
        {loadingShare ? '…' : 'Enviar por mail'}
      </button>
    </div>
  )
}

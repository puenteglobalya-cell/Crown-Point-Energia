'use client'

import { useEffect, useState } from 'react'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 60,
        width: 44, height: 44, borderRadius: '50%',
        border: '1px solid var(--rule, #E4E8EF)',
        background: 'var(--cp-navy, #1F2566)', color: '#fff',
        display: 'grid', placeItems: 'center', cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(22,28,46,0.22)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

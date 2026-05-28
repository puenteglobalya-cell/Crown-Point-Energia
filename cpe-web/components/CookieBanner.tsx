'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cpe_cookie_ok')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cpe_cookie_ok', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="alert">
      <p>
        <span className="lang-es">
          Usamos cookies propias y de terceros para mejorar tu experiencia de navegación y analizar el uso del sitio.
          Al continuar navegando aceptás su uso.{' '}
          <Link href="/legal/privacidad">Más información</Link>.
        </span>
        <span className="lang-en">
          We use first- and third-party cookies to improve your browsing experience and analyze site usage.
          By continuing you accept their use.{' '}
          <Link href="/legal/privacidad">Learn more</Link>.
        </span>
      </p>
      <div className="cookie-banner-actions">
        <button className="btn btn-primary" onClick={accept} style={{ fontSize: 13, padding: '9px 20px' }}>
          <span className="lang-es">Aceptar</span>
          <span className="lang-en">Accept</span>
        </button>
      </div>
    </div>
  )
}

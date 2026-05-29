'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const NAV = [
  { key: 'home', href: '/', es: 'Inicio', en: 'Home', menu: null },
  {
    key: 'invertir', href: '/inversores', es: 'Invertir', en: 'Invest',
    menu: [
      { href: '/inversores', es: 'Resumen del inversor', en: 'Investor overview' },
      { href: '/comunicados', es: 'Comunicados de prensa', en: 'Press releases' },
      { href: '/inversores#financieros', es: 'Estados financieros', en: 'Financial statements' },
      { href: '/inversores#cobertura', es: 'Cobertura de analistas', en: 'Analyst coverage' },
      { href: '/inversores#on', es: 'Obligaciones negociables', en: 'Notes' },
    ]
  },
  {
    key: 'operaciones', href: '/operaciones', es: 'Operaciones', en: 'Operations',
    menu: [
      { href: '/operaciones#ppc', es: 'Puesto Pozo Cercado Oriental', en: 'Puesto Pozo Cercado Oriental' },
      { href: '/operaciones#chanares', es: 'Chañares Herrados', en: 'Chañares Herrados' },
      { href: '/operaciones#cerro', es: 'Cerro de Los Leones', en: 'Cerro de Los Leones' },
      { href: '/operaciones#tordillo', es: 'El Tordillo · La Tapera · P. Quiroga', en: 'El Tordillo · La Tapera · P. Quiroga' },
      { href: '/operaciones#piedra', es: 'Piedra Clavada – Koluel Kaike', en: 'Piedra Clavada – Koluel Kaike' },
      { href: '/operaciones#tdf', es: 'Río Cullen · Las Violetas', en: 'Río Cullen · Las Violetas' },
    ]
  },
  {
    key: 'acerca', href: '/acerca', es: 'Acerca de', en: 'About',
    menu: [
      { href: '/acerca#estrategia', es: 'Estrategia', en: 'Strategy' },
      { href: '/acerca#management', es: 'Management', en: 'Management' },
      { href: '/acerca#directorio', es: 'Directorio CPE Inc.', en: 'CPE Inc. Board' },
      { href: '/esg', es: 'ESG & Responsabilidad corporativa', en: 'ESG & Corporate responsibility' },
      { href: '/carreras', es: 'Carreras', en: 'Careers' },
    ]
  },
  { key: 'contacto', href: '/contacto', es: 'Contacto', en: 'Contact', menu: null },
]

type Props = {
  fields: Record<string, string>
  show: Record<string, boolean>
  lang: 'es' | 'en'
}

export default function Header({ fields, show, lang }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const activeKey = NAV.find(it => it.href !== '/' && pathname.startsWith(it.href))?.key
    ?? (pathname === '/' ? 'home' : '')

  const tickerVisible = show['ticker'] !== false
  const price = fields['stock.price'] || 'CA $0.205'
  const delta = fields['stock.delta'] || '+0.00%'
  const beta = fields['stock.beta'] || '0.93'
  const vol30 = fields['stock.vol30'] || '14,210'

  function handleLangSwitch(newLang: string) {
    document.cookie = `cpe_lang=${newLang};path=/;max-age=31536000`
    document.documentElement.setAttribute('data-lang', newLang)
    window.location.reload()
  }

  useEffect(() => {
    const toggle = document.querySelector('.menu-toggle') as HTMLButtonElement | null
    const nav = navRef.current
    if (!toggle || !nav) return
    const handler = () => nav.classList.toggle('open')
    toggle.addEventListener('click', handler)
    return () => toggle.removeEventListener('click', handler)
  }, [])

  return (
    <>
      {tickerVisible && (
        <div className="ticker" data-cpe-section="ticker">
          <div className="container">
            <span className="ticker-label">
              <span className="live-dot"></span>TSXV: CWV
            </span>
            <div className="ticker-cell">
              <span className="key">Price</span>
              <span className="val" data-cpe-field="stock.price">{price}</span>
            </div>
            <div className="ticker-cell">
              <span className="key">Change</span>
              <span className="val delta pos" data-cpe-field="stock.delta">{delta}</span>
            </div>
            <div className="ticker-cell">
              <span className="key">Beta</span>
              <span className="val" data-cpe-field="stock.beta">{beta}</span>
            </div>
            <div className="ticker-cell">
              <span className="key">Volume</span>
              <span className="val" data-cpe-field="stock.vol30">{vol30}</span>
            </div>
            <div className="ticker-spacer"></div>
            <span className="ticker-cell" style={{ opacity: 0.6 }}>
              <span className="key">Updated</span>
              <span className="val">15&nbsp;min&nbsp;delay</span>
            </span>
          </div>
        </div>
      )}

      <header className="site-header">
        <div className="container">
          <Link className="brand" href="/" aria-label="Crown Point Energy">
            <Image src="/logo.png" alt="Crown Point Energy" className="brand-logo" width={160} height={72} />
          </Link>

          <nav className="primary-nav" ref={navRef}>
            {NAV.map(it => (
              <div
                key={it.key}
                className={`nav-item${it.menu ? ' has-menu' : ''}${it.key === activeKey ? ' active' : ''}`}
                tabIndex={0}
              >
                {it.menu ? (
                  <>
                    <span>
                      <span className="lang-es">{it.es}</span>
                      <span className="lang-en">{it.en}</span>
                    </span>
                    <div className="nav-submenu">
                      {it.menu.map(m => (
                        <Link key={m.href} href={m.href}>
                          <span className="lang-es">{m.es}</span>
                          <span className="lang-en">{m.en}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link href={it.href} style={{ display: 'block', margin: '-10px -14px', padding: '10px 14px' }}>
                    <span className="lang-es">{it.es}</span>
                    <span className="lang-en">{it.en}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <div className="header-utils">
            <Link
              href="/portal"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--fg-soft)', textDecoration: 'none',
                padding: '6px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-pill)',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--fg-soft)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg-soft)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--rule)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span className="lang-es">Acceso</span>
              <span className="lang-en">Login</span>
            </Link>
            <div className="lang-toggle" role="group" aria-label="Language">
              <button
                data-lang-btn="es"
                className={lang === 'es' ? 'active' : ''}
                onClick={() => handleLangSwitch('es')}
              >ES</button>
              <button
                data-lang-btn="en"
                className={lang === 'en' ? 'active' : ''}
                onClick={() => handleLangSwitch('en')}
              >EN</button>
            </div>
            <button className="menu-toggle" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
    </>
  )
}

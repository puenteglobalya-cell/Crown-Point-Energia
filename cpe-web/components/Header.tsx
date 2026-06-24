'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
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
      { divider: true, es: 'Explotación', en: 'Production' },
      { href: '/operaciones#tordillo', es: 'El Tordillo · La Tapera · P. Quiroga', en: 'El Tordillo · La Tapera · P. Quiroga' },
      { href: '/operaciones#piedra', es: 'Piedra Clavada – Koluel Kaike', en: 'Piedra Clavada – Koluel Kaike' },
      { href: '/operaciones#chanares', es: 'Chañares Herrados', en: 'Chañares Herrados' },
      { href: '/operaciones#ppc', es: 'Puesto Pozo Cercado Oriental', en: 'Puesto Pozo Cercado Oriental' },
      { href: '/operaciones#tdf', es: 'Río Cullen · Las Violetas', en: 'Río Cullen · Las Violetas' },
      { divider: true, es: 'Exploración', en: 'Exploration' },
      { href: '/operaciones#cerro', es: 'Cerro de Los Leones', en: 'Cerro de Los Leones' },
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
  { key: 'comercial', href: '/comercial', es: 'Comercial', en: 'Commercial', menu: null },
  { key: 'contacto', href: '/contacto', es: 'Contacto', en: 'Contact', menu: null },
  {
    key: 'portal', href: '/portal', es: 'Acceso', en: 'Access', cta: true,
    menu: [
      { href: '/portal',    es: 'Intranet',              en: 'Intranet' },
      { href: '/portal',    es: 'Personal',               en: 'Personnel' },
      { href: '/comercial', es: 'Portal de proveedores',  en: 'Supplier portal' },
      { href: '/biblioteca',es: 'VDR',                    en: 'VDR' },
    ]
  },
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
  const beta  = fields['stock.beta']  || '0.93'
  const vol30 = fields['stock.vol30'] || '14,210'

  const [live, setLive] = useState<{ price: string; delta: string; isUp: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchStock() {
      try {
        const r = await fetch('/api/stock/cwv')
        if (!r.ok || cancelled) return
        const d = await r.json() as { ok: boolean; price: number; deltaP: number; delta: number; currency: string }
        if (!d.ok || cancelled) return
        const cur = d.currency === 'CAD' ? 'CA' : (d.currency || 'CA')
        const sign = d.deltaP >= 0 ? '+' : ''
        setLive({
          price: `${cur} $${d.price.toFixed(3)}`,
          delta: `${sign}${d.deltaP.toFixed(2)}%`,
          isUp: d.delta >= 0,
        })
      } catch { /* network unavailable, keep CMS fallback */ }
    }
    fetchStock()
    const id = setInterval(fetchStock, 5 * 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const displayPrice = live?.price ?? price
  const displayDelta = live?.delta ?? delta
  const displayIsUp  = live ? live.isUp : !delta.startsWith('-')

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
              <span className="key"><span className="lang-es">Precio</span><span className="lang-en">Price</span></span>
              <span className="val">{displayPrice}</span>
            </div>
            <div className="ticker-cell">
              <span className="key"><span className="lang-es">Variación</span><span className="lang-en">Change</span></span>
              <span className={`val delta ${displayIsUp ? 'pos' : 'neg'}`}>{displayDelta}</span>
            </div>
            <div className="ticker-cell">
              <span className="key">Beta</span>
              <span className="val" data-cpe-field="stock.beta">{beta}</span>
            </div>
            <div className="ticker-cell">
              <span className="key"><span className="lang-es">Volumen</span><span className="lang-en">Volume</span></span>
              <span className="val" data-cpe-field="stock.vol30">{vol30}</span>
            </div>
            <div className="ticker-spacer"></div>
            <span className="ticker-cell" style={{ opacity: 0.6 }}>
              <span className="key"><span className="lang-es">Actualizado</span><span className="lang-en">Updated</span></span>
              <span className="val"><span className="lang-es">Cierre&nbsp;anterior</span><span className="lang-en">Prior&nbsp;close</span></span>
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
                {it.menu && (it as { cta?: boolean }).cta ? (
                  <>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--accent-deep)',
                      padding: '6px 14px', border: '1.5px solid currentColor',
                      borderRadius: 'var(--r-pill)', marginLeft: 4, cursor: 'pointer',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="lang-es">{it.es}</span>
                      <span className="lang-en">{it.en}</span>
                    </span>
                    <div className="nav-submenu">
                      {it.menu.map((m) => (
                        'href' in m && m.href ? (
                          <Link key={`${m.href}-${m.es}`} href={m.href}>
                            <span className="lang-es">{m.es}</span>
                            <span className="lang-en">{m.en}</span>
                          </Link>
                        ) : null
                      ))}
                    </div>
                  </>
                ) : it.menu ? (
                  <>
                    <span>
                      <span className="lang-es">{it.es}</span>
                      <span className="lang-en">{it.en}</span>
                    </span>
                    <div className="nav-submenu">
                      {it.menu.map((m, mi) => (
                        'divider' in m ? (
                          <span key={`d${mi}`} className="nav-submenu-divider">
                            <span className="lang-es">{m.es}</span>
                            <span className="lang-en">{m.en}</span>
                          </span>
                        ) : (
                          <Link key={m.href} href={m.href}>
                            <span className="lang-es">{m.es}</span>
                            <span className="lang-en">{m.en}</span>
                          </Link>
                        )
                      ))}
                    </div>
                  </>
                ) : (it as { cta?: boolean }).cta ? (
                  <Link
                    href={it.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--accent-deep)', textDecoration: 'none',
                      padding: '6px 14px', border: '1.5px solid currentColor',
                      borderRadius: 'var(--r-pill)', marginLeft: 4,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="lang-es">{it.es}</span>
                    <span className="lang-en">{it.en}</span>
                  </Link>
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

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import PushSubscriber from '@/components/PushSubscriber'

const ROLE_LABELS: Record<string, string> = {
  viewer:     'Consulta',
  uploader:   'Carga',
  admin:      'Admin',
  rrhh:       'RRHH',
  accionista: 'Accionista',
}

export default function PortalNav({
  email,
  role,
  canUpload,
  canViewReports = true,
  canViewDashboard = true,
  canViewComercial = true,
  theme: initialTheme = 'light',
}: {
  email: string
  role: string
  canUpload: boolean
  canViewReports?: boolean
  canViewDashboard?: boolean
  canViewComercial?: boolean
  theme?: string
}) {
  const [signingOut, setSigningOut] = useState(false)
  const [isDark, setIsDark] = useState(initialTheme === 'dark')
  const [menuOpen, setMenuOpen] = useState(false)

  function handleThemeToggle() {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    document.cookie = `cpe_theme=${next};path=/;max-age=31536000`
    setIsDark(!isDark)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await createSupabaseBrowserClient().auth.signOut()
    window.location.href = '/portal/login'
  }

  const links = role === 'finanzas' ? (
    <Link href="/portal/finanzas" className="portal-nav-link" onClick={() => setMenuOpen(false)}>
      Finanzas
    </Link>
  ) : (
    <>
      {canViewDashboard && (
        <Link href="/portal/dashboard" className="portal-nav-link" onClick={() => setMenuOpen(false)}>
          Dashboard
        </Link>
      )}
      {canViewReports && (
        <Link href="/portal" className="portal-nav-link" onClick={() => setMenuOpen(false)}>
          Reportes
        </Link>
      )}
      {canViewComercial && (
        <Link href="/portal/comercial" className="portal-nav-link" onClick={() => setMenuOpen(false)}>
          Reportes Comerciales
        </Link>
      )}
      {canUpload && (
        <Link href="/portal/subir" className="portal-nav-link" onClick={() => setMenuOpen(false)}>
          Subir reporte
        </Link>
      )}
    </>
  )

  return (
    <nav className="portal-nav">
      <div className="portal-nav-row">
        {/* Left: logo + nav links (collapses on mobile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <Link href="/portal" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
            textDecoration: 'none',
            flexShrink: 0,
          }}>
            Crown Point
            <span style={{ fontWeight: 400, color: 'var(--fg-muted)', marginLeft: 6, fontSize: 13 }}>Portal</span>
          </Link>

          <div className="portal-nav-links">
            {links}
          </div>
        </div>

        {/* Right: theme toggle + push bell + user info + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleThemeToggle}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{
              background: 'none', border: '1px solid var(--rule)',
              borderRadius: 'var(--r-pill)', width: 32, height: 32,
              display: 'grid', placeItems: 'center',
              cursor: 'pointer', color: 'var(--fg-soft)',
              flexShrink: 0,
            }}
          >
            {isDark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <PushSubscriber />

          <Link href="/portal/mi-cuenta" style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg-muted)',
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'var(--email-display, inline-flex)',
            alignItems: 'center',
            gap: 5,
            textDecoration: 'none',
          }} className="portal-nav-email" title="Mi cuenta · Contraseña y 2FA">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
          </Link>

          {role === 'admin' ? (
            <Link href="/admin" className="portal-nav-role" style={{
              background: 'rgba(108,174,82,0.15)',
              color: 'var(--cp-green-deep)',
              border: '1px solid rgba(108,174,82,0.3)',
              textDecoration: 'none',
            }}>
              {ROLE_LABELS[role] ?? role}
            </Link>
          ) : (
            <span className="portal-nav-role" style={{
              background: role === 'uploader'
                ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
                : 'var(--bg-alt)',
              color: role === 'uploader' ? 'var(--accent)' : 'var(--fg-muted)',
              border: '1px solid',
              borderColor: role === 'uploader'
                ? 'color-mix(in oklab, var(--accent) 30%, transparent)'
                : 'var(--rule)',
            }}>
              {ROLE_LABELS[role] ?? role}
            </span>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="portal-nav-signout"
            style={{
              background: 'none',
              border: '1px solid var(--rule)',
              color: 'var(--fg-soft)',
              cursor: signingOut ? 'not-allowed' : 'pointer',
              opacity: signingOut ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>{signingOut ? 'Saliendo…' : 'Cerrar sesión'}</span>
          </button>

          <button
            className="portal-nav-toggle"
            aria-label="Menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown — same links, shown when menuOpen */}
      <div className={`portal-nav-drawer${menuOpen ? ' open' : ''}`}>
        {links}
      </div>
    </nav>
  )
}

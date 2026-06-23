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
}: {
  email: string
  role: string
  canUpload: boolean
  canViewReports?: boolean
  canViewDashboard?: boolean
  canViewComercial?: boolean
}) {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await createSupabaseBrowserClient().auth.signOut()
    window.location.href = '/portal/login'
  }

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: 56,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--rule)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      overflowX: 'auto',
      gap: 12,
    }}>
      {/* Left: logo + nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <Link href="/portal" style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '-0.01em',
          color: 'var(--fg)',
          textDecoration: 'none',
        }}>
          Crown Point
          <span style={{ fontWeight: 400, color: 'var(--fg-muted)', marginLeft: 6, fontSize: 13 }}>Portal</span>
        </Link>

        <div style={{ width: 1, height: 18, background: 'var(--rule)' }} />

        {canViewDashboard && (
          <Link href="/portal/dashboard" style={{ fontSize: 13, color: 'var(--fg-soft)', textDecoration: 'none', fontWeight: 500 }}>
            Dashboard
          </Link>
        )}

        {canViewReports && (
          <Link href="/portal" style={{ fontSize: 13, color: 'var(--fg-soft)', textDecoration: 'none', fontWeight: 500 }}>
            Reportes
          </Link>
        )}

        {canViewComercial && (
          <Link href="/portal/comercial" style={{ fontSize: 13, color: 'var(--fg-soft)', textDecoration: 'none', fontWeight: 500 }}>
            Comercial
          </Link>
        )}

        {canUpload && (
          <Link href="/portal/subir" style={{ fontSize: 13, color: 'var(--fg-soft)', textDecoration: 'none', fontWeight: 500 }}>
            Subir reporte
          </Link>
        )}
      </div>

      {/* Right: push bell + user info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <PushSubscriber />

        <span style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg-muted)',
          maxWidth: 160,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'var(--email-display, inline)',
        }} className="portal-nav-email">
          {email}
        </span>

        {role === 'admin' ? (
          <Link href="/admin" style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--r-pill)',
            background: 'rgba(108,174,82,0.15)',
            color: 'var(--cp-green-deep)',
            border: '1px solid rgba(108,174,82,0.3)',
            textDecoration: 'none',
          }}>
            {ROLE_LABELS[role] ?? role}
          </Link>
        ) : (
          <span style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--r-pill)',
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
          style={{
            fontSize: 12,
            padding: '6px 14px',
            background: 'none',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--r-md)',
            color: 'var(--fg-soft)',
            cursor: signingOut ? 'not-allowed' : 'pointer',
            opacity: signingOut ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div>
    </nav>
  )
}

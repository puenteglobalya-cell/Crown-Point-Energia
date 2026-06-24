'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type NavItem = { href: string; label: string; roles?: string[] }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Sitio',
    items: [
      { href: '/admin', label: 'CMS' },
      { href: '/admin/cms', label: 'Contenido' },
      { href: '/admin/imagenes', label: 'Imágenes' },
      { href: '/admin/bloques-fotos', label: 'Fotos de bloques' },
      { href: '/admin/documentos', label: 'Documentos' },
      { href: '/admin/biblioteca', label: 'Biblioteca' },
    ],
  },
  {
    label: 'Publicaciones',
    items: [
      { href: '/admin/reportes', label: 'Reportes' },
      { href: '/admin/kpi', label: 'KPIs Excel' },
      { href: '/admin/comunicados', label: 'Comunicados' },
      { href: '/admin/push', label: 'Push' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios' },
      { href: '/admin/suscriptores', label: 'Suscriptores IR' },
      { href: '/admin/rrhh', label: 'RRHH', roles: ['rrhh', 'admin'] },
      { href: '/admin/contacto', label: 'Contacto' },
      { href: '/admin/logs', label: 'Logs' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/sitemap', label: 'Sitemap' },
      { href: '/admin/backup',  label: 'Backup' },
    ],
  },
]

const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin',
  uploader:   'Carga',
  viewer:     'Consulta',
  rrhh:       'RRHH',
  accionista: 'Accionista',
}

const EXTERNAL = [
  { href: '/', label: 'Sitio web' },
  { href: '/infografia', label: 'Infografía' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/portal', label: 'Portal' },
]

const SHELL_EXCLUDED = ['/admin/login', '/admin/reset-password']

function getVisibleGroups(role: string): typeof NAV_GROUPS {
  if (role === 'rrhh') {
    return NAV_GROUPS
      .map(g => ({ ...g, items: g.items.filter(item => item.roles?.includes('rrhh')) }))
      .filter(g => g.items.length > 0)
  }
  return NAV_GROUPS
}

export function AdminShell({
  children,
  userEmail = '',
  userRole = 'admin',
}: {
  children: React.ReactNode
  userEmail?: string
  userRole?: string
}) {
  const pathname = usePathname()

  if (SHELL_EXCLUDED.some(p => pathname.startsWith(p))) {
    return <>{children}</>
  }

  async function signOut() {
    const sb = createSupabaseBrowserClient()
    await sb.auth.signOut()
    window.location.href = '/admin/login'
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const visibleGroups = getVisibleGroups(userRole)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--surface)',
        borderRight: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
        zIndex: 40,
      }}>
        {/* Logo / brand */}
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--rule)', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
            Crown Point
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>Panel de administración</div>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {visibleGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div style={{
                padding: '6px 20px 4px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--fg-muted)',
              }}>
                {group.label}
              </div>
              {group.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '7px 20px',
                    fontSize: 13,
                    fontWeight: isActive(item.href) ? 600 : 400,
                    color: isActive(item.href) ? 'var(--accent)' : 'var(--fg-soft)',
                    textDecoration: 'none',
                    background: isActive(item.href) ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))' : 'transparent',
                    borderLeft: `2px solid ${isActive(item.href) ? 'var(--accent)' : 'transparent'}`,
                    transition: 'all 0.1s',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* External links */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--rule)' }}>
          {EXTERNAL.map(e => (
            <a
              key={e.href}
              href={e.href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 0',
                fontSize: 12,
                color: 'var(--fg-muted)',
                textDecoration: 'none',
              }}
            >
              {e.label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </div>

        {/* Active user display */}
        {userEmail && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--rule)' }}>
            <div style={{
              fontSize: 11,
              color: 'var(--fg-muted)',
              marginBottom: 5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {userEmail}
            </div>
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--bg-alt)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--rule)',
            }}>
              {ROLE_LABELS[userRole] ?? userRole}
            </span>
          </div>
        )}

        {/* Sign out */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--rule)' }}>
          <button
            onClick={signOut}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 12,
              color: 'var(--fg-muted)',
              background: 'none',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content — pages manage their own padding */}
      <main style={{ marginLeft: 220, flex: 1, minWidth: 0, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}

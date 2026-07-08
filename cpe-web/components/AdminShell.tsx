'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type NavItem = { href: string; label: string; icon: IconName; roles?: string[] }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Sitio',
    items: [
      { href: '/admin/inicio', label: 'Inicio', icon: 'home' },
      { href: '/admin', label: 'CMS', icon: 'sliders' },
      { href: '/admin/cms', label: 'Contenido', icon: 'edit' },
      { href: '/admin/imagenes', label: 'Imágenes', icon: 'image' },
      { href: '/admin/bloques-fotos', label: 'Fotos de bloques', icon: 'image' },
      { href: '/admin/documentos', label: 'Documentos', icon: 'file' },
      { href: '/admin/ir-docs', label: 'IR Documents', icon: 'folder' },
      { href: '/admin/biblioteca', label: 'Biblioteca', icon: 'book' },
      { href: '/admin/marca', label: 'Manual de marca', icon: 'bookmark' },
      { href: '/admin/word-export', label: 'Exportar Word', icon: 'download' },
    ],
  },
  {
    label: 'Publicaciones',
    items: [
      { href: '/admin/reportes', label: 'Reportes', icon: 'chart' },
      { href: '/admin/kpi', label: 'KPIs Excel', icon: 'grid' },
      { href: '/admin/comunicados', label: 'Comunicados', icon: 'megaphone' },
      { href: '/admin/cnv-sync', label: 'Hechos CNV', icon: 'alert' },
      { href: '/admin/push', label: 'Push', icon: 'bell' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
      { href: '/admin/suscriptores', label: 'Suscriptores IR', icon: 'mail' },
      { href: '/admin/ir-alertas', label: 'Alertas IR', icon: 'bell' },
      { href: '/admin/rrhh', label: 'RRHH', icon: 'briefcase', roles: ['rrhh', 'admin'] },
      { href: '/admin/contacto', label: 'Contacto', icon: 'message' },
      { href: '/admin/logs', label: 'Logs', icon: 'activity' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/sitemap', label: 'Sitemap', icon: 'map' },
      { href: '/admin/backup', label: 'Backup', icon: 'database' },
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
const STORAGE_KEY = 'cpe-admin-sidebar-collapsed'

// ── Icons ─────────────────────────────────────────────────────────
type IconName =
  | 'home' | 'sliders' | 'edit' | 'image' | 'file' | 'folder' | 'book'
  | 'bookmark' | 'download' | 'chart' | 'grid' | 'megaphone' | 'alert'
  | 'bell' | 'users' | 'mail' | 'briefcase' | 'message' | 'activity'
  | 'map' | 'database'

const ICON_PATHS: Record<IconName, string> = {
  home:      'M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5',
  sliders:   'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  edit:      'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  image:     'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
  file:      'M6 2h9l5 5v15H6zM14 2v6h6',
  folder:    'M3 6h6l2 2h10v11H3z',
  book:      'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v16',
  bookmark:  'M6 3h12v18l-6-4-6 4z',
  download:  'M12 3v12m0 0-4-4m4 4 4-4M4 19h16',
  chart:     'M4 20V10M10 20V4M16 20v-7M22 20H2',
  grid:      'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1zM14 7a5 5 0 0 1 0 10',
  alert:     'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
  bell:      'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.5 21a2 2 0 0 0 3 0',
  users:     'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1A4 4 0 0 1 16 11',
  mail:      'M3 5h18v14H3zM3 6l9 7 9-7',
  briefcase: 'M3 8h18v12H3zM8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3',
  message:   'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  activity:  'M22 12h-4l-3 9L9 3l-3 9H2',
  map:       'M9 3 3 6v15l6-3 6 3 6-3V3l-6 3zM9 3v15M15 6v15',
  database:  'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
}

function Icon({ name }: { name: IconName }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d={ICON_PATHS[name]} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)

  // Restore preference after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    setReady(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

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
  const W = collapsed ? 64 : 220

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: W,
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--surface)',
        borderRight: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 0',
        zIndex: 40,
        transition: ready ? 'width 0.16s ease' : undefined,
      }}>
        {/* Logo / brand + collapse toggle */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8, padding: collapsed ? '0 0 14px' : '0 16px 14px',
          borderBottom: '1px solid var(--rule)', marginBottom: 8,
        }}>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
                Crown Point
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1, whiteSpace: 'nowrap' }}>Administración</div>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-expanded={!collapsed}
            style={{
              display: 'grid', placeItems: 'center',
              width: 30, height: 30, flexShrink: 0,
              background: 'none', border: '1px solid var(--rule)',
              borderRadius: 'var(--r-sm, 6px)', cursor: 'pointer', color: 'var(--fg-soft)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.16s' }}>
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, padding: '4px 0' }}>
          {visibleGroups.map((group, gi) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              {collapsed ? (
                gi > 0 && <div style={{ height: 1, background: 'var(--rule)', margin: '8px 14px' }} />
              ) : (
                <div style={{
                  padding: '8px 16px 4px', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)',
                }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '9px 0' : '8px 16px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--accent)' : 'var(--fg-soft)',
                      textDecoration: 'none',
                      background: active ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))' : 'transparent',
                      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                      transition: 'background 0.1s',
                    }}
                  >
                    <Icon name={item.icon} />
                    {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* External links */}
        <div style={{ padding: collapsed ? '10px 0' : '12px 16px', borderTop: '1px solid var(--rule)' }}>
          {EXTERNAL.map(e => (
            <a
              key={e.href}
              href={e.href}
              target="_blank"
              rel="noreferrer"
              title={collapsed ? e.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: '5px 0', fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'none',
              }}
            >
              {collapsed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <>
                  {e.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </a>
          ))}
        </div>

        {/* Active user display */}
        {userEmail && !collapsed && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--rule)' }}>
            <div style={{
              fontSize: 11, color: 'var(--fg-muted)', marginBottom: 5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {userEmail}
            </div>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '2px 7px', borderRadius: 'var(--r-pill)',
              background: 'var(--bg-alt)', color: 'var(--fg-muted)', border: '1px solid var(--rule)',
            }}>
              {ROLE_LABELS[userRole] ?? userRole}
            </span>
          </div>
        )}

        {/* Sign out */}
        <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            style={{
              width: collapsed ? 34 : '100%', height: collapsed ? 34 : undefined,
              padding: collapsed ? 0 : '8px 12px',
              display: collapsed ? 'grid' : 'block', placeItems: 'center',
              fontSize: 12, color: 'var(--fg-muted)', background: 'none',
              border: '1px solid var(--rule)', borderRadius: 'var(--r-md, 8px)',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            {collapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Main content — pages manage their own padding */}
      <main style={{ marginLeft: W, flex: 1, minWidth: 0, minHeight: '100vh', transition: ready ? 'margin-left 0.16s ease' : undefined }}>
        {children}
      </main>
    </div>
  )
}

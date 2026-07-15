'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type NavItem = { href: string; label: string; icon: IconName; roles?: string[]; hint?: string }

// ─── 4 top-level categories (Área 1, punto 1) ────────────────────────────────
const NAV_GROUPS: { key: string; label: string; items: NavItem[] }[] = [
  {
    key: 'contenido-web',
    label: 'Contenido Web',
    items: [
      { href: '/admin/inicio', label: 'Inicio', icon: 'home' },
      { href: '/admin', label: 'Visibilidad y textos', icon: 'sliders', hint: 'Mostrar/ocultar secciones y editar textos cortos del sitio' },
      { href: '/admin/cms', label: 'Editor de contenido', icon: 'edit', hint: 'Editor completo: inversores, operaciones, compañía, ESG, carreras' },
      { href: '/admin/imagenes', label: 'Imágenes', icon: 'image' },
      { href: '/admin/bloques-fotos', label: 'Fotos de bloques', icon: 'image' },
      { href: '/admin/documentos', label: 'Documentos públicos', icon: 'file', hint: 'Balances, reportes y legales visibles para cualquier visitante' },
      { href: '/admin/ir-docs', label: 'Documentos IR (inversores)', icon: 'folder', hint: 'EE.FF., MD&A, AGM, ESTMA, gobierno corporativo' },
      { href: '/admin/biblioteca', label: 'Biblioteca restringida', icon: 'book', hint: 'Documentos con acceso limitado por usuario o grupo' },
      { href: '/admin/marca', label: 'Manual de marca', icon: 'bookmark' },
      { href: '/admin/word-export', label: 'Exportar Word', icon: 'download' },
    ],
  },
  {
    key: 'publicaciones-datos',
    label: 'Publicaciones y Datos',
    items: [
      { href: '/admin/reportes', label: 'Reportes', icon: 'chart' },
      { href: '/admin/kpi', label: 'KPIs Excel', icon: 'grid' },
      { href: '/admin/comunicados', label: 'Comunicados', icon: 'megaphone' },
      { href: '/admin/cnv-sync', label: 'Hechos CNV', icon: 'alert' },
      { href: '/admin/push', label: 'Push', icon: 'bell' },
    ],
  },
  {
    key: 'gestion-accesos',
    label: 'Gestión de Accesos',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
      { href: '/admin/permisos', label: 'Permisos por rol', icon: 'sliders' },
      { href: '/admin/suscriptores', label: 'Suscriptores IR', icon: 'mail' },
      { href: '/admin/ir-alertas', label: 'Alertas IR', icon: 'bell' },
      { href: '/admin/rrhh', label: 'RRHH', icon: 'briefcase', roles: ['rrhh', 'admin'] },
      { href: '/admin/contacto', label: 'Contacto', icon: 'message' },
      { href: '/admin/logs', label: 'Logs', icon: 'activity' },
    ],
  },
  {
    key: 'sistema',
    label: 'Sistema',
    items: [
      { href: '/admin/sitemap', label: 'Sitemap', icon: 'map' },
      { href: '/admin/backup', label: 'Backup', icon: 'database' },
    ],
  },
]

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items)

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
const STORAGE_KEY       = 'cpe-admin-sidebar-collapsed'
const GROUPS_STATE_KEY  = 'cpe-admin-sidebar-groups'
const PINNED_KEY        = 'cpe-admin-sidebar-pinned'
const MAX_PINNED = 4

// ── Icons ─────────────────────────────────────────────────────────
type IconName =
  | 'home' | 'sliders' | 'edit' | 'image' | 'file' | 'folder' | 'book'
  | 'bookmark' | 'download' | 'chart' | 'grid' | 'megaphone' | 'alert'
  | 'bell' | 'users' | 'mail' | 'briefcase' | 'message' | 'activity'
  | 'map' | 'database' | 'pin' | 'search' | 'chevron'

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
  pin:       'M12 2 12 9M8 9h8l1 4H7l1-4zM10 13v9M14 13v9',
  search:    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  chevron:   'M6 9l6 6 6-6',
}

function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
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

function isActiveHref(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

// ─── Breadcrumbs (Área 1, punto 7) ────────────────────────────────────────────
function findNavItem(pathname: string): { group: string; item: NavItem } | null {
  // Exact match first, then longest-prefix match, so nested routes (e.g.
  // /admin/reportes/comparar) still resolve to their parent nav entry.
  let best: { group: string; item: NavItem } | null = null
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isActiveHref(pathname, item.href)) {
        if (!best || item.href.length > best.item.href.length) {
          best = { group: group.label, item }
        }
      }
    }
  }
  return best
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const match = findNavItem(pathname)
  const extra = match && pathname !== match.item.href
    ? pathname.slice(match.item.href.length).replace(/^\//, '').split('/')[0]
    : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      padding: '14px 24px 0', fontSize: 12, color: 'var(--fg-muted)',
    }}>
      <Link href="/admin/inicio" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>Admin</Link>
      {match && (
        <>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>{match.group}</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <Link href={match.item.href} style={{ color: extra ? 'var(--fg-muted)' : 'var(--fg)', fontWeight: extra ? 400 : 600, textDecoration: 'none' }}>
            {match.item.label}
          </Link>
        </>
      )}
      {extra && (
        <>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: 'var(--fg)', fontWeight: 600, textTransform: 'capitalize' }}>{extra.replace(/-/g, ' ')}</span>
        </>
      )}
    </div>
  )
}

// ─── Command palette (Área 1, punto 2) ────────────────────────────────────────
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_ITEMS.slice(0, 8)
    return ALL_ITEMS.filter(i => i.label.toLowerCase().includes(q) || i.href.toLowerCase().includes(q)).slice(0, 8)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => { setIndex(0) }, [query])

  if (!open) return null

  function go(item: NavItem) {
    router.push(item.href)
    onClose()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter') { e.preventDefault(); if (results[index]) go(results[index]); return }
  }

  return (
    <div
      role="dialog" aria-modal="true"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar una sección del panel…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--fg)' }}
          />
          <kbd style={{ fontSize: 10, color: 'var(--fg-muted)', border: '1px solid var(--rule)', borderRadius: 4, padding: '1px 6px' }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: 6 }}>
          {results.length === 0 && (
            <div style={{ padding: '16px', fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>Sin resultados</div>
          )}
          {results.map((item, i) => (
            <button
              key={item.href}
              onClick={() => go(item)}
              onMouseEnter={() => setIndex(i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
                background: i === index ? 'var(--accent-soft, color-mix(in oklab, var(--accent) 10%, var(--surface)))' : 'transparent',
                color: i === index ? 'var(--accent)' : 'var(--fg)', fontSize: 13.5, textAlign: 'left',
              }}
            >
              <Icon name={item.icon} size={15} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [pinned, setPinned] = useState<string[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Restore preferences after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    try {
      const savedGroups = JSON.parse(localStorage.getItem(GROUPS_STATE_KEY) ?? '{}')
      setOpenGroups({
        'contenido-web': true, 'publicaciones-datos': true, 'gestion-accesos': true, 'sistema': true,
        ...savedGroups,
      })
    } catch {
      setOpenGroups({ 'contenido-web': true, 'publicaciones-datos': true, 'gestion-accesos': true, 'sistema': true })
    }
    try {
      setPinned(JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]'))
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close profile menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(GROUPS_STATE_KEY, JSON.stringify(next))
      return next
    })
  }

  function togglePin(href: string) {
    setPinned(prev => {
      const next = prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href].slice(-MAX_PINNED)
      localStorage.setItem(PINNED_KEY, JSON.stringify(next))
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

  const visibleGroups = getVisibleGroups(userRole)
  const pinnedItems = pinned
    .map(href => ALL_ITEMS.find(i => i.href === href))
    .filter((i): i is NavItem => !!i)
  const W = collapsed ? 64 : 240
  const initials = (userEmail || '?').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

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

        {/* Quick search trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          title="Buscar (Ctrl+K)"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            margin: collapsed ? '0 10px 10px' : '0 12px 10px',
            padding: collapsed ? '7px 0' : '7px 10px',
            fontSize: 12.5, color: 'var(--fg-muted)',
            background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8,
            cursor: 'pointer', width: collapsed ? 34 : undefined,
          }}
        >
          <Icon name="search" size={14} />
          {!collapsed && <><span style={{ flex: 1, textAlign: 'left' }}>Buscar…</span><kbd style={{ fontSize: 10, border: '1px solid var(--rule)', borderRadius: 4, padding: '1px 5px' }}>⌘K</kbd></>}
        </button>

        {/* Nav groups */}
        <nav style={{ flex: 1, padding: '4px 0' }}>
          {!collapsed && userRole === 'rrhh' && (
            <div style={{
              margin: '0 12px 10px', padding: '8px 10px', borderRadius: 8,
              background: 'rgba(201,80,40,.08)', border: '1px solid rgba(201,80,40,.2)',
              fontSize: 11, color: '#b03010', lineHeight: 1.4,
            }}>
              Vista restringida a RRHH — el resto del panel de administración no está disponible para tu rol.
            </div>
          )}

          {/* Favoritos / anclados */}
          {!collapsed && pinnedItems.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ padding: '4px 16px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                Favoritos
              </div>
              {pinnedItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '7px 16px',
                    fontSize: 13, fontWeight: isActiveHref(pathname, item.href) ? 600 : 400,
                    color: isActiveHref(pathname, item.href) ? 'var(--accent)' : 'var(--fg-soft)',
                    textDecoration: 'none',
                  }}
                >
                  <Icon name={item.icon} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {visibleGroups.map(group => {
            const isOpen = collapsed ? true : (openGroups[group.key] ?? true)
            return (
              <div key={group.key} style={{ marginBottom: 4 }}>
                {collapsed ? (
                  <div style={{ height: 1, background: 'var(--rule)', margin: '8px 14px' }} />
                ) : (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 16px 4px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)',
                    }}
                  >
                    {group.label}
                    <span style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s', display: 'inline-flex' }}>
                      <Icon name="chevron" size={11} />
                    </span>
                  </button>
                )}
                {isOpen && group.items.map(item => {
                  const active = isActiveHref(pathname, item.href)
                  const isPinned = pinned.includes(item.href)
                  return (
                    <div key={item.href} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : item.hint}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: 11,
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
                      {!collapsed && (
                        <button
                          onClick={() => togglePin(item.href)}
                          title={isPinned ? 'Quitar de favoritos' : 'Anclar a favoritos'}
                          style={{
                            position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer',
                            color: isPinned ? 'var(--gold, #9C7A2E)' : 'var(--fg-muted)',
                            opacity: isPinned ? 1 : 0.35, padding: 2, display: 'flex',
                          }}
                        >
                          <Icon name="pin" size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
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

        {/* Unified profile menu (Área 1, punto 6) */}
        <div ref={profileRef} style={{ position: 'relative', padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid var(--rule)' }}>
          <button
            onClick={() => setProfileOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent-soft, color-mix(in oklab, var(--accent) 12%, var(--surface)))',
              color: 'var(--accent)', fontSize: 11, fontWeight: 700,
              display: 'grid', placeItems: 'center',
            }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail}
                </div>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {ROLE_LABELS[userRole] ?? userRole}
                </div>
              </div>
            )}
          </button>

          {profileOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', left: collapsed ? 0 : 16, right: collapsed ? undefined : 16,
              marginBottom: 8, background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', overflow: 'hidden', minWidth: collapsed ? 200 : undefined,
              zIndex: 50,
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ fontSize: 12, color: 'var(--fg)', wordBreak: 'break-all' }}>{userEmail}</div>
                <span style={{
                  display: 'inline-block', marginTop: 4, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 'var(--r-pill)',
                  background: 'var(--bg-alt)', color: 'var(--fg-muted)', border: '1px solid var(--rule)',
                }}>
                  {ROLE_LABELS[userRole] ?? userRole}
                </span>
              </div>
              <Link href="/portal/mi-cuenta" style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: 'var(--fg-soft)', textDecoration: 'none' }}>
                Mi cuenta
              </Link>
              <button
                onClick={signOut}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: 'var(--cp-negative, #C0392B)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content — pages manage their own padding */}
      <main style={{ marginLeft: W, flex: 1, minWidth: 0, minHeight: '100vh', transition: ready ? 'margin-left 0.16s ease' : undefined }}>
        <Breadcrumbs pathname={pathname} />
        {children}
      </main>
    </div>
  )
}

'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/AdminPageHeader'
import { PERMISSIONS, PERMISSION_GROUPS, ADMIN_LOCKED as ADMIN_LOCKED_LIST } from '@/lib/permissions-config'

const ROLES = ['viewer', 'uploader', 'admin', 'rrhh', 'accionista', 'finanzas', 'compliance'] as const
type Role = typeof ROLES[number]
const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Consulta', uploader: 'Carga', admin: 'Admin', rrhh: 'RRHH', accionista: 'Accionista', finanzas: 'Finanzas', compliance: 'Compliance',
}

// Única fuente de verdad: lib/permissions-config.ts — antes esta pantalla
// tenía su propia lista pegada a mano, que se desactualizaba cada vez que se
// agregaba un permiso nuevo al código (view_investor, view_reservas quedaron
// invisibles acá aunque ya existían y el motor los usaba).
const PERMISSION_LABELS: Record<string, string> = PERMISSIONS as Record<string, string>

const ADMIN_LOCKED: Set<string> = new Set(ADMIN_LOCKED_LIST)

type Matrix = Record<string, Record<string, boolean>>

export default function PermisosPage() {
  const [matrix, setMatrix]   = useState<Matrix>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/permisos')
    if (res.ok) setMatrix(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(role: Role, permission: string, enabled: boolean) {
    if (role === 'admin' && ADMIN_LOCKED.has(permission) && !enabled) return
    const key = `${role}:${permission}`
    setSavingKey(key)
    setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [permission]: enabled } }))
    await fetch('/api/admin/permisos', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role, permission, enabled }),
    })
    setSavingKey('')
  }

  function toggleGroup(titulo: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(titulo)) next.delete(titulo); else next.add(titulo)
      return next
    })
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
      <AdminPageHeader
        title="Permisos por rol"
        subtitle="Cada casilla habilita o deshabilita una acción para todos los usuarios de ese rol."
        note="Los permisos de Admin marcados con 🔒 no se pueden desactivar. Los cambios aplican al siguiente login o recarga de sesión del usuario afectado."
      />

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cargando…</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--rule)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-alt)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#8e91b0', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--rule)' }}>
                  Permiso
                </th>
                {ROLES.map(role => (
                  <th key={role} style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#8e91b0', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--rule)' }}>
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(grupo => {
                const isCollapsed = collapsed.has(grupo.titulo)
                return (
                  <Fragment key={grupo.titulo}>
                    <tr style={{ background: 'var(--bg-alt)' }}>
                      <td
                        colSpan={ROLES.length + 1}
                        onClick={() => toggleGroup(grupo.titulo)}
                        style={{ padding: '8px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '.03em', cursor: 'pointer', userSelect: 'none', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}
                      >
                        <span style={{ display: 'inline-block', width: 12, transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                        {' '}{grupo.titulo}
                      </td>
                    </tr>
                    {!isCollapsed && grupo.permisos.map((perm, i) => (
                      <tr key={perm} style={{ borderBottom: i < grupo.permisos.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                        <td style={{ padding: '10px 14px 10px 30px', color: 'var(--fg)', fontWeight: 500 }}>
                          {PERMISSION_LABELS[perm]}
                        </td>
                        {ROLES.map(role => {
                          const locked = role === 'admin' && ADMIN_LOCKED.has(perm)
                          const key = `${role}:${perm}`
                          return (
                            <td key={role} style={{ textAlign: 'center', padding: '10px 14px' }}>
                              <input
                                type="checkbox"
                                checked={!!matrix[role]?.[perm]}
                                disabled={locked || savingKey === key}
                                onChange={e => toggle(role, perm, e.target.checked)}
                                style={{ width: 16, height: 16, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1 }}
                                title={locked ? 'Siempre activo para Admin' : undefined}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

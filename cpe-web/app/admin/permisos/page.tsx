'use client'

import { useCallback, useEffect, useState } from 'react'

const ROLES = ['viewer', 'uploader', 'admin', 'rrhh', 'accionista'] as const
type Role = typeof ROLES[number]
const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Consulta', uploader: 'Carga', admin: 'Admin', rrhh: 'RRHH', accionista: 'Accionista',
}

const PERMISSION_LABELS: Record<string, string> = {
  view_reports:    'Ver reportes',
  view_dashboard:  'Ver dashboard',
  view_comercial:  'Ver sección comercial',
  view_drafts:     'Ver reportes borrador',
  upload_reports:  'Subir reportes',
  publish_reports: 'Publicar / despublicar reportes',
  delete_reports:  'Eliminar reportes',
  manage_users:    'Gestionar usuarios',
  manage_cms:      'Panel CMS / Admin',
}

const ADMIN_LOCKED = new Set(['manage_users', 'manage_cms'])

type Matrix = Record<string, Record<string, boolean>>

export default function PermisosPage() {
  const [matrix, setMatrix]   = useState<Matrix>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/permisos')
    if (res.ok) setMatrix(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const permissions = Object.keys(PERMISSION_LABELS)

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

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8e91b0', margin: '0 0 4px' }}>
        Gestión
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: '0 0 8px' }}>
        Permisos por rol
      </h1>
      <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '0 0 28px', maxWidth: 620 }}>
        Cada casilla habilita o deshabilita una acción para todos los usuarios de ese rol.
        Los permisos de Admin marcados con 🔒 no se pueden desactivar. Los cambios aplican
        al siguiente login o recarga de sesión del usuario afectado.
      </p>

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
              {permissions.map((perm, i) => (
                <tr key={perm} style={{ borderBottom: i < permissions.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--fg)', fontWeight: 500 }}>
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

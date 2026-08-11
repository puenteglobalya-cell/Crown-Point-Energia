'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { AdminPageHeader } from '@/components/AdminPageHeader'

type CalificacionLocal = {
  plazo: string; fecha: string; rating: string; perspectiva: string; accion: string; synced_at: string
}
type OnVigente = {
  isin: string; concepto: string; fecha: string; rating: string; perspectiva: string; accion: string; synced_at: string
}

const STALE_AFTER_MS = 36 * 60 * 60 * 1000 // 36h — mismo criterio que cnv-sync

export default function FixscrSyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [autoSyncing, setAutoSyncing] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; calificaciones?: number; on?: number; errors?: string[]; error?: string } | null>(null)
  const [calificaciones, setCalificaciones] = useState<CalificacionLocal[] | null>(null)
  const [onVigentes, setOnVigentes] = useState<OnVigente[] | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [autoChecked, setAutoChecked] = useState(false)

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/fixscr-sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setResult({ error: json.error ?? 'Error de sincronización' }); return }
      setResult(json)
      if (json.ok) await loadDatos()
    } catch (e) {
      setResult({ error: (e as Error).message })
    } finally {
      setSyncing(false)
    }
  }

  async function loadDatos() {
    const db = createSupabaseBrowserClient()
    const [c, o] = await Promise.all([
      db.from('fix_calificacion_local').select('*').order('plazo'),
      db.from('fix_on_vigentes').select('*').order('orden'),
    ])
    const rowsC = (c.data ?? []) as CalificacionLocal[]
    const rowsO = (o.data ?? []) as OnVigente[]
    setCalificaciones(rowsC)
    setOnVigentes(rowsO)
    const newest = [...rowsC, ...rowsO].reduce<string | null>(
      (max, r) => (!max || r.synced_at > max ? r.synced_at : max), null
    )
    setLastSyncedAt(newest)
    return newest
  }

  useState(() => {
    (async () => {
      const newest = await loadDatos()
      const isStale = !newest || Date.now() - new Date(newest).getTime() > STALE_AFTER_MS
      setAutoChecked(true)
      if (isStale) {
        setAutoSyncing(true)
        try { await handleSync() } finally { setAutoSyncing(false) }
      }
    })()
  })

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 'var(--s-8)' }}>
        <AdminPageHeader
          title="Calificación crediticia y ON"
          subtitle="FIX SCR"
          note={
            <>
              Sincroniza automáticamente desde{' '}
              <a href="https://www.fixscr.com/emisor/view?type=emisor&id=4052" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                fixscr.com
              </a>{' '}
              todos los días. También podés forzar una sincronización manual — nuevas ON que aparezcan ahí se agregan solas, no hace falta cargarlas a mano.
              {lastSyncedAt && (
                <> · última sincronización: {new Date(lastSyncedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
              )}
            </>
          }
        />
      </div>

      {autoChecked && autoSyncing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--s-4)',
          padding: '10px 14px', background: 'rgba(31,37,102,.06)', border: '1px solid rgba(31,37,102,.18)',
          borderRadius: 'var(--r-md)', fontSize: 12.5, color: 'var(--fg-soft)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          La última sincronización quedó vieja — revisando automáticamente contra fixscr.com…
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'var(--s-8)', padding: 'var(--s-6)', background: 'var(--bg-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)' }}>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            padding: '10px 20px', borderRadius: 'var(--r-pill)',
            background: syncing ? 'var(--bg-alt)' : 'var(--cp-navy)',
            color: syncing ? 'var(--fg-muted)' : '#fff',
            border: '1px solid var(--rule)',
            fontWeight: 600, fontSize: 13, cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>

        {result && (
          <div style={{ fontSize: 13, color: result.ok ? 'var(--cp-green)' : 'var(--cp-red, #e53)' }}>
            {result.ok
              ? `✓ ${result.calificaciones} calificación(es) + ${result.on} ON sincronizadas${result.errors?.length ? ` (avisos: ${result.errors.join(', ')})` : ''}`
              : `Error: ${result.error ?? result.errors?.join(', ')}`
            }
          </div>
        )}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Calificación — Deuda Local</h3>
      {calificaciones !== null && (
        calificaciones.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 'var(--s-8)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Plazo</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Fecha</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Rating</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Perspectiva</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {calificaciones.map(c => (
                <tr key={c.plazo} style={{ borderTop: '1px solid var(--rule)' }}>
                  <td style={{ padding: '10px 14px' }}>{c.plazo}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{c.fecha}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{c.rating}</td>
                  <td style={{ padding: '10px 14px' }}>{c.perspectiva}</td>
                  <td style={{ padding: '10px 14px' }}>{c.accion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', border: '1px dashed var(--rule)', borderRadius: 'var(--r-lg)', color: 'var(--fg-muted)', fontSize: 13, marginBottom: 'var(--s-8)' }}>
            Sin datos. Presioná "Sincronizar ahora".
          </div>
        )
      )}

      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Obligaciones Negociables vigentes</h3>
      {onVigentes !== null && (
        onVigentes.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--rule)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Instrumento</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Fecha</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>ISIN</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Rating</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Perspectiva</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {onVigentes.map(o => (
                <tr key={o.isin} style={{ borderTop: '1px solid var(--rule)' }}>
                  <td style={{ padding: '10px 14px' }}>{o.concepto}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{o.fecha}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{o.isin}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{o.rating}</td>
                  <td style={{ padding: '10px 14px' }}>{o.perspectiva}</td>
                  <td style={{ padding: '10px 14px' }}>{o.accion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 'var(--s-8)', textAlign: 'center', border: '1px dashed var(--rule)', borderRadius: 'var(--r-lg)', color: 'var(--fg-muted)', fontSize: 13 }}>
            Sin datos. Presioná "Sincronizar ahora".
          </div>
        )
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

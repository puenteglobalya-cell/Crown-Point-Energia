'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type CnvHecho = {
  doc_id: number
  fecha: string
  hora: string
  tipo: string
  descripcion: string
  pdf_url: string | null
  synced_at: string
}

export default function CnvSyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult]   = useState<{ ok?: boolean; inserted?: number; errors?: string[]; error?: string } | null>(null)
  const [hechos, setHechos]   = useState<CnvHecho[] | null>(null)

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/cnv-sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setResult({ error: json.error ?? 'Error de sincronización' }); return }
      setResult(json)
      if (json.ok) await loadHechos()
    } catch (e) {
      setResult({ error: (e as Error).message })
    } finally {
      setSyncing(false)
    }
  }

  async function loadHechos() {
    const db = createSupabaseBrowserClient()
    const { data } = await db
      .from('cnv_hechos')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(50)
    setHechos((data ?? []) as CnvHecho[])
  }

  useState(() => { loadHechos() })

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 'var(--s-8)' }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
          CNV · AIF
        </span>
        <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>
          Hechos relevantes
        </h1>
        <p style={{ fontSize: 14, color: 'var(--fg-soft)', maxWidth: 620 }}>
          Sincroniza automáticamente desde{' '}
          <a href="https://www.cnv.gov.ar/SitioWeb/Empresas/Empresa/30709346268" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            cnv.gov.ar
          </a>{' '}
          cada día hábil a las 8:00 AM (Argentina). También podés forzar una sincronización manual.
        </p>
      </div>

      {/* Sync button */}
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
          {syncing ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Sincronizando…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Sincronizar ahora
            </>
          )}
        </button>

        {result && (
          <div style={{ fontSize: 13, color: result.ok ? 'var(--cp-green)' : 'var(--cp-red, #e53)' }}>
            {result.ok
              ? `✓ ${result.inserted} registros sincronizados${result.errors?.length ? ` (avisos: ${result.errors.join(', ')})` : ''}`
              : `Error: ${result.error ?? result.errors?.join(', ')}`
            }
          </div>
        )}
      </div>

      {/* Table */}
      {hechos !== null && (
        hechos.length > 0 ? (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--rule)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', width: 110 }}>Fecha</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', width: 80 }}>Tipo</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Descripción</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', width: 80 }}>Doc</th>
                </tr>
              </thead>
              <tbody>
                {hechos.map((h, i) => (
                  <tr key={h.doc_id} style={{ borderTop: i > 0 ? '1px solid var(--rule)' : 'none', background: 'var(--surface)' }}>
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                      {h.fecha}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 4,
                        background: h.tipo === 'hecho_relevante' ? 'rgba(108,174,82,.15)' : 'rgba(31,37,102,.1)',
                        color: h.tipo === 'hecho_relevante' ? 'var(--cp-green)' : 'var(--cp-navy)',
                      }}>
                        {h.tipo === 'hecho_relevante' ? 'HR' : 'EC'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--fg)', lineHeight: 1.5 }}>
                      {h.descripcion}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                      {h.pdf_url && (
                        <a href={h.pdf_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                          {h.doc_id}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 'var(--s-10)', textAlign: 'center', border: '1px dashed var(--rule)', borderRadius: 'var(--r-lg)', color: 'var(--fg-muted)', fontSize: 14 }}>
            No hay registros. Presioná "Sincronizar ahora" para importar desde CNV.
          </div>
        )
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

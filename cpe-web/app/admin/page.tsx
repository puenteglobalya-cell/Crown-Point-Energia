'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { CMSState } from '@/lib/cms'

// ─── Schema ────────────────────────────────────────────────────────────────

const SECTIONS: { key: string; labelEs: string; labelEn: string }[] = [
  { key: 'ticker',              labelEs: 'Ticker bar',              labelEn: 'Ticker bar' },
  { key: 'hero',                labelEs: 'Hero',                    labelEn: 'Hero' },
  { key: 'basinsStrip',         labelEs: 'Tira de cuencas',         labelEn: 'Basins strip' },
  { key: 'kpis',                labelEs: 'KPIs',                    labelEn: 'KPIs' },
  { key: 'ops',                 labelEs: 'Operaciones (home)',       labelEn: 'Operations (home)' },
  { key: 'investor',            labelEs: 'Sección inversor',        labelEn: 'Investor section' },
  { key: 'investor.quotePanel', labelEs: 'Panel cotización',        labelEn: 'Quote panel' },
  { key: 'investor.sparkline',  labelEs: 'Sparkline precio',        labelEn: 'Price sparkline' },
  { key: 'investor.beta',       labelEs: 'Beta',                    labelEn: 'Beta' },
  { key: 'investor.vol30',      labelEs: 'Volumen 30d',             labelEn: '30d volume' },
  { key: 'investor.high52',     labelEs: 'Máximo 52 sem.',          labelEn: '52w high' },
  { key: 'investor.low52',      labelEs: 'Mínimo 52 sem.',          labelEn: '52w low' },
  { key: 'investor.cap',        labelEs: 'Cap. de mercado',         labelEn: 'Market cap' },
  { key: 'investor.shares',     labelEs: 'Acciones en circulación', labelEn: 'Shares outstanding' },
  { key: 'press',               labelEs: 'Prensa (home)',           labelEn: 'Press (home)' },
  { key: 'contact',             labelEs: 'Contacto (home)',         labelEn: 'Contact CTA (home)' },
]

const TEXT_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: 'Producción',
    items: [
      { key: 'kpi.production.value', label: 'Valor' },
      { key: 'kpi.production.unit',  label: 'Unidad' },
      { key: 'kpi.production.delta', label: 'Delta' },
    ],
  },
  {
    group: 'Reservas',
    items: [
      { key: 'kpi.reserves.value', label: 'Valor' },
      { key: 'kpi.reserves.unit',  label: 'Unidad' },
      { key: 'kpi.reserves.delta', label: 'Delta' },
    ],
  },
  {
    group: 'EBITDA',
    items: [
      { key: 'kpi.ebitda.value', label: 'Valor' },
      { key: 'kpi.ebitda.unit',  label: 'Unidad' },
      { key: 'kpi.ebitda.delta', label: 'Delta' },
    ],
  },
  {
    group: 'Bloques',
    items: [
      { key: 'kpi.blocks.value', label: 'Valor' },
      { key: 'kpi.blocks.unit',  label: 'Unidad' },
      { key: 'kpi.blocks.delta', label: 'Delta' },
    ],
  },
  {
    group: 'Stock (TSXV: CWV)',
    items: [
      { key: 'stock.price',  label: 'Precio' },
      { key: 'stock.delta',  label: 'Cambio' },
      { key: 'stock.beta',   label: 'Beta' },
      { key: 'stock.vol30',  label: 'Vol. 30d' },
      { key: 'stock.high52', label: 'Máx. 52 sem.' },
      { key: 'stock.low52',  label: 'Mín. 52 sem.' },
      { key: 'stock.cap',    label: 'Market cap' },
      { key: 'stock.shares', label: 'Acciones en circ.' },
    ],
  },
]

type Tab = 'estilo' | 'visibilidad' | 'textos' | 'export'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('estilo')
  const [state, setState] = useState<CMSState | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Local draft edits before save
  const [draftFields, setDraftFields] = useState<Record<string, string>>({})
  const [exportJson, setExportJson] = useState('')
  const [copyMsg, setCopyMsg] = useState('')

  const loadState = useCallback(async () => {
    const res = await fetch('/api/cms/state', { cache: 'no-store' })
    if (res.ok) {
      const s: CMSState = await res.json()
      setState(s)
      setDraftFields({ ...s.fields })
      setExportJson(JSON.stringify(s, null, 2))
    }
  }, [])

  useEffect(() => { loadState() }, [loadState])

  async function save(patch: Partial<CMSState>) {
    setSaving(true)
    const res = await fetch('/api/cms/state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      await loadState()
      setSavedMsg('Guardado')
      setTimeout(() => setSavedMsg(''), 2000)
    }
    setSaving(false)
  }

  async function saveFields() {
    await save({ fields: draftFields })
  }

  async function handleReset() {
    if (!confirm('¿Restablecer todos los ajustes al valor por defecto?')) return
    await fetch('/api/cms/state', { method: 'POST', body: JSON.stringify({ _reset: true }), headers: { 'content-type': 'application/json' } })
    await loadState()
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  if (!state) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Cargando…</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
              CMS — Crown Point
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
              Los cambios se reflejan en el sitio público en hasta 60&nbsp;s.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {savedMsg && (
              <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ✓ {savedMsg}
              </span>
            )}
            <Link href="/admin/documentos" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Documentos
            </Link>
            <Link href="/admin/comunicados" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Comunicados
            </Link>
            <button onClick={handleSignOut} className="btn" style={{ fontSize: 13, padding: '8px 16px' }}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--rule)', marginBottom: 28 }}>
          {(['estilo', 'visibilidad', 'textos', 'export'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--fg)' : 'var(--fg-muted)',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Tab: Estilo ───────────────────────────────────────────────── */}
        {tab === 'estilo' && (
          <div style={{ display: 'grid', gap: 28 }}>
            <RadioGroup
              label="Dirección visual"
              value={state.direction}
              options={[
                { value: 'corporativo', label: 'Corporativo', desc: 'Azul navy — comunicación institucional' },
                { value: 'editorial',   label: 'Editorial',   desc: 'Tipografía prominente — press / IR' },
                { value: 'industrial',  label: 'Industrial',  desc: 'Grid denso — foco técnico operaciones' },
              ]}
              onChange={v => save({ direction: v as CMSState['direction'] })}
              saving={saving}
            />
            <RadioGroup
              label="Tema"
              value={state.theme}
              options={[
                { value: 'light', label: 'Claro' },
                { value: 'dark',  label: 'Oscuro' },
              ]}
              onChange={v => save({ theme: v as CMSState['theme'] })}
              saving={saving}
            />
            <RadioGroup
              label="Idioma por defecto"
              value={state.lang}
              options={[
                { value: 'es', label: 'Español' },
                { value: 'en', label: 'English' },
              ]}
              onChange={v => save({ lang: v as CMSState['lang'] })}
              saving={saving}
            />

            {/* Maintenance mode */}
            <div style={{ paddingTop: 8, borderTop: '1px solid var(--rule)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-soft)', marginBottom: 12 }}>
                Modo mantenimiento
              </div>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                background: state.maintenance
                  ? 'color-mix(in oklab, var(--cp-negative) 10%, var(--surface))'
                  : 'var(--surface)',
                border: `1px solid ${state.maintenance ? 'var(--cp-negative)' : 'var(--rule)'}`,
                borderRadius: 'var(--r-md)', cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>
                    {state.maintenance ? 'Sitio fuera de servicio' : 'Sitio en línea'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>
                    {state.maintenance
                      ? 'Los visitantes ven la página de mantenimiento. El panel /admin sigue accesible.'
                      : 'El sitio es visible para todos. Activá para ocultarlo mientras hacés cambios.'}
                  </div>
                </div>
                <div
                  style={{
                    width: 48, height: 26, borderRadius: 13, flexShrink: 0, marginLeft: 16,
                    background: state.maintenance ? 'var(--cp-negative)' : 'var(--rule)',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                  onClick={() => !saving && save({ maintenance: !state.maintenance })}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: state.maintenance ? 25 : 3,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ── Tab: Visibilidad ──────────────────────────────────────────── */}
        {tab === 'visibilidad' && (
          <div>
            {/* Toggle all */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button
                className="btn"
                style={{ fontSize: 12, padding: '7px 16px' }}
                onClick={() => {
                  const allShow: Record<string, boolean> = {}
                  SECTIONS.forEach(s => { allShow[s.key] = true })
                  save({ show: allShow })
                }}
                disabled={saving}
              >
                Mostrar todo
              </button>
              <button
                className="btn"
                style={{ fontSize: 12, padding: '7px 16px' }}
                onClick={() => {
                  const allShow: Record<string, boolean> = {}
                  SECTIONS.forEach(s => { allShow[s.key] = false })
                  save({ show: allShow })
                }}
                disabled={saving}
              >
                Ocultar todo
              </button>
            </div>
          <div style={{ display: 'grid', gap: 2 }}>
            {SECTIONS.map(s => {
              const visible = state.show[s.key] !== false
              return (
                <label
                  key={s.key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0', borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{s.labelEs}</span>
                    {s.labelEn !== s.labelEs && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                        {s.key}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: visible ? 'var(--accent)' : 'var(--rule)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                    onClick={() => save({ show: { ...state.show, [s.key]: !visible } })}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: visible ? 22 : 3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                    }} />
                  </div>
                </label>
              )
            })}
          </div>
          </div>
        )}

        {/* ── Tab: Textos ───────────────────────────────────────────────── */}
        {tab === 'textos' && (
          <div>
            {TEXT_GROUPS.map(g => (
              <div key={g.group} style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
                  {g.group}
                </h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {g.items.map(item => (
                    <div key={item.key} className="form-row" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 12 }}>
                      <label style={{ fontSize: 13, color: 'var(--fg-soft)', fontWeight: 500, margin: 0 }}>
                        {item.label}
                        <span style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', marginTop: 1 }}>{item.key}</span>
                      </label>
                      <input
                        type="text"
                        value={draftFields[item.key] ?? ''}
                        onChange={e => setDraftFields(prev => ({ ...prev, [item.key]: e.target.value }))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                className="btn btn-primary"
                onClick={saveFields}
                disabled={saving}
                style={{ justifyContent: 'center', padding: '14px 32px', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Guardando…' : 'Guardar textos'}
              </button>
              {savedMsg && (
                <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ✓ {savedMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Export ───────────────────────────────────────────────── */}
        {tab === 'export' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <textarea
              readOnly
              value={exportJson}
              style={{
                width: '100%', height: 420, fontFamily: 'var(--font-mono)', fontSize: 12,
                background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
                padding: 16, color: 'var(--fg-soft)', resize: 'vertical', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(exportJson)
                  setCopyMsg('¡Copiado!')
                  setTimeout(() => setCopyMsg(''), 2000)
                }}
                style={{ justifyContent: 'center' }}
              >
                {copyMsg || 'Copiar JSON'}
              </button>
              <button
                className="btn"
                onClick={handleReset}
                style={{ justifyContent: 'center', color: 'var(--cp-negative)' }}
              >
                Restablecer por defecto
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── RadioGroup component ───────────────────────────────────────────────────

function RadioGroup({
  label,
  value,
  options,
  onChange,
  saving,
}: {
  label: string
  value: string
  options: { value: string; label: string; desc?: string }[]
  onChange: (v: string) => void
  saving: boolean
}) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-soft)', marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <label
            key={opt.value}
            style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              padding: '12px 16px',
              background: value === opt.value ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))' : 'var(--surface)',
              border: `1px solid ${value === opt.value ? 'var(--accent)' : 'var(--rule)'}`,
              borderRadius: 'var(--r-md)', cursor: saving ? 'not-allowed' : 'pointer',
              minWidth: 140, opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
            }}
            onClick={() => !saving && value !== opt.value && onChange(opt.value)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', border: `2px solid ${value === opt.value ? 'var(--accent)' : 'var(--rule)'}`,
                background: value === opt.value ? 'var(--accent)' : 'transparent',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{opt.label}</span>
            </div>
            {opt.desc && (
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 24 }}>{opt.desc}</span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

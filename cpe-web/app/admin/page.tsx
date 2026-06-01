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

type FieldItem = {
  key: string
  label: string
  keyEn?: string
  bilingualCol?: boolean
  multiline?: boolean
}

type PageGroup = {
  page: string
  route: string
  groups: { group: string; items: FieldItem[] }[]
}

const PAGE_GROUPS: PageGroup[] = [
  {
    page: 'Inicio',
    route: '/',
    groups: [
      {
        group: 'Imagen hero',
        items: [
          { key: 'hero.home.img', label: 'URL foto hero (pegar desde /admin/imagenes)' },
        ],
      },
      {
        group: 'Hero · Textos',
        items: [
          { key: 'hero.title.es', label: 'Titular',     keyEn: 'hero.title.en', multiline: true },
          { key: 'hero.lede.es',  label: 'Descripción', keyEn: 'hero.lede.en',  multiline: true },
        ],
      },
      {
        group: 'KPIs · Período',
        items: [
          { key: 'kpis.periodo.es', label: 'Período', keyEn: 'kpis.periodo.en' },
        ],
      },
      {
        group: 'KPI Producción',
        items: [
          { key: 'kpi.production.value', label: 'Valor' },
          { key: 'kpi.production.unit',  label: 'Unidad' },
          { key: 'kpi.production.delta', label: 'Delta' },
        ],
      },
      {
        group: 'KPI Reservas',
        items: [
          { key: 'kpi.reserves.value', label: 'Valor' },
          { key: 'kpi.reserves.unit',  label: 'Unidad' },
          { key: 'kpi.reserves.delta', label: 'Delta' },
        ],
      },
      {
        group: 'KPI EBITDA',
        items: [
          { key: 'kpi.ebitda.value', label: 'Valor' },
          { key: 'kpi.ebitda.unit',  label: 'Unidad' },
          { key: 'kpi.ebitda.delta', label: 'Delta' },
        ],
      },
      {
        group: 'KPI Bloques',
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
    ],
  },
  {
    page: 'Inversores',
    route: '/inversores',
    groups: [
      {
        group: 'Imagen hero',
        items: [
          { key: 'hero.inversores.img', label: 'URL foto hero' },
        ],
      },
      {
        group: 'Hero · Textos',
        items: [
          { key: 'page.inversores.h1',   label: 'Titular',     bilingualCol: true, multiline: true },
          { key: 'page.inversores.lede', label: 'Descripción', bilingualCol: true, multiline: true },
        ],
      },
      {
        group: 'Tesis de inversión · KPIs',
        items: [
          { key: 'inv.thesis.1.val',  label: '01 Producción — Valor' },
          { key: 'inv.thesis.1.unit', label: '01 Producción — Unidad' },
          { key: 'inv.thesis.1.meta', label: '01 Producción — Meta', bilingualCol: true },
          { key: 'inv.thesis.2.val',  label: '02 Costos — Valor' },
          { key: 'inv.thesis.2.unit', label: '02 Costos — Unidad' },
          { key: 'inv.thesis.2.meta', label: '02 Costos — Meta', bilingualCol: true },
          { key: 'inv.thesis.3.val',  label: '03 Apalancamiento — Valor' },
          { key: 'inv.thesis.3.unit', label: '03 Apalancamiento — Unidad' },
          { key: 'inv.thesis.3.meta', label: '03 Apalancamiento — Meta', bilingualCol: true },
          { key: 'inv.thesis.4.val',  label: '04 Pipeline — Valor' },
          { key: 'inv.thesis.4.unit', label: '04 Pipeline — Unidad', bilingualCol: true },
          { key: 'inv.thesis.4.meta', label: '04 Pipeline — Meta' },
        ],
      },
    ],
  },
  {
    page: 'Operaciones',
    route: '/operaciones',
    groups: [
      {
        group: 'Imagen hero',
        items: [
          { key: 'hero.operaciones.img', label: 'URL foto hero' },
        ],
      },
      {
        group: 'Hero · Textos',
        items: [
          { key: 'page.operaciones.h1',   label: 'Titular',     bilingualCol: true, multiline: true },
          { key: 'page.operaciones.lede', label: 'Descripción', bilingualCol: true, multiline: true },
        ],
      },
      {
        group: 'KPIs del encabezado',
        items: [
          { key: 'ops.kpi.acreage',         label: 'Hectáreas operadas' },
          { key: 'ops.kpi.wells',           label: 'Pozos productores' },
          { key: 'ops.kpi.wells.meta',      label: 'Pozos — nota (inyectores)', bilingualCol: true },
          { key: 'ops.kpi.production',      label: 'Producción promedio' },
          { key: 'ops.kpi.production.meta', label: 'Producción — período' },
          { key: 'ops.kpi.mix',             label: 'Mix gas/líquidos' },
        ],
      },
    ],
  },
  {
    page: 'Acerca de',
    route: '/acerca',
    groups: [
      {
        group: 'Imagen hero',
        items: [
          { key: 'hero.acerca.img', label: 'URL foto hero' },
        ],
      },
      {
        group: 'Hero · Textos',
        items: [
          { key: 'page.acerca.h1',   label: 'Titular',     bilingualCol: true, multiline: true },
          { key: 'page.acerca.lede', label: 'Descripción', bilingualCol: true, multiline: true },
        ],
      },
    ],
  },
  {
    page: 'ESG',
    route: '/esg',
    groups: [
      {
        group: 'Imagen hero',
        items: [
          { key: 'hero.esg.img', label: 'URL foto hero' },
        ],
      },
      {
        group: 'Hero · Textos',
        items: [
          { key: 'page.esg.h1',   label: 'Titular',     bilingualCol: true, multiline: true },
          { key: 'page.esg.lede', label: 'Descripción', bilingualCol: true, multiline: true },
        ],
      },
      {
        group: 'KPIs de impacto',
        items: [
          { key: 'esg.kpi.emissions',  label: 'Reducción emisiones' },
          { key: 'esg.kpi.water',      label: 'Agua reinyectada' },
          { key: 'esg.kpi.trir',       label: 'TRIR seguridad' },
          { key: 'esg.kpi.directors',  label: 'Directores independientes' },
        ],
      },
    ],
  },
  {
    page: 'Carreras',
    route: '/carreras',
    groups: [
      {
        group: 'Hero',
        items: [
          { key: 'page.carreras.h1',   label: 'Titular',     bilingualCol: true, multiline: true },
          { key: 'page.carreras.lede', label: 'Descripción', bilingualCol: true, multiline: true },
        ],
      },
    ],
  },
  {
    page: 'Contacto',
    route: '/contacto',
    groups: [
      {
        group: 'Imagen hero',
        items: [
          { key: 'hero.contacto.img', label: 'URL foto hero' },
        ],
      },
      {
        group: 'Hero · Textos',
        items: [
          { key: 'page.contacto.h1',   label: 'Titular',     bilingualCol: true, multiline: true },
          { key: 'page.contacto.lede', label: 'Descripción', bilingualCol: true, multiline: true },
        ],
      },
      {
        group: 'Argentina',
        items: [
          { key: 'contact.ar.address', label: 'Dirección', multiline: true },
          { key: 'contact.ar.phone',   label: 'Teléfono' },
          { key: 'contact.ar.email',   label: 'Email' },
        ],
      },
      {
        group: 'Canadá',
        items: [
          { key: 'contact.ca.address', label: 'Dirección', multiline: true },
          { key: 'contact.ca.phone',   label: 'Teléfono' },
          { key: 'contact.ca.email',   label: 'Email' },
        ],
      },
      {
        group: 'Agente de Transferencia',
        items: [
          { key: 'contact.ta.name',    label: 'Nombre' },
          { key: 'contact.ta.address', label: 'Dirección', multiline: true },
          { key: 'contact.ta.phone',   label: 'Teléfono' },
          { key: 'contact.ta.url',     label: 'Sitio web' },
        ],
      },
      {
        group: 'Relaciones con Inversores',
        items: [
          { key: 'contact.ir.email', label: 'Email IR' },
        ],
      },
      {
        group: 'Línea de ética',
        items: [
          { key: 'contact.ethics.phone', label: 'Teléfono ética' },
          { key: 'contact.ethics.email', label: 'Email ética' },
        ],
      },
    ],
  },
]

function filterBySearch(pg: PageGroup, q: string): PageGroup | null {
  if (!q) return pg
  const ql = q.toLowerCase()
  if (pg.page.toLowerCase().includes(ql) || pg.route.toLowerCase().includes(ql)) return pg
  const groups = pg.groups
    .map(g => {
      if (g.group.toLowerCase().includes(ql)) return g
      const items = g.items.filter(it =>
        it.label.toLowerCase().includes(ql) || it.key.toLowerCase().includes(ql)
      )
      return items.length > 0 ? { ...g, items } : null
    })
    .filter((g): g is { group: string; items: FieldItem[] } => g !== null)
  return groups.length > 0 ? { ...pg, groups } : null
}

type Tab = 'estilo' | 'visibilidad' | 'textos' | 'sitio' | 'export'

const TAB_LABELS: Record<Tab, string> = {
  estilo:       'Estilo',
  visibilidad:  'Visibilidad',
  textos:       'Textos',
  sitio:        'Vista previa',
  export:       'Export',
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('estilo')
  const [state, setState] = useState<CMSState | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [draftFields, setDraftFields] = useState<Record<string, string>>({})
  const [draftFieldsEn, setDraftFieldsEn] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [openPages, setOpenPages] = useState<Record<string, boolean>>({})
  const [exportJson, setExportJson] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  const [iframeKey, setIframeKey] = useState(0)

  const loadState = useCallback(async () => {
    const res = await fetch('/api/cms/state', { cache: 'no-store' })
    if (res.ok) {
      const s: CMSState = await res.json()
      setState(s)
      setDraftFields({ ...s.fields })
      setDraftFieldsEn({ ...s.fieldsEn })
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
    await save({ fields: draftFields, fieldsEn: draftFieldsEn })
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
      <div style={{ maxWidth: tab === 'sitio' ? 1280 : 760, margin: '0 auto', transition: 'max-width 0.2s' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                CMS — Crown Point
              </h1>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
                Los cambios se reflejan en el sitio público en hasta 60&nbsp;s.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {savedMsg && (
                <span style={{ fontSize: 12, color: 'var(--cp-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ✓ {savedMsg}
                </span>
              )}
              <button onClick={handleSignOut} className="btn" style={{ fontSize: 13, padding: '8px 16px' }}>
                Cerrar sesión
              </button>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Admin tools */}
            <Link href="/admin/cms" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Contenido del sitio
            </Link>
            <Link href="/admin/imagenes" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Imágenes
            </Link>
            <Link href="/admin/documentos" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Documentos
            </Link>
            <Link href="/admin/biblioteca" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Biblioteca
            </Link>
            <Link href="/admin/comunicados" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Comunicados
            </Link>
            <Link href="/admin/reportes" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Reportes
            </Link>
            <Link href="/admin/usuarios" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
              Usuarios
            </Link>

            {/* Divider */}
            <span style={{ width: 1, height: 24, background: 'var(--rule)', margin: '0 4px', flexShrink: 0 }} />

            {/* User-facing links */}
            <Link href="/" target="_blank" rel="noreferrer" style={{
              fontSize: 13, padding: '7px 14px', textDecoration: 'none',
              border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
              color: 'var(--fg-soft)', display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--surface)',
            }}>
              Sitio web
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/biblioteca" target="_blank" rel="noreferrer" style={{
              fontSize: 13, padding: '7px 14px', textDecoration: 'none',
              border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
              color: 'var(--fg-soft)', display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--surface)',
            }}>
              Biblioteca
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/portal" target="_blank" rel="noreferrer" style={{
              fontSize: 13, padding: '7px 14px', textDecoration: 'none',
              border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
              color: 'var(--fg-soft)', display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--surface)',
            }}>
              Portal
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </nav>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--rule)', marginBottom: 28 }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
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
              {TAB_LABELS[t]}
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
            {/* Search bar */}
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <svg
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }}
                width="15" height="15" viewBox="0 0 24 24" fill="none"
              >
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="search"
                placeholder="Buscar por campo, clave o página…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', fontSize: 14, padding: '10px 14px 10px 36px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Page accordions */}
            {PAGE_GROUPS.map(pg => {
              const filtered = filterBySearch(pg, search)
              if (!filtered) return null
              const isOpen = search ? true : (openPages[pg.page] !== false)
              return (
                <div key={pg.page} style={{ marginBottom: 6, border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <button
                    onClick={() => { if (!search) setOpenPages(p => ({ ...p, [pg.page]: !isOpen })) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 18px',
                      background: isOpen ? 'color-mix(in oklab, var(--accent) 6%, var(--surface))' : 'var(--surface)',
                      border: 'none', cursor: search ? 'default' : 'pointer', textAlign: 'left', gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{pg.page}</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', background: 'var(--bg-alt)', padding: '2px 8px', borderRadius: 4 }}>
                        {pg.route}
                      </span>
                    </div>
                    {!search && (
                      <svg
                        style={{ color: 'var(--fg-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                      >
                        <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {isOpen && (
                    <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--rule)' }}>
                      {filtered.groups.map((g, gi) => (
                        <div key={g.group} style={{ marginBottom: gi < filtered.groups.length - 1 ? 28 : 0 }}>
                          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, marginTop: 0 }}>
                            {g.group}
                          </h3>
                          <div style={{ display: 'grid', gap: 12 }}>
                            {g.items.map(item => {
                              const hasBilingual = item.bilingualCol || !!item.keyEn
                              return (
                                <div
                                  key={item.key}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: hasBilingual ? '140px 1fr 1fr' : '140px 1fr',
                                    alignItems: 'start',
                                    gap: 12,
                                  }}
                                >
                                  <label style={{ fontSize: 13, color: 'var(--fg-soft)', fontWeight: 500, margin: 0, paddingTop: hasBilingual ? 20 : 0 }}>
                                    {item.label}
                                    <span style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', marginTop: 1 }}>
                                      {item.key}
                                    </span>
                                  </label>

                                  {item.bilingualCol ? (
                                    <>
                                      <BilingualInput
                                        lang="ES"
                                        value={draftFields[item.key] ?? ''}
                                        onChange={v => setDraftFields(p => ({ ...p, [item.key]: v }))}
                                        multiline={item.multiline}
                                      />
                                      <BilingualInput
                                        lang="EN"
                                        value={draftFieldsEn[item.key] ?? ''}
                                        onChange={v => setDraftFieldsEn(p => ({ ...p, [item.key]: v }))}
                                        multiline={item.multiline}
                                      />
                                    </>
                                  ) : item.keyEn ? (
                                    <>
                                      <BilingualInput
                                        lang="ES"
                                        value={draftFields[item.key] ?? ''}
                                        onChange={v => setDraftFields(p => ({ ...p, [item.key]: v }))}
                                        multiline={item.multiline}
                                      />
                                      <BilingualInput
                                        lang="EN"
                                        value={draftFields[item.keyEn] ?? ''}
                                        onChange={v => setDraftFields(p => ({ ...p, [item.keyEn!]: v }))}
                                        multiline={item.multiline}
                                      />
                                    </>
                                  ) : item.multiline ? (
                                    <textarea
                                      rows={3}
                                      value={draftFields[item.key] ?? ''}
                                      onChange={e => setDraftFields(p => ({ ...p, [item.key]: e.target.value }))}
                                      style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={draftFields[item.key] ?? ''}
                                      onChange={e => setDraftFields(p => ({ ...p, [item.key]: e.target.value }))}
                                      style={{ width: '100%' }}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 20 }}>
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

        {/* ── Tab: Vista previa (espejo) ────────────────────────────────── */}
        {tab === 'sitio' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
                Vista en tiempo real del sitio público. Los cambios guardados aparecen en hasta 60 s.
              </p>
              <button
                className="btn"
                onClick={() => setIframeKey(k => k + 1)}
                style={{ fontSize: 12, padding: '7px 16px', flexShrink: 0, marginLeft: 16 }}
              >
                Recargar
              </button>
            </div>
            <iframe
              key={iframeKey}
              src="/"
              title="Vista previa del sitio"
              style={{
                width: '100%',
                height: 'calc(100vh - 220px)',
                minHeight: 600,
                border: '1px solid var(--rule)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)',
                display: 'block',
              }}
            />
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

// ─── Sub-components ─────────────────────────────────────────────────────────

function BilingualInput({
  lang,
  value,
  onChange,
  multiline,
}: {
  lang: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <div>
      <span style={{
        display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)',
        marginBottom: 4,
      }}>
        {lang}
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%' }}
        />
      )}
    </div>
  )
}

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

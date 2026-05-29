'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

type IrEvent = { id: string; fecha: string; tipo: string; titulo_es: string; titulo_en: string; nota_es: string; nota_en: string; activo: boolean; orden: number }
type IrAnalyst = { id: string; analyst: string; firm: string; rating_es: string; rating_en: string; target: string; activo: boolean; orden: number }
type ObligacionNegociable = { id: string; serie: string; monto: string; vencimiento: string; tasa: string; isin: string; bolsa: string; activo: boolean; orden: number }
type OperationsBlock = { id: string; slug: string; orden: number; commodity: string; eyebrow: string; titulo: string; lede_es: string; lede_en: string; card_title_es: string; card_title_en: string; chips: string[]; body_es: string[]; body_en: string[]; stats: unknown; map_stats: unknown; activo: boolean }
type TeamMember = { id: string; name: string; role_es: string; role_en: string; bio_es: string; bio_en: string; initials: string; bg: string; tipo: string; cargo_board: string; independiente: boolean | null; orden: number; activo: boolean }
type StrategyCard = { id: string; num: string; title_es: string; title_en: string; body_es: string; body_en: string; orden: number }
type OpenPosition = { id: string; area: string; location: string; tipo: string; activo: boolean; orden: number }
type CultureCard = { id: string; title_es: string; title_en: string; desc_es: string; desc_en: string; color: string; icon_key: string; orden: number }
type EsgPillar = { pilar: string; color: string; lede_es: string; lede_en: string; metrics: unknown; initiatives_es: string[]; initiatives_en: string[] }
type CmsField = { key: string; value_es: string; value_en: string }

type Tab = 'inversores' | 'operaciones' | 'compannia' | 'esg' | 'carreras' | 'hero'

const TAB_LABELS: Record<Tab, string> = {
  inversores:  'Inversores',
  operaciones: 'Operaciones',
  compannia:   'Compañía',
  esg:         'ESG',
  carreras:    'Carreras',
  hero:        'Textos hero',
}

const HERO_KEYS = [
  { key: 'page.inversores.h1',   label: 'Inversores H1' },
  { key: 'page.inversores.lede', label: 'Inversores Lede' },
  { key: 'page.operaciones.h1',  label: 'Operaciones H1' },
  { key: 'page.operaciones.lede',label: 'Operaciones Lede' },
  { key: 'page.acerca.h1',       label: 'Acerca H1' },
  { key: 'page.acerca.lede',     label: 'Acerca Lede' },
  { key: 'page.esg.h1',          label: 'ESG H1' },
  { key: 'page.esg.lede',        label: 'ESG Lede' },
  { key: 'page.carreras.h1',     label: 'Carreras H1' },
  { key: 'page.carreras.lede',   label: 'Carreras Lede' },
  { key: 'page.contacto.h1',     label: 'Contacto H1' },
  { key: 'page.contacto.lede',   label: 'Contacto Lede' },
]

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(table: string) {
  const res = await fetch(`/api/cms/content/${table}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiCreate(table: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/cms/content/${table}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiUpdate(table: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/cms/content/${table}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function apiDelete(table: string, id: string, isPilar = false) {
  const param = isPilar ? `pilar=${id}` : `id=${id}`
  const res = await fetch(`/api/cms/content/${table}?${param}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function Field({ label, value, onChange, multiline = false, mono = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; mono?: boolean }) {
  const style: React.CSSProperties = { width: '100%', boxSizing: 'border-box', fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? 12 : undefined }
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{label}</label>
      {multiline
        ? <textarea rows={mono ? 5 : 3} value={value} onChange={e => onChange(e.target.value)} style={{ ...style, resize: 'vertical' }} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} style={style} />}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
      <div
        style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'var(--accent)' : 'var(--rule)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
        onClick={() => onChange(!checked)}
      >
        <div style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </div>
      {label}
    </label>
  )
}

function StatusMsg({ msg, error }: { msg: string; error: string }) {
  if (!msg && !error) return null
  return (
    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: error ? 'var(--cp-negative, #e53)' : 'var(--cp-green)' }}>
      {error || `✓ ${msg}`}
    </span>
  )
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h3>
      {onAdd && (
        <button className="btn btn-primary" onClick={onAdd} style={{ fontSize: 12, padding: '6px 14px' }}>
          + Agregar
        </button>
      )}
    </div>
  )
}

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>¿Confirmar?</span>
      <button onClick={onConfirm} style={{ background: 'var(--cp-negative, #e53)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>Sí</button>
      <button onClick={onCancel} style={{ background: 'var(--rule)', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>No</button>
    </span>
  )
}

// ─── Row actions ─────────────────────────────────────────────────────────────

function RowActions({ onEdit, onDelete, deletingId, id, editingId }: { onEdit: () => void; onDelete: () => void; deletingId: string | null; id: string; editingId: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {editingId === id
        ? <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>editando…</span>
        : <button className="btn" onClick={onEdit} style={{ fontSize: 11, padding: '4px 10px' }}>Editar</button>}
      {deletingId === id
        ? <ConfirmDelete onConfirm={onDelete} onCancel={() => {}} />
        : <button onClick={onDelete} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>✕</button>}
    </div>
  )
}

// ─── Section: IR Events ──────────────────────────────────────────────────────

function IrEventsSection() {
  const [rows, setRows] = useState<IrEvent[]>([])
  const [editing, setEditing] = useState<Partial<IrEvent> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('ir_events')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  const blank: Partial<IrEvent> = { fecha: '', tipo: 'results', titulo_es: '', titulo_en: '', nota_es: '', nota_en: '', activo: true, orden: rows.length + 1 }

  async function save() {
    setErr('')
    try {
      if (editingId) await apiUpdate('ir_events', { id: editingId, ...editing })
      else await apiCreate('ir_events', editing as Record<string, unknown>)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    setErr('')
    try { await apiDelete('ir_events', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Calendario financiero (IR Events)" onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Fecha" value={editing.fecha ?? ''} onChange={v => setEditing(p => ({ ...p, fecha: v }))} />
            <Field label="Tipo (results/agm/...)" value={editing.tipo ?? ''} onChange={v => setEditing(p => ({ ...p, tipo: v }))} />
            <Field label="Orden" value={String(editing.orden ?? '')} onChange={v => setEditing(p => ({ ...p, orden: Number(v) }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Título ES" value={editing.titulo_es ?? ''} onChange={v => setEditing(p => ({ ...p, titulo_es: v }))} />
            <Field label="Título EN" value={editing.titulo_en ?? ''} onChange={v => setEditing(p => ({ ...p, titulo_en: v }))} />
            <Field label="Nota ES" value={editing.nota_es ?? ''} onChange={v => setEditing(p => ({ ...p, nota_es: v }))} />
            <Field label="Nota EN" value={editing.nota_en ?? ''} onChange={v => setEditing(p => ({ ...p, nota_en: v }))} />
          </div>
          <Toggle label="Activo" checked={editing.activo ?? true} onChange={v => setEditing(p => ({ ...p, activo: v }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--rule)' }}>
            <th style={th}>Fecha</th><th style={th}>Tipo</th><th style={th}>Título ES</th><th style={th}>Activo</th><th style={th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.fecha}</td>
              <td style={td}><code style={{ fontSize: 11 }}>{r.tipo}</code></td>
              <td style={td}>{r.titulo_es}</td>
              <td style={td}>{r.activo ? '✓' : '—'}</td>
              <td style={td}>
                <RowActions
                  id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(r); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Analysts ───────────────────────────────────────────────────────

function AnalystsSection() {
  const [rows, setRows] = useState<IrAnalyst[]>([])
  const [editing, setEditing] = useState<Partial<IrAnalyst> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('ir_analysts')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  const blank: Partial<IrAnalyst> = { analyst: '', firm: '', rating_es: 'Compra', rating_en: 'Buy', target: '', activo: true, orden: rows.length + 1 }

  async function save() {
    setErr('')
    try {
      if (editingId) await apiUpdate('ir_analysts', { id: editingId, ...editing })
      else await apiCreate('ir_analysts', editing as Record<string, unknown>)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    try { await apiDelete('ir_analysts', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Cobertura de analistas" onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Field label="Analista" value={editing.analyst ?? ''} onChange={v => setEditing(p => ({ ...p, analyst: v }))} />
            <Field label="Firma" value={editing.firm ?? ''} onChange={v => setEditing(p => ({ ...p, firm: v }))} />
            <Field label="Rating ES" value={editing.rating_es ?? ''} onChange={v => setEditing(p => ({ ...p, rating_es: v }))} />
            <Field label="Rating EN" value={editing.rating_en ?? ''} onChange={v => setEditing(p => ({ ...p, rating_en: v }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Target (ej: CA $0.35)" value={editing.target ?? ''} onChange={v => setEditing(p => ({ ...p, target: v }))} />
            <Field label="Orden" value={String(editing.orden ?? '')} onChange={v => setEditing(p => ({ ...p, orden: Number(v) }))} />
          </div>
          <Toggle label="Activo" checked={editing.activo ?? true} onChange={v => setEditing(p => ({ ...p, activo: v }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Analista</th><th style={th}>Firma</th><th style={th}>Rating ES</th><th style={th}>Target</th><th style={th}>Activo</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.analyst}</td><td style={td}>{r.firm}</td><td style={td}>{r.rating_es}</td><td style={td}>{r.target}</td>
              <td style={td}>{r.activo ? '✓' : '—'}</td>
              <td style={td}>
                <RowActions id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(r); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Obligaciones ───────────────────────────────────────────────────

function ObligacionesSection() {
  const [rows, setRows] = useState<ObligacionNegociable[]>([])
  const [editing, setEditing] = useState<Partial<ObligacionNegociable> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('obligaciones_negociables')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  const blank: Partial<ObligacionNegociable> = { serie: '', monto: '', vencimiento: '', tasa: '', isin: '', bolsa: '', activo: true, orden: rows.length + 1 }

  async function save() {
    setErr('')
    try {
      if (editingId) await apiUpdate('obligaciones_negociables', { id: editingId, ...editing })
      else await apiCreate('obligaciones_negociables', editing as Record<string, unknown>)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    try { await apiDelete('obligaciones_negociables', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Obligaciones negociables" onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Field label="Serie" value={editing.serie ?? ''} onChange={v => setEditing(p => ({ ...p, serie: v }))} />
            <Field label="Monto" value={editing.monto ?? ''} onChange={v => setEditing(p => ({ ...p, monto: v }))} />
            <Field label="Vencimiento" value={editing.vencimiento ?? ''} onChange={v => setEditing(p => ({ ...p, vencimiento: v }))} />
            <Field label="Tasa" value={editing.tasa ?? ''} onChange={v => setEditing(p => ({ ...p, tasa: v }))} />
            <Field label="ISIN" value={editing.isin ?? ''} onChange={v => setEditing(p => ({ ...p, isin: v }))} />
            <Field label="Bolsa" value={editing.bolsa ?? ''} onChange={v => setEditing(p => ({ ...p, bolsa: v }))} />
          </div>
          <Toggle label="Activo" checked={editing.activo ?? true} onChange={v => setEditing(p => ({ ...p, activo: v }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Serie</th><th style={th}>Monto</th><th style={th}>Vencimiento</th><th style={th}>Tasa</th><th style={th}>ISIN</th><th style={th}>Bolsa</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.serie}</td><td style={td}>{r.monto}</td><td style={td}>{r.vencimiento}</td>
              <td style={td}>{r.tasa}</td><td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.isin}</td><td style={td}>{r.bolsa}</td>
              <td style={td}>
                <RowActions id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(r); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Operations Blocks ──────────────────────────────────────────────

function BlocksSection() {
  const [rows, setRows] = useState<OperationsBlock[]>([])
  const [editing, setEditing] = useState<Partial<OperationsBlock> & { stats_json?: string; map_stats_json?: string; body_es_text?: string; body_en_text?: string; chips_text?: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('operations_blocks')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  const blank = {
    slug: '', eyebrow: '', titulo: '', lede_es: '', lede_en: '', card_title_es: '', card_title_en: '',
    commodity: 'oil', orden: rows.length + 1, activo: true,
    chips_text: '',
    body_es_text: '',
    body_en_text: '',
    stats_json: '[]',
    map_stats_json: '[]',
  }

  function toEditing(r: OperationsBlock) {
    return {
      ...r,
      chips_text: (r.chips ?? []).join('\n'),
      body_es_text: (r.body_es ?? []).join('\n\n'),
      body_en_text: (r.body_en ?? []).join('\n\n'),
      stats_json: JSON.stringify(r.stats ?? [], null, 2),
      map_stats_json: JSON.stringify(r.map_stats ?? [], null, 2),
    }
  }

  async function save() {
    setErr('')
    if (!editing) return
    try {
      const payload: Record<string, unknown> = {
        slug: editing.slug,
        eyebrow: editing.eyebrow,
        titulo: editing.titulo,
        lede_es: editing.lede_es,
        lede_en: editing.lede_en,
        card_title_es: editing.card_title_es,
        card_title_en: editing.card_title_en,
        commodity: editing.commodity,
        orden: editing.orden,
        activo: editing.activo,
        chips: (editing.chips_text ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean),
        body_es: (editing.body_es_text ?? '').split('\n\n').map((s: string) => s.trim()).filter(Boolean),
        body_en: (editing.body_en_text ?? '').split('\n\n').map((s: string) => s.trim()).filter(Boolean),
        stats: JSON.parse(editing.stats_json ?? '[]'),
        map_stats: JSON.parse(editing.map_stats_json ?? '[]'),
      }
      if (editingId) await apiUpdate('operations_blocks', { id: editingId, ...payload })
      else await apiCreate('operations_blocks', payload)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    try { await apiDelete('operations_blocks', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Bloques / Áreas de concesión" onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
        Podés agregar, editar o eliminar bloques operativos. El <code>slug</code> debe ser único (ej: <code>ppc</code>, <code>chanares</code>).
      </p>
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Field label="Slug (único)" value={editing.slug ?? ''} onChange={v => setEditing(p => ({ ...p!, slug: v }))} />
            <Field label="Orden" value={String(editing.orden ?? '')} onChange={v => setEditing(p => ({ ...p!, orden: Number(v) }))} />
            <div style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Commodity</label>
              <select value={editing.commodity ?? 'oil'} onChange={e => setEditing(p => ({ ...p!, commodity: e.target.value }))} style={{ width: '100%' }}>
                <option value="oil">Petróleo</option>
                <option value="gas">Gas</option>
                <option value="mixed">Petróleo + Gas</option>
              </select>
            </div>
            <Toggle label="Activo" checked={editing.activo ?? true} onChange={v => setEditing(p => ({ ...p!, activo: v }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Eyebrow" value={editing.eyebrow ?? ''} onChange={v => setEditing(p => ({ ...p!, eyebrow: v }))} />
            <Field label="Título" value={editing.titulo ?? ''} onChange={v => setEditing(p => ({ ...p!, titulo: v }))} />
            <Field label="Lede ES" value={editing.lede_es ?? ''} onChange={v => setEditing(p => ({ ...p!, lede_es: v }))} multiline />
            <Field label="Lede EN" value={editing.lede_en ?? ''} onChange={v => setEditing(p => ({ ...p!, lede_en: v }))} multiline />
            <Field label="Card title ES" value={editing.card_title_es ?? ''} onChange={v => setEditing(p => ({ ...p!, card_title_es: v }))} />
            <Field label="Card title EN" value={editing.card_title_en ?? ''} onChange={v => setEditing(p => ({ ...p!, card_title_en: v }))} />
          </div>
          <Field label="Chips (uno por línea)" value={editing.chips_text ?? ''} onChange={v => setEditing(p => ({ ...p!, chips_text: v }))} multiline />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cuerpo ES (párrafos separados por línea en blanco)" value={editing.body_es_text ?? ''} onChange={v => setEditing(p => ({ ...p!, body_es_text: v }))} multiline />
            <Field label="Cuerpo EN" value={editing.body_en_text ?? ''} onChange={v => setEditing(p => ({ ...p!, body_en_text: v }))} multiline />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label='Stats JSON (formato: [{"label_es":"...","label_en":"...","val":"..."}])' value={editing.stats_json ?? ''} onChange={v => setEditing(p => ({ ...p!, stats_json: v }))} multiline mono />
            <Field label='Map stats JSON' value={editing.map_stats_json ?? ''} onChange={v => setEditing(p => ({ ...p!, map_stats_json: v }))} multiline mono />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Orden</th><th style={th}>Slug</th><th style={th}>Título</th><th style={th}>Commodity</th><th style={th}>Activo</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.orden}</td>
              <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.slug}</td>
              <td style={td}>{r.titulo}</td>
              <td style={td}>{r.commodity}</td>
              <td style={td}>{r.activo ? '✓' : '—'}</td>
              <td style={td}>
                <RowActions id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(toEditing(r)); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Team Members ───────────────────────────────────────────────────

function TeamSection({ tipo }: { tipo: 'management' | 'board' }) {
  const [rows, setRows] = useState<TeamMember[]>([])
  const [editing, setEditing] = useState<Partial<TeamMember> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const all: TeamMember[] = await apiFetch('team_members')
      setRows(all.filter(m => m.tipo === tipo))
    } catch { setErr('Error cargando') }
  }, [tipo])
  useEffect(() => { load() }, [load])

  const blank: Partial<TeamMember> = { name: '', role_es: '', role_en: '', bio_es: '', bio_en: '', initials: '', bg: 'linear-gradient(135deg,#1F2566,#4F5478)', tipo, cargo_board: '', independiente: null, activo: true, orden: rows.length + 1 }

  async function save() {
    setErr('')
    try {
      if (editingId) await apiUpdate('team_members', { id: editingId, ...editing })
      else await apiCreate('team_members', editing as Record<string, unknown>)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    try { await apiDelete('team_members', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  const title = tipo === 'management' ? 'Equipo ejecutivo (Management)' : 'Directorio (Board)'

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title={title} onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Field label="Nombre" value={editing.name ?? ''} onChange={v => setEditing(p => ({ ...p!, name: v }))} />
            <Field label="Iniciales" value={editing.initials ?? ''} onChange={v => setEditing(p => ({ ...p!, initials: v }))} />
            <Field label="Orden" value={String(editing.orden ?? '')} onChange={v => setEditing(p => ({ ...p!, orden: Number(v) }))} />
            {tipo === 'board' && <Field label="Cargo board" value={editing.cargo_board ?? ''} onChange={v => setEditing(p => ({ ...p!, cargo_board: v }))} />}
          </div>
          {tipo === 'management' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Rol ES" value={editing.role_es ?? ''} onChange={v => setEditing(p => ({ ...p!, role_es: v }))} />
              <Field label="Rol EN" value={editing.role_en ?? ''} onChange={v => setEditing(p => ({ ...p!, role_en: v }))} />
              <Field label="Bio ES" value={editing.bio_es ?? ''} onChange={v => setEditing(p => ({ ...p!, bio_es: v }))} multiline />
              <Field label="Bio EN" value={editing.bio_en ?? ''} onChange={v => setEditing(p => ({ ...p!, bio_en: v }))} multiline />
            </div>
          )}
          <Field label="CSS gradient (bg)" value={editing.bg ?? ''} onChange={v => setEditing(p => ({ ...p!, bg: v }))} />
          {tipo === 'board' && (
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Independiente</label>
              <select value={String(editing.independiente)} onChange={e => setEditing(p => ({ ...p!, independiente: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null }))}>
                <option value="null">—</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          )}
          <Toggle label="Activo" checked={editing.activo ?? true} onChange={v => setEditing(p => ({ ...p!, activo: v }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Nombre</th>
          <th style={th}>{tipo === 'management' ? 'Rol ES' : 'Cargo'}</th>
          {tipo === 'board' && <th style={th}>Independiente</th>}
          <th style={th}>Activo</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.name}</td>
              <td style={td}>{tipo === 'management' ? r.role_es : r.cargo_board}</td>
              {tipo === 'board' && <td style={td}>{r.independiente === true ? 'Sí' : r.independiente === false ? 'No' : '—'}</td>}
              <td style={td}>{r.activo ? '✓' : '—'}</td>
              <td style={td}>
                <RowActions id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(r); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Strategy Cards ─────────────────────────────────────────────────

function StrategySection() {
  const [rows, setRows] = useState<StrategyCard[]>([])
  const [editing, setEditing] = useState<Partial<StrategyCard> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('strategy_cards')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  const blank: Partial<StrategyCard> = { num: `0${rows.length + 1}`, title_es: '', title_en: '', body_es: '', body_en: '', orden: rows.length + 1 }

  async function save() {
    setErr('')
    try {
      if (editingId) await apiUpdate('strategy_cards', { id: editingId, ...editing })
      else await apiCreate('strategy_cards', editing as Record<string, unknown>)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    try { await apiDelete('strategy_cards', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Pilares de estrategia" onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Número (ej: 01)" value={editing.num ?? ''} onChange={v => setEditing(p => ({ ...p!, num: v }))} />
            <Field label="Título ES" value={editing.title_es ?? ''} onChange={v => setEditing(p => ({ ...p!, title_es: v }))} />
            <Field label="Título EN" value={editing.title_en ?? ''} onChange={v => setEditing(p => ({ ...p!, title_en: v }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cuerpo ES" value={editing.body_es ?? ''} onChange={v => setEditing(p => ({ ...p!, body_es: v }))} multiline />
            <Field label="Cuerpo EN" value={editing.body_en ?? ''} onChange={v => setEditing(p => ({ ...p!, body_en: v }))} multiline />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Nro</th><th style={th}>Título ES</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.num}</td><td style={td}>{r.title_es}</td>
              <td style={td}>
                <RowActions id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(r); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: ESG Pillars ────────────────────────────────────────────────────

function EsgSection() {
  const [rows, setRows] = useState<EsgPillar[]>([])
  const [editing, setEditing] = useState<(Partial<EsgPillar> & { metrics_json?: string; init_es_text?: string; init_en_text?: string }) | null>(null)
  const [editingPilar, setEditingPilar] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('esg_pillar_data')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  function toEditing(r: EsgPillar) {
    return {
      ...r,
      metrics_json: JSON.stringify(r.metrics ?? [], null, 2),
      init_es_text: (r.initiatives_es ?? []).join('\n'),
      init_en_text: (r.initiatives_en ?? []).join('\n'),
    }
  }

  async function save() {
    setErr('')
    if (!editing) return
    try {
      const payload = {
        pilar: editingPilar,
        color: editing.color,
        lede_es: editing.lede_es,
        lede_en: editing.lede_en,
        metrics: JSON.parse(editing.metrics_json ?? '[]'),
        initiatives_es: (editing.init_es_text ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean),
        initiatives_en: (editing.init_en_text ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean),
      }
      await apiUpdate('esg_pillar_data', payload)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingPilar(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Pilares ESG (3 fijos: ambiental, social, gobernanza)" />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Pilar</label>
              <code style={{ fontSize: 14 }}>{editingPilar}</code>
            </div>
            <Field label="Color (hex)" value={editing.color ?? ''} onChange={v => setEditing(p => ({ ...p!, color: v }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Lede ES" value={editing.lede_es ?? ''} onChange={v => setEditing(p => ({ ...p!, lede_es: v }))} multiline />
            <Field label="Lede EN" value={editing.lede_en ?? ''} onChange={v => setEditing(p => ({ ...p!, lede_en: v }))} multiline />
            <Field label='Métricas JSON [{"labelEs":"...","labelEn":"...","val":"..."}]' value={editing.metrics_json ?? ''} onChange={v => setEditing(p => ({ ...p!, metrics_json: v }))} multiline mono />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Iniciativas ES (una por línea)" value={editing.init_es_text ?? ''} onChange={v => setEditing(p => ({ ...p!, init_es_text: v }))} multiline />
              <Field label="Iniciativas EN" value={editing.init_en_text ?? ''} onChange={v => setEditing(p => ({ ...p!, init_en_text: v }))} multiline />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingPilar(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Pilar</th><th style={th}>Color</th><th style={th}>Lede ES (inicio)</th><th style={th}>Métricas</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.pilar} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}><strong>{r.pilar}</strong></td>
              <td style={td}><span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 3, background: r.color, verticalAlign: 'middle', marginRight: 6 }} />{r.color}</td>
              <td style={td}>{r.lede_es?.slice(0, 60)}…</td>
              <td style={td}>{Array.isArray(r.metrics) ? r.metrics.length : '—'} métricas</td>
              <td style={td}>
                <button className="btn" onClick={() => { setEditing(toEditing(r)); setEditingPilar(r.pilar) }} style={{ fontSize: 11, padding: '4px 10px' }}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Open Positions ─────────────────────────────────────────────────

function PositionsSection() {
  const [rows, setRows] = useState<OpenPosition[]>([])
  const [editing, setEditing] = useState<Partial<OpenPosition> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('open_positions')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  const blank: Partial<OpenPosition> = { area: '', location: '', tipo: 'Full-time', activo: true, orden: rows.length + 1 }

  async function save() {
    setErr('')
    try {
      if (editingId) await apiUpdate('open_positions', { id: editingId, ...editing })
      else await apiCreate('open_positions', editing as Record<string, unknown>)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    try { await apiDelete('open_positions', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Posiciones abiertas" onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Área" value={editing.area ?? ''} onChange={v => setEditing(p => ({ ...p!, area: v }))} />
            <Field label="Ubicación" value={editing.location ?? ''} onChange={v => setEditing(p => ({ ...p!, location: v }))} />
            <Field label="Tipo (ej: Full-time)" value={editing.tipo ?? ''} onChange={v => setEditing(p => ({ ...p!, tipo: v }))} />
          </div>
          <Toggle label="Activo (visible en el sitio)" checked={editing.activo ?? true} onChange={v => setEditing(p => ({ ...p!, activo: v }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Área</th><th style={th}>Ubicación</th><th style={th}>Tipo</th><th style={th}>Activo</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.area}</td><td style={td}>{r.location}</td><td style={td}>{r.tipo}</td>
              <td style={td}>{r.activo ? '✓' : '—'}</td>
              <td style={td}>
                <RowActions id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(r); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Culture Cards ──────────────────────────────────────────────────

function CultureSection() {
  const [rows, setRows] = useState<CultureCard[]>([])
  const [editing, setEditing] = useState<Partial<CultureCard> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setRows(await apiFetch('culture_cards')) } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  const blank: Partial<CultureCard> = { title_es: '', title_en: '', desc_es: '', desc_en: '', color: '#C9A24A', icon_key: 'shield', orden: rows.length + 1 }

  async function save() {
    setErr('')
    try {
      if (editingId) await apiUpdate('culture_cards', { id: editingId, ...editing })
      else await apiCreate('culture_cards', editing as Record<string, unknown>)
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
      setEditing(null); setEditingId(null); load()
    } catch (e: unknown) { setErr(String(e)) }
  }

  async function del(id: string) {
    try { await apiDelete('culture_cards', id); load(); setDeletingId(null) }
    catch (e: unknown) { setErr(String(e)) }
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader title="Valores culturales" onAdd={() => { setEditing(blank); setEditingId(null) }} />
      <StatusMsg msg={msg} error={err} />

      {editing && (
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Field label="Título ES" value={editing.title_es ?? ''} onChange={v => setEditing(p => ({ ...p!, title_es: v }))} />
            <Field label="Título EN" value={editing.title_en ?? ''} onChange={v => setEditing(p => ({ ...p!, title_en: v }))} />
            <Field label="Color (hex)" value={editing.color ?? ''} onChange={v => setEditing(p => ({ ...p!, color: v }))} />
            <div style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Ícono</label>
              <select value={editing.icon_key ?? 'shield'} onChange={e => setEditing(p => ({ ...p!, icon_key: e.target.value }))}>
                <option value="shield">shield</option>
                <option value="sun">sun</option>
                <option value="people">people</option>
                <option value="chart">chart</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Descripción ES" value={editing.desc_es ?? ''} onChange={v => setEditing(p => ({ ...p!, desc_es: v }))} multiline />
            <Field label="Descripción EN" value={editing.desc_en ?? ''} onChange={v => setEditing(p => ({ ...p!, desc_en: v }))} multiline />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} style={{ fontSize: 13 }}>Guardar</button>
            <button className="btn" onClick={() => { setEditing(null); setEditingId(null) }} style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--rule)' }}>
          <th style={th}>Título ES</th><th style={th}>Ícono</th><th style={th}>Color</th><th style={th}>Acciones</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={td}>{r.title_es}</td>
              <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.icon_key}</td>
              <td style={td}><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: r.color, verticalAlign: 'middle', marginRight: 6 }} />{r.color}</td>
              <td style={td}>
                <RowActions id={r.id} editingId={editingId} deletingId={deletingId}
                  onEdit={() => { setEditing(r); setEditingId(r.id) }}
                  onDelete={() => deletingId === r.id ? del(r.id) : setDeletingId(r.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section: Hero texts ─────────────────────────────────────────────────────

function HeroSection() {
  const [fields, setFields] = useState<Record<string, CmsField>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/state', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const s = await res.json()
      const map: Record<string, CmsField> = {}
      for (const k of HERO_KEYS) {
        map[k.key] = { key: k.key, value_es: s.fields?.[k.key] ?? '', value_en: s.fieldsEn?.[k.key] ?? '' }
      }
      setFields(map)
    } catch { setErr('Error cargando') }
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true); setErr('')
    try {
      const es: Record<string, string> = {}
      const en: Record<string, string> = {}
      for (const f of Object.values(fields)) { es[f.key] = f.value_es; en[f.key] = f.value_en }
      const res = await fetch('/api/cms/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields: es, fieldsEn: en }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMsg('Guardado'); setTimeout(() => setMsg(''), 2000)
    } catch (e: unknown) { setErr(String(e)) }
    setSaving(false)
  }

  return (
    <div>
      <SectionHeader title="Textos hero de páginas internas" />
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
        El campo <code>h1</code> acepta <code>&lt;br/&gt;</code> para saltos de línea. Los cambios se reflejan en hasta 60 s.
      </p>
      <StatusMsg msg={msg} error={err} />

      <div style={{ display: 'grid', gap: 24 }}>
        {HERO_KEYS.map(({ key, label }) => (
          <div key={key} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="ES" value={fields[key]?.value_es ?? ''} onChange={v => setFields(p => ({ ...p, [key]: { ...p[key], value_es: v } }))} multiline />
              <Field label="EN" value={fields[key]?.value_en ?? ''} onChange={v => setFields(p => ({ ...p, [key]: { ...p[key], value_en: v } }))} multiline />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ fontSize: 13, padding: '10px 24px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando…' : 'Guardar todos los textos'}
        </button>
      </div>
    </div>
  )
}

// ─── Table style helpers ─────────────────────────────────────────────────────

const th: React.CSSProperties = { textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', padding: '8px 10px' }
const td: React.CSSProperties = { padding: '10px 10px', color: 'var(--fg-soft)', verticalAlign: 'middle' }

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CmsAdminPage() {
  const [tab, setTab] = useState<Tab>('inversores')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
              Contenido del sitio
            </h1>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '4px 0 0' }}>
              CRUD de todas las secciones editables. Los cambios se publican en hasta 60 s.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/admin" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>← Panel CMS</Link>
            <Link href="/" target="_blank" className="btn" style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>Ver sitio</Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--rule)', marginBottom: 32, overflowX: 'auto' }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 18px', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
                textTransform: 'uppercase', background: 'none', border: 'none', whiteSpace: 'nowrap',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--fg)' : 'var(--fg-muted)',
                cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === 'inversores' && (
          <div>
            <IrEventsSection />
            <AnalystsSection />
            <ObligacionesSection />
          </div>
        )}

        {tab === 'operaciones' && <BlocksSection />}

        {tab === 'compannia' && (
          <div>
            <StrategySection />
            <TeamSection tipo="management" />
            <TeamSection tipo="board" />
          </div>
        )}

        {tab === 'esg' && <EsgSection />}

        {tab === 'carreras' && (
          <div>
            <CultureSection />
            <PositionsSection />
          </div>
        )}

        {tab === 'hero' && <HeroSection />}

      </div>
    </div>
  )
}

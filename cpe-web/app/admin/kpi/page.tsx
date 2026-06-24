'use client'

import { useState, useRef } from 'react'
import type { KpiExtracted } from '@/lib/parsers/kpi-excel'

type Step = 'upload' | 'preview' | 'done' | 'error'

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 14px', background: 'var(--bg-alt)', borderRadius: 8, border: '1px solid var(--rule)' }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}

function FieldRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--rule)', alignItems: 'center' }}>
      <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', background: 'var(--bg-alt)', padding: '2px 6px', borderRadius: 4 }}>{k}</code>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{v}</span>
    </div>
  )
}

export default function AdminKpiPage() {
  const [step, setStep]     = useState<Step>('upload')
  const [data, setData]     = useState<KpiExtracted | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState('')
  const fileRef             = useRef<HTMLInputElement>(null)

  async function handleAnalyze() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/kpi', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al analizar')
      setData(json as KpiExtracted)
      setStep('preview')
    } catch (e) {
      setMsg((e as Error).message)
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleApply() {
    if (!data) return
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/kpi/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields: data.fields, fieldsEn: data.fieldsEn, period: data.period }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al aplicar')
      setStep('done')
    } catch (e) {
      setMsg((e as Error).message)
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const allFields = data ? { ...data.fields, ...Object.fromEntries(Object.entries(data.fieldsEn).map(([k, v]) => [`${k} (EN)`, v])) } : {}

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 4px' }}>Admin</p>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Actualizar KPIs desde Excel
      </h1>
      <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '0 0 32px' }}>
        Subí el archivo de consolidación contable (ej.{' '}
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-alt)', padding: '1px 6px', borderRadius: 4 }}>03_2026_Consolidation_1.xlsx</code>
        ) para actualizar automáticamente producción, EBITDA y el período visible en la web.
      </p>

      {/* Upload step */}
      {step === 'upload' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, fontFamily: 'var(--font-display)' }}>
            Seleccionar archivo de consolidación
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
            El archivo debe contener la hoja <strong>MD&amp;A input</strong> con los datos del período actual.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ fontSize: 13 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={loading}
              style={{ padding: '10px 22px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Analizando…' : 'Analizar Excel'}
            </button>
          </div>
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && data && (
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Summary cards */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '24px 28px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
              Período detectado: <span style={{ color: 'var(--accent)' }}>{data.period}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
              Revisá los valores antes de aplicarlos al sitio.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 24 }}>
              <Pill label="Producción" value={`${data.fields['kpi.production.value']} boe/d`} />
              <Pill label="vs Q1 anterior" value={data.fields['kpi.production.delta'] || '—'} />
              <Pill label="Revenue" value={fmtUSD(data.revenueUSD)} />
              <Pill label="Funds flow" value={fmtUSD(data.fundsFlowUSD)} />
              <Pill label="Op. Netback" value={fmtUSD(data.netbackUSD)} />
              <Pill label="EBITDA (campo)" value={`$${data.fields['kpi.ebitda.value']}M`} />
            </div>
          </div>

          {/* Fields that will be updated */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              Campos que se actualizarán ({Object.keys(allFields).length})
            </div>
            {Object.entries(allFields).map(([k, v]) => <FieldRow key={k} k={k} v={v} />)}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleApply}
              disabled={loading}
              style={{ padding: '11px 28px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Aplicando…' : 'Aplicar al sitio'}
            </button>
            <button
              className="btn"
              onClick={() => { setStep('upload'); setData(null) }}
              disabled={loading}
              style={{ padding: '11px 20px' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--cp-green)', borderRadius: 'var(--r-lg)', padding: '28px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cp-green-deep)', marginBottom: 8 }}>
            ✓ KPIs actualizados — {data?.period}
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 20 }}>
            Los campos del sitio se actualizaron y el caché se invalidó. Los cambios son visibles de inmediato.
          </p>
          <button className="btn" onClick={() => { setStep('upload'); setData(null) }} style={{ padding: '10px 20px' }}>
            Subir otro archivo
          </button>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--danger,#c0392b)', borderRadius: 'var(--r-lg)', padding: '28px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger,#c0392b)', marginBottom: 8 }}>Error</div>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 20 }}>{msg}</p>
          <button className="btn" onClick={() => setStep('upload')} style={{ padding: '10px 20px' }}>
            Reintentar
          </button>
        </div>
      )}

    </div>
  )
}

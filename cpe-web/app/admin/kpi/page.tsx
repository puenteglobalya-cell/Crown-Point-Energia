'use client'

import { useState, useRef } from 'react'
import type { KpiExtracted } from '@/lib/parsers/kpi-excel'
import type { KpiWordExtracted } from '@/lib/parsers/kpi-word'
import { AdminPageHeader } from '@/components/AdminPageHeader'

type Step = 'upload' | 'preview' | 'done' | 'error'

interface KpiResult {
  excel: KpiExtracted
  word:  KpiWordExtracted
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtM(n: number) {
  return `$${(Math.abs(n) / 1_000_000).toFixed(1)}M`
}

function Pill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 14px', background: 'var(--bg-alt)', borderRadius: 8, border: '1px solid var(--rule)' }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{sub}</span>}
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

function FileInput({
  label, accept, fileRef, hint,
}: {
  label: string
  accept: string
  fileRef: React.RefObject<HTMLInputElement>
  hint: string
}) {
  const [name, setName] = useState<string>('')
  return (
    <div style={{ flex: 1, minWidth: 260, background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 12 }}>{hint}</div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        style={{ fontSize: 12, display: 'block', marginBottom: 6 }}
        onChange={e => setName(e.target.files?.[0]?.name ?? '')}
      />
      {name && (
        <div style={{ fontSize: 11, color: 'var(--cp-green-deep)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          ✓ {name}
        </div>
      )}
    </div>
  )
}

export default function AdminKpiPage() {
  const [step, setStep]       = useState<Step>('upload')
  const [data, setData]       = useState<KpiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const excelRef              = useRef<HTMLInputElement>(null)
  const wordRef               = useRef<HTMLInputElement>(null)

  async function handleAnalyze() {
    const excel = excelRef.current?.files?.[0]
    const word  = wordRef.current?.files?.[0]
    if (!excel) { setMsg('Seleccioná el archivo Excel (.xlsx)'); setStep('error'); return }
    if (!word)  { setMsg('Seleccioná el archivo Word del MDA (.docx)'); setStep('error'); return }

    setLoading(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('excel', excel)
      fd.append('word', word)
      const res = await fetch('/api/admin/kpi', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al analizar')
      setData(json as KpiResult)
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
    const { excel } = data
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/kpi/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields: excel.fields, fieldsEn: excel.fieldsEn, period: excel.period }),
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

  const allFields = data
    ? {
        ...data.excel.fields,
        ...Object.fromEntries(Object.entries(data.excel.fieldsEn).map(([k, v]) => [`${k} (EN)`, v])),
      }
    : {}

  const excel = data?.excel
  const word  = data?.word

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <AdminPageHeader
          title="Actualizar KPIs desde Excel + Word"
          subtitle="Se requieren ambos archivos para garantizar integridad: el Excel de consolidación (datos financieros) y el Word del MD&A (plan de pozos y contexto operacional)."
        />
      </div>

      {/* Upload step */}
      {step === 'upload' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            Seleccionar archivos del período
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <FileInput
              label="Excel de consolidación"
              accept=".xlsx,.xls"
              fileRef={excelRef}
              hint="Ej. 03_2026_Consolidation_1.xlsx — debe contener la hoja MD&A input"
            />
            <FileInput
              label="Word del MD&A"
              accept=".docx"
              fileRef={wordRef}
              hint="Ej. 2_Crown_Point_MDA_Mar_2026.docx — fuente del plan de perforación"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={loading}
            style={{ padding: '11px 28px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Analizando…' : 'Analizar ambos archivos'}
          </button>
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && excel && word && (
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Summary header */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '24px 28px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
              Período detectado: <span style={{ color: 'var(--accent)' }}>{excel.period}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
              Revisá los valores antes de aplicarlos al sitio.
            </div>

            {/* Financial KPIs from Excel */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>
              Datos financieros · Excel
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10, marginBottom: 24 }}>
              <Pill label="Producción" value={`${excel.fields['kpi.production.value']} boe/d`} sub={excel.fields['kpi.production.delta'] || undefined} />
              <Pill label="Revenue" value={fmtUSD(excel.revenueUSD)} />
              <Pill label="Funds flow" value={fmtUSD(excel.fundsFlowUSD)} sub={excel.fields['kpi.ebitda.delta'] || undefined} />
              <Pill label="EBITDA" value={fmtM(excel.ebitdaUSD)} />
              <Pill label="Opex/BOE" value={excel.fields['kpi.opex.value'] || '—'} sub={excel.fields['kpi.opex.delta'] || undefined} />
              <Pill label="Op. Netback" value={fmtUSD(excel.netbackUSD)} />
            </div>

            {/* Balance sheet */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>
              Balance · Excel
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10, marginBottom: 24 }}>
              <Pill label="Deuda total" value={fmtM(excel.loansUSD + excel.notesPayableUSD)} sub={`loans ${fmtM(excel.loansUSD)} · notes ${fmtM(excel.notesPayableUSD)}`} />
              <Pill label="Caja" value={fmtM(excel.cashUSD)} />
              <Pill label="Net debt" value={fmtM(excel.netDebtUSD)} />
              <Pill label="Net debt/EBITDA" value={excel.ebitdaUSD > 0 ? `${(excel.netDebtUSD / (excel.ebitdaUSD * 4)).toFixed(1)}x` : '—'} sub="anualizado" />
            </div>

            {/* Operational from Word */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>
              Operacional · Word MD&amp;A
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10 }}>
              <Pill label="Pozos planificados" value={word.wellsPlannedTotal > 0 ? String(word.wellsPlannedTotal) : '—'} />
              <Pill label="Budget CAPEX" value={word.capitalBudgetUSD > 0 ? fmtM(word.capitalBudgetUSD) : '—'} />
              {word.wellsBreakdown.map(w => (
                <Pill key={w.area} label={w.area} value={`${w.wells} pozos`} sub={w.capexUSD > 0 ? fmtM(w.capexUSD) : undefined} />
              ))}
            </div>
          </div>

          {/* Fields table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              Campos que se actualizarán en el CMS ({Object.keys(allFields).length})
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
            ✓ KPIs actualizados — {data?.excel.period}
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 20 }}>
            Los campos del sitio se actualizaron y el caché se invalidó. Los cambios son visibles de inmediato.
          </p>
          <button className="btn" onClick={() => { setStep('upload'); setData(null) }} style={{ padding: '10px 20px' }}>
            Subir otro período
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

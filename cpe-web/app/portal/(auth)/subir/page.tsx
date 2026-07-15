'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { parsearIngresosExcel, type DatosIngresos } from '@/lib/parsers/ingresos'
import { parsearAccionistaPPTX, type DatosAccionista } from '@/lib/parsers/accionista'
import { parsearExcelGenerico, type DatosGenerico } from '@/lib/parsers/generico'
import { parsearTextoMacro, type DatosMacro } from '@/lib/parsers/macro'
import { parsearFacturacionExcel, type DatosFacturacion, dedupKey, reconstruirDatosFacturacion } from '@/lib/parsers/facturacion'
import type { LineaFacturacion } from '@/lib/parsers/facturacion'
import { generarReporteHTML, type MacroSnapshot } from '@/lib/generador/htmlReport'
import { generarReporteAccionistaHTML } from '@/lib/generador/htmlReportAccionista'
import { generarReporteGenericoHTML } from '@/lib/generador/htmlReportGenerico'
import { generarReporteFacturacionHTML } from '@/lib/generador/htmlReportFacturacion'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type ReportType = 'ingresos' | 'accionista' | 'produccion' | 'financiero' | 'henry_hub' | 'ice_brent' | 'facturacion'
type Step = 'type' | 'select' | 'parsing' | 'preview' | 'uploading' | 'done'

const isMacroType = (t: ReportType) => t === 'henry_hub' || t === 'ice_brent'

const TYPES: { id: ReportType; label: string; desc: string; ext: string; icon: string }[] = [
  { id: 'ingresos',    label: 'Ingresos Estimados',    desc: 'Revenue mensual petróleo & gas',          ext: '.xlsx,.xls',  icon: '📊' },
  { id: 'facturacion', label: 'Reporte de Facturación', desc: 'Detalle de ventas por artículo y bloque', ext: '.xlsx,.xls', icon: '🧾' },
  { id: 'accionista',  label: 'Informe de Seguimiento', desc: 'Cash flow operativo + comercial',         ext: '.pptx',       icon: '📋' },
  { id: 'produccion',  label: 'Reporte de Producción',  desc: 'Volúmenes y pozos por área',              ext: '.xlsx,.xls',  icon: '⛽' },
  { id: 'financiero',  label: 'Reporte Financiero',     desc: 'Estados financieros (P&L, balance)',      ext: '.xlsx,.xls',  icon: '💰' },
  { id: 'henry_hub',   label: 'Henry Hub (Gas)',         desc: 'Pegar tabla de CME Group',                ext: 'pegar texto', icon: '🔵' },
  { id: 'ice_brent',   label: 'ICE Brent (Petróleo)',   desc: 'Pegar tabla de ICE Futures Europe',       ext: 'pegar texto', icon: '🟢' },
]

const MACRO_HINTS: Record<string, { url: string; col: string; placeholder: string }> = {
  henry_hub: {
    url: 'cmegroup.com → Energy → Natural Gas → Quotes',
    col: 'Columna usada: Prior Settle',
    placeholder: 'Product\tGlobex\tOpen\tHigh\tLow\tLast\tChange\tPrior Settle\tVolume\t…\nJUL 2025\tNG\t2.856\t2.921\t2.781\t2.813\t-0.028\t2.841\t85174\t…\nAUG 2025\tNG\t2.898\t2.964\t2.826\t2.859\t-0.030\t2.889\t45231\t…',
  },
  ice_brent: {
    url: 'theice.com → Brent Crude Futures → Quotes (tab "Settlement Prices")',
    col: 'Columna usada: Last',
    placeholder: 'AUG 26\nBRNQ26\n66.29\n-0.76\n66.98\n65.71\n1,295\n15:43:39\nSEP 26\nBRNV26\n65.83\n-0.67\n66.48\n65.45\n3,042\n15:44:23',
  },
}

export default function PortalSubirPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState<ReportType>('ingresos')
  const [step, setStep] = useState<Step>('type')
  const [err, setErr] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [macroText, setMacroText] = useState('')
  const [datosIngresos, setDatosIngresos] = useState<DatosIngresos | null>(null)
  const [datosAccionista, setDatosAccionista] = useState<DatosAccionista | null>(null)
  const [datosGenerico, setDatosGenerico] = useState<DatosGenerico | null>(null)
  const [datosMacro, setDatosMacro] = useState<DatosMacro | null>(null)
  const [datosFacturacion, setDatosFacturacion] = useState<DatosFacturacion | null>(null)
  const [macroSnap, setMacroSnap]   = useState<MacroSnapshot | null>(null)
  const [macroLoading, setMacroLoading] = useState(false)
  const [cclRate, setCclRate] = useState<number | null>(null)
  const [includeMacro, setIncludeMacro] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [doneId, setDoneId] = useState('')
  const [existingFactId, setExistingFactId] = useState<string | null>(null)
  const [existingLineas, setExistingLineas] = useState<LineaFacturacion[] | null>(null)
  const [mergeStats, setMergeStats] = useState<{ added: number; skipped: number } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')

  const tipoMeta = TYPES.find(t => t.id === tipo)!
  const [parsingStage, setParsingStage] = useState<'leyendo' | 'procesando' | 'generando'>('leyendo')

  async function handleFile(f: File) {
    setFile(f)
    setErr('')
    setStep('parsing')
    setParsingStage('leyendo')
    try {
      // Staged progress feedback — these steps mirror what the parsers actually do
      await new Promise(r => setTimeout(r, 200))
      setParsingStage('procesando')
      if (tipo === 'ingresos') {
        const parsed = await parsearIngresosExcel(f)
        setDatosIngresos(parsed)
        setTitulo(`Ingresos Estimados — ${parsed.mes}`)
        setMacroLoading(true)
        fetch('/api/macro').then(r => r.ok ? r.json() : null).then(m => {
          if (m && (m.hasHH || m.hasBrent)) setMacroSnap(m as MacroSnapshot)
        }).catch(() => {}).finally(() => setMacroLoading(false))
        fetch('/api/ccl').then(r => r.ok ? r.json() : null).then(d => {
          if (d?.indexValue) setCclRate(d.indexValue)
        }).catch(() => {})
      } else if (tipo === 'facturacion') {
        const parsed = await parsearFacturacionExcel(f)
        setDatosFacturacion(parsed)
        setTitulo(`Facturación — ${parsed.periodo}`)
        // Try to find existing published facturación report for dedup
        try {
          const listRes = await fetch('/api/admin/reportes')
          if (listRes.ok) {
            const list = await listRes.json() as Array<{ id: string; type_id: string; estado: string }>
            const found = list.find(r => r.type_id === 'facturacion' && r.estado === 'publicado')
            if (found) {
              const detailRes = await fetch(`/api/admin/reportes/${found.id}?format=json`)
              if (detailRes.ok) {
                const detail = await detailRes.json()
                const existLines: LineaFacturacion[] = detail.datos?.lineas ?? []
                if (existLines.length > 0) {
                  const existKeys = new Set(existLines.map(dedupKey))
                  const newOnly = parsed.lineas.filter(l => !existKeys.has(dedupKey(l)))
                  setExistingFactId(found.id)
                  setExistingLineas(existLines)
                  setMergeStats({ added: newOnly.length, skipped: parsed.lineas.length - newOnly.length })
                }
              }
            }
          }
        } catch { /* best-effort */ }
      } else if (tipo === 'accionista') {
        const parsed = await parsearAccionistaPPTX(f)
        setDatosAccionista(parsed)
        setTitulo(`Informe de Seguimiento — ${parsed.periodo}`)
      } else {
        const parsed = await parsearExcelGenerico(f, tipo as 'produccion' | 'financiero')
        setDatosGenerico(parsed)
        const tipoLabel = tipo === 'produccion' ? 'Reporte de Producción' : 'Reporte Financiero'
        setTitulo(`${tipoLabel} — ${parsed.periodo}`)
      }
      setParsingStage('generando')
      await new Promise(r => setTimeout(r, 150))
      setStep('preview')
    } catch (e) {
      const msg = (e as Error).message
      setErr(msg.includes('Invalid') || msg.includes('signature') || msg.includes('Unexpected')
        ? 'El archivo no pudo leerse. Verificá que sea un archivo válido (.xlsx / .pptx / .docx).'
        : msg)
      setStep('select')
    }
  }

  function handleParseMacroText() {
    setErr('')
    try {
      const source = tipo === 'henry_hub' ? 'hh' : 'brent' as const
      const parsed = parsearTextoMacro(macroText, source)
      setDatosMacro(parsed)
      const tipoLabel = tipo === 'henry_hub' ? 'Henry Hub' : 'ICE Brent'
      setTitulo(`Futuros ${tipoLabel} — ${parsed.periodo}`)
      setStep('preview')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function handleSave(estado: 'borrador' | 'publicado') {
    setStep('uploading')
    setErr('')
    try {
      const supabase = createSupabaseBrowserClient()

      let datos: unknown
      let html: string
      let periodo: string

      if (tipo === 'ingresos' && datosIngresos) {
        datos   = datosIngresos
        html    = generarReporteHTML(datosIngresos, includeMacro && macroSnap ? macroSnap : undefined, cclRate)
        periodo = datosIngresos.periodo
      } else if (tipo === 'facturacion' && datosFacturacion) {
        let mergedDatos = datosFacturacion

        if (existingLineas && existingLineas.length > 0) {
          const existKeys = new Set(existingLineas.map(dedupKey))
          const newOnly = datosFacturacion.lineas.filter(l => !existKeys.has(dedupKey(l)))
          if (newOnly.length === 0) {
            throw new Error('No hay líneas nuevas — todas las líneas del archivo ya están en el reporte publicado.')
          }
          const allLineas = [...existingLineas, ...newOnly].sort((a, b) => a.fecha.localeCompare(b.fecha))
          mergedDatos = reconstruirDatosFacturacion(allLineas)
        }

        datos   = mergedDatos
        html    = generarReporteFacturacionHTML(mergedDatos)
        periodo = `${mergedDatos.periodo_desde}_${mergedDatos.periodo_hasta}`
      } else if (tipo === 'accionista' && datosAccionista) {
        datos   = datosAccionista
        html    = generarReporteAccionistaHTML(datosAccionista)
        periodo = datosAccionista.periodo.replace(/\s*\|\s*/, '_')
      } else if ((tipo === 'produccion' || tipo === 'financiero') && datosGenerico) {
        datos   = datosGenerico
        html    = generarReporteGenericoHTML(datosGenerico)
        periodo = datosGenerico.periodo
      } else if (isMacroType(tipo) && datosMacro) {
        datos   = datosMacro
        html    = generarHTMLMacro(datosMacro, titulo.trim())
        periodo = datosMacro.periodo
      } else {
        throw new Error('Sin datos para guardar')
      }

      // Storage upload only for file-based types
      let storedPath: string | null = null
      if (file) {
        const ext = tipo === 'accionista' ? 'pptx' : 'xlsx'
        const { error: storageErr } = await supabase.storage
          .from('documents')
          .upload(`reportes/${tipo}-${periodo}-${Date.now()}.${ext}`, file,
            { upsert: false, contentType: file.type || 'application/octet-stream' })
        if (storageErr) {
          console.warn('[subir] Storage upload failed:', storageErr.message)
          setErr('⚠ El reporte se guardó pero el archivo original no se pudo subir al storage. Contactá al administrador.')
        } else {
          storedPath = `reportes/${tipo}-${periodo}-${Date.now()}.${ext}`
        }
      }

      // For cumulative facturación: PATCH existing report instead of creating new
      if (existingFactId && tipo === 'facturacion') {
        const res = await fetch(`/api/admin/reportes/${existingFactId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ datos, html, titulo: titulo.trim(), periodo, estado }),
        })
        if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Error al actualizar')
        setDoneId(existingFactId)
        setStep('done')
        return  // skip normal POST
      }

      const res = await fetch('/api/admin/reportes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type_id:      tipo,
          titulo:       titulo.trim(),
          periodo,
          datos,
          html,
          storage_path: storedPath,
          file_name:    file?.name ?? '',
          file_size:    file?.size ?? 0,
          estado,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al guardar')
      const { id } = await res.json()
      setDoneId(id)
      setStep('done')
    } catch (e) {
      setErr((e as Error).message)
      setStep('preview')
    }
  }

  function reset() {
    setStep('type'); setFile(null); setMacroText('')
    setDatosIngresos(null); setDatosAccionista(null); setDatosGenerico(null); setDatosMacro(null); setDatosFacturacion(null)
    setMacroSnap(null); setIncludeMacro(true); setCclRate(null)
    setTitulo(''); setDoneId(''); setErr('')
    setExistingFactId(null); setExistingLineas(null); setMergeStats(null)
    setShowPreview(false); setPreviewHtml('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function buildPreviewHtml(): string {
    if (tipo === 'ingresos' && datosIngresos)
      return generarReporteHTML(datosIngresos, includeMacro && macroSnap ? macroSnap : undefined, cclRate)
    if (tipo === 'facturacion' && datosFacturacion)
      return generarReporteFacturacionHTML(datosFacturacion)
    if (tipo === 'accionista' && datosAccionista)
      return generarReporteAccionistaHTML(datosAccionista)
    if ((tipo === 'produccion' || tipo === 'financiero') && datosGenerico)
      return generarReporteGenericoHTML(datosGenerico)
    if (isMacroType(tipo) && datosMacro)
      return generarHTMLMacro(datosMacro, titulo.trim() || tipoMeta.label)
    return ''
  }

  function togglePreview() {
    if (!showPreview && !previewHtml) {
      const html = buildPreviewHtml()
      if (html) setPreviewHtml(html)
    }
    setShowPreview(s => !s)
  }

  function generarHTMLMacro(d: DatosMacro, t: string): string {
    const stamp = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    const dec = d.source === 'hh' ? 3 : 2
    const unit = d.source === 'hh' ? 'USD/MMBtu (Prior Settle)' : 'USD/bbl (Last)'
    const rows = d.points.map(p => `<tr><td>${p.label}</td><td>${p.price.toFixed(dec)}</td></tr>`).join('')
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${t}</title>
<style>body{font-family:system-ui,sans-serif;padding:40px;color:#14172E}
h1{font-size:20px;margin-bottom:4px}p{color:#888;font-size:12px;margin-bottom:24px}
table{border-collapse:collapse;width:420px}
th{text-align:left;padding:6px 12px;border-bottom:2px solid #ddd;font-size:11px;color:#888}
td{padding:6px 12px;border-bottom:1px solid #eee;font-family:monospace}</style></head>
<body><h1>${t}</h1><p>Crown Point Energía · ${stamp}</p>
<table><thead><tr><th>Mes</th><th>${unit}</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`
  }

  const kv = (label: string, val: string) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}>
      <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--fg)', fontSize: 13 }}>{val}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/portal" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>
            ← Portal
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 4px' }}>
            Subir reporte
          </h1>
        </div>

        {err && (
          <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '12px 16px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 20 }}>
            {err}
          </div>
        )}

        {/* STEP: type selector */}
        {step === 'type' && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)', marginBottom: 20 }}>
              Seleccioná el tipo de reporte a subir.
            </p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  style={{
                    background: tipo === t.id ? 'var(--accent-pale)' : 'var(--surface)',
                    border: `2px solid ${tipo === t.id ? 'var(--accent)' : 'var(--rule)'}`,
                    borderRadius: 'var(--r-lg)', padding: '20px 18px', textAlign: 'left',
                    cursor: 'pointer', transition: 'border-color .15s',
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{t.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t.desc}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{t.ext}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <button
                className="btn btn-primary"
                style={{ padding: '13px 28px' }}
                onClick={() => setStep('select')}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP: paste (macro types) */}
        {step === 'select' && isMacroType(tipo) && (() => {
          const hint = MACRO_HINTS[tipo]!
          return (
            <>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setStep('type')} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                  ← cambiar tipo
                </button>
                <span style={{ fontSize: 12, color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', background: 'var(--surface)', border: '1px solid var(--rule)', padding: '3px 10px', borderRadius: 20 }}>
                  {tipoMeta.icon} {tipoMeta.label}
                </span>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '20px 24px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: '0 0 4px' }}>
                  Copiá la tabla de precios desde la web y pegala abajo
                </p>
                <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.5 }}>
                  Fuente: <strong>{hint.url}</strong><br />
                  {hint.col} · Formatos aceptados: <code style={{ fontSize: 11 }}>Aug26</code>, <code style={{ fontSize: 11 }}>JUL 2025</code>, <code style={{ fontSize: 11 }}>Ago-26</code>
                </p>
              </div>

              <textarea
                value={macroText}
                onChange={e => setMacroText(e.target.value)}
                placeholder={hint.placeholder}
                rows={14}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  padding: '14px 16px', borderRadius: 'var(--r-lg)',
                  border: '1px solid var(--rule)', background: 'var(--surface)',
                  color: 'var(--fg)', resize: 'vertical', lineHeight: 1.6,
                  marginBottom: 16,
                }}
                onPaste={e => {
                  // Auto-process a moment after paste lands
                  setTimeout(() => {
                    if (e.currentTarget.value.trim()) setErr('')
                  }, 50)
                }}
              />

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '12px 28px' }}
                  disabled={!macroText.trim()}
                  onClick={handleParseMacroText}
                >
                  Procesar →
                </button>
                <button className="btn" style={{ padding: '12px 16px' }} onClick={reset}>
                  Cancelar
                </button>
              </div>
            </>
          )
        })()}

        {/* STEP: select file (non-macro types) */}
        {step === 'select' && !isMacroType(tipo) && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setStep('type')} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                ← cambiar tipo
              </button>
              <span style={{ fontSize: 12, color: 'var(--fg-soft)', fontFamily: 'var(--font-mono)', background: 'var(--surface)', border: '1px solid var(--rule)', padding: '3px 10px', borderRadius: 20 }}>
                {tipoMeta.icon} {tipoMeta.label}
              </span>
            </div>
            <div
              style={{ border: '2px dashed var(--rule)', borderRadius: 'var(--r-lg)', padding: '56px 40px', textAlign: 'center', background: 'var(--surface)', cursor: 'pointer', marginBottom: 40 }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{tipoMeta.icon}</div>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
                Arrastrá el archivo acá
              </p>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
                {tipoMeta.ext} · {tipoMeta.desc}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept={tipoMeta.ext}
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <button className="btn btn-primary" style={{ padding: '12px 28px' }} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                Seleccionar archivo
              </button>
            </div>
          </>
        )}

        {/* STEP: parsing */}
        {step === 'parsing' && (
          <div style={{ padding: '56px 40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', marginBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 18 }}>
              {([
                ['leyendo',    'Leyendo archivo'],
                ['procesando', 'Procesando filas'],
                ['generando',  'Generando informe'],
              ] as const).map(([key, label], i) => {
                const order = ['leyendo', 'procesando', 'generando']
                const done = order.indexOf(parsingStage) > i
                const current = key === parsingStage
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: current ? 'var(--accent)' : done ? 'var(--cp-green-deep, #2C7A5B)' : 'var(--fg-muted)', fontWeight: current ? 700 : 400 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: current ? 'var(--accent)' : done ? 'var(--cp-green-deep, #2C7A5B)' : 'var(--rule)', display: 'inline-block' }} />
                    {label}
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              Procesando {tipo === 'accionista' ? 'PowerPoint' : 'Excel'}…
            </div>
            <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500 }}>{file?.name}</div>
          </div>
        )}

        {/* STEP: preview */}
        {step === 'preview' && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.01em', color: 'var(--accent)' }}>
                ✓ {isMacroType(tipo) ? 'Datos procesados correctamente' : 'Archivo procesado correctamente'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {tipo === 'ingresos' && datosIngresos && <>
                  {kv('Período', datosIngresos.periodo)}
                  {kv('Mes', datosIngresos.mes)}
                  {kv('Ventas estimadas', `us$ ${datosIngresos.ventas_MM.toFixed(2)} MM`)}
                  {kv('Vol. producido', `${Math.round(datosIngresos.vol_producido_boed).toLocaleString('es-AR')} BOE/d`)}
                  {kv('Precio neto oil', `us$ ${datosIngresos.precio_neto_oil.toFixed(2)}/bbl`)}
                  {kv('Precio neto gas', `us$ ${datosIngresos.precio_neto_gas.toFixed(2)}/mcf`)}
                </>}
                {tipo === 'facturacion' && datosFacturacion && <>
                  {kv('Período', datosFacturacion.periodo)}
                  {kv('Meses cubiertos', `${datosFacturacion.meses.length}`)}
                  {kv('Total facturado', `us$ ${(datosFacturacion.resumen.total_facturas / 1_000_000).toFixed(3)} MM`)}
                  {kv('Notas de crédito', `(us$ ${(Math.abs(datosFacturacion.resumen.total_nc) / 1_000_000).toFixed(3)} MM)`)}
                  {kv('Neto facturado', `us$ ${(datosFacturacion.resumen.neto / 1_000_000).toFixed(3)} MM`)}
                  {kv('Líneas de detalle', `${datosFacturacion.lineas.length}`)}
                  {mergeStats && (
                    <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                      <div style={{ background: mergeStats.added > 0 ? '#EBF8FF' : '#FFF5F5', border: `1px solid ${mergeStats.added > 0 ? '#BEE3F8' : '#FED7D7'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                        {mergeStats.added > 0
                          ? <><strong>{mergeStats.added} líneas nuevas</strong> · {mergeStats.skipped} duplicadas omitidas — se actualizará el reporte publicado existente</>
                          : <span style={{ color: '#C53030' }}>⚠ Todas las líneas ya están en el reporte publicado ({mergeStats.skipped} duplicadas)</span>
                        }
                      </div>
                    </div>
                  )}
                </>}
                {tipo === 'ingresos' && macroSnap && (
                  <div style={{ gridColumn: '1 / -1', marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      id="include-macro"
                      type="checkbox"
                      checked={includeMacro}
                      onChange={e => setIncludeMacro(e.target.checked)}
                      style={{ width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <label htmlFor="include-macro" style={{ fontSize: 13, color: 'var(--fg)', cursor: 'pointer' }}>
                      Incluir proyecciones de precios (Brent + Henry Hub)
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                      {macroSnap.hasBrent && macroSnap.hasHH ? 'ICE Brent + Henry Hub'
                       : macroSnap.hasBrent ? 'ICE Brent' : 'Henry Hub'} · {new Date(macroSnap.updatedAt).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                )}
                {tipo === 'accionista' && datosAccionista && <>
                  {kv('Período', datosAccionista.periodo)}
                  {kv('Producción consolidada', `${Math.round(datosAccionista.areas.consolidado.prod_mes).toLocaleString('es-AR')} M³/d`)}
                  {kv('OPEX consolidado', `U$S ${datosAccionista.areas.consolidado.opex_mes.toFixed(1)}/bbl`)}
                  {kv('Precio neto oil', `U$S ${datosAccionista.areas.consolidado.precio_mes.toFixed(2)}/bbl`)}
                  {kv('Deuda total', `US$ ${datosAccionista.deuda_total_MMUS.toFixed(2)} MM`)}
                  {kv('Meses de facturación', `${datosAccionista.facturacion.length}`)}
                </>}
                {(tipo === 'produccion' || tipo === 'financiero') && datosGenerico && <>
                  {kv('Período', datosGenerico.periodo)}
                  {kv('Archivo', datosGenerico.titulo_archivo)}
                  {kv('Hojas encontradas', `${datosGenerico.hojas.length}`)}
                  {kv('Total filas', `${datosGenerico.hojas.reduce((s, h) => s + h.filas.length, 0)}`)}
                </>}
                {isMacroType(tipo) && datosMacro && <>
                  {kv('Fuente', tipo === 'henry_hub' ? 'Henry Hub — CME · NYMEX' : 'ICE Brent Crude')}
                  {kv('M+1 (primer mes)', datosMacro.points[0]?.label ?? '—')}
                  {kv('Último mes', datosMacro.points[datosMacro.points.length - 1]?.label ?? '—')}
                  {kv('Contratos encontrados', `${datosMacro.points.length}`)}
                  {kv('Precio M+1', tipo === 'henry_hub'
                    ? `${datosMacro.points[0]?.price.toFixed(3)} USD/MMBtu`
                    : `${datosMacro.points[0]?.price.toFixed(2)} USD/bbl`
                  )}
                </>}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={togglePreview}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
                  background: showPreview ? 'var(--accent-pale)' : 'var(--surface)',
                  color: showPreview ? 'var(--accent)' : 'var(--fg-soft)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                {showPreview ? 'Ocultar preview' : 'Ver preview del informe'}
              </button>
            </div>

            {showPreview && previewHtml && (
              <div style={{ marginBottom: 20 }}>
                <iframe
                  srcDoc={previewHtml}
                  title="Preview del reporte"
                  style={{
                    width: '100%', height: 600,
                    border: '1px solid var(--rule)', borderRadius: 'var(--r-md)',
                    background: '#fff',
                  }}
                  sandbox="allow-scripts"
                />
              </div>
            )}

            <div className="form-row" style={{ marginBottom: 20 }}>
              <label>Título del reporte</label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ padding: '13px 28px', flex: 1, minWidth: 180 }} disabled={macroLoading} onClick={() => handleSave('publicado')}>
                {macroLoading ? 'Cargando datos macro…' : isMacroType(tipo) ? 'Guardar y publicar' : 'Subir y publicar'}
              </button>
              <button className="btn" style={{ padding: '13px 24px' }} disabled={macroLoading} onClick={() => handleSave('borrador')}>
                Guardar borrador
              </button>
              <button className="btn" style={{ padding: '13px 16px' }} onClick={reset}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* STEP: uploading */}
        {step === 'uploading' && (
          <div style={{ padding: '56px 40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', marginBottom: 40 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Guardando…</div>
            <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500 }}>{titulo}</div>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(108,174,82,0.5)', borderRadius: 'var(--r-lg)', padding: '40px', textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>{titulo}</h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>
              {isMacroType(tipo) ? 'Precios guardados. El widget del portal se actualizará automáticamente.' : 'Reporte guardado correctamente.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {!isMacroType(tipo) && (
                <a href={`/api/admin/reportes/${doneId}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '10px 20px', textDecoration: 'none' }}>
                  Ver informe
                </a>
              )}
              <button className="btn" style={{ padding: '10px 20px' }} onClick={reset}>
                {isMacroType(tipo) ? 'Actualizar otro' : 'Subir otro'}
              </button>
              <Link href="/portal" className="btn" style={{ padding: '10px 20px', textDecoration: 'none' }}>Ir al portal</Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

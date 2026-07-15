'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { parsearExcelGenerico, type DatosGenerico } from '@/lib/parsers/generico'
import { parsearFacturacionExcel, type DatosFacturacion, dedupKey, reconstruirDatosFacturacion } from '@/lib/parsers/facturacion'
import type { LineaFacturacion } from '@/lib/parsers/facturacion'
import { generarReporteGenericoHTML } from '@/lib/generador/htmlReportGenerico'
import { generarReporteFacturacionHTML } from '@/lib/generador/htmlReportFacturacion'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type ReportType = 'financiero' | 'facturacion'
type Step = 'type' | 'select' | 'parsing' | 'preview' | 'uploading' | 'done'

const TYPES: { id: ReportType; label: string; desc: string; icon: string }[] = [
  { id: 'financiero',  label: 'Reporte Financiero',      desc: 'Estados financieros (P&L, balance)',      icon: '💰' },
  { id: 'facturacion', label: 'Reporte de Facturación',  desc: 'Detalle de ventas por artículo y bloque', icon: '🧾' },
]

export default function PortalFinanzasSubirPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState<ReportType>('financiero')
  const [step, setStep] = useState<Step>('type')
  const [err, setErr] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [datosGenerico, setDatosGenerico] = useState<DatosGenerico | null>(null)
  const [datosFacturacion, setDatosFacturacion] = useState<DatosFacturacion | null>(null)
  const [titulo, setTitulo] = useState('')
  const [doneId, setDoneId] = useState('')
  const [existingFactId, setExistingFactId] = useState<string | null>(null)
  const [existingLineas, setExistingLineas] = useState<LineaFacturacion[] | null>(null)
  const [mergeStats, setMergeStats] = useState<{ added: number; skipped: number } | null>(null)

  const tipoMeta = TYPES.find(t => t.id === tipo)!

  async function handleFile(f: File) {
    setFile(f)
    setErr('')
    setStep('parsing')
    try {
      if (tipo === 'facturacion') {
        const parsed = await parsearFacturacionExcel(f)
        setDatosFacturacion(parsed)
        setTitulo(`Facturación — ${parsed.periodo}`)
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
      } else {
        const parsed = await parsearExcelGenerico(f, 'financiero')
        setDatosGenerico(parsed)
        setTitulo(`Reporte Financiero — ${parsed.periodo}`)
      }
      setStep('preview')
    } catch (e) {
      const msg = (e as Error).message
      setErr(msg.includes('Invalid') || msg.includes('signature') || msg.includes('Unexpected')
        ? 'El archivo no pudo leerse. Verificá que sea un .xlsx válido.'
        : msg)
      setStep('select')
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

      if (tipo === 'facturacion' && datosFacturacion) {
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
      } else if (tipo === 'financiero' && datosGenerico) {
        datos   = datosGenerico
        html    = generarReporteGenericoHTML(datosGenerico)
        periodo = datosGenerico.periodo
      } else {
        throw new Error('Sin datos para guardar')
      }

      let storedPath: string | null = null
      if (file) {
        const path = `reportes/${tipo}-${periodo}-${Date.now()}.xlsx`
        const { error: storageErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })
        if (!storageErr) storedPath = path
      }

      if (existingFactId && tipo === 'facturacion') {
        const res = await fetch(`/api/admin/reportes/${existingFactId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ datos, html, titulo: titulo.trim(), periodo, estado }),
        })
        if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Error al actualizar')
        setDoneId(existingFactId)
        setStep('done')
        return
      }

      const res = await fetch('/api/admin/reportes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type_id: tipo, titulo: titulo.trim(), periodo, datos, html,
          storage_path: storedPath, file_name: file?.name ?? '', file_size: file?.size ?? 0, estado,
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
    setStep('type'); setFile(null); setDatosGenerico(null); setDatosFacturacion(null)
    setTitulo(''); setDoneId(''); setErr('')
    setExistingFactId(null); setExistingLineas(null); setMergeStats(null)
    if (fileRef.current) fileRef.current.value = ''
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
          <Link href="/portal/finanzas" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>
            ← Finanzas
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 4px' }}>
            Subir reporte financiero
          </h1>
        </div>

        {err && (
          <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '12px 16px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 20 }}>
            {err}
          </div>
        )}

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
                </button>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-primary" style={{ padding: '13px 28px' }} onClick={() => setStep('select')}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {step === 'select' && (
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
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Arrastrá el archivo acá</p>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>.xlsx · {tipoMeta.desc}</p>
              <input
                ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <button className="btn btn-primary" style={{ padding: '12px 28px' }} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                Seleccionar archivo
              </button>
            </div>
          </>
        )}

        {step === 'parsing' && (
          <div style={{ padding: '56px 40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', marginBottom: 40 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Procesando Excel…</div>
            <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500 }}>{file?.name}</div>
          </div>
        )}

        {step === 'preview' && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.01em', color: 'var(--accent)' }}>
                ✓ Archivo procesado correctamente
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {tipo === 'facturacion' && datosFacturacion && <>
                  {kv('Período', datosFacturacion.periodo)}
                  {kv('Meses cubiertos', `${datosFacturacion.meses.length}`)}
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
                {tipo === 'financiero' && datosGenerico && <>
                  {kv('Período', datosGenerico.periodo)}
                  {kv('Archivo', datosGenerico.titulo_archivo)}
                  {kv('Hojas encontradas', `${datosGenerico.hojas.length}`)}
                </>}
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 20 }}>
              <label>Título del reporte</label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn" style={{ padding: '13px 24px' }} onClick={() => handleSave('borrador')}>
                Guardar borrador
              </button>
              <button className="btn" style={{ padding: '13px 16px' }} onClick={reset}>
                Cancelar
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 14 }}>
              Tu rol puede subir y guardar el reporte como borrador. Un administrador lo revisa y publica.
            </p>
          </div>
        )}

        {step === 'uploading' && (
          <div style={{ padding: '56px 40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', marginBottom: 40 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Guardando…</div>
            <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500 }}>{titulo}</div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(108,174,82,0.5)', borderRadius: 'var(--r-lg)', padding: '40px', textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>{titulo}</h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>
              Reporte guardado como borrador. Un administrador lo va a revisar y publicar.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn" style={{ padding: '10px 20px' }} onClick={reset}>Subir otro</button>
              <Link href="/portal/finanzas" className="btn" style={{ padding: '10px 20px', textDecoration: 'none' }}>Ir a Finanzas</Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

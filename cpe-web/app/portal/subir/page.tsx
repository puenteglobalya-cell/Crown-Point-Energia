'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { parsearIngresosExcel, type DatosIngresos } from '@/lib/parsers/ingresos'
import { generarReporteHTML } from '@/lib/generador/htmlReport'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type Step = 'select' | 'parsing' | 'preview' | 'uploading' | 'done'

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PortalSubirPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('select')
  const [err, setErr] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [datos, setDatos] = useState<DatosIngresos | null>(null)
  const [titulo, setTitulo] = useState('')
  const [doneId, setDoneId] = useState('')

  async function handleFile(f: File) {
    setFile(f)
    setErr('')
    setStep('parsing')
    try {
      const parsed = await parsearIngresosExcel(f)
      setDatos(parsed)
      setTitulo(`Ingresos Estimados — ${parsed.mes}`)
      setStep('preview')
    } catch (e) {
      setErr((e as Error).message)
      setStep('select')
    }
  }

  async function handleSave(estado: 'borrador' | 'publicado') {
    if (!datos || !file) return
    setStep('uploading')
    setErr('')
    try {
      const supabase = createSupabaseBrowserClient()
      const path = `reportes/${datos.periodo}-${Date.now()}.xlsx`
      const { error: storageErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
      if (storageErr) throw new Error(storageErr.message)

      const html = generarReporteHTML(datos)

      const res = await fetch('/api/admin/reportes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          periodo: datos.periodo,
          datos,
          html,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
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
    setStep('select')
    setFile(null)
    setDatos(null)
    setTitulo('')
    setDoneId('')
    setErr('')
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

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/portal" style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none' }}>
            ← Portal
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 4px' }}>
            Subir reporte
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: 0 }}>
            Ingresos Estimados · Excel → informe interactivo
          </p>
        </div>

        {err && (
          <div style={{ fontSize: 13, color: 'var(--cp-negative)', padding: '12px 16px', background: 'rgba(179,59,46,0.08)', borderRadius: 'var(--r-md)', marginBottom: 20 }}>
            {err}
          </div>
        )}

        {/* STEP: select */}
        {step === 'select' && (
          <div
            style={{ border: '2px dashed var(--rule)', borderRadius: 'var(--r-lg)', padding: '56px 40px', textAlign: 'center', background: 'var(--surface)', cursor: 'pointer', marginBottom: 40 }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
              Arrastrá el archivo Excel acá
            </p>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
              .xlsx · Revenue estimado mensual
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <button className="btn btn-primary" style={{ padding: '12px 28px' }} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
              Seleccionar archivo
            </button>
          </div>
        )}

        {/* STEP: parsing */}
        {step === 'parsing' && (
          <div style={{ padding: '56px 40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', marginBottom: 40 }}>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Procesando Excel…</div>
            <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500 }}>{file?.name}</div>
          </div>
        )}

        {/* STEP: preview */}
        {step === 'preview' && datos && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)', padding: '28px', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.01em', color: 'var(--accent)' }}>
                ✓ Archivo procesado correctamente
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {kv('Período', datos.periodo)}
                {kv('Mes', datos.mes)}
                {kv('Ventas estimadas', `us$ ${datos.ventas_MM.toFixed(2)} MM`)}
                {kv('Vol. producido', `${Math.round(datos.vol_producido_boed).toLocaleString('es-AR')} BOE/d`)}
                {kv('Precio neto oil', `us$ ${datos.precio_neto_oil.toFixed(2)}/bbl`)}
                {kv('Precio neto gas', `us$ ${datos.precio_neto_gas.toFixed(2)}/mcf`)}
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 20 }}>
              <label>Título del reporte</label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ padding: '13px 28px', flex: 1, minWidth: 180 }} onClick={() => handleSave('publicado')}>
                Subir y publicar
              </button>
              <button className="btn" style={{ padding: '13px 24px' }} onClick={() => handleSave('borrador')}>
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
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Subiendo reporte…</div>
            <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500 }}>{titulo}</div>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(108,174,82,0.5)', borderRadius: 'var(--r-lg)', padding: '40px', textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>{titulo}</h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>Reporte guardado correctamente.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={`/api/admin/reportes/${doneId}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ padding: '10px 20px', textDecoration: 'none' }}
              >
                Ver informe
              </a>
              <button className="btn" style={{ padding: '10px 20px' }} onClick={reset}>
                Subir otro
              </button>
              <Link href="/portal" className="btn" style={{ padding: '10px 20px', textDecoration: 'none' }}>
                Ir al portal
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

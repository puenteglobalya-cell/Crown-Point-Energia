'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { parsearIngresosExcel, type DatosIngresos } from '@/lib/parsers/ingresos'
import { parsearAccionistaPPTX, type DatosAccionista } from '@/lib/parsers/accionista'
import { parsearExcelGenerico, type DatosGenerico } from '@/lib/parsers/generico'
import { generarReporteHTML } from '@/lib/generador/htmlReport'
import { generarReporteAccionistaHTML } from '@/lib/generador/htmlReportAccionista'
import { generarReporteGenericoHTML } from '@/lib/generador/htmlReportGenerico'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type ReportType = 'ingresos' | 'accionista' | 'produccion' | 'financiero'
type Step = 'type' | 'select' | 'parsing' | 'preview' | 'uploading' | 'done'

const TYPES: { id: ReportType; label: string; desc: string; ext: string; icon: string }[] = [
  { id: 'ingresos',   label: 'Ingresos Estimados',    desc: 'Revenue mensual petróleo & gas',    ext: '.xlsx,.xls', icon: '📊' },
  { id: 'accionista', label: 'Informe de Seguimiento', desc: 'Cash flow operativo + comercial',   ext: '.pptx',      icon: '📋' },
  { id: 'produccion', label: 'Reporte de Producción', desc: 'Volúmenes y pozos por área',         ext: '.xlsx,.xls', icon: '⛽' },
  { id: 'financiero', label: 'Reporte Financiero',    desc: 'Estados financieros (P&L, balance)', ext: '.xlsx,.xls', icon: '💰' },
]

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PortalSubirPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState<ReportType>('ingresos')
  const [step, setStep] = useState<Step>('type')
  const [err, setErr] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [datosIngresos, setDatosIngresos] = useState<DatosIngresos | null>(null)
  const [datosAccionista, setDatosAccionista] = useState<DatosAccionista | null>(null)
  const [datosGenerico, setDatosGenerico] = useState<DatosGenerico | null>(null)
  const [titulo, setTitulo] = useState('')
  const [doneId, setDoneId] = useState('')

  const tipoMeta = TYPES.find(t => t.id === tipo)!

  async function handleFile(f: File) {
    setFile(f)
    setErr('')
    setStep('parsing')
    try {
      if (tipo === 'ingresos') {
        const parsed = await parsearIngresosExcel(f)
        setDatosIngresos(parsed)
        setTitulo(`Ingresos Estimados — ${parsed.mes}`)
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
      setStep('preview')
    } catch (e) {
      setErr((e as Error).message)
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
      let ext: string
      let periodo: string

      if (tipo === 'ingresos' && datosIngresos) {
        datos   = datosIngresos
        html    = generarReporteHTML(datosIngresos)
        ext     = 'xlsx'
        periodo = datosIngresos.periodo
      } else if (tipo === 'accionista' && datosAccionista) {
        datos   = datosAccionista
        html    = generarReporteAccionistaHTML(datosAccionista)
        ext     = 'pptx'
        periodo = datosAccionista.periodo.replace(/\s*\|\s*/, '_')
      } else if ((tipo === 'produccion' || tipo === 'financiero') && datosGenerico) {
        datos   = datosGenerico
        html    = generarReporteGenericoHTML(datosGenerico)
        ext     = 'xlsx'
        periodo = datosGenerico.periodo
      } else {
        throw new Error('Sin datos para guardar')
      }

      const path = `reportes/${tipo}-${periodo}-${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('documents')
        .upload(path, file!, { upsert: false, contentType: file!.type || 'application/octet-stream' })
      // Storage upload is best-effort — report is still saved via the HTML in the DB
      const storedPath = storageErr ? null : path

      const res = await fetch('/api/admin/reportes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type_id: tipo,
          titulo:  titulo.trim(),
          periodo,
          datos,
          html,
          storage_path: storedPath,
          file_name:    file!.name,
          file_size:    file!.size,
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
    setStep('type'); setFile(null)
    setDatosIngresos(null); setDatosAccionista(null); setDatosGenerico(null)
    setTitulo(''); setDoneId(''); setErr('')
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

        {/* STEP: select file */}
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
                ✓ Archivo procesado correctamente
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
              <a href={`/api/admin/reportes/${doneId}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '10px 20px', textDecoration: 'none' }}>
                Ver informe
              </a>
              <button className="btn" style={{ padding: '10px 20px' }} onClick={reset}>Subir otro</button>
              <Link href="/portal" className="btn" style={{ padding: '10px 20px', textDecoration: 'none' }}>Ir al portal</Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

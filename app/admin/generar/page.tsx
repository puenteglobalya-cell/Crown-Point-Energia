'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import styles from './generar.module.css'
import { parsearIngresosExcel } from '@/lib/parsers/ingresos'
import type { DatosIngresos } from '@/lib/parsers/ingresos'
import { generarReporteHTML } from '@/lib/generador/htmlReport'

type Paso = 'idle' | 'procesando' | 'preview' | 'listo'

export default function GenerarPage() {
  const [paso, setPaso] = useState<Paso>('idle')
  const [datos, setDatos] = useState<DatosIngresos | null>(null)
  const [htmlReporte, setHtmlReporte] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Procesamiento de archivo ────────────────────────────────
  const procesarArchivo = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se aceptan archivos Excel (.xlsx)')
      return
    }
    setError('')
    setPaso('procesando')
    try {
      const resultado = await parsearIngresosExcel(file)
      setDatos(resultado)
      setPaso('preview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo'
      setError(msg)
      setPaso('idle')
    }
  }, [])

  // ── Drag & drop ─────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) procesarArchivo(file)
  }, [procesarArchivo])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
    e.target.value = ''
  }, [procesarArchivo])

  // ── Generar HTML ─────────────────────────────────────────────
  const generarReporte = useCallback(() => {
    if (!datos) return
    setError('')
    try {
      const html = generarReporteHTML(datos)
      setHtmlReporte(html)
      setPaso('listo')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el reporte'
      setError(msg)
    }
  }, [datos])

  // ── Ver en pantalla ──────────────────────────────────────────
  const verEnPantalla = useCallback(() => {
    if (!htmlReporte) return
    const blob = new Blob([htmlReporte], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }, [htmlReporte])

  // ── Descargar HTML ───────────────────────────────────────────
  const descargar = useCallback(() => {
    if (!htmlReporte || !datos) return
    const blob = new Blob([htmlReporte], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ingresos-${datos.periodo}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [htmlReporte, datos])

  // ── Reset ─────────────────────────────────────────────────────
  const resetear = useCallback(() => {
    setPaso('idle')
    setDatos(null)
    setHtmlReporte('')
    setError('')
  }, [])

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>

      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Inicio</Link>
        <span className={styles.title}>Generar Reporte HTML</span>
      </header>

      {/* ── IDLE: drop zone ───────────────────────────────── */}
      {paso === 'idle' && (
        <>
          <div
            className={`${styles.dropzone} ${dragActive ? styles.dropActive : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <span className={styles.dropIcon}>📊</span>
            <span className={styles.dropText}>Arrastrá el Excel acá</span>
            <span className={styles.dropSub}>Excel .xlsx — Formato Ingresos mensual</span>
            <span className={styles.dropBtn}>Seleccionar archivo</span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </>
      )}

      {/* ── PROCESANDO ────────────────────────────────────── */}
      {paso === 'procesando' && (
        <div className={styles.procesando}>
          <div className={styles.spinner} />
          <span>Leyendo y procesando el Excel…</span>
        </div>
      )}

      {/* ── PREVIEW ───────────────────────────────────────── */}
      {paso === 'preview' && datos && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <div>
              <div className={styles.previewTitulo}>Ingresos {datos.mes}</div>
              <div className={styles.previewSub}>
                {datos.dias} días · {datos.periodo}
              </div>
            </div>
            <span className={styles.previewOk}>✓ Parseado</span>
          </div>

          {/* KPI pills */}
          <div className={styles.previewKpis}>
            <div className={styles.previewKpi}>
              <span className={styles.previewKpiL}>Ventas</span>
              <span className={styles.previewKpiV}>
                us$ {datos.ventas_MM.toFixed(2).replace('.', ',')} MM
              </span>
            </div>
            <div className={styles.previewKpi}>
              <span className={styles.previewKpiL}>Vol. Producido</span>
              <span className={styles.previewKpiV}>
                {Math.round(datos.vol_producido_boed).toLocaleString('es-AR')} boe/d
              </span>
            </div>
            <div className={styles.previewKpi}>
              <span className={styles.previewKpiL}>Vol. Vendido</span>
              <span className={styles.previewKpiV}>
                {Math.round(datos.vol_vendido_boed).toLocaleString('es-AR')} boe/d
              </span>
            </div>
            <div className={styles.previewKpi}>
              <span className={styles.previewKpiL}>Precio Oil</span>
              <span className={styles.previewKpiV}>
                {datos.precio_neto_oil.toFixed(2).replace('.', ',')} us$/bbl
              </span>
            </div>
            <div className={styles.previewKpi}>
              <span className={styles.previewKpiL}>Precio Gas</span>
              <span className={styles.previewKpiV}>
                {datos.precio_neto_gas.toFixed(3).replace('.', ',')} us$/mcf
              </span>
            </div>
          </div>

          {/* Area pills */}
          <div className={styles.previewAreas}>
            <div className={styles.previewArea}>
              <div className={styles.previewAreaNombre}>ET / LT-PQ</div>
              <div className={styles.previewAreaVal}>
                {(datos.areas.ET.ingreso / 1_000_000).toFixed(2).replace('.', ',')} MM
              </div>
              <div className={styles.previewAreaPrec}>
                {datos.areas.ET.precio_neto.toFixed(2).replace('.', ',')} us$/bbl
              </div>
            </div>
            <div className={styles.previewArea}>
              <div className={styles.previewAreaNombre}>PC-KK</div>
              <div className={styles.previewAreaVal}>
                {(datos.areas.PCKK.ingreso / 1_000_000).toFixed(2).replace('.', ',')} MM
              </div>
              <div className={styles.previewAreaPrec}>
                {datos.areas.PCKK.precio_neto.toFixed(2).replace('.', ',')} us$/bbl
              </div>
            </div>
            <div className={styles.previewArea}>
              <div className={styles.previewAreaNombre}>CH / PPC</div>
              <div className={styles.previewAreaVal}>
                {(datos.areas.CH.ingreso / 1_000_000).toFixed(2).replace('.', ',')} MM
              </div>
              <div className={styles.previewAreaPrec}>
                {datos.areas.CH.precio_neto.toFixed(2).replace('.', ',')} us$/bbl
              </div>
            </div>
            <div className={styles.previewArea}>
              <div className={styles.previewAreaNombre}>RCLV</div>
              <div className={styles.previewAreaVal}>
                {(datos.areas.RCLV.ingreso / 1_000_000).toFixed(2).replace('.', ',')} MM
              </div>
              <div className={styles.previewAreaPrec}>
                {datos.areas.RCLV.precio_neto.toFixed(2).replace('.', ',')} us$/bbl
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={resetear}>
              Cambiar archivo
            </button>
            <button className={styles.btnPrimary} onClick={generarReporte}>
              Generar Reporte HTML
            </button>
          </div>
        </div>
      )}

      {/* ── LISTO ─────────────────────────────────────────── */}
      {paso === 'listo' && datos && (
        <div className={styles.listo}>
          <div className={styles.listoIcon}>✓</div>
          <h2>Reporte generado</h2>
          <p>Ingresos {datos.mes}</p>
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={verEnPantalla}>
              Ver en pantalla
            </button>
            <button className={styles.btnPrimary} onClick={descargar}>
              Descargar HTML
            </button>
          </div>
          <button className={styles.reset} onClick={resetear}>
            ← Generar otro
          </button>
        </div>
      )}

    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { parsearIngresosExcel, type DatosIngresos } from '@/lib/parsers/ingresos'
import { subirArchivo, guardarReporte, publicarReporte } from '@/lib/admin'
import styles from './upload.module.css'

type Paso = 'seleccionar' | 'procesando' | 'preview' | 'subiendo' | 'listo'
type TipoReporte = 'ingresos' | 'custom'

export default function UploadPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>('seleccionar')
  const [tipo, setTipo] = useState<TipoReporte>('ingresos')
  const [file, setFile] = useState<File | null>(null)
  const [datos, setDatos] = useState<DatosIngresos | null>(null)
  const [error, setError] = useState('')
  const [reporteId, setReporteId] = useState('')
  const [drag, setDrag] = useState(false)

  // ── DRAG & DROP ───────────────────────────────────────────
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) await procesarArchivo(f)
  }, [tipo])

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) await procesarArchivo(f)
  }

  // ── PROCESAR ARCHIVO ──────────────────────────────────────
  async function procesarArchivo(f: File) {
    setFile(f)
    setError('')

    if (tipo === 'ingresos') {
      setPaso('procesando')
      try {
        const parsed = await parsearIngresosExcel(f)
        setDatos(parsed)
        setPaso('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error procesando el archivo')
        setPaso('seleccionar')
      }
    } else {
      // Para reportes custom: solo subir sin parsear
      setPaso('preview')
    }
  }

  // ── PUBLICAR ──────────────────────────────────────────────
  async function publicar(estado: 'borrador' | 'publicado') {
    if (!file) return
    setPaso('subiendo')
    setError('')

    try {
      // 1. Subir archivo a Storage
      const ext = file.name.split('.').pop()
      const path = `${tipo}/${datos?.periodo ?? 'custom'}_${Date.now()}.${ext}`
      const uploaded = await subirArchivo(file, path)

      // 2. Guardar en DB
      const saved = await guardarReporte({
        type_id: tipo,
        titulo: datos?.mes ? `Ingresos ${datos.mes}` : file.name.replace(/\.\w+$/, ''),
        periodo: datos?.periodo ?? new Date().toISOString().slice(0, 7),
        storage_path: uploaded?.path ?? '',
       datos: (datos as unknown as Record<string, unknown>) ?? {},
        estado,
      })

      if (!saved) throw new Error('No se pudo guardar en la base de datos')

      setReporteId(saved.id)
      setPaso('listo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar')
      setPaso('preview')
    }
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>

      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.push('/')}>← Volver</button>
        <h1 className={styles.title}>Subir Reporte</h1>
      </div>

      {/* Tipo de reporte */}
      {paso === 'seleccionar' && (
        <div className={styles.section}>
          <p className={styles.sectionLbl}>Tipo de reporte</p>
          <div className={styles.tipoGrid}>
            {[
              { id: 'ingresos', label: 'Ingresos estimados', desc: 'Excel con formato Revenue mensual — se parsea automáticamente', icon: '📊' },
              { id: 'custom',   label: 'Otro tipo',          desc: 'Subís el archivo tal cual. Se puede ver y descargar.',         icon: '📁' },
            ].map(t => (
              <button
                key={t.id}
                className={`${styles.tipoCard} ${tipo === t.id ? styles.tipoActive : ''}`}
                onClick={() => setTipo(t.id as TipoReporte)}
              >
                <span className={styles.tipoIcon}>{t.icon}</span>
                <span className={styles.tipoLabel}>{t.label}</span>
                <span className={styles.tipoDesc}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      {paso === 'seleccionar' && (
        <div
          className={`${styles.dropzone} ${drag ? styles.dropActive : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <div className={styles.dropIcon}>⬆</div>
          <p className={styles.dropText}>
            {drag ? 'Soltá el archivo acá' : 'Arrastrá el archivo acá'}
          </p>
          <p className={styles.dropSub}>
            {tipo === 'ingresos' ? 'Excel .xlsx — Revenue estimado' : 'Excel, HTML, PDF'}
          </p>
          <label className={styles.dropBtn}>
            Seleccionar archivo
            <input
              type="file"
              accept={tipo === 'ingresos' ? '.xlsx,.xls' : '.xlsx,.xls,.html,.pdf'}
              onChange={onFileInput}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      {/* Procesando */}
      {paso === 'procesando' && (
        <div className={styles.procesando}>
          <div className={styles.spinner} />
          <p>Leyendo y procesando el Excel…</p>
        </div>
      )}

      {/* Preview de datos parseados */}
      {paso === 'preview' && datos && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <div>
              <h2 className={styles.previewTitulo}>Ingresos {datos.mes}</h2>
              <p className={styles.previewSub}>{datos.dias} días · {datos.periodo}</p>
            </div>
            <span className={styles.previewOk}>✓ Parseado correctamente</span>
          </div>

          <div className={styles.previewKpis}>
            {[
              { l: 'Ventas período',  v: `us$ ${datos.ventas_MM.toFixed(2)} MM` },
              { l: 'BRENT prom.',     v: `${datos.brent_prom.toFixed(2)} us$/bbl` },
              { l: 'Precio neto oil', v: `${datos.precio_neto_oil.toFixed(2)} us$/bbl` },
              { l: 'Precio neto gas', v: `${datos.precio_neto_gas.toFixed(2)} us$/mcf` },
              { l: 'Stock mes sig.',  v: `us$ ${datos.stock_MM.toFixed(2)} MM` },
            ].map(k => (
              <div key={k.l} className={styles.previewKpi}>
                <span className={styles.previewKpiL}>{k.l}</span>
                <span className={styles.previewKpiV}>{k.v}</span>
              </div>
            ))}
          </div>

          <div className={styles.previewAreas}>
            {Object.entries(datos.areas).map(([nombre, area]) => (
              <div key={nombre} className={styles.previewArea}>
                <p className={styles.previewAreaNombre}>{nombre}</p>
                <p className={styles.previewAreaVal}>us$ {(area.ingreso / 1e6).toFixed(2)} MM</p>
                <p className={styles.previewAreaPrec}>{area.precio_neto.toFixed(2)} us$/bbl</p>
              </div>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => publicar('borrador')}>
              Guardar como borrador
            </button>
            <button className={styles.btnPrimary} onClick={() => publicar('publicado')}>
              Publicar ahora
            </button>
          </div>
        </div>
      )}

      {/* Preview para archivos custom (sin parseo) */}
      {paso === 'preview' && !datos && file && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <div>
              <h2 className={styles.previewTitulo}>{file.name}</h2>
              <p className={styles.previewSub}>{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <span className={styles.previewOk}>✓ Archivo listo</span>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => publicar('borrador')}>
              Guardar como borrador
            </button>
            <button className={styles.btnPrimary} onClick={() => publicar('publicado')}>
              Publicar ahora
            </button>
          </div>
        </div>
      )}

      {/* Subiendo */}
      {paso === 'subiendo' && (
        <div className={styles.procesando}>
          <div className={styles.spinner} />
          <p>Subiendo y guardando…</p>
        </div>
      )}

      {/* Listo */}
      {paso === 'listo' && (
        <div className={styles.listo}>
          <div className={styles.listoIcon}>✓</div>
          <h2>¡Reporte publicado!</h2>
          <p>Ya está disponible para todos los usuarios.</p>
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => {
              setPaso('seleccionar'); setFile(null); setDatos(null); setError('')
            }}>
              Subir otro
            </button>
            <button className={styles.btnPrimary} onClick={() => router.push('/')}>
              Ver reportes
            </button>
          </div>
        </div>
      )}

      {error && paso === 'seleccionar' && (
        <p className={styles.errorGlobal}>{error}</p>
      )}

    </div>
  )
}

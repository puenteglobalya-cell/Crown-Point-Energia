'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

type MatchPadronAgip = {
  cuit: string
  caracter: string
  alicuotaPercepcion: number
  alicuotaRetencion: number
  vigenciaDesde: string
  vigenciaHasta: string
  nombre: string
  codigoSap: string
  razonSocialSap: string
}

const AGIP_REF_URL = 'https://www.agip.gob.ar/agentes/agentes-de-recaudacion-e-informacion'

export default function PadronAgipPage() {
  const sapFileRef = useRef<HTMLInputElement>(null)
  const padronFileRef = useRef<HTMLInputElement>(null)

  const [sapTotal, setSapTotal] = useState<number | null>(null)
  const [sapUltimaCarga, setSapUltimaCarga] = useState<string | null>(null)
  const [sapCargando, setSapCargando] = useState(false)
  const [sapErr, setSapErr] = useState('')

  const [padronCargando, setPadronCargando] = useState(false)
  const [padronProgreso, setPadronProgreso] = useState('')
  const [padronErr, setPadronErr] = useState('')
  const [matches, setMatches] = useState<MatchPadronAgip[] | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const supabase = createSupabaseBrowserClient()

  async function cargarEstadoSap() {
    const res = await fetch('/api/finanzas/sap-clientes')
    if (!res.ok) return
    const data = await res.json()
    setSapTotal(data.total)
    setSapUltimaCarga(data.ultimaCarga)
  }

  useEffect(() => { cargarEstadoSap() }, [])

  async function handleSapFile(file: File) {
    setSapErr('')
    setSapCargando(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/finanzas/sap-clientes', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar el Excel de clientes SAP.')
      await cargarEstadoSap()
    } catch (e) {
      setSapErr((e as Error).message)
    } finally {
      setSapCargando(false)
      if (sapFileRef.current) sapFileRef.current.value = ''
    }
  }

  async function handlePadronFile(file: File) {
    setPadronErr('')
    setMatches(null)
    setPadronCargando(true)
    try {
      setPadronProgreso('Subiendo padrón…')
      const path = `padron-agip/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: false, contentType: 'text/plain' })
      if (uploadErr) throw new Error(`Error al subir el archivo: ${uploadErr.message}`)

      setPadronProgreso('Procesando y cruzando contra clientes SAP…')
      const res = await fetch('/api/finanzas/padron-agip', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar el padrón.')
      setMatches(data.matches)
    } catch (e) {
      setPadronErr((e as Error).message)
    } finally {
      setPadronCargando(false)
      setPadronProgreso('')
      if (padronFileRef.current) padronFileRef.current.value = ''
    }
  }

  const filtrados = (matches ?? []).filter(m => {
    if (!busqueda.trim()) return true
    const q = busqueda.trim().toLowerCase()
    return m.cuit.includes(q) || m.razonSocialSap.toLowerCase().includes(q) || m.codigoSap.toLowerCase().includes(q)
  })

  return (
    <div className="portal-page">
      <div className="portal-header">
        <div>
          <h1 className="portal-header__title">Padrón AGIP — Alícuotas IIBB</h1>
          <p className="portal-header__subtitle">
            Subí el padrón de agentes de recaudación de AGIP (CABA) y obtené la alícuota de percepción/retención
            y el código SAP de cada cliente propio.
          </p>
        </div>
        <Link href="/portal/finanzas" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 14 }}>
          Volver
        </Link>
      </div>

      <section className="portal-section">
        <h2 className="portal-section__title">1. Clientes SAP (CUIT ↔ código SAP)</h2>
        <p style={{ fontSize: 13, color: 'var(--muted2, #667)', marginBottom: 12 }}>
          Subí el Excel de clientes de SAP (export de KNA1 — Cliente general) para tener la tabla de referencia
          CUIT → código SAP. Solo hace falta repetirlo cuando cambien los clientes.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '10px 20px', fontSize: 14 }}>
            {sapCargando ? 'Cargando…' : 'Subir Excel de clientes SAP'}
            <input
              ref={sapFileRef}
              type="file"
              accept=".xlsx"
              hidden
              disabled={sapCargando}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleSapFile(f) }}
            />
          </label>
          <span style={{ fontSize: 13, color: 'var(--muted2, #667)' }}>
            {sapTotal != null
              ? `${sapTotal.toLocaleString('es-AR')} clientes cargados${sapUltimaCarga ? ` · última carga: ${new Date(sapUltimaCarga).toLocaleString('es-AR')}` : ''}`
              : 'Sin clientes cargados todavía'}
          </span>
        </div>
        {sapErr && <p style={{ color: 'var(--rojo, #c0392b)', fontSize: 13, marginTop: 10 }}>{sapErr}</p>}
      </section>

      <section className="portal-section">
        <h2 className="portal-section__title">2. Padrón AGIP del período</h2>
        <p style={{ fontSize: 13, color: 'var(--muted2, #667)', marginBottom: 12 }}>
          Subí el archivo .txt del padrón (si lo bajaste comprimido en .rar/.zip, extraelo primero). Referencia:{' '}
          <a href={AGIP_REF_URL} target="_blank" rel="noopener noreferrer">agentes de recaudación — AGIP</a>.
        </p>
        <label className="btn btn-primary" style={{ cursor: 'pointer', padding: '10px 20px', fontSize: 14, display: 'inline-block' }}>
          {padronCargando ? (padronProgreso || 'Procesando…') : 'Subir padrón (.txt)'}
          <input
            ref={padronFileRef}
            type="file"
            accept=".txt"
            hidden
            disabled={padronCargando || !sapTotal}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePadronFile(f) }}
          />
        </label>
        {!sapTotal && <p style={{ fontSize: 13, color: 'var(--muted2, #667)', marginTop: 10 }}>Primero cargá los clientes SAP (paso 1).</p>}
        {padronErr && <p style={{ color: 'var(--rojo, #c0392b)', fontSize: 13, marginTop: 10 }}>{padronErr}</p>}
      </section>

      {matches && (
        <section className="portal-section">
          <h2 className="portal-section__title">Resultado — {matches.length} cliente(s) encontrados en el padrón</h2>
          <input
            type="text"
            placeholder="Buscar por CUIT, razón social o código SAP…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', maxWidth: 420, padding: '8px 12px', marginBottom: 14, borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
          />
          <div style={{ overflowX: 'auto' }}>
            <table className="t" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>CUIT</th>
                  <th>Razón social (SAP)</th>
                  <th>Código SAP</th>
                  <th>Alícuota percepción</th>
                  <th>Alícuota retención</th>
                  <th>Vigencia</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(m => (
                  <tr key={m.cuit}>
                    <td>{m.cuit}</td>
                    <td>{m.razonSocialSap || m.nombre || '—'}</td>
                    <td><b>{m.codigoSap}</b></td>
                    <td>{m.alicuotaPercepcion.toFixed(2).replace('.', ',')}%</td>
                    <td>{m.alicuotaRetencion.toFixed(2).replace('.', ',')}%</td>
                    <td>{m.vigenciaDesde} a {m.vigenciaHasta}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--muted2, #667)' }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

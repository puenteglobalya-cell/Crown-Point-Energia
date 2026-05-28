import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const revalidate = 60

const TIPO_LABELS: Record<string, { es: string; en: string }> = {
  general:    { es: 'General',               en: 'General' },
  resultados: { es: 'Resultados financieros', en: 'Financial results' },
  operaciones:{ es: 'Operaciones',            en: 'Operations' },
  mercados:   { es: 'Mercados de capital',    en: 'Capital markets' },
  esg:        { es: 'ESG / Sostenibilidad',   en: 'ESG / Sustainability' },
  gobierno:   { es: 'Gobierno corporativo',   en: 'Corporate governance' },
}

function fmtFecha(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${path}`
}

export default async function ComunicadoDetailPage({ params }: { params: { id: string } }) {
  const { data } = await createSupabaseServerAdminClient()
    .from('comunicados')
    .select('*')
    .eq('id', params.id)
    .eq('publicado', true)
    .single()

  if (!data) notFound()

  const label = TIPO_LABELS[data.tipo] ?? { es: data.tipo, en: data.tipo }
  const docUrl = data.url || (data.storage_path ? publicUrl(data.storage_path) : null)

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <Link href="/comunicados"><span className="lang-es">Comunicados</span><span className="lang-en">Press releases</span></Link>
            <span>/</span>
            <span>{data.periodo || fmtFecha(data.fecha)}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 'var(--s-4)', flexWrap: 'wrap' }}>
            <span className="chip">
              <span className="lang-es">{label.es}</span>
              <span className="lang-en">{label.en}</span>
            </span>
            <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
              {fmtFecha(data.fecha)}
            </span>
          </div>
          <h1 style={{ marginTop: 0 }}>
            <span className="lang-es">{data.titulo_es}</span>
            <span className="lang-en">{data.titulo_en || data.titulo_es}</span>
          </h1>
          {(data.resumen_es || data.resumen_en) && (
            <p style={{ marginTop: 'var(--s-4)' }}>
              <span className="lang-es">{data.resumen_es}</span>
              <span className="lang-en">{data.resumen_en || data.resumen_es}</span>
            </p>
          )}
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div style={{ maxWidth: 680 }}>
            {docUrl ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 'var(--s-8)' }}>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 13V3M6 9l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 17h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  <span className="lang-es">Descargar comunicado</span>
                  <span className="lang-en">Download release</span>
                </a>
                <Link href="/comunicados" className="btn" style={{ textDecoration: 'none' }}>
                  <span className="lang-es">← Ver todos</span>
                  <span className="lang-en">← All releases</span>
                </Link>
              </div>
            ) : (
              <div style={{ marginBottom: 'var(--s-8)' }}>
                <Link href="/comunicados" className="btn" style={{ textDecoration: 'none' }}>
                  <span className="lang-es">← Ver todos los comunicados</span>
                  <span className="lang-en">← All press releases</span>
                </Link>
              </div>
            )}

            {/* Disclaimer */}
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6, borderTop: '1px solid var(--rule)', paddingTop: 'var(--s-6)' }}>
              <span className="lang-es">
                Este comunicado fue publicado por Crown Point Energía S.A. y/o Crown Point Energy Inc. (TSXV: CWV).
                Las declaraciones prospectivas están sujetas a riesgos e incertidumbres que podrían diferir materialmente de los resultados reales.
              </span>
              <span className="lang-en">
                This release was published by Crown Point Energía S.A. and/or Crown Point Energy Inc. (TSXV: CWV).
                Forward-looking statements are subject to risks and uncertainties that could cause actual results to differ materially.
              </span>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

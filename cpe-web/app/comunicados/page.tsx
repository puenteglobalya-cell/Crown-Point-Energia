import Link from 'next/link'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import ComunicadosList from './ComunicadosList'
import { getEffectiveLang } from '@/lib/lang'

export const revalidate = 60

export const metadata = {
  title: 'Comunicados | Crown Point Energy',
  description: 'Comunicados de prensa, hechos relevantes y novedades corporativas de Crown Point Energy (TSXV: CWV).',
  alternates: {
    canonical: 'https://crownpointenergy.com/comunicados',
    types: { 'application/rss+xml': 'https://crownpointenergy.com/comunicados/rss.xml' },
  },
}

export default async function ComunicadosPage() {
  const { data } = await createSupabaseServerAdminClient()
    .from('comunicados')
    .select('*')
    .eq('publicado', true)
    .order('fecha', { ascending: false })

  const lang = await getEffectiveLang('es')

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es" aria-hidden={lang !== 'es'}>Inicio</span><span className="lang-en" aria-hidden={lang !== 'en'}>Home</span></Link>
            <span>/</span>
            <Link href="/inversores"><span className="lang-es" aria-hidden={lang !== 'es'}>Invertir</span><span className="lang-en" aria-hidden={lang !== 'en'}>Invest</span></Link>
            <span>/</span>
            <span><span className="lang-es" aria-hidden={lang !== 'es'}>Comunicados</span><span className="lang-en" aria-hidden={lang !== 'en'}>Press releases</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es" aria-hidden={lang !== 'es'}>Sala de prensa</span><span className="lang-en" aria-hidden={lang !== 'en'}>Newsroom</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es" aria-hidden={lang !== 'es'}>Comunicados de prensa.</span>
            <span className="lang-en" aria-hidden={lang !== 'en'}>Press releases.</span>
          </h1>
          <p>
            <span className="lang-es" aria-hidden={lang !== 'es'}>Eventos relevantes, resultados financieros y anuncios operativos publicados por Crown Point Energía S.A. y Crown Point Energy Inc. (TSXV: CWV).</span>
            <span className="lang-en" aria-hidden={lang !== 'en'}>Material events, financial results and operational announcements published by Crown Point Energía S.A. and Crown Point Energy Inc. (TSXV: CWV).</span>
          </p>
        </div>
      </section>

      <ComunicadosList initialData={data ?? []} />
    </>
  )
}

import Link from 'next/link'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import ComunicadosList from './ComunicadosList'

export const revalidate = 60

export default async function ComunicadosPage() {
  const { data } = await createSupabaseServerAdminClient()
    .from('comunicados')
    .select('*')
    .eq('publicado', true)
    .order('fecha', { ascending: false })

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/"><span className="lang-es">Inicio</span><span className="lang-en">Home</span></Link>
            <span>/</span>
            <Link href="/inversores"><span className="lang-es">Invertir</span><span className="lang-en">Invest</span></Link>
            <span>/</span>
            <span><span className="lang-es">Comunicados</span><span className="lang-en">Press releases</span></span>
          </div>
          <span className="eyebrow"><span className="lang-es">Sala de prensa</span><span className="lang-en">Newsroom</span></span>
          <h1 style={{ marginTop: 14 }}>
            <span className="lang-es">Comunicados de prensa.</span>
            <span className="lang-en">Press releases.</span>
          </h1>
          <p>
            <span className="lang-es">Eventos relevantes, resultados financieros y anuncios operativos publicados por Crown Point Energía S.A. y Crown Point Energy Inc. (TSXV: CWV).</span>
            <span className="lang-en">Material events, financial results and operational announcements published by Crown Point Energía S.A. and Crown Point Energy Inc. (TSXV: CWV).</span>
          </p>
        </div>
      </section>

      <ComunicadosList initialData={data ?? []} />
    </>
  )
}

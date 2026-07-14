import type { Metadata } from 'next'
import { getCmsState } from '@/lib/cms'

export const metadata: Metadata = {
  title: 'Infografía — Crown Point Energía',
}
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import InfografiaClient from './InfografiaClient'

export const revalidate = 300
export const dynamic = 'force-dynamic'

export default async function InfografiaPage() {
  const db = createSupabaseServerAdminClient()
  const [s, blocksRes] = await Promise.all([
    getCmsState(),
    db.from('operations_blocks')
      .select('slug,titulo,subtitulo_es,commodity,wi')
      .eq('activo', true)
      .order('orden'),
  ])

  const f = s.fields
  const blocks = (blocksRes.data ?? []) as Array<{
    slug: string; titulo: string; subtitulo_es: string; commodity: 'oil' | 'gas' | 'mixed'; wi?: string
  }>

  const dateStr = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <InfografiaClient
      stats={{
        pozos:      f['stats.pozos']      || '357',
        inyectores: f['stats.inyectores'] || '83',
        cuencas:    f['stats.cuencas']    || '4',
        ha:         f['stats.ha']         || '372k',
        anios:      f['stats.anios']      || '25+',
      }}
      production={{
        val:     f['ops.kpi.production'] || '3,090',
        unit:    'boe/d neto',
        mix:     (f['ops.kpi.mix'] || '54/46') + ' % gas / líquidos',
        periodo: 'Q1 2026',
      }}
      blocks={blocks.map(b => ({
        slug:      b.slug,
        titulo:    b.titulo,
        subtitulo: b.subtitulo_es || '',
        commodity: b.commodity,
        wi:        b.wi || undefined,
      }))}
      thesis={{
        prodVal:   f['kpi.production.value'] || '3,090',
        prodUnit:  f['kpi.production.unit']  || 'boe/d neto',
        prodDelta: f['kpi.production.delta'] || 'Q1 2026',
        resVal:    f['kpi.reserves.value']   || 'N/D',
        resUnit:   f['kpi.reserves.unit']    || 'MMboe 2P',
        resDelta:  f['kpi.reserves.delta']   || '',
        ebVal:     f['kpi.ebitda.value']     || 'N/D',
        ebUnit:    f['kpi.ebitda.unit']      || 'USD MM',
        ebDelta:   f['kpi.ebitda.delta']     || '',
      }}
      date={dateStr}
    />
  )
}

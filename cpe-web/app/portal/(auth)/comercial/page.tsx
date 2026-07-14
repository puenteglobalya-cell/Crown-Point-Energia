import { redirect } from 'next/navigation'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import ComercialClient from './ComercialClient'
import { MacroWidget } from '../MacroWidget'
import { getCurrentUserAndRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  facturacion: 'Facturación',
  ingresos:    'Ventas Estimadas',
}

export default async function ComercialPage() {
  const { permissions } = await getCurrentUserAndRole()
  if (!permissions.has('view_comercial')) redirect('/portal')

  const db = createSupabaseServerAdminClient()

  const [facturacionRes, ingresosRes, seRes] = await Promise.all([
    db.from('reportes')
      .select('id, tipo_id:type_id, titulo, periodo, created_at')
      .eq('type_id', 'facturacion')
      .eq('estado', 'publicado')
      .order('created_at', { ascending: false })
      .limit(6),

    db.from('reportes')
      .select('id, tipo_id:type_id, titulo, periodo, created_at')
      .eq('type_id', 'ingresos')
      .eq('estado', 'publicado')
      .order('created_at', { ascending: false })
      .limit(6),

    db.from('se_referencias')
      .select('id, fecha_desde, fecha_hasta, scraped_at, headers, filas, brent_ref')
      .order('fecha_desde', { ascending: false })
      .limit(24),
  ])

  type ReporteRow = { id: string; tipo_id: string | null; titulo: string; periodo: string; created_at: string }
  const facturacion = (facturacionRes.data ?? []) as ReporteRow[]
  const ingresos    = (ingresosRes.data    ?? []) as ReporteRow[]
  const seList      = (seRes.data ?? []) as NonNullable<typeof seRes.data>
  const isAdmin     = permissions.has('manage_users')

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8e91b0', margin: '0 0 4px' }}>
          Portal
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', margin: 0 }}>
          Reportes Comerciales
        </h1>
      </div>

      {/* ── Reportes ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: '0 0 16px', fontFamily: 'var(--font-display)' }}>
          Reportes
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

          {/* Facturación */}
          <ReporteGroup
            label={TYPE_LABELS.facturacion}
            color="#E07B30"
            items={facturacion}
            allHref="/portal?type=facturacion"
          />

          {/* Ventas estimadas */}
          <ReporteGroup
            label={TYPE_LABELS.ingresos}
            color="#1F2566"
            items={ingresos}
            allHref="/portal?type=ingresos"
          />

        </div>
      </section>

      {/* ── Forecast de precios ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>
          Forecast de Precios
        </h2>
        <p style={{ fontSize: 12, color: '#8e91b0', margin: '0 0 16px' }}>
          Curva de futuros ICE Brent + Henry Hub — próximos 12 meses
        </p>
        <MacroWidget />
      </section>

      {/* ── Referencia de Mercado SE ── */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>
          Referencia de Mercado
        </h2>
        <p style={{ fontSize: 12, color: '#8e91b0', margin: '0 0 16px' }}>
          Secretaría de Energía · oferta de comercio exterior de líquidos
        </p>
        <ComercialClient seList={seList} isAdmin={isAdmin} />
      </section>

    </div>
  )
}

/* ── ReporteGroup sub-component ── */
function ReporteGroup({
  label, color, items, allHref,
}: {
  label:   string
  color:   string
  items:   { id: string; titulo: string; periodo: string; created_at: string }[]
  allHref: string
}) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--rule)', overflow: 'hidden' }}>
      {/* Group header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>{label}</span>
        </div>
        <Link href={allHref} style={{ fontSize: 11, color: '#8e91b0', textDecoration: 'none' }}>
          Ver todos →
        </Link>
      </div>

      {items.length === 0 ? (
        <p style={{ padding: '20px 18px', fontSize: 13, color: '#8e91b0', margin: 0 }}>Sin reportes publicados.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((r, i) => (
            <li key={r.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 18px',
              borderBottom: i < items.length - 1 ? '1px solid var(--rule)' : 'none',
            }}>
              <div>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{r.titulo}</span>
                <span style={{ fontSize: 11, color: '#8e91b0' }}>{r.periodo}</span>
              </div>
              <Link
                href={`/api/admin/reportes/${r.id}`}
                target="_blank"
                style={{ fontSize: 12, fontWeight: 600, color: color, textDecoration: 'none', flexShrink: 0 }}
              >
                Ver →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

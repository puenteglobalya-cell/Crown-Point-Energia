import { redirect } from 'next/navigation'
import { requireAdminUser } from '@/lib/admin-auth'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { AdminPageHeader } from '@/components/AdminPageHeader'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function hoursSince(iso: string | null): number | null {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

// Both syncs run on weekdays only — give them room for a weekend gap before flagging as stale.
const STALE_AFTER_HOURS = 72

function StatusPill({ hours }: { hours: number | null }) {
  if (hours === null) {
    return <span style={pillStyle('#8e91b0', 'rgba(142,145,176,0.12)')}>Sin datos</span>
  }
  if (hours > STALE_AFTER_HOURS) {
    return <span style={pillStyle('#C94A4A', 'rgba(201,74,74,0.12)')}>Atrasado</span>
  }
  return <span style={pillStyle('var(--cp-green-deep, #2f6b3f)', 'rgba(47,107,63,0.12)')}>Al día</span>
}

function pillStyle(fg: string, bg: string): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
    padding: '3px 10px', borderRadius: 100, color: fg, background: bg,
  }
}

function Card({ title, subtitle, lastUpdated, extra }: {
  title: string; subtitle: string; lastUpdated: string | null; extra?: React.ReactNode
}) {
  const hours = hoursSince(lastUpdated)
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-lg)',
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
        <StatusPill hours={hours} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-soft)', marginTop: 4 }}>
        Última actualización:{' '}
        <strong style={{ color: 'var(--fg)' }}>{fmtDate(lastUpdated) ?? 'nunca'}</strong>
        {hours !== null && (
          <span style={{ color: 'var(--fg-muted)' }}> · hace {hours < 1 ? '<1 hora' : `${Math.round(hours)} h`}</span>
        )}
      </div>
      {extra}
    </div>
  )
}

export default async function EstadoSistemaPage() {
  const user = await requireAdminUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseServerAdminClient()

  const [{ data: stockFields }, { data: cnvLatest }, { count: cnvCount }] = await Promise.all([
    db.from('cms_fields').select('key, value_es, updated_at').ilike('key', 'stock.%').order('updated_at', { ascending: false }),
    db.from('cnv_hechos').select('synced_at, descripcion, fecha').order('synced_at', { ascending: false }).limit(1),
    db.from('cnv_hechos').select('*', { count: 'exact', head: true }),
  ])

  const stockUpdatedAt = stockFields?.[0]?.updated_at ?? null
  const stockPrice = stockFields?.find(f => f.key === 'stock.price')?.value_es ?? null
  const cnvSyncedAt = cnvLatest?.[0]?.synced_at ?? null
  const cnvLastDesc = cnvLatest?.[0]?.descripcion ?? null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <AdminPageHeader
          title="Estado del sistema"
          subtitle="Última vez que se sincronizaron los datos automáticos del sitio."
          note="Corren solo, de lunes a viernes (cotización todos los días hábiles; CNV puede saltear algún día si su sitio no responde)."
        />

        <div style={{ display: 'grid', gap: 16 }}>
          <Card
            title="Cotización — TSXV: CWV"
            subtitle="Precio, variación, máximo/mínimo de 52 semanas (Yahoo Finance)"
            lastUpdated={stockUpdatedAt}
            extra={stockPrice && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Último precio registrado: <strong style={{ color: 'var(--fg)' }}>{stockPrice}</strong></div>
            )}
          />
          <Card
            title="CNV — Hechos relevantes"
            subtitle={`Comunicados de la Comisión Nacional de Valores${cnvCount ? ` · ${cnvCount} registrados en total` : ''}`}
            lastUpdated={cnvSyncedAt}
            extra={cnvLastDesc && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                Último detectado: <span style={{ color: 'var(--fg-soft)' }}>{cnvLastDesc.slice(0, 90)}{cnvLastDesc.length > 90 ? '…' : ''}</span>
              </div>
            )}
          />
        </div>

        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 20 }}>
          Si algo aparece "Atrasado" por más de un día hábil, probá el botón "Sincronizar ahora" en{' '}
          <a href="/admin" style={{ color: 'var(--accent)' }}>Panel principal</a> o{' '}
          <a href="/admin/cnv-sync" style={{ color: 'var(--accent)' }}>CNV</a>, y si sigue sin
          actualizarse avisá para revisar el workflow automático.
        </p>
      </div>
    </div>
  )
}

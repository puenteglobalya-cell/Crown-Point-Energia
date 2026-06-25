import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { enviarAlertaFilingDeadline } from '@/lib/email'

export const dynamic = 'force-dynamic'

const ALERT_DAYS = [60, 70, 80]
const ADMINS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

// Quarter end dates for a given year (month is 0-indexed)
function quarterEnds(year: number) {
  return [
    { q: 'Q1', close: new Date(year,  2, 31) },   // Mar 31
    { q: 'Q2', close: new Date(year,  5, 30) },   // Jun 30
    { q: 'Q3', close: new Date(year,  8, 30) },   // Sep 30
    { q: 'Q4', close: new Date(year, 11, 31) },   // Dec 31
  ]
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// GET /api/cron/filing-reminder — run daily at 9 AM
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check last 2 years of quarters to catch any recent ones
  const allQuarters = [
    ...quarterEnds(today.getFullYear() - 1),
    ...quarterEnds(today.getFullYear()),
  ]

  const alerts: string[] = []

  for (const { q, close } of allQuarters) {
    if (close >= today) continue                    // quarter not closed yet

    const daysElapsed = Math.floor((today.getTime() - close.getTime()) / 86_400_000)
    if (!ALERT_DAYS.includes(daysElapsed)) continue // not an alert day

    const quarter  = `${q} ${close.getFullYear()}`
    const deadline = new Date(close)
    deadline.setDate(deadline.getDate() + 80)

    // Check if a financial report for this quarter was already published
    const sb = createSupabaseServerClient()
    const { count } = await sb
      .from('reportes')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'publicado')
      .ilike('periodo', `%${q}%`)
      .ilike('periodo', `%${close.getFullYear()}%`)

    if ((count ?? 0) > 0) {
      alerts.push(`${quarter}: ya publicado, omitido`)
      continue
    }

    await enviarAlertaFilingDeadline({
      quarter,
      closeDate:   fmtDate(close),
      deadline:    fmtDate(deadline),
      daysElapsed,
      adminEmails: ADMINS,
    })

    alerts.push(`${quarter}: alerta día ${daysElapsed} enviada`)
  }

  const sb2 = createSupabaseServerClient()
  void sb2.from('activity_log').insert({
    user_id:       null,
    user_email:    'cron/filing-reminder',
    action:        alerts.some(a => a.includes('enviada')) ? 'cron_filing_alerta' : 'cron_filing_ok',
    resource_type: 'reporte',
    metadata:      { alerts, today: today.toISOString().slice(0, 10) },
  })

  return NextResponse.json({ ok: true, today: today.toISOString().slice(0, 10), alerts })
}

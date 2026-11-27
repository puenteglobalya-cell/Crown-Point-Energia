import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { enviarResumenCalendarioComercial } from '@/lib/email'
import { secureCompare } from '@/lib/secure-compare'

export const dynamic = 'force-dynamic'

const ADMINS = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// GET /api/cron/calendario-comercial — run Fridays at 9 AM ART
// Resumen semanal de notas pendientes (hecho=false) del calendario de
// Comercial para los próximos 15 días.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }
  if (!secureCompare(req.headers.get('authorization') ?? '', `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const en15dias = new Date(hoy)
  en15dias.setDate(en15dias.getDate() + 15)

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('comercial_calendario_notas')
    .select('fecha, texto')
    .eq('hecho', false)
    .gte('fecha', toIso(hoy))
    .lte('fecha', toIso(en15dias))
    .order('fecha', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notas = data ?? []
  const result = await enviarResumenCalendarioComercial({ notas, adminEmails: ADMINS })

  void db.from('activity_log').insert({
    user_id:       null,
    user_email:    'cron/calendario-comercial',
    action:        notas.length > 0 ? 'cron_calendario_resumen' : 'cron_calendario_vacio',
    resource_type: 'comercial_calendario_notas',
    metadata:      { notas: notas.length, result, hoy: toIso(hoy), en15dias: toIso(en15dias) },
  })

  return NextResponse.json({ ok: true, notas: notas.length, result })
}

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend  = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM    = process.env.RESEND_FROM ?? 'Crown Point Energía <reportes@crownpointenergy.com>'
const ADMINS  = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
const SITE    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crown-point-energia.vercel.app'

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!resend || ADMINS.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'No resend key or no admin emails' })
  }

  const date  = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const backupUrl = `${SITE}/api/admin/backup`

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:40px auto;color:#1a1a2e;line-height:1.6">
  <h2 style="font-size:20px;margin:0 0 8px">Recordatorio de backup semanal</h2>
  <p style="color:#666;margin:0 0 24px;font-size:14px">${date}</p>
  <p>Esta es la notificación semanal automática de Crown Point Energía. Es un buen momento para descargar el backup de la base de datos del sitio.</p>
  <p>El backup incluye: configuración del CMS, campos del sitio, secciones, metadatos de reportes, roles de usuarios y permisos.</p>
  <a href="${SITE}/admin/backup" style="display:inline-block;background:#1F2566;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin:8px 0">
    Ir al panel de backup →
  </a>
  <p style="margin-top:32px;font-size:12px;color:#999">
    Este recordatorio se envía todos los lunes a las 9 AM. Para desactivarlo, eliminá el cron <code>backup-reminder</code> de <code>vercel.json</code>.
  </p>
</body></html>`

  await Promise.allSettled(
    ADMINS.map(to =>
      resend!.emails.send({ from: FROM, to, subject: `[CPE] Recordatorio backup semanal — ${date}`, html })
    )
  )

  return NextResponse.json({ ok: true, sent_to: ADMINS.length })
}

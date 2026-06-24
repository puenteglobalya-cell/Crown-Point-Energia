import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.RESEND_FROM ?? 'Crown Point Energía <reportes@crownpointenergy.com>'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crown-point-energia.vercel.app'

export interface Subscriber { nombre: string; email: string }

export async function enviarNotificacionReporte({
  titulo,
  periodo,
  type_id,
  reporteId,
  subscribers,
}: {
  titulo: string
  periodo: string
  type_id: string | null
  reporteId: string
  subscribers: Subscriber[]
}) {
  if (!resend || subscribers.length === 0) return { sent: 0, skipped: true }

  const portalUrl = `${BASE_URL}/portal`
  const tipoLabel: Record<string, string> = {
    ingresos:   'Ingresos Estimados',
    accionista: 'Informe de Seguimiento',
    produccion: 'Reporte de Producción',
    financiero: 'Reporte Financiero',
    facturacion:'Facturación',
  }
  const tipo = tipoLabel[type_id ?? ''] ?? type_id ?? 'Reporte'

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(31,37,102,.08)">
  <tr><td style="background:#1F2566;padding:28px 36px">
    <p style="margin:0;color:rgba(255,255,255,.7);font-size:12px;letter-spacing:.08em;text-transform:uppercase">Crown Point Energía</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:600">${tipo}</h1>
  </td></tr>
  <tr><td style="padding:36px">
    <p style="margin:0 0 8px;font-size:15px;color:#1a1c2e;font-weight:600">Nuevo reporte disponible</p>
    <p style="margin:0 0 24px;font-size:14px;color:#5a5d78;line-height:1.6">
      Se publicó <strong style="color:#1a1c2e">${titulo}</strong> · Período: ${periodo}
    </p>
    <a href="${portalUrl}" style="display:inline-block;background:#1F2566;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
      Ver en el Portal →
    </a>
    <p style="margin:32px 0 0;font-size:11px;color:#8e91b0;border-top:1px solid #e8e8f0;padding-top:16px">
      Recibís este mail porque estás suscripto a notificaciones de Crown Point Energía.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

  const results = await Promise.allSettled(
    subscribers.map(sub =>
      resend!.emails.send({
        from: FROM,
        to:   sub.email,
        subject: `Nuevo reporte: ${titulo} — ${periodo}`,
        html,
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return { sent, total: subscribers.length }
}

function emailShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(31,37,102,.08)">
  <tr><td style="background:#1F2566;padding:28px 36px">
    <p style="margin:0;color:rgba(255,255,255,.7);font-size:12px;letter-spacing:.08em;text-transform:uppercase">Crown Point Energía</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:600">${title}</h1>
  </td></tr>
  <tr><td style="padding:36px">
    ${body}
    <p style="margin:32px 0 0;font-size:11px;color:#8e91b0;border-top:1px solid #e8e8f0;padding-top:16px">
      Crown Point Energía S.A. · <a href="${BASE_URL}" style="color:#8e91b0">${BASE_URL.replace('https://', '')}</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

export async function enviarConfirmacionContacto({
  nombre,
  email,
  asunto,
}: {
  nombre: string
  email: string
  asunto?: string
}) {
  if (!resend) return
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#1a1c2e;font-weight:600">Hola${nombre ? `, ${nombre}` : ''}.</p>
    <p style="margin:0 0 20px;font-size:14px;color:#5a5d78;line-height:1.6">
      Recibimos tu consulta${asunto ? ` sobre "<strong style="color:#1a1c2e">${asunto}</strong>"` : ''}.
      Nos pondremos en contacto a la brevedad.
    </p>
    <p style="margin:0;font-size:13px;color:#8e91b0;line-height:1.6">
      Si no enviaste este mensaje, podés ignorar este correo.
    </p>`
  await resend.emails.send({
    from: FROM,
    to:   email,
    subject: 'Recibimos tu consulta — Crown Point Energía',
    html:  emailShell('Consulta recibida', body),
  }).catch(() => {/* non-blocking */})
}

export async function enviarConfirmacionPostulacion({
  nombre,
  email,
  area,
}: {
  nombre: string
  email: string
  area: string
}) {
  if (!resend) return
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#1a1c2e;font-weight:600">Hola${nombre ? `, ${nombre}` : ''}.</p>
    <p style="margin:0 0 20px;font-size:14px;color:#5a5d78;line-height:1.6">
      Recibimos tu postulación para el área de <strong style="color:#1a1c2e">${area}</strong>.
      Nuestro equipo de RRHH la revisará y se pondrá en contacto si tu perfil se ajusta a las búsquedas vigentes.
    </p>
    <p style="margin:0;font-size:13px;color:#8e91b0;line-height:1.6">
      Muchas gracias por tu interés en sumarte a Crown Point Energía.
    </p>`
  await resend.emails.send({
    from:     FROM,
    to:       email,
    reply_to: 'rrhh@crownpointenergy.com',
    subject:  'Recibimos tu postulación — Crown Point Energía',
    html:     emailShell('Postulación recibida', body),
  }).catch(() => {/* non-blocking */})
}

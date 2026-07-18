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

// ---------------------------------------------------------------------------
// IR Alert emails — sent to ir_alert_recipients (internal/professional list)
// ---------------------------------------------------------------------------

export interface IrRecipient { nombre: string; email: string }

export async function enviarNotificacionIR({
  titulo,
  tipo,
  descripcion,
  url,
  recipients,
}: {
  titulo: string
  tipo: string           // e.g. "Estado Financiero", "Hecho Relevante", "Comunicado"
  descripcion: string
  url: string            // public URL where the document lives
  recipients: IrRecipient[]
}) {
  if (!resend || recipients.length === 0) return { sent: 0, skipped: true }

  const html = emailShell(`Nueva publicación: ${tipo}`, `
    <p style="margin:0 0 6px;font-size:15px;color:#1a1c2e;font-weight:600">${titulo}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#5a5d78;line-height:1.6">${descripcion}</p>
    <a href="${url}"
       style="display:inline-block;background:#1F2566;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
      Ver documento →
    </a>
    <p style="margin:28px 0 0;font-size:12px;color:#8e91b0">
      Recibís esta notificación porque estás en la lista de alertas IR de Crown Point Energía.
    </p>`)

  const results = await Promise.allSettled(
    recipients.map(r =>
      resend!.emails.send({
        from:    FROM,
        to:      r.email,
        subject: `[CPE IR] ${titulo}`,
        html,
      })
    )
  )
  const sent = results.filter(r => r.status === 'fulfilled').length
  return { sent, total: recipients.length }
}

export async function enviarAlertaFilingDeadline({
  quarter,
  closeDate,
  deadline,
  daysElapsed,
  adminEmails,
}: {
  quarter: string      // e.g. "Q1 2026"
  closeDate: string    // e.g. "31 de marzo de 2026"
  deadline: string     // e.g. "19 de junio de 2026"
  daysElapsed: number
  adminEmails: string[]
}) {
  if (!resend || adminEmails.length === 0) return { sent: 0, skipped: true }

  const daysLeft  = 80 - daysElapsed
  const isOverdue = daysLeft <= 0

  const urgency = daysLeft <= 0
    ? '🔴 VENCIDO'
    : daysLeft <= 5
    ? '🔴 Urgente'
    : daysLeft <= 15
    ? '🟡 Prioridad alta'
    : '🔵 Recordatorio'

  const html = emailShell(`${urgency} — Filing ${quarter}`, `
    <p style="margin:0 0 16px;font-size:15px;color:#1a1c2e;font-weight:600">
      ${isOverdue ? `El plazo para publicar los estados del ${quarter} ya venció.` : `Faltan ${daysLeft} días para publicar los estados del ${quarter}.`}
    </p>
    <table style="border-collapse:collapse;width:100%;margin:0 0 24px;font-size:13px">
      <tr><td style="padding:8px 12px;background:#f4f6fb;border-radius:6px 6px 0 0;color:#5a5d78">Trimestre</td>
          <td style="padding:8px 12px;background:#f4f6fb;border-radius:6px 6px 0 0;font-weight:600;color:#1a1c2e">${quarter}</td></tr>
      <tr><td style="padding:8px 12px;color:#5a5d78">Fecha de cierre</td>
          <td style="padding:8px 12px;font-weight:600;color:#1a1c2e">${closeDate}</td></tr>
      <tr><td style="padding:8px 12px;background:#f4f6fb;color:#5a5d78">Vencimiento (día 80)</td>
          <td style="padding:8px 12px;background:#f4f6fb;font-weight:600;color:${isOverdue ? '#c0392b' : '#1a1c2e'}">${deadline}</td></tr>
      <tr><td style="padding:8px 12px;color:#5a5d78">Días transcurridos</td>
          <td style="padding:8px 12px;font-weight:600;color:${isOverdue ? '#c0392b' : '#1a1c2e'}">${daysElapsed} / 80</td></tr>
    </table>
    <a href="${BASE_URL}/admin/documentos"
       style="display:inline-block;background:#1F2566;color:#fff;text-decoration:none;
              padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
      Ir a Documentos →
    </a>
    <p style="margin:28px 0 0;font-size:12px;color:#8e91b0">
      Esta alerta es automática del sistema CPE. Se envía los días 60, 70 y 80 post-cierre de cada trimestre.
    </p>`)

  const results = await Promise.allSettled(
    adminEmails.map(to =>
      resend!.emails.send({
        from:    FROM,
        to,
        subject: `${urgency} — Publicación estados ${quarter} · Día ${daysElapsed}/80`,
        html,
      })
    )
  )
  const sent = results.filter(r => r.status === 'fulfilled').length
  return { sent, total: adminEmails.length }
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
    replyTo:  'rrhh@crownpointenergy.com',
    subject:  'Recibimos tu postulación — Crown Point Energía',
    html:     emailShell('Postulación recibida', body),
  }).catch(() => {/* non-blocking */})
}

// Notifies accionista users that a new private IR document was uploaded.
// Unlike enviarNotificacionIR, this never links directly to the file — the
// storage bucket is private and signed URLs expire — it points to /portal
// instead, where the document list itself is auth-gated.
export async function enviarNotificacionDocumentoIR({
  titulo,
  categoria,
  recipients,
}: {
  titulo: string
  categoria: string
  recipients: string[]
}) {
  if (!resend || recipients.length === 0) return { sent: 0, skipped: true }

  const html = emailShell('Nuevo documento IR', `
    <p style="margin:0 0 6px;font-size:15px;color:#1a1c2e;font-weight:600">${titulo}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#5a5d78;line-height:1.6">
      Se subió un nuevo documento (${categoria}) a la sección de Documentos IR del portal de accionistas.
    </p>
    <a href="${BASE_URL}/portal"
       style="display:inline-block;background:#1F2566;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
      Ver en el portal →
    </a>
    <p style="margin:28px 0 0;font-size:12px;color:#8e91b0">
      Necesitás iniciar sesión con tu cuenta de accionista para acceder al documento.
    </p>`)

  const results = await Promise.allSettled(
    recipients.map(email => resend!.emails.send({ from: FROM, to: email, subject: `[CPE IR] ${titulo}`, html }))
  )
  const sent = results.filter(r => r.status === 'fulfilled').length
  return { sent, total: recipients.length }
}

const CATEGORIA_LABELS_DENUNCIA: Record<string, string> = {
  anticorrupcion: 'Anticorrupción',
  informacion_privilegiada: 'Uso de información privilegiada',
  conflicto_interes: 'Conflicto de interés',
  acoso_discriminacion: 'Acoso o discriminación',
  fraude_financiero: 'Fraude o irregularidad financiera',
  seguridad_ambiente: 'Seguridad, salud o medio ambiente',
  otro: 'Otro',
}

// Alerts the ethics inbox that a new report came in — deliberately never
// includes the report's content (sensitive, and the reporter may be
// anonymous); it only points staff to the admin panel to review it there.
//
// TODO — PENDIENTE DE VALIDAR: for 'fraude_financiero' / 'anticorrupcion',
// governance best practice is a separate escalation route to the Audit
// Committee / Board (bypassing management) instead of only this shared
// ethics inbox, in case management itself is implicated. No such route
// exists yet — needs a real contact from the company before wiring it up.
export async function enviarNotificacionDenuncia({ categoria }: { categoria: string }) {
  if (!resend) return
  const label = CATEGORIA_LABELS_DENUNCIA[categoria] ?? categoria
  const html = emailShell('Nueva denuncia recibida', `
    <p style="margin:0 0 20px;font-size:14px;color:#5a5d78;line-height:1.6">
      Se recibió una nueva denuncia por el canal de Línea Ética, categoría:
      <strong style="color:#1a1c2e">${label}</strong>.
    </p>
    <a href="${BASE_URL}/admin/denuncias"
       style="display:inline-block;background:#1F2566;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
      Revisar en el panel →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#8e91b0">
      Por confidencialidad, el contenido de la denuncia no se incluye en este email.
    </p>`)
  await resend.emails.send({
    from: FROM,
    to: 'etica@crownpointenergy.com',
    subject: '[CPE Línea Ética] Nueva denuncia recibida',
    html,
  }).catch(() => {/* non-blocking */})
}

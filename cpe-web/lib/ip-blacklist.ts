import { createSupabaseServerAdminClient } from '@/lib/supabase'

// ─── Blacklist escalada de IPs ───────────────────────────────────────────
// El rate limit por endpoint devuelve 429 y no guarda memoria: una IP puede
// chocar contra el límite todo el día, y rotar de endpoint para seguir
// probando. Esta capa cuenta las violaciones POR IP, cruzando endpoints, y
// escala el bloqueo.
//
// Decisiones que conviene tener presentes:
//
// · **Falla abierta.** Si la base no responde, se deja pasar. Un bloqueo es
//   una defensa contra abuso, no un control de acceso: dejar afuera a todos
//   los usuarios legítimos porque se cayó una consulta es peor que el abuso
//   que evita. El login sigue teniendo su propio lockout por cuenta.
//
// · **No se bloquea la IP desconocida.** `getClientIp` devuelve 'unknown' si
//   no hay headers de proxy; bloquear esa clave dejaría afuera a todo el
//   mundo de una si algo se configura mal.
//
// · **Una IP puede ser mucha gente.** Detrás de un NAT corporativo o de una
//   red móvil hay cientos de usuarios compartiendo salida. Por eso los
//   umbrales son holgados y el log guarda el detalle, para poder desbloquear
//   a mano con criterio.

const NIVELES = [
  { violaciones: 10, horas: 24 * 7, nivel: 3 as const, etiqueta: '7 días' },
  { violaciones: 6, horas: 24, nivel: 2 as const, etiqueta: '24 horas' },
  { violaciones: 3, horas: 1, nivel: 1 as const, etiqueta: '1 hora' },
]

// Escalón que corresponde a N violaciones en la ventana. Se expone aparte
// para poder verificar los umbrales sin base de datos.
export function nivelPara(violaciones: number) {
  return NIVELES.find(n => violaciones >= n.violaciones) ?? null
}

export const VENTANA_HORAS = 24
const RETENCION_LOG_DIAS = 30

export type EstadoBloqueo =
  | { bloqueada: false }
  | { bloqueada: true; hasta: string; nivel: number; retryAfterSeconds: number }

function ipValida(ip: string): boolean {
  return ip !== '' && ip !== 'unknown'
}

// ¿Está bloqueada esta IP ahora mismo?
export async function ipBloqueada(ip: string): Promise<EstadoBloqueo> {
  if (!ipValida(ip)) return { bloqueada: false }
  try {
    const db = createSupabaseServerAdminClient()
    const { data } = await db
      .from('ip_bloqueos')
      .select('bloqueada_hasta, nivel')
      .eq('ip', ip)
      .maybeSingle()

    if (!data?.bloqueada_hasta) return { bloqueada: false }
    const hasta = new Date(data.bloqueada_hasta).getTime()
    if (hasta <= Date.now()) return { bloqueada: false }

    return {
      bloqueada: true,
      hasta: data.bloqueada_hasta,
      nivel: data.nivel,
      retryAfterSeconds: Math.ceil((hasta - Date.now()) / 1000),
    }
  } catch {
    return { bloqueada: false } // falla abierta
  }
}

// Registra que la IP chocó contra el rate limit y escala el bloqueo si
// corresponde. Devuelve el bloqueo aplicado, o null si todavía no llegó al
// primer umbral.
export type BloqueoAplicado = { hasta: string; nivel: number; retryAfterSeconds: number }

export async function registrarViolacion(ip: string, endpoint: string): Promise<BloqueoAplicado | null> {
  if (!ipValida(ip)) return null
  try {
    const db = createSupabaseServerAdminClient()
    const ahora = Date.now()

    await db.from('ip_violaciones').insert({ ip, endpoint })

    // Ventana móvil real de 24 hs, contada sobre el log.
    const desde = new Date(ahora - VENTANA_HORAS * 3600_000).toISOString()
    const { count } = await db
      .from('ip_violaciones')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('creada_en', desde)

    const violaciones = count ?? 0
    const escalon = nivelPara(violaciones)

    // Limpieza oportunista del log, para que no crezca sin techo. Va sin await
    // a propósito: es mantenimiento, no puede demorar la respuesta.
    if (violaciones % 25 === 0) {
      void db.from('ip_violaciones')
        .delete()
        .lt('creada_en', new Date(ahora - RETENCION_LOG_DIAS * 86400_000).toISOString())
        .then(() => {}, () => {})
    }

    if (!escalon) return null

    const hasta = new Date(ahora + escalon.horas * 3600_000).toISOString()

    // Si ya había un bloqueo vigente más largo, no se acorta.
    const { data: previo } = await db
      .from('ip_bloqueos')
      .select('bloqueada_hasta, total_bloqueos')
      .eq('ip', ip)
      .maybeSingle()

    const previoVigente = previo?.bloqueada_hasta && new Date(previo.bloqueada_hasta).getTime() > ahora
    const hastaFinal = previoVigente && new Date(previo!.bloqueada_hasta).getTime() > new Date(hasta).getTime()
      ? previo!.bloqueada_hasta
      : hasta

    await db.from('ip_bloqueos').upsert({
      ip,
      bloqueada_hasta: hastaFinal,
      nivel: escalon.nivel,
      violaciones,
      motivo: `${violaciones} violaciones del rate limit en ${VENTANA_HORAS} hs — bloqueo de ${escalon.etiqueta}`,
      ultimo_endpoint: endpoint,
      // Sólo cuenta como bloqueo nuevo si no venía de uno vigente.
      total_bloqueos: previoVigente ? (previo?.total_bloqueos ?? 1) : (previo?.total_bloqueos ?? 0) + 1,
      updated_at: new Date(ahora).toISOString(),
    }, { onConflict: 'ip' })

    return {
      hasta: hastaFinal,
      nivel: escalon.nivel,
      retryAfterSeconds: Math.ceil((new Date(hastaFinal).getTime() - ahora) / 1000),
    }
  } catch {
    return null // falla abierta
  }
}

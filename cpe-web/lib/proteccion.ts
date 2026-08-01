import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { ipBloqueada, registrarViolacion } from '@/lib/ip-blacklist'

// ─── Rate limit + blacklist escalada, en una sola llamada ────────────────
// Compone las dos capas para que cada endpoint no tenga que acordarse de
// llamar a las dos ni de registrar la violación:
//
//   1. ¿La IP está bloqueada? → 429 y no se ejecuta nada más.
//   2. ¿Choca contra el límite del endpoint? → se registra la violación
//      (que puede disparar el bloqueo) y se devuelve 429.
//   3. Si no, pasa.
//
// La blacklist es transversal: las violaciones se cuentan por IP sin importar
// en qué endpoint ocurran, así que rotar entre login, contacto y postulaciones
// no sirve para esquivar el escalado.
//
// Se deja aparte de `lib/ratelimit.ts` para no arrastrar el cliente de
// Supabase a todos los consumidores del rate limit.

export type Veredicto =
  | { permitido: true; ip: string }
  | { permitido: false; ip: string; respuesta: NextResponse }

type Opciones = {
  /** Nombre del endpoint, para la clave del rate limit y para el log. */
  nombre: string
  /** Máximo de requests permitidos en la ventana. */
  max: number
  /** Ventana en milisegundos. */
  ventanaMs: number
  /** Mensaje de error. Conviene que sea el mismo que ya devolvía el endpoint. */
  mensaje?: string
  /** Clave extra además de la IP (por ejemplo el user id), si el endpoint ya la usaba. */
  claveExtra?: string
}

const MENSAJE_DEFECTO = 'Demasiados intentos. Esperá unos minutos.'
const MENSAJE_BLOQUEO = 'Acceso temporalmente bloqueado por actividad inusual desde tu conexión.'

function respuesta429(mensaje: string, retryAfterSeconds: number): NextResponse {
  return NextResponse.json({ error: mensaje }, {
    status: 429,
    // Retry-After es la forma estándar de decirle al cliente cuánto esperar;
    // sin él, un cliente bien portado reintenta a ciegas.
    headers: { 'Retry-After': String(Math.max(retryAfterSeconds, 1)) },
  })
}

export async function proteger(
  req: { headers: { get(name: string): string | null } },
  opciones: Opciones,
): Promise<Veredicto> {
  const ip = getClientIp(req)
  const mensaje = opciones.mensaje ?? MENSAJE_DEFECTO

  const bloqueo = await ipBloqueada(ip)
  if (bloqueo.bloqueada) {
    return { permitido: false, ip, respuesta: respuesta429(MENSAJE_BLOQUEO, bloqueo.retryAfterSeconds) }
  }

  const ventanaSeg = Math.ceil(opciones.ventanaMs / 1000)

  if (opciones.claveExtra) {
    const okExtra = await checkRateLimit(`${opciones.nombre}:${opciones.claveExtra}`, opciones.max, opciones.ventanaMs)
    if (!okExtra) {
      // El límite por usuario no alimenta la blacklist: bloquear una IP por lo
      // que hizo una cuenta autenticada castigaría a todos los que comparten
      // esa salida.
      return { permitido: false, ip, respuesta: respuesta429(mensaje, ventanaSeg) }
    }
  }

  const ok = await checkRateLimit(`${opciones.nombre}:${ip}`, opciones.max, opciones.ventanaMs)
  if (!ok) {
    const nuevoBloqueo = await registrarViolacion(ip, opciones.nombre)
    return {
      permitido: false,
      ip,
      respuesta: nuevoBloqueo
        ? respuesta429(MENSAJE_BLOQUEO, nuevoBloqueo.retryAfterSeconds)
        : respuesta429(mensaje, ventanaSeg),
    }
  }

  return { permitido: true, ip }
}

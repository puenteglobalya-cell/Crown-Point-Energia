# Pendientes de configuración — Crown Point Energy

Checklist de tareas que quedan del lado del equipo (SQL, deploy y configuración
en Supabase / Vercel). El código ya está mergeado en `main`; esto es lo que
falta para que todo quede operativo en producción.

Última actualización: 2026-07-03

---

## 🔴 Imprescindible — ruta crítica

### 0. Cuando migren el DNS de crownpointenergy.com
`sitemap.xml` y `robots.txt` (`cpe-web/app/sitemap.ts`, `cpe-web/app/robots.ts`) apuntan
temporalmente a `crown-point-energia.vercel.app` (comentario `TEMP` en el código) porque
el DNS todavía no estaba migrado cuando se verificó Google Search Console. Una vez
migrado: cambiar `BASE` y `sitemap`/`host` de vuelta a `https://crownpointenergy.com`,
y volver a verificar/enviar el sitemap en Search Console con el dominio final.

Mismo tema afecta los links de invitación/reset de contraseña (`app/api/admin/usuarios/route.ts`,
`app/api/admin/usuarios/[id]/reset/route.ts`) — recomendado: setear la variable de entorno
**`NEXT_PUBLIC_SITE_URL`** en Vercel a `https://crown-point-energia.vercel.app` ahora, y
cambiarla a `https://crownpointenergy.com` cuando migre el DNS. Mientras esa variable no
esté seteada, el código cae a un fallback hardcodeado (hoy ya corregido para apuntar al
dominio de Vercel en vez de una URL rota).

Con estos tres pasos, todo lo desarrollado queda vivo:

### 1. Correr la migración SQL en Supabase
En el **SQL Editor** del proyecto CPE, correr:

```
supabase/migrations/20260702_comunicados_and_anon_revoke.sql
supabase/webauthn-schema.sql
supabase/login-lockout-schema.sql
```

`login-lockout-schema.sql` crea la tabla `login_lockouts` que usa el nuevo
endpoint `/api/auth/portal-login` (login de portal Y admin) para bloquear una
cuenta después de 5 intentos fallidos por 15 minutos. Sin esta tabla, el
login sigue funcionando pero el bloqueo por intentos fallidos no se aplica
(la consulta falla silenciosamente a "no bloqueado").

`webauthn-schema.sql` crea la tabla `webauthn_credentials` para el login con
huella/Face ID (passkeys) del portal — sin esto, `/portal/mi-cuenta` no puede
guardar llaves de acceso y el botón "Ingresar con huella / Face ID" en el
login siempre va a fallar. Nota: una passkey queda atada al dominio exacto
donde se registró — cuando migre el DNS a `crownpointenergy.com`, las passkeys
registradas bajo `crown-point-energia.vercel.app` van a dejar de funcionar y
los usuarios van a tener que volver a registrarlas.

Es idempotente (se puede correr más de una vez). Hace dos cosas:
- Crea la tabla `comunicados` con RLS endurecida (lectura pública de publicados,
  escritura solo `service_role`).
- Revoca `INSERT/UPDATE/DELETE` de `anon` sobre `ir_documents`, `cnv_hechos` y
  `shareholder_meetings` (defensa en profundidad).

→ **Desbloquea:** sala de prensa (`/comunicados`) y feed RSS (`/comunicados/rss.xml`).

### 2. Redeploy en Vercel
Para publicar los últimos merges (comparador de reportes, RSS, tendencias del
dashboard, export CSV).

### 3. Guardar en el CMS
Entrar a `/admin/cms` y tocar **"Guardar"** una vez. Dispara
`revalidateTag('cms')` y refresca el cache (incluye los mapas de operaciones).

---

## 🟠 Deuda de seguridad — upgrade mayor de Next.js (deliberadamente no aplicado)

`npm audit` marca `next@14.2.35` con varios CVEs (DoS, cache poisoning, XSS en
CSP nonces, SSRF, request smuggling) cuyo único fix es saltar a `next@16.x`.
Se intentó ese upgrade en sesión y se revirtió a propósito: Next 16 vuelve
asíncronos `cookies()`/`headers()`/`params` (refactor mecánico grande, ya
resuelto en gran parte con el codemod oficial `next-async-request-api`), pero
además cambia la firma de `revalidateTag()` — pasa a exigir un "profile" de
cache ligado a un sistema nuevo (`cacheLife`), y `lib/cms.ts` depende de
`revalidateTag('cms')` para invalidar el caché del CMS al instante (el mismo
mecanismo que ya causó el incidente de hero-video/EBITDA documentado en
`CLAUDE.md`). No hay forma de verificar en este entorno que la invalidación
siga funcionando igual sin un deploy real a un preview de Vercel.

**Cuando se retome:** hacerlo en una rama aparte, seguir el codemod, resolver
`revalidateTag('cms', <profile>)` con la semántica correcta (probablemente
`'max'` o el profile por defecto — confirmar contra la doc oficial de Next 16
de `cacheLife`), y probar en un preview deploy real que guardar en `/admin/cms`
efectivamente actualiza el sitio público al instante antes de mergear a `main`.

Mientras tanto, se resolvieron sin necesidad del upgrade (vía `overrides` en
`package.json`, sin tocar Next): `uuid` (vía `exceljs`), `postcss` (bundleado
en Next, parcheable independientemente), y `brace-expansion` (vía `exceljs`
→ `archiver`).

---

## 🟡 Variables de entorno (verificar en Vercel)

Settings → Environment Variables. Confirmar que estén todas:

| Variable | Para qué | Si falta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase | Todo rompe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase | Todo rompe |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrituras server-side | El admin rompe |
| `CMS_ADMIN_EMAILS` | Lista de admins (coma-separada) | Sin acceso admin por email |
| `ANTHROPIC_API_KEY` | Scoring IA de candidatos (RRHH) | "Analizar con IA" da 500 |
| `CRON_SECRET` | Auth del cron de backup diario | El backup no corre |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications (opcional) | Push falla |
| `VAPID_PRIVATE_KEY` | Push notifications (opcional) | Push falla |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` y `VAPID_PRIVATE_KEY` son **solo server** —
> nunca deben terminar en un bundle de cliente.

---

## 🟢 Contenido / datos a completar

- **Datos IR latentes** en `/inversores`: cobertura de analistas, reservas, y
  datos de capital/acciones (las secciones se auto-ocultan hasta tener datos).
- **Verificación visual en producción:**
  - Comparador de reportes (`/admin/reportes/comparar`)
  - Mapas de bloques en `/operaciones`
  - Directorios CPE Inc. vs CPESA en `/acerca`

---

## ⚪ Opcional — robustez (no bloquean nada)

- **Upstash Redis** (`@upstash/ratelimit`): rate limiting distribuido entre edge
  nodes. Hoy es in-memory por instancia (efectivo solo dentro de una instancia
  caliente). Ver `lib/ratelimit.ts`.
- **Captcha** (hCaptcha / Cloudflare Turnstile) en formularios públicos:
  contacto, suscripción IR, postulaciones.
- **Sentry**: observabilidad de errores en producción.

---

## Referencia — VAPID (solo si hay que rotar claves)

Rotar las VAPID invalida **todas** las suscripciones push existentes. Ver el
procedimiento completo en `CLAUDE.md` → sección "VAPID key rotation".

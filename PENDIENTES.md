# Pendientes de configuración — Crown Point Energy

Checklist de tareas que quedan del lado del equipo (SQL, deploy y configuración
en Supabase / Vercel). El código ya está mergeado en `main`; esto es lo que
falta para que todo quede operativo en producción.

Última actualización: 2026-08-01

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

## 🔴 Blacklist escalada de IPs — SQL a correr

```
supabase/ip-blacklist-schema.sql
```

Crea `ip_violaciones` (log) e `ip_bloqueos` (bloqueos vigentes). **Sin esta
migración la capa no bloquea nada**: falla abierta a propósito, así que el
rate limit sigue funcionando igual pero no escala.

Escalado, contando violaciones por IP en una ventana móvil de 24 hs y
**cruzando endpoints** (rotar de endpoint no sirve para esquivarlo):

| Violaciones en 24 hs | Bloqueo |
|---|---|
| 3ª | 1 hora |
| 6ª | 24 horas |
| 10ª | 7 días |

**El bloqueo se aplica sólo a los formularios públicos**, que son los expuestos
a cualquiera desde internet:

| Endpoint | Rate limit | Alimenta y sufre la blacklist |
|---|---|---|
| `contacto` | 5 / 10 min | sí |
| `denuncias` | 3 / 60 min | sí |
| `carreras` (postulaciones) | 3 / 30 min | sí |
| `ir-subscribe` | 5 / 60 min | sí |
| `portal-login` | 40 / 15 min | **no** |
| `webauthn/login-options` | 40 / 15 min | **no** |
| `rrhh/analizar` | 30 / 60 min | **no** |

Los de acceso quedan afuera a propósito: detrás de una IP hay muchas personas,
y dejar a una oficina entera sin poder entrar al portal porque alguien spameó
el formulario de contacto es peor que el abuso que se evita. Conservan su rate
limit, y el login además tiene su lockout por cuenta, que es la defensa que de
verdad frena un ataque dirigido a una cuenta.

Operación (consultas listas en el `.sql`): ver quién está bloqueado, ver qué
hizo una IP antes del bloqueo, y desbloquear a mano. **Esto último va a hacer
falta**: detrás de un NAT corporativo o una red móvil hay muchos usuarios
compartiendo una IP, así que un bloqueo puede alcanzar a gente legítima.

---

## 🔴 Simulador de reservas — mergear a `main`

**La rama `claude/github-data-lec4yg` tiene 18 commits sin mergear.** `CLAUDE.md`
pide mergear cada 2-3 commits justamente para no repetir el incidente de
hero-video/EBITDA, donde 11 commits terminados nunca llegaron a producción.
Todo el trabajo del simulador está ahí: hasta que no se mergee y se redeploye,
nada de esto está vivo.

---

## 🔴 Simulador de reservas — SQL a correr en Supabase

En el **SQL Editor**, en este orden. Los tres son idempotentes.

```
supabase/20260801_reservas_abandono.sql
supabase/20260801_reservas_certeza_incremental.sql
supabase/20260801_pozos_tipo_gsj.sql
supabase/20260801_campanas_perforacion.sql
supabase/20260801_proyectos_consolidado.sql
supabase/20260801_reservas_reconciliacion.sql
supabase/20260801_costos_corporativos.sql
supabase/20260801_price_decks.sql
supabase/20260801_metodo_amortizacion.sql
supabase/20260801_trazabilidad_corridas.sql
```

- **`reservas_abandono`** agrega `pozos.costo_abandono_usd`. NI 51-101 pide
  informar las reservas netas de costos de abandono y remediación; sin esta
  columna el motor no los cobra y **el VAN queda sobrestimado**. Después de
  correrla hay que cargar el costo por pozo en la sección "Pozo".
- **`reservas_certeza_incremental`** agrega el saldo de reservas ponderado por
  el grado de certeza al roll-forward. Sin ella el cálculo corre igual, sólo
  faltan esos valores en la tabla de depleción.
- **`pozos_tipo_gsj`** crea las 4 curvas tipo del Golfo San Jorge (GSJ_CH,
  GSJ_PQO, GSJ_BLG, GSJ_WO). Avisa por `raise warning` si falta crear algún
  yacimiento antes. Las curvas mensuales se cargan después desde la pantalla,
  con el importador de Excel o el generador de declinación de Arps.

- **`campanas_perforacion`** crea la tabla `campanas` y agrega a
  `intervenciones` los campos de campaña, orden, inicio de perforación y días
  por etapa. Habilita la pestaña **"Cronograma"**, que es la que responde la
  pregunta de fondo del simulador: **cuándo perforar cada pozo para aprovechar
  el % de participación vigente**. Sin esta migración la pestaña no encuentra
  campañas y el resto del simulador sigue funcionando igual.

- **`proyectos_consolidado`** crea `proyectos` y `costos_proyecto`, y cuelga
  los escenarios de un proyecto. Habilita la pestaña **"Consolidado"** (la
  empresa como suma de proyectos) y, sobre todo, el lugar donde va el **precio
  de compra de un área** — el número que define si una adquisición cierra.

- **`reservas_reconciliacion`** crea `reservas_movimientos` y agrega al
  roll-forward una columna por categoría. Es lo que convierte la depleción en
  una **reconciliación de reservas de NI 51-101** — hasta ahora teníamos 1 de
  las 7 categorías obligatorias.
- **`costos_corporativos`** crea la tabla de G&A y estructura. Junto con la
  deuda ya cargada, permite que el consolidado pase de "suma de proyectos" a
  **valor de empresa**.

- **`price_decks`** crea curvas de precio con nombre propio. Evita cargar 240
  cotizaciones a mano por referencia, y es lo que permite correr el mismo
  escenario contra un deck de **pronóstico** y otro **constante**, que es lo que
  pide NI 51-101. Sin la migración, los precios se siguen resolviendo contra
  `precios_referencia` igual que antes.

- **`metodo_amortizacion`** deja elegir entre unidades de producción (default)
  y lineal. El motor ya amortiza por unidades de producción aunque la migración
  no haya corrido; la columna sirve para poder forzar lineal en un escenario.
  **Para que funcione hace falta tener cargadas las reservas del yacimiento**:
  sin ellas cae a la vida útil lineal e informa un aviso.

- **`trazabilidad_corridas`** sella cada corrida con quién, cuándo y una
  **huella de los datos** con los que se corrió. Al abrir los resultados se
  recalcula la huella y se compara: si alguien editó un precio o una curva
  después de calcular, aparece **"Desactualizado"** en lugar de mostrar un VAN
  viejo como si fuera bueno. Sin la migración el cálculo funciona igual, pero
  no se puede verificar si los resultados quedaron viejos.

El motor lee las columnas nuevas de forma defensiva, así que el simulador
funciona con o sin estas migraciones aplicadas.

**Confirmar aparte** si estas dos, que son anteriores a esta tanda, ya se
corrieron: `20260801_reservas_certeza.sql` y `20260802_reservas_gaps.sql`.

---

## 🟢 Simulador — dos tablas que NO alimentan el cash flow (a propósito)

No son datos muertos: son inputs de la **valuación de la empresa en marcha**,
que es otra cosa que el cash flow de reservas. Confirmado por el cliente, no se
eliminan.

- **`comparables_mercado`** → ya se usa: alimenta la pestaña **"Comparables"**,
  que calcula EV/boe, EV por barril diario y EV/NPV10 de los pares y los aplica
  a las métricas de CPE para obtener un valor implícito.
- **`supuestos_generales`** → supuestos de valuación de empresa. El motor de
  reservas no los lee.

⚠ Lo único que sigue siendo una trampa: **`supuestos_generales.working_interest_pct`
NO es la participación que usa el motor**. La que afecta el cálculo es la de
"Participación en la concesión", que además admite tramos con fechas. Quedó
aclarado en el formulario.

Informativos, tampoco afectan el cálculo: `reservas_anuales.reservas_bbl` (el
motor usa la columna BOE) e `intervenciones.subtipo`.

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

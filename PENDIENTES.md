# Pendientes de configuración — Crown Point Energy

Checklist de tareas que quedan del lado del equipo (SQL, deploy y configuración
en Supabase / Vercel). El código ya está mergeado en `main`; esto es lo que
falta para que todo quede operativo en producción.

Última actualización: 2026-07-03

---

## 🔴 Imprescindible — ruta crítica

Con estos tres pasos, todo lo desarrollado queda vivo:

### 1. Correr la migración SQL en Supabase
En el **SQL Editor** del proyecto CPE, correr:

```
supabase/migrations/20260702_comunicados_and_anon_revoke.sql
```

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

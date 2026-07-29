# Crown Point Energia — mapa del repo

Este repositorio tiene **dos aplicaciones Next.js independientes** que no comparten código ni deploy:

| | Raíz del repo (`/`) | `cpe-web/` |
|---|---|---|
| Qué es | "Revenue App" — portal privado de reportes de ingresos | Sitio corporativo público + intranet/portal de staff + panel de admin |
| Quién lo usa | Un grupo chico (finanzas/dirección) | Público general (inversores) + todo el staff + admins de contenido |
| Deploy | Proyecto Vercel propio | `crown-point-energia.vercel.app` (dominio final: crownpointenergy.com, DNS todavía no migrado) |
| Tamaño | Chico (~10 archivos en `app/`) | Grande (100+ rutas) |

Si estás por tocar algo, primero confirmá en cuál de las dos carpetas vivís — `cd cpe-web` para casi todo lo que tiene que ver con la web pública, portal de staff, o admin.

---

## 1. Raíz del repo — Revenue App

Dashboard interno de "Ingresos Estimados" (petróleo & gas). Ver `README.md` en la raíz para setup/deploy — está bien documentado ahí.

- `app/reportes/[slug]` — vista pública (a usuarios invitados) de un reporte
- `app/admin/upload` — carga de Excel → `lib/parsers/ingresos.ts` → `lib/generador/htmlReport.ts`
- Auth: Supabase magic link, sin roles complejos

Esta app es chica y estable — rara vez hace falta tocarla.

---

## 2. `cpe-web/` — sitio corporativo + intranet

### 2.1 Tres superficies distintas dentro de la misma app

```
cpe-web/app/
  (páginas sueltas: page.tsx, inversores/, operaciones/, acerca/, esg/,
   carreras/, comunicados/, contacto/, denuncias/, comercial/,
   biblioteca/, infografia/, buscar/, legal/, maintenance/)
                                          ← PÚBLICO, sin login
  portal/(auth)/...                      ← STAFF, requiere login (roles: viewer/uploader/admin/rrhh/accionista/finanzas)
  admin/...                               ← ADMINS, requiere rol admin (o email en ADMIN_EMAILS)
  api/...                                 ← rutas server (algunas públicas, la mayoría no)
```

**Regla de oro:** cualquier componente/página nueva bajo `app/` (fuera de `portal/` y `admin/`) es pública. Si muestra un dato sensible (cotización, financieros no publicados), tiene que estar detrás de un toggle de CMS — ver 2.3.

### 2.2 El "Portal" (`app/portal/(auth)/`)

Reportes internos para staff: `/portal` (lista de reportes), `/portal/dashboard`, `/portal/comercial`, `/portal/finanzas`, `/portal/subir` (carga de Excel/PPTX). Nav en `components/PortalNav.tsx`.

Tipos de reporte y sus parsers dedicados (`lib/parsers/*.ts` + `lib/generador/htmlReport*.ts`):

| type_id | Parser | Generador | Qué es |
|---|---|---|---|
| `ingresos` | `ingresos.ts` | `htmlReport.ts` | Ingresos mensuales por área |
| `facturacion` | `facturacion.ts` | `htmlReportFacturacion.ts` | Detalle de facturación |
| `accionista` | `accionista.ts` (lee `.pptx`) | `htmlReportAccionista.ts` | Informe de seguimiento a accionistas |
| `produccion` | `produccion.ts` | `htmlReportProduccion.ts` | Resumen semanal de producción por área (petróleo/gas, vs plan, pérdidas) + serie diaria |
| `financiero` | `generico.ts` (genérico, vuelca todas las hojas) | `htmlReportGenerico.ts` | Estados financieros — sin parser dedicado todavía |
| `henry_hub` / `ice_brent` | `macro.ts` (pega texto, no sube archivo) | inline en `subir/page.tsx` | Curvas de futuros para el widget de macro |

Si te piden un nuevo tipo de reporte: mirá `produccion.ts` como plantilla — es el más reciente y el mejor documentado. Patrón: leer con `ExcelJS`, ojo con **celdas combinadas** (`cell.isMerged` + `cell.master.row`) en hojas con subtotales/grupos, porque ExcelJS devuelve el valor del master para todas las celdas del rango.

### 2.3 CMS (contenido editable sin deploy)

Tres tablas en Supabase: `cms_settings` (tema/idioma/dirección visual), `cms_sections` (toggles show/hide por `key`), `cms_fields` (textos ES/EN por `key`). Todo se lee vía `lib/cms.ts::getCmsState()`, cacheado 60s y tageado `'cms'` — `revalidateTag('cms')` lo invalida al instante (lo dispara `/api/cms/state` cuando se guarda desde `/admin`).

Editor: `/admin` (pestañas Estilo/Visibilidad/Textos/Vista previa/Export) y `/admin/cms` (CRUD más estructurado: inversores, operaciones, ESG, carreras).

**Gotcha que ya mordió dos veces:** agregar un componente nuevo que muestra un campo de `cms_fields` (ej. precio de la acción) **no alcanza** — si no lo envolvés en `{show['algo'] !== false && (...)}`, el toggle de "Visibilidad" en el admin no hace nada, porque el componente ni siquiera lo consulta. Cuando agregues un widget nuevo con datos sensibles, buscá primero si ya existe un `show['...']` similar y reusalo.

### 2.4 Cron jobs (`vercel.json`)

| Cron | Qué hace |
|---|---|
| `/api/cron/stock` | Trae cotización de Yahoo Finance → `cms_fields` (stock.*) — desde jul/2026 estas secciones están **apagadas por directiva** (ver `cms_sections`), pero el cron sigue corriendo igual |
| `/api/cron/macro` | Curvas Brent/Henry Hub |
| `/api/cron/cnv-sync` | "Hechos relevantes" desde cnv.gov.ar → `cnv_hechos`. Página `/admin/cnv-sync` tiene botón manual + auto-resync si el último éxito tiene +36h |
| `/api/cron/backup`, `/backup-reminder` | Backup diario de tablas + recordatorio semanal |
| `/api/cron/cleanup-*`, `/filing-reminder` | Housekeeping |

### 2.5 Supabase — cómo está organizado

`cpe-web/supabase/*.sql` son schemas + migraciones sueltas (sin numeración estricta tipo Prisma) — 46 archivos. No hay un solo "schema.sql" canónico; para saber el estado real de una tabla/campo, el `.sql` con la fecha más reciente en el nombre gana. Cuando una migración "reemplaza" contenido (ej. seed de un campo), y no la corren después de mergear el código, el dato en producción queda desactualizado aunque el código esté bien — pasó con `stats.cuencas` (código default `'3'`, DB tenía `'4'` de una migración de tres meses atrás nunca re-corrida).

---

## 3. Cosas que ya nos mordieron — leer antes de tocar contenido

1. **Conteos de cuencas/bloques/concesiones.** Hubo dos reducciones reales: la fusión Chañares+PPCO (jul 15) y la salida de Tierra del Fuego/Río Cullen (jul 22, concesión devuelta). Canónico hoy: **8 concesiones, 5 bloques, 3 cuencas**. Si ves `4 cuencas`, `6 bloques`, `11 concesiones` en cualquier lado (código o dato de Supabase), está desactualizado.
2. **EBITDA** — sacado deliberadamente del sitio público (home, `/inversores`, infografía, export Word) por decisión de dirección, "pendiente de definición" según comentario en `20260722_reserves_2p_and_tdf_removal.sql`. No lo reintroduzcas sin confirmar que la decisión cambió.
3. **Cotización de la acción (TSXV: CWV)** — directiva: no puede aparecer en el sitio público. Los 9 toggles en `cms_sections` (`ticker`, `investor.quotePanel`, `investor.sparkline`, `investor.beta`, `investor.vol30`, `investor.high52`, `investor.low52`, `investor.cap`, `investor.shares`) están en `false`. Si agregás un widget de cotización nuevo, respetá `show['investor.quotePanel']`.
4. **Branches viejas pre-reset** — 14 branches remotas (`claude/cpe-*`, `fix/facturacion-*`, etc.) tienen un historial de git **desconectado** de `main` (root commit distinto). No tienen merge-base, no se pueden mergear, y ya están superadas (ver lista completa y detalle en `CLAUDE.md`). Ignóralas salvo que el usuario pida explícitamente recuperar algo de ahí.
5. **Workflow de branches:** mergear a `main` cada 2-3 commits, no dejar trabajo acumulado sin mergear — así se armó este repo (ver `CLAUDE.md`).

---

## 4. Convenciones de código

- Next.js 14 App Router en ambas apps, TypeScript estricto.
- `npx tsc --noEmit` y `npm run build` **corren siempre** antes de cerrar un cambio (no hay test runner configurado — el build es la verificación principal).
- Estilos: mezcla de CSS global (`styles/tokens.css`, `styles/*.css`) con clases utilitarias, más `style={{}}` inline en componentes admin/portal (menos cuidados visualmente, son herramientas internas).
- Bilingüe: patrón `<span className="lang-es">...</span><span className="lang-en">...</span>` — nunca borrar un idioma sin el otro.
- Ver `CLAUDE.md` (raíz) para el detalle técnico completo — este archivo es el mapa rápido, `CLAUDE.md` es la referencia profunda.

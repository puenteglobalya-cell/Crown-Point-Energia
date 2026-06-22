# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # development server (localhost:3000)
npm run build     # production build
npx tsc --noEmit  # type-check without emitting
```

No test runner is configured. Type-check is the primary static correctness tool.

## Architecture

### Current app — Revenue Reports (ingresos)

A private Next.js 14 App Router app where authenticated users upload Excel files, parse them into structured JSON, generate HTML reports, and publish them via Supabase.

**Auth**: All routes require login except `/login` and `/auth/*`. Supabase email+password auth via `@supabase/ssr`. After `signInWithPassword`, use `window.location.href = '/'` (not `router.push`) to force a full reload so the SSR middleware can read the session cookie. Admin routes additionally check `ADMIN_EMAILS` (hardcoded in `middleware.ts` and `lib/admin.ts` — keep in sync).

**Data flow**:
1. Admin uploads `.xlsx` → `app/admin/upload/page.tsx`
2. `lib/parsers/ingresos.ts` parses it via SheetJS (`xlsx`) → `DatosIngresos`
3. `lib/generador/htmlReport.ts` builds a self-contained HTML string (Chart.js 4.4.1 via CDN, Lora + DM Sans fonts)
4. `lib/admin.ts` stores the raw file in Supabase Storage bucket `reportes` and saves parsed JSON + HTML in the `reportes` table
5. Public visitors see published reports at `app/reportes/[slug]/page.tsx`

**Supabase schema** (see `supabase/schema.sql`):
- `report_types` — registry of parser types (`ingresos`, `produccion`, `financiero`)
- `reportes` — one row per uploaded file; `datos JSONB` holds the parsed `DatosIngresos`; `estado` is `borrador` or `publicado`
- Storage bucket: `reportes` (private)

**Excel parser** (`lib/parsers/ingresos.ts`):
- Reads the `sales & Volume` sheet for per-area revenues (rows 6–21, oil areas in cols 3–10, total in col 15) and price history (rows 35–54, prices in cols 3–6)
- Excel date serials → month labels: `new Date(Math.round((serial - 25569) * 86400 * 1000))` → `"May-26"`
- Current month row (May-26) prices inject into price history when the row shows zeros
- `dias` is at `buscarCelda(detalle, 0, 3)` (not col 2, which is the string "días")

**HTML generator** (`lib/generador/htmlReport.ts`):
- Generates a full self-contained HTML document as a TypeScript template literal
- Charts: vertical grouped bar (area revenues), donut with center text plugin (`centro`), stacked monthly bar, price line with smart collision-avoidance labels (`smartLabels`)
- Conditional sections: `hasHistorico` (≥ 2 months of history) and `hasPriceHistory`
- JavaScript template literals embedded inside the TS template literal must use `\`` and `\${}` to avoid breaking the outer string

---

### Planned — CPE Corporate Website migration

The static HTML prototype in `/tmp/cpe_proto/` needs to be migrated to Next.js App Router and deployed to Vercel. This may be built as a separate project or integrated here.

**Prototype structure**:
```
index.html, inversores.html, operaciones.html, comunicados.html, acerca.html, contacto.html
styles/tokens.css, styles/home.css, styles/pages.css
scripts/cpe.js       ← CMS engine + window.CPE API
scripts/chrome.js    ← shared header + footer builder
scripts/editor.jsx   ← admin panel (React + Babel, in-page)
scripts/map.js       ← injects argentina-map.svg inline
assets/logo.png, assets/argentina-map.svg
```

#### CMS state shape

```ts
type CMSState = {
  direction: 'corporativo' | 'editorial' | 'industrial'
  theme:     'light' | 'dark'
  lang:      'es' | 'en'
  show:   Record<string, boolean>   // e.g. { "ticker": false }
  fields: Record<string, string>    // e.g. { "stock.price": "CA $0.205" }
}
```

#### DOM conventions — DO NOT CHANGE

- `[data-cpe-section="<key>"]` — sections toggled via `show[key]`
- `[data-cpe-field="<key>"]` — text fields updated via `fields[key]`
- `<span class="lang-es">` / `<span class="lang-en">` — bilingual children pattern
- `[data-lang="es"] .lang-en { display: none }` in tokens.css drives language switching
- `[data-direction="..."]` on `<html>` drives the 3 visual directions
- `[data-theme="dark"]` on `<html>` drives dark mode
- SVG map uses CSS classes (`cc-country`, `cc-green`, `cc-amber`, etc.) — NOT fill attributes — for cross-browser compatibility

#### window.CPE public API — MUST be preserved

`window.CPE = { state, set(patch), setField(key,val), setShow(key,vis), on(fn), off(fn), export(), reset() }`

#### CMS keys (from `editor.jsx` SCHEMA — source of truth)

**Sections** (`show[key]`): `ticker`, `hero`, `basinsStrip`, `kpis`, `ops`, `investor`, `press`, `contact`, `investor.quotePanel`, `investor.sparkline`, `investor.beta`, `investor.vol30`, `investor.high52`, `investor.low52`, `investor.cap`, `investor.shares`

**Fields** (`fields[key]`): `kpi.{production|reserves|ebitda|blocks}.{value|unit|delta}`, `stock.{price|delta|beta|vol30|high52|low52|cap|shares}`

#### Supabase schema for the corporate website

```sql
cms_settings (id SMALLINT PK DEFAULT 1, direction, theme, lang, updated_at)
cms_sections (key TEXT PK, visible BOOLEAN DEFAULT true, updated_at)
cms_fields   (key TEXT PK, value_es TEXT, value_en TEXT, updated_at)
```
RLS: public SELECT on all three tables; authenticated-only INSERT/UPDATE/DELETE.

#### Next.js migration rules

- **SSR-first**: `app/layout.tsx` must fetch CMS state from Supabase at request time and apply `data-direction`, `data-theme`, `data-lang` directly on the `<html>` element to prevent FOUC.
- **ISR**: use `next: { tags: ['cms'] }` on the fetch; call `revalidateTag('cms')` in the `POST /api/cms/state` route handler when admin saves.
- **Language**: store in a cookie (not localStorage) so it's readable during SSR.
- **SVG map**: import `argentina-map.svg` as a React component via `@svgr/webpack` — eliminates `map.js`. CSS class fills work because the SVG becomes inline JSX.
- **Admin editor**: `/admin` route with Supabase Auth guard; editor is a client component. Anonymous visitors must NOT receive the editor JS bundle.
- **`window.CPE`**: expose via a client-side `<script>` in layout or a small client component; the SSR-applied HTML attrs handle the no-flash requirement without JS.

#### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server only — NEVER in client bundles
CMS_ADMIN_EMAILS=              # comma-separated
CRON_SECRET=                   # random secret — Vercel passes it as Bearer token to cron routes
```

#### VAPID key rotation (push notifications)

VAPID keys are permanent — rotating them invalidates ALL existing push subscriptions. Procedure when rotation is necessary (e.g., key leak):

1. Generate new keys: `node -e "const w=require('web-push'); console.log(w.generateVAPIDKeys())"`
2. Update `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel env vars
3. Redeploy so the new keys are live
4. In Supabase SQL Editor: `DELETE FROM push_subscriptions;`
5. The next push send will fail for all users (expected — they need to re-subscribe)
6. On the portal, users will see a push permission prompt again on next visit

The `PwaInstallBanner` component handles SW registration. Re-subscription happens automatically when a user visits the portal after the rotation.

#### Security notes

- `lib/ratelimit.ts` uses in-memory sliding window — effective for burst protection within a warm serverless instance. For distributed rate limiting across Vercel edge nodes, replace with Upstash Redis (`@upstash/ratelimit`).
- `lib/cms.ts` wraps `getCmsState()` in `unstable_cache` tagged `'cms'`. Call `revalidateTag('cms')` whenever CMS content changes (already done in `/api/cms/state` POST and `/api/cms/history` restore).
- Middleware reads role from DB (`user_roles` table) on every request. After running `20260622_security_hardening.sql`, roles are synced to `user.app_metadata` via trigger — middleware can be updated to read from JWT instead, eliminating the DB query.
- `SessionGuard` client component in portal layout auto-logs out after 30 min of inactivity.

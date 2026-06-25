-- ═══════════════════════════════════════════════════════════════════════════
-- KPI seed — 1Q 2026
-- Popula cms_fields con los valores de la sección "Cuatro motivos"
-- de la página /inversores sin necesidad de subir el Excel.
-- Ejecutar en Supabase SQL Editor (una sola query, sin dollar-quotes).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.cms_fields (key, value_es, value_en, updated_at)
VALUES
  -- ── 01 · Producción ──────────────────────────────────────────────────────
  ('inv.thesis.1.val',  '8,672',                              '8,672',                        now()),
  ('inv.thesis.1.unit', 'boe/d',                              'boe/d',                        now()),
  ('inv.thesis.1.meta', '86% petróleo · 14% gas · 1Q 2026',  '86% oil · 14% gas · 1Q 2026',  now()),

  -- ── 02 · Costos  (producción + procesamiento + transporte) ───────────────
  -- $36.41 producción & procesamiento + $2.39 transporte = $38.80/boe
  ('inv.thesis.2.val',  'US$38.8',                            'US$38.8',                      now()),
  ('inv.thesis.2.unit', '/boe',                               '/boe',                         now()),
  ('inv.thesis.2.meta', 'Opex total · 1Q 2026',               'Total opex · 1Q 2026',         now()),

  -- ── 03 · Apalancamiento ──────────────────────────────────────────────────
  -- Net debt $140.3M / EBITDA anualizado $47.6M = 2.9x
  -- (Loans $75.3M + Notes $78.5M − Cash $13.5M = $140.3M net debt)
  ('inv.thesis.3.val',  '2.9x',                               '2.9x',                         now()),
  ('inv.thesis.3.unit', 'Net debt / EBITDA',                  'Net debt / EBITDA',            now()),
  ('inv.thesis.3.meta', '1Q 2026 · anualizado',               '1Q 2026 · annualized',         now()),

  -- ── 04 · Pipeline ────────────────────────────────────────────────────────
  -- 5 pozos Santa Cruz + 8 pozos Chubut = 13 nuevos pozos plan 2026
  ('inv.thesis.4.val',  '13',                                 '13',                           now()),
  ('inv.thesis.4.unit', 'pozos planeados',                    'planned wells',                now()),
  ('inv.thesis.4.meta', 'plan de perforación 2026',           '2026 drilling plan',           now())

ON CONFLICT (key) DO UPDATE
  SET value_es   = EXCLUDED.value_es,
      value_en   = EXCLUDED.value_en,
      updated_at = now();

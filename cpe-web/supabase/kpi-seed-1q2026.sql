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

  -- ── 02 · Costos ──────────────────────────────────────────────────────────
  ('inv.thesis.2.val',  'US$14.2',                            'US$14.2',                      now()),
  ('inv.thesis.2.unit', '/boe',                               '/boe',                         now()),
  ('inv.thesis.2.meta', 'Opex total LTM',                     'Total opex LTM',               now()),

  -- ── 03 · Apalancamiento ──────────────────────────────────────────────────
  ('inv.thesis.3.val',  '1.2x',                               '1.2x',                         now()),
  ('inv.thesis.3.unit', 'Net debt / EBITDA',                  'Net debt / EBITDA',            now()),
  ('inv.thesis.3.meta', '1Q 2026 · anualizado',               '1Q 2026 · annualized',         now()),

  -- ── 04 · Pipeline ────────────────────────────────────────────────────────
  ('inv.thesis.4.val',  '12',                                 '12',                           now()),
  ('inv.thesis.4.unit', 'pozos planeados',                    'planned wells',                now()),
  ('inv.thesis.4.meta', '1Q 2026 · plan de perforación',      '1Q 2026 · drilling plan',      now())

ON CONFLICT (key) DO UPDATE
  SET value_es   = EXCLUDED.value_es,
      value_en   = EXCLUDED.value_en,
      updated_at = now();

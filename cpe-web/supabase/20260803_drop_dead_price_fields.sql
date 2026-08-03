-- premium_descuento_usd y tipo_curva_precio nunca fueron leídos por el
-- motor (lib/reservas/engine.ts) — la fórmula real de precio vive en
-- formulas_precio + price_decks. Se editaban y guardaban sin efecto alguno.
alter table supuestos_generales
  drop column if exists premium_descuento_usd,
  drop column if exists tipo_curva_precio;

-- El Excel real (Sproule/ERCE) aplica el descuento fijo ANTES del recorte
-- por DDE% ("Descuento", normalmente negativo, ej. -3 USD/bbl) y no lo
-- confunde con "Extra" (descuento_adicional_usd), que se suma DESPUÉS de
-- dividir por el divisor. Antes sólo existía descuento_adicional_usd y se
-- restaba al final — no reproducía la fórmula real.
alter table formulas_precio
  add column if not exists descuento_fijo_usd numeric default 0;

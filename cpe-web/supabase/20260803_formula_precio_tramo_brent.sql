-- El Excel real del equipo técnico (Sproule/ERCE) no usa un DDE% fijo por
-- fecha: usa una escala lineal por nivel de Brent del año —
-- 0% si Brent <= dde_brent_min, dde_pct_max si Brent >= dde_brent_max,
-- lineal entre los dos. dde_pct sigue funcionando como está si estas
-- columnas quedan vacías (compatibilidad con fórmulas ya cargadas).
alter table formulas_precio
  add column if not exists dde_brent_min numeric,
  add column if not exists dde_pct_min numeric,
  add column if not exists dde_brent_max numeric,
  add column if not exists dde_pct_max numeric;

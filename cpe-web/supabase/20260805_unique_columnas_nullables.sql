-- Varios `unique` de este esquema incluyen una columna NULLABLE, y en
-- Postgres dos NULL nunca se consideran iguales para una constraint unique
-- normal — así que "duplicados" con esa columna vacía pasan sin que nadie
-- se entere. Se agrega un índice único PARCIAL para el caso NULL de cada
-- uno (la unique original ya cubre bien el caso con valor).

-- price_deck_puntos: dos puntos ANUALES (mes null) del mismo deck/referencia/
-- año no colisionaban — cargar el mismo punto anual dos veces sumaba un
-- precio competidor en vez de actualizar.
create unique index if not exists price_deck_puntos_anual_idx
  on price_deck_puntos (price_deck_id, referencia, anio) where mes is null;

-- campanas: dos campañas "plan base" (escenario_id null) con el mismo
-- nombre no colisionaban.
create unique index if not exists campanas_nombre_base_idx
  on campanas (nombre) where escenario_id is null;

-- opex_fijo / opex_fijo_pozo: dos filas de la misma concesión y fecha sin
-- concepto (concepto null) no colisionaban.
create unique index if not exists opex_fijo_sin_concepto_idx
  on opex_fijo (concesion_id, fecha_desde) where concepto is null;
create unique index if not exists opex_fijo_pozo_sin_concepto_idx
  on opex_fijo_pozo (concesion_id, fecha_desde) where concepto is null;

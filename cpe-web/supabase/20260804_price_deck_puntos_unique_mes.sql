-- La unique original (price_deck_id, referencia, anio) no incluye "mes" —
-- cargar varios meses del mismo año (ej. 9 puntos de brent en 2027) rompe
-- esa constraint. La reemplaza por una que sí distingue por mes.
alter table price_deck_puntos drop constraint if exists price_deck_puntos_price_deck_id_referencia_anio_key;
alter table price_deck_puntos add constraint price_deck_puntos_deck_ref_anio_mes_key unique (price_deck_id, referencia, anio, mes);

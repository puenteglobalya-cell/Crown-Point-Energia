-- Curva de precios (price deck) de Brent, de la corrida ICE Brent al
-- 04/08/2026 5:49 PM GMT. Se cargan los meses con cotización real (algunos
-- contratos 2027-2031 no tenían trade ese día — "0.000" — y se omiten, se
-- interpolan solos entre los puntos que sí hay). Escalación 0 después del
-- último punto (Dic-2031) — ajustar si el cliente da un criterio distinto.

insert into price_decks (nombre, tipo, escalacion_anual, descripcion)
values ('ICE Brent 04-08-2026', 'strip', 0, 'Strip de mercado ICE Brent al 04/08/2026 17:49 GMT')
on conflict do nothing;

with deck as (
  select id as deck_id from price_decks where nombre = 'ICE Brent 04-08-2026'
)
insert into price_deck_puntos (price_deck_id, referencia, anio, mes, precio_usd)
select deck.deck_id, 'brent', v.anio, v.mes, v.precio
from deck, (values
  (2026, 10, 79.320),
  (2026, 11, 77.830),
  (2026, 12, 76.620),
  (2027, 1, 75.780),
  (2027, 2, 75.110),
  (2027, 3, 74.550),
  (2027, 4, 74.050),
  (2027, 5, 73.720),
  (2027, 6, 73.380),
  (2027, 7, 73.020),
  (2027, 8, 72.760),
  (2027, 9, 72.540),
  (2027, 12, 71.890),
  (2028, 6, 70.950),
  (2028, 12, 70.310),
  (2029, 6, 69.970),
  (2029, 12, 69.710),
  (2030, 6, 69.580),
  (2030, 12, 69.440),
  (2031, 12, 68.820)
) as v(anio, mes, precio)
where deck.deck_id is not null;

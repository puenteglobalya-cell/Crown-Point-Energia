-- Curva de precios de Henry Hub, strip NYMEX al 04/08/2026. Va al MISMO
-- price deck que Brent ("ICE Brent 04-08-2026") -- un Escenario solo puede
-- tener un price_deck_id asignado, y el motor busca ahí las dos referencias
-- (brent y henry_hub) juntas, no una por deck.
-- Un punto por mes, Sep-2026 a Dic-2031. Donde no hubo trade esa sesión
-- ("Last" = "-") se usa el precio de ajuste/settle en su lugar.

with deck as (
  select id as deck_id from price_decks where nombre = 'ICE Brent 04-08-2026'
)
insert into price_deck_puntos (price_deck_id, referencia, anio, mes, precio_usd)
select deck.deck_id, 'henry_hub', v.anio, v.mes, v.precio
from deck, (values
  (2026, 9, 2.68),
  (2026, 10, 2.726),
  (2026, 11, 2.95),
  (2026, 12, 3.626),
  (2027, 1, 4.099),
  (2027, 2, 3.732),
  (2027, 3, 2.946),
  (2027, 4, 2.809),
  (2027, 5, 2.819),
  (2027, 6, 2.96),
  (2027, 7, 3.165),
  (2027, 8, 3.232),
  (2027, 9, 3.206),
  (2027, 10, 3.283),
  (2027, 11, 3.529),
  (2027, 12, 4.199),
  (2028, 1, 4.653),
  (2028, 2, 4.223),
  (2028, 3, 3.438),
  (2028, 4, 3.168),
  (2028, 5, 3.145),
  (2028, 6, 3.282),
  (2028, 7, 3.485),
  (2028, 8, 3.591),
  (2028, 9, 3.547),
  (2028, 10, 3.587),
  (2028, 11, 3.793),
  (2028, 12, 4.4),
  (2029, 1, 4.832),
  (2029, 2, 4.4),
  (2029, 3, 3.495),
  (2029, 4, 3.199),
  (2029, 5, 3.171),
  (2029, 6, 3.288),
  (2029, 7, 3.5),
  (2029, 8, 3.558),
  (2029, 9, 3.545),
  (2029, 10, 3.61),
  (2029, 11, 3.774),
  (2029, 12, 4.353),
  (2030, 1, 4.786),
  (2030, 2, 4.364),
  (2030, 3, 3.511),
  (2030, 4, 3.136),
  (2030, 5, 3.09),
  (2030, 6, 3.207),
  (2030, 7, 3.453),
  (2030, 8, 3.489),
  (2030, 9, 3.457),
  (2030, 10, 3.538),
  (2030, 11, 3.704),
  (2030, 12, 4.244),
  (2031, 1, 4.659),
  (2031, 2, 4.239),
  (2031, 3, 3.457),
  (2031, 4, 3.087),
  (2031, 5, 3.053),
  (2031, 6, 3.174),
  (2031, 7, 3.376),
  (2031, 8, 3.431),
  (2031, 9, 3.415),
  (2031, 10, 3.499),
  (2031, 11, 3.725),
  (2031, 12, 4.326)
) as v(anio, mes, precio)
where deck.deck_id is not null;

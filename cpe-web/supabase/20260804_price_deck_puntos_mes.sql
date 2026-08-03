-- Las corridas reales de ICE Brent (o cualquier strip de mercado) vienen con
-- un contrato por mes en el corto plazo y sólo unos pocos años más allá —
-- promediar todo a un punto anual perdía la baja mes a mes del corto plazo
-- (ej. Oct26 83.59 → Dic26 79.18). "mes" es opcional: si queda vacío, el
-- punto sigue siendo anual como antes (equivale a enero).
alter table price_deck_puntos
  add column if not exists mes smallint check (mes between 1 and 12);

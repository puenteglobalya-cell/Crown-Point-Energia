-- CAPEX default por pozo tipo — solo informativo (referencia al armar una
-- Intervención), el motor sigue usando el capex_usd que se carga en cada
-- Intervención, no este valor.
alter table pozos_tipo add column if not exists capex_default_usd numeric(14,2);

update pozos_tipo set capex_default_usd = 4550000 where nombre in ('GSJ_CH_MODELO', 'GSJ_PQO_MODELO', 'GSJ_BLG_MODELO');
update pozos_tipo set capex_default_usd = 556000 where nombre = 'GSJ_WO_MODELO';

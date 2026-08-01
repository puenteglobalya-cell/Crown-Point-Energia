-- ============================================================
-- P1/P2/P3 como categorías incrementales + saldo ponderado por certeza
-- ============================================================
-- Definición confirmada por el cliente: P1/P2/P3 son Probadas / Probables /
-- Posibles **incrementales**, no los totales acumulados 1P/2P/3P.
--
-- Consecuencias en el motor (ya aplicadas en lib/reservas/engine.ts):
--
-- 1. La depleción cascadea. La producción de cada año agota primero las
--    probadas y sólo el excedente pasa a probables y después a posibles.
--    Antes se restaba la producción TOTAL del yacimiento de cada categoría
--    por separado, lo que consumía tres veces el mismo barril y hacía que
--    las tres bolsas se agotaran en paralelo.
--
-- 2. El factor de certeza (parametros_certeza_reservas: P1=100%, P2=50%,
--    P3=20%) ya NO se aplica a la apertura. La producción es física y no
--    conoce factores de riesgo; ponderar la apertura y después depletar hacía
--    que la relación entre el saldo ponderado y el volumen físico se desviara
--    en cada período. Ahora el factor se aplica al saldo de cierre, que es
--    donde tiene sentido.
--
-- Estas dos columnas guardan ese saldo ponderado. El motor comprueba si
-- existen antes de escribirlas, así que el cálculo funciona con o sin esta
-- migración aplicada (sin ella, sólo faltan los valores ponderados).

alter table reservas_depletion_anual
  add column if not exists cierre_riesgo_boe numeric(16,2),
  add column if not exists factor_certeza    numeric(6,4);

comment on column reservas_depletion_anual.cierre_boe is
  'Saldo de cierre en volumen FÍSICO (sin ponderar por certeza).';

comment on column reservas_depletion_anual.cierre_riesgo_boe is
  'Saldo de cierre ponderado por el grado de certeza de la categoría (cierre_boe x factor_certeza).';

comment on column reservas_depletion_anual.factor_certeza is
  'Factor aplicado: override del registro de reservas_anuales, o el vigente de parametros_certeza_reservas a la fecha de corte del reporte.';

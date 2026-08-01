-- ============================================================
-- Costo de abandono y remediación (ARO)
-- ============================================================
-- NI 51-101 exige que el valor de las reservas se informe neto de los costos
-- futuros de abandono y remediación (abandonment & reclamation). El motor
-- cortaba el pozo por límite económico y simplemente dejaba de generar filas,
-- sin ningún desembolso de cierre, lo que sobrestima el VAN de todo escenario.
--
-- Se carga por pozo porque el costo real depende del pozo (profundidad,
-- ubicación, si es inyector). Si se deja en 0 el comportamiento es el de
-- antes, así que la migración es segura de correr sin cargar nada.
--
-- El motor lee esta columna de forma defensiva (`?? 0`), así que el código
-- funciona con o sin esta migración aplicada.

alter table pozos
  add column if not exists costo_abandono_usd numeric(14,2) not null default 0;

comment on column pozos.costo_abandono_usd is
  'Costo de abandono y remediación del pozo (ARO). Se imputa como salida de caja en el último mes de vida económica del pozo, ponderado por la participación en la concesión.';

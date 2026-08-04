-- cashflow_mensual no guardaba el yacimiento directo -- los reportes por
-- yacimiento (resultados_escenario_anual) y la depleción de reservas NI
-- 51-101 lo derivaban de pozo_id -> concesion_id -> yacimiento_id, que da
-- null para facilities y para Intervenciones sin pozo real (pozo_id null
-- a propósito). Esas filas quedaban excluidas del reporte POR yacimiento
-- (aunque sí entraban en el consolidado, que dejaba de reconciliar contra
-- la suma de los yacimientos) y afuera por completo de la depleción de
-- reservas -- esa producción nunca depletaba nada.
--
-- Guardar el yacimiento en la fila misma, en el momento en que el motor ya
-- lo conoce (sea por pozo real, facilities o intervención sin pozo), saca
-- de raíz la necesidad de derivarlo después.
alter table cashflow_mensual add column if not exists yacimiento_id bigint references yacimientos(id) on delete cascade;

-- Backfill de filas ya calculadas con pozo real (facilities/pozo-nuevo van a
-- quedar en null hasta el próximo recálculo del escenario, que las va a
-- completar).
update cashflow_mensual cf
set yacimiento_id = c.yacimiento_id
from pozos p
join concesiones c on c.id = p.concesion_id
where cf.pozo_id = p.id and cf.yacimiento_id is null;

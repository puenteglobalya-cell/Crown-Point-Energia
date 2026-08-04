-- Categoría de actividad (basico/drilling/workover/pulling/facilities) de
-- cada fila de cashflow_mensual — para armar el gráfico de producción
-- apilado por categoría (formato del Excel del cliente: Básica/WO/Pulling/
-- Drilling) sin reconstruir la categoría cruzando intervenciones a mano.
alter table cashflow_mensual add column if not exists categoria text;

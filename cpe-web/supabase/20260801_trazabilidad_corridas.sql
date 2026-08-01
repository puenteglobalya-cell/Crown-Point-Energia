-- ============================================================
-- Trazabilidad de corridas
-- ============================================================
-- `escenario_metricas` guardaba el resultado pero no cuándo se calculó ni
-- sobre qué datos. Si alguien edita un precio, una curva o una intervención
-- después de correr el motor, el Pareto y el consolidado siguen mostrando el
-- VAN viejo sin ninguna advertencia — y ese número puede terminar en un
-- directorio.
--
-- `hash_inputs` es una huella de todos los datos que entraron al cálculo. Al
-- abrir los resultados se vuelve a calcular la huella sobre los datos actuales
-- y se compara: si cambió, la corrida quedó vieja y hay que volver a correr.

alter table escenario_metricas
  add column if not exists calculado_en  timestamptz not null default now(),
  add column if not exists calculado_por text,
  add column if not exists hash_inputs   text;

comment on column escenario_metricas.hash_inputs is
  'Huella de los datos de entrada al momento de correr. Si no coincide con la huella actual, los resultados están desactualizados.';
comment on column escenario_metricas.calculado_por is
  'Email de quien corrió el cálculo.';

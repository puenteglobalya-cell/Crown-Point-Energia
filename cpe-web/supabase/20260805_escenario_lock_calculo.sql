-- Lock liviano para evitar dos "Calcular escenario" concurrentes sobre el
-- mismo escenario (ej. dos pestañas del navegador): calcularEscenario hace
-- delete + insert en cashflow_mensual sin transacción, así que la corrida
-- que termina último gana en silencio y la otra queda sin ningún aviso de
-- que su resultado no es el que se ve.
alter table escenarios add column if not exists calculando_desde timestamptz;

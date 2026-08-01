-- ============================================================
-- Costos corporativos — del consolidado al valor de empresa
-- ============================================================
-- El consolidado era la suma de los proyectos. Para llegar a un valor de
-- empresa faltan los costos que no pertenecen a ningún proyecto: la estructura
-- corporativa y el servicio de la deuda.
--
-- Los intereses NO van acá: se derivan de `deuda_notas`, que ya tiene saldo,
-- tasa y vencimiento por serie. Duplicarlos a mano sería una fuente de
-- desactualización.

create table if not exists costos_corporativos (
    id            bigint generated always as identity primary key,
    concepto      text not null,
    tipo          text not null default 'g_and_a'
                  check (tipo in ('g_and_a','estructura','honorarios','seguros','otro')),
    -- Costo recurrente mensual entre dos fechas. Para un desembolso único,
    -- poné el mismo mes en desde y hasta.
    fecha_desde   date not null,
    fecha_hasta   date,
    monto_usd_mes numeric(14,2) not null,
    -- Si es deducible, genera escudo fiscal a la alícuota de ganancias.
    deducible     boolean not null default true,
    notas         text,
    check (fecha_hasta is null or fecha_hasta > fecha_desde)
);

comment on table costos_corporativos is
  'Costos de estructura que no pertenecen a ningún proyecto. Se restan del consolidado para llegar a un valor de empresa.';
comment on column costos_corporativos.monto_usd_mes is
  'Monto MENSUAL, no anual. Un G&A de 3,6 MM al año se carga como 300.000.';

alter table costos_corporativos enable row level security;
create policy "reservas_service_role_all" on costos_corporativos for all using (auth.role() = 'service_role');

-- Regla de impuesto a las ganancias definida por el cliente:
--   base_imponible = ventas - opex - regalías - IIBB - Imp. Débitos y Créditos - amortización
--   impuesto_ganancias = base_imponible * alicuota (default 35%, ajustable)
--   resultado_neto = base_imponible - impuesto_ganancias
-- (cashflow_mensual.resultado_antes_ganancias_usd = base_imponible, ya existe)

-- Imp. a los Débitos y Créditos (nacional, no varía por concesión) — falta
-- una línea de costo separada de IIBB en el cashflow.
alter table cashflow_mensual
  add column if not exists debitos_creditos_usd numeric(16,2) not null default 0;

create table if not exists parametros_debitos_creditos (
    id           bigint generated always as identity primary key,
    fecha_desde  date not null,
    alicuota     numeric(6,4) not null, -- ej 0.006 = 0.6%
    unique (fecha_desde)
);

alter table parametros_debitos_creditos enable row level security;
create policy "reservas_service_role_all" on parametros_debitos_creditos for all using (auth.role() = 'service_role');

-- Alícuota inicial de ganancias, ajustable a futuro por fecha_desde
insert into parametros_impuesto_ganancias (fecha_desde, alicuota, nivel, concesion_id)
select current_date, 0.35, 'consolidado', null
where not exists (select 1 from parametros_impuesto_ganancias where nivel = 'consolidado');

-- Alícuota inicial de Imp. Débitos y Créditos (0.6% es la tasa general vigente en Argentina — ajustable)
insert into parametros_debitos_creditos (fecha_desde, alicuota)
select current_date, 0.006
where not exists (select 1 from parametros_debitos_creditos);

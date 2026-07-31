-- Factor de certeza/riesgo ajustable por categoría de reserva (P1/P2/P3),
-- para ponderar reservas_anuales según el grado de certeza que defina la
-- empresa (ej. P1=100%, P2=50%, P3=20% — son valores de partida, no una
-- convención fija de la industria, ajustables acá).
create table if not exists parametros_certeza_reservas (
    id           bigint generated always as identity primary key,
    categoria    text not null check (categoria in ('P1','P2','P3')),
    factor       numeric(6,4) not null check (factor between 0 and 1),
    fecha_desde  date not null,
    unique (categoria, fecha_desde)
);

alter table parametros_certeza_reservas enable row level security;
create policy "reservas_service_role_all" on parametros_certeza_reservas for all using (auth.role() = 'service_role');

insert into parametros_certeza_reservas (categoria, factor, fecha_desde) values
  ('P1', 1.00, current_date),
  ('P2', 0.50, current_date),
  ('P3', 0.20, current_date)
on conflict (categoria, fecha_desde) do nothing;

-- Override puntual por registro — si es null, se usa el factor vigente de
-- parametros_certeza_reservas para esa categoría y fecha.
alter table reservas_anuales
  add column if not exists factor_certeza_override numeric(6,4) check (factor_certeza_override between 0 and 1);

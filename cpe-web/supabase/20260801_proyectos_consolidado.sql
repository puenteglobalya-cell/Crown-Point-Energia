-- ============================================================
-- Proyectos, costos de proyecto (compra de áreas) y consolidado
-- ============================================================
-- Hasta acá el simulador valuaba un escenario. Para mirar nuevos negocios hace
-- falta un nivel más arriba: **proyecto**. Cada proyecto tiene sus escenarios,
-- y el consolidado de la empresa es —por ahora, definido por el cliente— la
-- suma de los proyectos.
--
-- Lo que no encajaba en el modelo anterior son los costos que no cuelgan de un
-- pozo: el **precio de compra de un área**, un bono de firma, un compromiso
-- exploratorio. Son justamente los que definen si un negocio nuevo cierra o no,
-- y van en costos_proyecto.

create table if not exists proyectos (
    id            bigint generated always as identity primary key,
    nombre        text not null unique,
    descripcion   text,
    tipo          text not null default 'organico'
                  check (tipo in ('organico','adquisicion','farm_in','exploratorio')),
    -- Fecha a la que se descuenta el proyecto en el consolidado. Si es null se
    -- usa la fecha base común que elija el consolidado.
    fecha_evaluacion date,
    incluir_en_consolidado boolean not null default true,
    notas         text
);

comment on table proyectos is
  'Nivel por encima del escenario. El consolidado de la empresa es la suma de los proyectos incluidos.';
comment on column proyectos.tipo is
  'organico = desarrollo sobre activos propios · adquisicion = compra de un área · farm_in · exploratorio.';

alter table proyectos enable row level security;
create policy "reservas_service_role_all" on proyectos for all using (auth.role() = 'service_role');

-- Un escenario pasa a pertenecer a un proyecto. El escenario marcado es_base
-- dentro de cada proyecto es el que entra al consolidado.
alter table escenarios
  add column if not exists proyecto_id bigint references proyectos(id) on delete set null;

create index if not exists escenarios_proyecto_idx on escenarios (proyecto_id);

-- ─── Costos a nivel proyecto ────────────────────────────────────────────
-- Desembolsos que no pertenecen a ningún pozo. El caso principal es el precio
-- de compra del área, que es la variable que decide una adquisición.
create table if not exists costos_proyecto (
    id            bigint generated always as identity primary key,
    proyecto_id   bigint not null references proyectos(id) on delete cascade,
    -- Si es null, el costo aplica a todos los escenarios del proyecto. Si
    -- apunta a un escenario, aplica sólo a ese (sirve para probar dos precios
    -- de compra distintos sobre el mismo proyecto).
    escenario_id  bigint references escenarios(id) on delete cascade,
    concepto      text not null,
    tipo          text not null default 'compra_area'
                  check (tipo in ('compra_area','bono_firma','compromiso_exploratorio',
                                  'g_and_a','abandono_asumido','otro')),
    fecha         date not null,
    monto_usd     numeric(16,2) not null,
    -- Un precio de compra normalmente YA es lo que paga CPE por la porción que
    -- adquiere, así que por defecto NO se vuelve a multiplicar por la
    -- participación. El resto de los inputs del simulador sí se cargan al 100%
    -- y el motor los netea; por eso este flag es explícito y no un supuesto.
    aplicar_participacion boolean not null default false,
    -- Amortización del desembolso a efectos del impuesto a las ganancias.
    -- NULL = no se amortiza (se trata como salida de caja pura).
    amortizable_meses int check (amortizable_meses is null or amortizable_meses > 0),
    notas         text
);

comment on table costos_proyecto is
  'Desembolsos de nivel proyecto que no cuelgan de un pozo: precio de compra del área, bono de firma, compromiso exploratorio, G&A.';
comment on column costos_proyecto.aplicar_participacion is
  'false (default) = el monto ya es lo que desembolsa CPE. true = el monto está al 100% y se netea por la participación, como el resto de los inputs.';

create index if not exists costos_proyecto_idx on costos_proyecto (proyecto_id, escenario_id);

alter table costos_proyecto enable row level security;
create policy "reservas_service_role_all" on costos_proyecto for all using (auth.role() = 'service_role');

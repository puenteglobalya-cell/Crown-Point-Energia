-- Calificación crediticia y ON vigentes según FIX SCR (afiliada de Fitch
-- Ratings en Argentina) -- hoy están hardcodeadas en app/inversores/page.tsx
-- y quedan desactualizadas apenas FIX publica un cambio. Se sincronizan
-- todos los días vía scraping (lib/fixscr-sync.ts + app/api/cron/fixscr-sync).

create table if not exists fix_calificacion_local (
    id           bigint generated always as identity primary key,
    plazo        text not null,
    fecha        date not null,
    rating       text not null,
    perspectiva  text not null,
    accion       text not null,
    synced_at    timestamptz not null default now(),
    unique (plazo)
);
alter table fix_calificacion_local enable row level security;
create policy "fix_calificacion_local_select_public" on fix_calificacion_local
    for select using (true);

create table if not exists fix_on_vigentes (
    isin         text primary key,
    concepto     text not null,
    fecha        date not null,
    rating       text not null,
    perspectiva  text not null,
    accion       text not null,
    orden        int not null default 0,
    synced_at    timestamptz not null default now()
);
alter table fix_on_vigentes enable row level security;
create policy "fix_on_vigentes_select_public" on fix_on_vigentes
    for select using (true);

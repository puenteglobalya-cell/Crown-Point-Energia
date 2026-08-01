-- ============================================================
-- Blacklist escalada de IPs por reincidencia en el rate limit
-- ============================================================
-- El rate limit por endpoint (lib/ratelimit.ts) devuelve 429 y ahí termina:
-- una IP puede chocar contra el límite indefinidamente, y rotar de endpoint
-- para seguir probando. Esta capa cuenta las violaciones POR IP, sin importar
-- en qué endpoint ocurran, y escala el bloqueo:
--
--   3ª violación en 24 hs  →  1 hora
--   6ª violación en 24 hs  →  24 horas
--   10ª violación en 24 hs →  7 días
--
-- Se separa en dos tablas a propósito. El log permite responder "por qué está
-- bloqueada esta IP" — que es la pregunta que aparece cuando el bloqueado
-- resulta ser un cliente real detrás de un NAT corporativo — y permite contar
-- con una ventana móvil de 24 hs de verdad, no una ventana fija que se
-- reinicia sola.

-- ─── Log de violaciones ───────────────────────────────────────────────────
create table if not exists ip_violaciones (
  id         bigint generated always as identity primary key,
  ip         text not null,
  endpoint   text not null,
  creada_en  timestamptz not null default now()
);

create index if not exists ip_violaciones_ip_fecha_idx
  on ip_violaciones (ip, creada_en desc);

comment on table ip_violaciones is
  'Cada vez que una IP choca contra el rate limit. Sirve para contar la ventana móvil de 24 hs y para auditar por qué se bloqueó una IP.';

alter table ip_violaciones enable row level security;
-- Sin políticas: sólo el service-role (server-side) escribe y lee. Nadie
-- autenticado debería poder ver ni borrar su propio historial.

-- ─── Bloqueos vigentes ────────────────────────────────────────────────────
create table if not exists ip_bloqueos (
  ip               text primary key,
  bloqueada_hasta  timestamptz not null,
  nivel            int not null check (nivel between 1 and 3),
  violaciones      int not null default 0,
  motivo           text,
  ultimo_endpoint  text,
  total_bloqueos   int not null default 1,
  creado_en        timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ip_bloqueos_hasta_idx on ip_bloqueos (bloqueada_hasta);

comment on table ip_bloqueos is
  'Bloqueos vigentes por IP. nivel 1 = 1 hora · 2 = 24 horas · 3 = 7 días.';
comment on column ip_bloqueos.total_bloqueos is
  'Cuántas veces se bloqueó esta IP históricamente. No se reinicia: sirve para detectar reincidencia crónica.';

alter table ip_bloqueos enable row level security;

-- ─── Operación ────────────────────────────────────────────────────────────
-- Ver quién está bloqueado ahora:
--   select ip, bloqueada_hasta, nivel, violaciones, ultimo_endpoint, motivo
--   from ip_bloqueos where bloqueada_hasta > now() order by bloqueada_hasta desc;
--
-- Ver qué hizo una IP antes de que la bloquearan:
--   select endpoint, creada_en from ip_violaciones
--   where ip = 'x.x.x.x' order by creada_en desc limit 50;
--
-- Desbloquear a mano (un cliente real detrás de un NAT compartido, por ejemplo):
--   delete from ip_bloqueos where ip = 'x.x.x.x';
--   delete from ip_violaciones where ip = 'x.x.x.x';
--
-- Limpieza del log. El código borra oportunísticamente lo que pasa de 30 días,
-- pero si el log creció mucho conviene correrlo a mano una vez:
--   delete from ip_violaciones where creada_en < now() - interval '30 days';

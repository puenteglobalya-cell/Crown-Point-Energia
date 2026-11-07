-- Auditoría de seguridad 2026-11-07: cierre de políticas RLS y de Storage
-- demasiado amplias ("authenticated USING (true)" en tablas cuya única vía
-- de escritura real es una API route con service_role), más la vista
-- job_applications_view que corría con privilegios del owner.
--
-- Correr manualmente en el SQL editor de Supabase (no hay acceso directo
-- desde este entorno). Es idempotente: se puede reintentar sin problema.
--
-- EXCEPCIÓN DELIBERADA: operations_block_photos NO se lleva a
-- service_role-only porque app/admin/bloques-fotos/page.tsx escribe esa
-- tabla directamente desde el cliente autenticado (browser client, rol
-- admin). Ahí se usa un predicado por rol via JWT en vez de bloquear todo.
--
-- FUERA DE ESTA MIGRACIÓN (requiere decisión de producto/UX primero):
--   - bucket "documents" público (sirve a la vez documentos públicos de IR
--     y CVs/archivos internos) — necesita separarse en dos buckets + cambios
--     de código en varios consumidores antes de poder restringirlo.
--   - bucket "site-images": se deja insert/update/delete solo para authenticated
--     (ya lo estaba) pero NO se tocan los MIME types permitidos acá.

begin;

-- ---------------------------------------------------------------------
-- 1) job_applications_view corría con privilegios del owner (bypass RLS
--    de candidatos/postulaciones para cualquiera que pudiera hacer SELECT
--    sobre la vista). security_invoker = on hace que respete la RLS del
--    que consulta; además sacamos el acceso directo de anon/authenticated
--    ya que el único consumidor es app/api/carreras/route.ts vía
--    service_role.
-- ---------------------------------------------------------------------
alter view public.job_applications_view set (security_invoker = on);
revoke all on public.job_applications_view from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Tablas con política "authenticated USING (true)" que en la práctica
--    solo se escriben desde API routes con service_role. Se reemplazan
--    por políticas service_role-only (equivalente a "service_role bypassa
--    RLS siempre", pero deja explícito que ningún usuario autenticado común
--    debería poder leer/escribir directo).
-- ---------------------------------------------------------------------

-- candidatos / postulaciones / candidato_documentos
drop policy if exists "auth select candidatos" on public.candidatos;
drop policy if exists "auth update candidatos" on public.candidatos;
create policy "service_role all candidatos" on public.candidatos
  for all to service_role using (true) with check (true);

drop policy if exists "auth select postulaciones" on public.postulaciones;
drop policy if exists "auth all postulaciones" on public.postulaciones;
create policy "service_role all postulaciones" on public.postulaciones
  for all to service_role using (true) with check (true);

drop policy if exists "auth select candidato_documentos" on public.candidato_documentos;
drop policy if exists "auth all candidato_documentos" on public.candidato_documentos;
create policy "service_role all candidato_documentos" on public.candidato_documentos
  for all to service_role using (true) with check (true);

-- job_applications (tabla legacy, carreras-schema.sql)
drop policy if exists "auth select applications" on public.job_applications;
drop policy if exists "auth update applications" on public.job_applications;
create policy "service_role all job_applications" on public.job_applications
  for all to service_role using (true) with check (true);

-- contact_submissions
drop policy if exists "auth all contact" on public.contact_submissions;
create policy "service_role all contact_submissions" on public.contact_submissions
  for all to service_role using (true) with check (true);

-- ir_subscribers: la política "public update ir_sub" permitía a CUALQUIER
-- anónimo actualizar cualquier fila (sin siquiera exigir auth). Se elimina
-- junto con la de authenticated; alta/baja de suscripción debe ir por API.
drop policy if exists "public update ir_sub" on public.ir_subscribers;
drop policy if exists "auth all ir_sub" on public.ir_subscribers;
create policy "service_role all ir_subscribers" on public.ir_subscribers
  for all to service_role using (true) with check (true);

-- user_profiles: "user_profiles_admin_all" decía "admins" en el comentario
-- pero el predicado real era TO authenticated USING(true) -- cualquier
-- usuario logueado podía leer/editar el perfil (incluye DNI) de cualquier
-- otro. Se reemplaza por admin-only vía claim de rol en el JWT.
drop policy if exists "user_profiles_admin_all" on public.user_profiles;
create policy "user_profiles_admin_all" on public.user_profiles
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ir_alert_recipients: mismo patrón ("Admins manage..." pero sin chequeo real)
drop policy if exists "Admins manage ir_alert_recipients" on public.ir_alert_recipients;
create policy "Admins manage ir_alert_recipients" on public.ir_alert_recipients
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- documentos (docs-schema.sql)
drop policy if exists "auth all documentos" on public.documentos;
create policy "service_role all documentos" on public.documentos
  for all to service_role using (true) with check (true);

-- comunicados: por las dudas de que la política vieja siga vigente según
-- orden de ejecución de migraciones, se dropea explícitamente acá también.
drop policy if exists "auth all comunicados" on public.comunicados;
create policy "service_role all comunicados" on public.comunicados
  for all to service_role using (true) with check (true);

-- ir_documents
drop policy if exists "auth all ir_documents" on public.ir_documents;
create policy "service_role all ir_documents" on public.ir_documents
  for all to service_role using (true) with check (true);

-- cms_settings / cms_sections / cms_fields -- esta era la que, combinada
-- con el XSS de customCss (ya resuelto en código), permitía defacement del
-- sitio público a cualquier usuario logueado, sin importar su rol.
drop policy if exists "auth insert/update settings" on public.cms_settings;
create policy "service_role all cms_settings" on public.cms_settings
  for all to service_role using (true) with check (true);

drop policy if exists "auth insert/update sections" on public.cms_sections;
create policy "service_role all cms_sections" on public.cms_sections
  for all to service_role using (true) with check (true);

drop policy if exists "auth insert/update fields" on public.cms_fields;
create policy "service_role all cms_fields" on public.cms_fields
  for all to service_role using (true) with check (true);

-- editable-content-schema.sql: 9 tablas con el mismo patrón "auth all ..."
drop policy if exists "auth all ir_events" on public.ir_events;
create policy "service_role all ir_events" on public.ir_events
  for all to service_role using (true) with check (true);

drop policy if exists "auth all ir_analysts" on public.ir_analysts;
create policy "service_role all ir_analysts" on public.ir_analysts
  for all to service_role using (true) with check (true);

drop policy if exists "auth all ons" on public.obligaciones_negociables;
create policy "service_role all obligaciones_negociables" on public.obligaciones_negociables
  for all to service_role using (true) with check (true);

drop policy if exists "auth all ops_blocks" on public.operations_blocks;
create policy "service_role all operations_blocks" on public.operations_blocks
  for all to service_role using (true) with check (true);

drop policy if exists "auth all team" on public.team_members;
create policy "service_role all team_members" on public.team_members
  for all to service_role using (true) with check (true);

drop policy if exists "auth all strategy" on public.strategy_cards;
create policy "service_role all strategy_cards" on public.strategy_cards
  for all to service_role using (true) with check (true);

drop policy if exists "auth all positions" on public.open_positions;
create policy "service_role all open_positions" on public.open_positions
  for all to service_role using (true) with check (true);

drop policy if exists "auth all culture" on public.culture_cards;
create policy "service_role all culture_cards" on public.culture_cards
  for all to service_role using (true) with check (true);

drop policy if exists "auth all esg" on public.esg_pillar_data;
create policy "service_role all esg_pillar_data" on public.esg_pillar_data
  for all to service_role using (true) with check (true);

-- operations_block_photos: EXCEPCIÓN -- se mantiene escritura directa desde
-- el cliente autenticado, pero solo para rol admin (antes: cualquier
-- authenticated).
drop policy if exists "auth manage block photos" on public.operations_block_photos;
create policy "admin manage block photos" on public.operations_block_photos
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- biblioteca (storage.objects, bucket 'biblioteca'): insert/delete abiertos
-- a cualquier authenticated -> admin-only.
drop policy if exists "biblioteca_insert" on storage.objects;
create policy "biblioteca_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'biblioteca'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "biblioteca_delete" on storage.objects;
create policy "biblioteca_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'biblioteca'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- activity_logs: "admins_read_logs" en realidad era "cualquier logueado"
drop policy if exists "admins_read_logs" on public.activity_logs;
create policy "admins_read_logs" on public.activity_logs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------------------
-- 3) Storage: buckets con política "FOR ALL TO authenticated" que
--    bypasseaba el control de acceso ya correcto a nivel de tabla.
-- ---------------------------------------------------------------------

-- investor-documents: la tabla investor_documents ya restringe a
-- accionista/admin correctamente -- el bucket no debería ser más laxo.
drop policy if exists "auth all investor-documents storage" on storage.objects;
create policy "admin all investor-documents storage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'investor-documents'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'investor-documents'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

commit;

-- Verificación sugerida post-migración (correr aparte, no destructivo):
--   select schemaname, tablename, policyname, roles, qual
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;

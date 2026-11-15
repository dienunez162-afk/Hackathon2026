-- =====================================================================
-- G-NOSIS · migración 0002 (borrador): cuentas propias y clases con código
--
-- Cambio de diseño respecto a 0001:
--   Antes: el maestro creaba a cada alumno y todo alumno tenía grupo.
--   Ahora: el niño crea su propia cuenta (alias + contraseña, SIN correo), juega y guarda
--          sus partidas y récords. Si quiere, escribe el código de una clase y pide unirse;
--          el maestro lo acepta o lo rechaza. Solo entonces el maestro ve su avance.
--
-- Privacidad (niños de 7 a 12 años):
--   - No se guarda correo ni nombre real. El alias es solo minúsculas, números y _.
--   - Supabase exige un correo para Auth: el juego usa uno interno e inventado
--     (<alias>@<DOMINIO_ALUMNOS>). En el panel de Supabase hay que DESACTIVAR
--     «Confirm email» (Authentication > Providers > Email), porque ese correo no existe.
--   - Si el niño olvida su contraseña no hay recuperación automática (no hay correo).
--     Un maestro puede restablecerla a sus alumnos con una Edge Function (pendiente).
--   - Si el niño sale de la clase, el maestro deja de ver todo su avance.
--   - Los récords son personales; no hay tablas de posiciones entre niños.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Un alumno ya no necesita grupo, y su alias es único en toda la app
-- ---------------------------------------------------------------------
alter table public.alumnos alter column grupo_id drop not null;
alter table public.alumnos drop constraint if exists alumnos_grupo_id_alias_key;
alter table public.alumnos drop constraint if exists alumnos_alias_check;
alter table public.alumnos
  add constraint alumnos_alias_formato check (alias ~ '^[a-z0-9_]{3,20}$');
create unique index if not exists alumnos_alias_unico on public.alumnos (alias);

-- Cuenta nueva: empieza en el nivel más bajo; el juego lo ajusta según cómo le va.
alter table public.alumnos alter column nivel_inicial set default 1;
alter table public.alumnos alter column nivel_reto set default 1;
alter table public.alumnos alter column nivel_lectura set default 1;

-- Para los récords personales
alter table public.partidas
  add column if not exists preguntas_total   smallint not null default 0 check (preguntas_total >= 0),
  add column if not exists preguntas_primera smallint not null default 0 check (preguntas_primera >= 0),
  add constraint partidas_primera_le_total check (preguntas_primera <= preguntas_total);

-- ---------------------------------------------------------------------
-- 2. Alta automática: maestro (con correo) o alumno (alias)
--    El registro manda options.data = { rol: 'maestro', nombre } o { rol: 'alumno', alias }.
-- ---------------------------------------------------------------------
create or replace function public.crear_perfil_maestro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r text := coalesce(new.raw_user_meta_data ->> 'rol', '');
        a text := lower(coalesce(new.raw_user_meta_data ->> 'alias', ''));
begin
  if r = 'maestro' then
    insert into public.perfiles (id, rol, nombre)
    values (new.id, 'maestro', coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), 'Maestro'));
  elsif r = 'alumno' then
    if a !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'alias inválido: usa de 3 a 20 letras minúsculas, números o _';
    end if;
    insert into public.perfiles (id, rol, nombre) values (new.id, 'alumno', a);
    insert into public.alumnos (id, grupo_id, alias) values (new.id, null, a);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Solicitudes para unirse a una clase
-- ---------------------------------------------------------------------
create type public.estado_solicitud as enum ('pendiente', 'aceptada', 'rechazada');

create table public.solicitudes_clase (
  id          uuid primary key default gen_random_uuid(),
  alumno_id   uuid not null references public.alumnos (id) on delete cascade,
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  estado      public.estado_solicitud not null default 'pendiente',
  creada_en   timestamptz not null default now(),
  resuelta_en timestamptz,
  unique (alumno_id, grupo_id)
);
create index on public.solicitudes_clase (grupo_id, estado);

alter table public.solicitudes_clase enable row level security;

create policy "alumno ve sus solicitudes" on public.solicitudes_clase
  for select to authenticated using (alumno_id = auth.uid());
create policy "maestro ve solicitudes de sus grupos" on public.solicitudes_clase
  for select to authenticated using (
    exists (select 1 from public.grupos g where g.id = grupo_id and g.maestro_id = auth.uid())
  );
-- Nadie inserta ni edita directo: solo las funciones de abajo.

-- El maestro ve el alias de quien pidió unirse (antes de aceptarlo)
create policy "maestro ve alumnos que piden unirse" on public.alumnos
  for select to authenticated using (
    exists (
      select 1 from public.solicitudes_clase s
      join public.grupos g on g.id = s.grupo_id
      where s.alumno_id = alumnos.id and s.estado = 'pendiente' and g.maestro_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 4. Funciones que usa el juego (security definer, validan quién llama)
-- ---------------------------------------------------------------------

-- ¿Cómo se llama la clase con este código? Solo devuelve nombre y grado.
create or replace function public.buscar_clase(p_codigo text)
returns table (nombre text, grado smallint)
language sql
stable
security definer
set search_path = public
as $$
  select g.nombre, g.grado from public.grupos g
  where g.codigo = upper(trim(p_codigo)) and exists (select 1 from public.alumnos where id = auth.uid());
$$;

-- Pide unirse. Devuelve 'pendiente' (o 'aceptada' si ya había sido aceptado).
create or replace function public.pedir_unirme(p_codigo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare g public.grupos; a public.alumnos; s public.solicitudes_clase;
begin
  select * into a from public.alumnos where id = auth.uid();
  if not found then raise exception 'solo un alumno puede unirse a una clase'; end if;
  if a.grupo_id is not null then raise exception 'ya estás en una clase: sal primero de ella'; end if;
  select * into g from public.grupos where codigo = upper(trim(p_codigo));
  if not found then raise exception 'ese código no existe'; end if;
  select * into s from public.solicitudes_clase where alumno_id = a.id and grupo_id = g.id;
  if found then
    if s.estado = 'rechazada' then raise exception 'el maestro no aceptó esta solicitud'; end if;
    return s.estado::text;
  end if;
  insert into public.solicitudes_clase (alumno_id, grupo_id) values (a.id, g.id);
  return 'pendiente';
end;
$$;

-- El maestro acepta o rechaza. Al aceptar, el alumno entra al grupo y el maestro empieza a ver su avance.
-- Nivel inicial por grado (1.°-2.° → 1, 3.°-4.° → 2, 5.°-6.° → 3); el nivel actual del niño no se toca.
create or replace function public.resolver_solicitud(p_id uuid, p_acepta boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s public.solicitudes_clase; g public.grupos;
begin
  select * into s from public.solicitudes_clase where id = p_id;
  if not found then raise exception 'solicitud no encontrada'; end if;
  select * into g from public.grupos where id = s.grupo_id;
  if g.maestro_id is distinct from auth.uid() then raise exception 'esta solicitud no es de tu grupo'; end if;
  if s.estado <> 'pendiente' then raise exception 'esta solicitud ya se resolvió'; end if;

  update public.solicitudes_clase
     set estado = case when p_acepta then 'aceptada'::public.estado_solicitud else 'rechazada'::public.estado_solicitud end,
         resuelta_en = now()
   where id = p_id;

  if p_acepta then
    update public.alumnos
       set grupo_id = g.id,
           nivel_inicial = case when g.grado <= 2 then 1 when g.grado <= 4 then 2 else 3 end
     where id = s.alumno_id and grupo_id is null;
  end if;
end;
$$;

-- El niño sale de su clase cuando quiera; el maestro deja de ver su avance.
create or replace function public.salir_de_clase()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.alumnos set grupo_id = null where id = auth.uid();
  delete from public.solicitudes_clase where alumno_id = auth.uid();
end;
$$;

-- Guarda una misión terminada (el número de partida lo calcula la base, no el navegador).
create or replace function public.registrar_partida(
  p_version text, p_nivel_reto smallint, p_nivel_lectura smallint, p_final text, p_estrellas smallint,
  p_dia_final smallint, p_barras jsonb, p_tareas smallint, p_preg_total smallint, p_preg_primera smallint
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare nuevo uuid; n int;
begin
  if not exists (select 1 from public.alumnos where id = auth.uid()) then
    raise exception 'solo un alumno puede guardar partidas';
  end if;
  select coalesce(max(numero), 0) + 1 into n from public.partidas where alumno_id = auth.uid();
  insert into public.partidas (alumno_id, numero, version_grafo, nivel_reto, nivel_lectura, terminada_en, final,
                               estrellas, dia_final, barras_finales, tareas_control, preguntas_total, preguntas_primera)
  values (auth.uid(), n, p_version, p_nivel_reto, p_nivel_lectura, now(), p_final,
          p_estrellas, p_dia_final, p_barras, p_tareas, p_preg_total, least(p_preg_primera, p_preg_total))
  returning id into nuevo;
  return nuevo;
end;
$$;

revoke all on function public.buscar_clase(text), public.pedir_unirme(text), public.salir_de_clase(),
  public.registrar_partida(text, smallint, smallint, text, smallint, smallint, jsonb, smallint, smallint, smallint) from public;
revoke all on function public.resolver_solicitud(uuid, boolean) from public;
grant execute on function public.buscar_clase(text), public.pedir_unirme(text), public.salir_de_clase(),
  public.registrar_partida(text, smallint, smallint, text, smallint, smallint, jsonb, smallint, smallint, smallint),
  public.resolver_solicitud(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Récords personales (PR): una fila por alumno; solo se ve a sí mismo (y su maestro, por RLS de partidas)
--    puntaje_barras: 0 a 400 = (100 − radiación) + energía + comida + salud al terminar.
-- ---------------------------------------------------------------------
create view public.v_records with (security_invoker = true) as
select p.alumno_id,
       count(*) filter (where p.terminada_en is not null)                       as misiones,
       max(p.estrellas)                                                         as mejores_estrellas,
       max( (100 - coalesce((p.barras_finales ->> 'radiacion')::int, 100))
            + coalesce((p.barras_finales ->> 'energia')::int, 0)
            + coalesce((p.barras_finales ->> 'comida')::int, 0)
            + coalesce((p.barras_finales ->> 'salud')::int, 0) )               as mejor_puntaje_barras,
       max(p.preguntas_primera)                                                 as mas_aciertos_primera
from public.partidas p
group by p.alumno_id;

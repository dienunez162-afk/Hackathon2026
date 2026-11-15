-- =====================================================================
-- 0006: lo que necesita el panel del maestro (correr DESPUÉS de 0002, 0004 y 0005)
--   1. `respuestas` acepta las preguntas del banco (tipo 'pregunta') y las vistas las cuentan.
--   2. restablecer_clave_alumno: el maestro le pone una contraseña nueva a un alumno de su clase
--      (sin correo no hay otra forma; sustituye a la Edge Function que se pensó al principio).
--   3. quitar_de_clase: el maestro saca a un alumno de su clase.
--   4. Límite de intentos al escribir códigos de clase (8 cada 10 minutos por usuario).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Preguntas del banco en `respuestas`
-- ---------------------------------------------------------------------
alter table public.respuestas drop constraint if exists respuestas_tipo_check;
alter table public.respuestas
  add constraint respuestas_tipo_check check (tipo in ('situacion', 'averia', 'manual', 'pregunta'));

create or replace view public.v_aciertos_tema with (security_invoker = true) as
select r.alumno_id, r.tema,
       count(*)                                         as decisiones,
       count(*) filter (where r.accion_correcta)        as aciertos,
       round(100.0 * avg(r.accion_correcta::int), 1)    as pct
from public.respuestas r
where r.tipo in ('situacion', 'averia', 'pregunta')
group by r.alumno_id, r.tema;

create or replace view public.v_grupo_tema with (security_invoker = true) as
select a.grupo_id, r.tema,
       count(distinct r.alumno_id)                   as alumnos,
       count(*)                                      as decisiones,
       round(100.0 * avg(r.accion_correcta::int), 1) as pct
from public.respuestas r
join public.alumnos a on a.id = r.alumno_id
where r.tipo in ('situacion', 'averia', 'pregunta')
group by a.grupo_id, r.tema;

create or replace view public.v_repasos_pendientes with (security_invoker = true) as
select distinct on (r.alumno_id, r.tema)
       r.alumno_id, r.tema, r.reto_id, r.creado_en as fallado_en
from public.respuestas r
where r.tipo in ('situacion', 'averia', 'pregunta') and not r.accion_correcta
  and not exists (
    select 1 from public.respuestas r2
    where r2.alumno_id = r.alumno_id and r2.tema = r.tema
      and r2.tipo in ('situacion', 'averia', 'pregunta') and r2.accion_correcta and r2.creado_en > r.creado_en
  )
order by r.alumno_id, r.tema, r.creado_en desc;

-- ---------------------------------------------------------------------
-- 2 y 3. Acciones del maestro sobre sus alumnos
-- ---------------------------------------------------------------------
create or replace function public.restablecer_clave_alumno(p_alumno uuid, p_clave text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.es_maestro_de_alumno(p_alumno) then
    raise exception 'ese alumno no es de tu clase';
  end if;
  if char_length(coalesce(p_clave, '')) < 6 then
    raise exception 'la contraseña debe tener al menos 6 caracteres';
  end if;
  update auth.users
     set encrypted_password = crypt(p_clave, gen_salt('bf')), updated_at = now()
   where id = p_alumno;
end;
$$;

create or replace function public.quitar_de_clase(p_alumno uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_maestro_de_alumno(p_alumno) then
    raise exception 'ese alumno no es de tu clase';
  end if;
  update public.alumnos set grupo_id = null where id = p_alumno;
  delete from public.solicitudes_clase where alumno_id = p_alumno;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Límite de intentos con códigos de clase
-- ---------------------------------------------------------------------
create table if not exists public.intentos_codigo (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null,
  creado_en   timestamptz not null default now()
);
create index if not exists intentos_codigo_usuario on public.intentos_codigo (usuario_id, creado_en);
alter table public.intentos_codigo enable row level security;   -- sin políticas: solo las funciones lo tocan

create or replace function public.contar_intento_codigo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.intentos_codigo where creado_en < now() - interval '1 day';
  if (select count(*) from public.intentos_codigo where usuario_id = auth.uid() and creado_en > now() - interval '10 minutes') >= 8 then
    raise exception 'demasiados intentos: espera unos minutos';
  end if;
  insert into public.intentos_codigo (usuario_id) values (auth.uid());
end;
$$;

create or replace function public.buscar_clase(p_codigo text)
returns table (nombre text, grado smallint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.contar_intento_codigo();
  return query
    select g.nombre, g.grado from public.grupos g
    where g.codigo = upper(trim(p_codigo)) and exists (select 1 from public.alumnos where id = auth.uid());
end;
$$;

create or replace function public.pedir_unirme(p_codigo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare g public.grupos; a public.alumnos; s public.solicitudes_clase;
begin
  perform public.contar_intento_codigo();
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

-- ---------------------------------------------------------------------
-- Permisos: solo con sesión (Supabase da por defecto permiso a `anon`)
-- ---------------------------------------------------------------------
revoke all on function public.restablecer_clave_alumno(uuid, text), public.quitar_de_clase(uuid),
  public.contar_intento_codigo() from public, anon;
grant execute on function public.restablecer_clave_alumno(uuid, text), public.quitar_de_clase(uuid),
  public.contar_intento_codigo() to authenticated;
revoke execute on function public.buscar_clase(text), public.pedir_unirme(text) from anon;

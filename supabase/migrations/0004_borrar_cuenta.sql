-- 0004: el niño (o un adulto con él) puede borrar su cuenta y todo lo que guardó.
-- Borra el usuario de Auth; por las llaves "on delete cascade" se van también su perfil,
-- partidas, bitácora, respuestas y solicitudes de clase. Solo cuentas de alumno.
create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.alumnos where id = auth.uid()) then
    raise exception 'solo una cuenta de alumno se puede borrar así';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.borrar_mi_cuenta() from public;
grant execute on function public.borrar_mi_cuenta() to authenticated;

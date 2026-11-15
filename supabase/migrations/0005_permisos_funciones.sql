-- 0005: endurecer permisos. Correr DESPUÉS de 0002 y 0004.
-- Supabase da por defecto permiso de ejecutar funciones nuevas al rol `anon` (visitantes sin sesión);
-- "revoke ... from public" no lo quita. Las funciones ya validan auth.uid() y fallan sin sesión,
-- pero no tiene sentido que un visitante pueda ni llamarlas.
revoke execute on function public.buscar_clase(text) from anon;
revoke execute on function public.pedir_unirme(text) from anon;
revoke execute on function public.salir_de_clase() from anon;
revoke execute on function public.registrar_partida(text, smallint, smallint, text, smallint, smallint, jsonb, smallint, smallint, smallint) from anon;
revoke execute on function public.resolver_solicitud(uuid, boolean) from anon;
revoke execute on function public.borrar_mi_cuenta() from anon;

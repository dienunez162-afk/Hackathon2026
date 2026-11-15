-- Prueba de punta a punta del modo Salón (0001 + 0002), con la RLS real de cada rol.
-- Corre en el SQL Editor de Supabase. NO deja nada guardado: al final lanza un error a propósito
-- con el reporte, y así toda la transacción se deshace (usuarios, clase, partida...).
-- Si todo sale bien, el error dice «PRUEBA OK» y la lista de pasos.
do $$
declare
  t uuid := gen_random_uuid();   -- maestro de prueba
  a uuid := gen_random_uuid();   -- alumno de prueba
  g uuid; cod text; sol uuid; part uuid; n int; txt text; rep text := '';
begin
  -- 1. alta (el trigger crea perfiles y alumnos)
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', t, 'authenticated', 'authenticated', 'profe.prueba@prueba.g-nosis.local', '{"rol":"maestro","nombre":"Profe de prueba"}', '{}', now(), now()),
         ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'alumno_prueba@alumnos.g-nosis.local', '{"rol":"alumno","alias":"alumno_prueba"}', '{}', now(), now());
  select count(*) into n from public.perfiles where id in (t, a);
  if n <> 2 then raise exception 'FALLO 1: el trigger no creó los perfiles (%)', n; end if;
  select count(*) into n from public.alumnos where id = a and alias = 'alumno_prueba' and grupo_id is null;
  if n <> 1 then raise exception 'FALLO 1b: no se creó la fila de alumno'; end if;
  rep := rep || E'\n1 alta de maestro y alumno: ok';

  -- 2. el maestro crea una clase (como «authenticated», con su RLS)
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.grupos (maestro_id, nombre, grado) values (t, '4.° B de prueba', 4) returning id, codigo into g, cod;
  rep := rep || E'\n2 el maestro creó la clase ' || cod || ': ok';
  execute 'reset role';

  -- 3. el alumno busca la clase y pide entrar
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select nombre into txt from public.buscar_clase(lower(cod));
  if txt is null then raise exception 'FALLO 3: buscar_clase no encontró la clase'; end if;
  txt := public.pedir_unirme(cod);
  if txt <> 'pendiente' then raise exception 'FALLO 3b: pedir_unirme devolvió %', txt; end if;
  select count(*) into n from public.grupos where id = g;
  if n <> 0 then raise exception 'FALLO 3c: el alumno ve la clase antes de ser aceptado'; end if;
  rep := rep || E'\n3 el alumno encontró la clase y pidió entrar (pendiente): ok';
  execute 'reset role';

  -- 4. el maestro ve la solicitud y el alias, y acepta
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select id into sol from public.solicitudes_clase where grupo_id = g and estado = 'pendiente';
  if sol is null then raise exception 'FALLO 4: el maestro no ve la solicitud'; end if;
  select alias into txt from public.alumnos where id = a;
  if txt is distinct from 'alumno_prueba' then raise exception 'FALLO 4b: el maestro no ve el alias'; end if;
  perform public.resolver_solicitud(sol, true);
  rep := rep || E'\n4 el maestro vio la solicitud y aceptó: ok';
  execute 'reset role';

  -- 5. el alumno ya está en la clase, sube de nivel y guarda una partida con todo
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select nombre into txt from public.grupos where id = g;
  if txt is null then raise exception 'FALLO 5: el alumno aceptado no ve su clase'; end if;
  perform public.ajustar_mi_nivel(null, 3::smallint, 'sube', 2::smallint, 1::smallint);
  part := public.registrar_partida('0.4', 2::smallint, 1::smallint, 'FIN-2', 2::smallint, 14::smallint,
    '{"radiacion":30,"energia":70,"comida":65,"salud":80}'::jsonb, 2::smallint, 6::smallint, 4::smallint);
  insert into public.respuestas (alumno_id, partida_id, tipo, reto_id, tema, nivel_reto, nivel_lectura, origen, dia, prediccion_correcta, accion_correcta, accion, con_apoyo)
  values (a, part, 'situacion', 'S-radiacion', 'radiacion', 2, 1, 'esta_partida', 6, true, true, 'Ir al refugio', false),
         (a, part, 'averia', 'A-polvo', 'polvo_lunar', 2, 1, null, 9, null, false, null, false);
  insert into public.respuestas (alumno_id, partida_id, tipo, nivel_reto, nivel_lectura, dia, accion_correcta, aciertos, total)
  values (a, part, 'manual', 2, 1, 14, true, 2, 2);
  insert into public.cartas_usadas (partida_id, carta_id, tema, tipo, dia) values (part, 'C-radiacion', 'radiacion', 'escudo', 7);
  insert into public.bitacora (alumno_id, entrada_id, tema, partida_id) values (a, 'F1-D4', 'radiacion', part) on conflict do nothing;
  insert into public.bitacora (alumno_id, entrada_id, tema, partida_id) values (a, 'F1-D4', 'radiacion', part) on conflict do nothing;
  update public.partidas set cartas_iniciales = '{}', cartas_manual = '{radiacion,sismos}', rama_ev1 = 'normal' where id = part;
  select misiones into n from public.v_records where alumno_id = a;
  if n is distinct from 1 then raise exception 'FALLO 5b: v_records no ve la partida (%)', n; end if;
  rep := rep || E'\n5 nivel, partida, respuestas, cartas, bitácora y récords del alumno: ok';
  execute 'reset role';

  -- 6. el maestro ve el avance de su alumno
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.alumnos where grupo_id = g;
  if n <> 1 then raise exception 'FALLO 6: el maestro no ve a su alumno'; end if;
  select misiones into n from public.v_records where alumno_id = a;
  if n is distinct from 1 then raise exception 'FALLO 6b: el maestro no ve los récords'; end if;
  select count(*) into n from public.v_habilidades where alumno_id = a and accion_pct is not null;
  if n <> 1 then raise exception 'FALLO 6c: el maestro no ve las habilidades'; end if;
  select count(*) into n from public.v_grupo_tema where grupo_id = g;
  if n < 1 then raise exception 'FALLO 6d: el maestro no ve los temas del grupo'; end if;
  select nivel_reto into n from public.alumnos where id = a;
  rep := rep || E'\n6 el maestro ve alumno, récords, habilidades y temas (nivel actual ' || n || '): ok';
  execute 'reset role';

  -- 7. un extraño no ve nada
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.partidas where alumno_id = a;
  if n <> 0 then raise exception 'FALLO 7: otra cuenta ve partidas ajenas'; end if;
  select count(*) into n from public.alumnos where id = a;
  if n <> 0 then raise exception 'FALLO 7b: otra cuenta ve al alumno'; end if;
  rep := rep || E'\n7 otra cuenta no ve partidas ni alumnos ajenos: ok';
  execute 'reset role';

  raise exception 'PRUEBA OK (no se guardó nada):%', rep;
end $$;

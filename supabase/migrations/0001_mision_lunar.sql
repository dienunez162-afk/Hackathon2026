-- =====================================================================
-- Misión Lunar · esquema de Supabase (borrador v0.2)
-- Maestros con cuenta de correo; alumnos con alias + clave que crea el maestro.
-- Cada partida guarda sus pasos, las cartas que desbloqueó (bitácora) y usó,
-- y lo que el niño decidió en cada reto (situaciones, averías y manual).
-- Las vistas v_* alimentan el panel del maestro.
--
-- Cómo entran los alumnos (sin correo propio):
--   1. El maestro crea al alumno desde el panel. La Edge Function
--      `crear-alumno` genera una clave de 6 caracteres y crea el usuario de
--      Auth con un correo interno: <alias>.<codigo-grupo>@alumnos.<tu-dominio>.
--   2. En el juego, el niño escribe código de grupo + alias + clave; la app
--      arma ese correo interno y llama a signInWithPassword.
--   Así no se guarda ningún correo ni nombre real de un menor.
--
-- Esto es solo para el modo educativo (salón). En el modo libre no hay
-- cuentas ni grado: el progreso y el nivel se guardan en el dispositivo.
-- =====================================================================

create extension if not exists pgcrypto;

create type public.rol_usuario as enum ('maestro', 'alumno');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  rol         public.rol_usuario not null,
  nombre      text not null,                       -- maestro: su nombre; alumno: su alias
  creado_en   timestamptz not null default now()
);

create table public.grupos (
  id          uuid primary key default gen_random_uuid(),
  maestro_id  uuid not null references public.perfiles (id) on delete cascade,
  nombre      text not null,                       -- "4°B"
  escuela     text,
  grado       smallint not null check (grado between 1 and 6),   -- fija el nivel inicial de sus alumnos
  codigo      text not null unique
              default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  creado_en   timestamptz not null default now()
);

create table public.alumnos (
  id          uuid primary key references public.perfiles (id) on delete cascade,
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  alias       text not null check (char_length(alias) between 2 and 24),
  avatar      text,
  -- El nivel nunca se le muestra al niño. El maestro pone el inicial (por defecto, según el grado)
  -- y el juego ajusta reto y lectura según cómo le va (retos-mision-lunar.json → reglas.adaptacion).
  nivel_inicial  smallint not null check (nivel_inicial between 1 and 3),
  nivel_reto     smallint not null check (nivel_reto between 1 and 3),
  nivel_lectura  smallint not null check (nivel_lectura between 1 and 3),
  creado_en   timestamptz not null default now(),
  unique (grupo_id, alias)
);

create table public.partidas (
  id              uuid primary key default gen_random_uuid(),
  alumno_id       uuid not null references public.alumnos (id) on delete cascade,
  numero          int not null,                    -- 1ª, 2ª, 3ª partida del alumno
  version_grafo   text not null,                   -- "0.3"
  nivel_reto      smallint not null check (nivel_reto between 1 and 3),     -- al empezar la partida
  nivel_lectura   smallint not null check (nivel_lectura between 1 and 3),
  iniciada_en     timestamptz not null default now(),
  terminada_en    timestamptz,
  final           text,                            -- 'FIN-3' | 'FIN-2' | 'FIN-1' | 'FAIL-energia' ...
  estrellas       smallint check (estrellas between 0 and 3),
  dia_final       smallint check (dia_final between 0 and 14),
  rama_ev1        text check (rama_ev1 in ('experto', 'normal', 'rescate')),
  rama_ev2        text check (rama_ev2 in ('experto', 'normal', 'rescate')),
  barras_finales  jsonb,                           -- {"radiacion":30,"energia":61,...}
  tareas_control  smallint not null default 0,
  cartas_iniciales text[] not null default '{}',   -- temas que trajo del manual de la partida anterior
  cartas_manual    text[] not null default '{}',   -- temas que dejó bien emparejados para la siguiente
  unique (alumno_id, numero)
);

-- Un renglón por nodo visitado: permite reconstruir la ruta en el grafo.
create table public.pasos (
  id          bigint generated always as identity primary key,
  partida_id  uuid not null references public.partidas (id) on delete cascade,
  nodo_id     text not null,                       -- 'N-D6'
  dia         smallint,
  resultado   text check (resultado in ('exito', 'fallo')),
  opcion      text,                                -- texto de la opción en nodos de decisión
  preparado   boolean not null default false,      -- tenía Pronóstico activo
  barras      jsonb not null,
  creado_en   timestamptz not null default now()
);

-- Entradas de la bitácora (cada informe que el niño desbloquea).
create table public.bitacora (
  alumno_id        uuid not null references public.alumnos (id) on delete cascade,
  entrada_id       text not null,                  -- id del nodo cuyo informe se desbloqueó
  tema             text not null,
  partida_id       uuid references public.partidas (id) on delete set null,
  dia              smallint,
  desbloqueada_en  timestamptz not null default now(),
  primary key (alumno_id, entrada_id)
);

-- Lo que el niño decidió en cada reto: la base de la medición de aprendizaje (evaluación por lo que hace).
--   situacion: llamada de Control de Misión (predecir → actuar → ver)
--   averia:    diagnóstico con pistas
--   manual:    consejos para el siguiente capitán al terminar la partida
create table public.respuestas (
  id                    bigint generated always as identity primary key,
  alumno_id             uuid not null references public.alumnos (id) on delete cascade,
  partida_id            uuid not null references public.partidas (id) on delete cascade,
  tipo                  text not null check (tipo in ('situacion', 'averia', 'manual')),
  reto_id               text,                      -- 'S-radiacion', 'A-polvo' (null en el manual)
  tema                  text,
  nivel_reto            smallint not null check (nivel_reto between 1 and 3),     -- en ese momento
  nivel_lectura         smallint not null check (nivel_lectura between 1 and 3),
  origen                text check (origen in ('esta_partida', 'partida_pasada', 'repaso')),  -- solo situaciones
  dia                   smallint not null check (dia between 0 and 14),
  dias_desde_aprendido  smallint,                  -- null si lo aprendió en otra partida
  rama                  text check (rama in ('experto', 'normal', 'rescate')),
  prediccion_correcta   boolean,                   -- situación: ¿tocó la barra correcta?
  accion_correcta       boolean not null,          -- situación: acción correcta · avería: diagnóstico al primer intento · manual: todo bien emparejado
  accion                text,                      -- texto de la acción elegida
  intentos              smallint check (intentos between 1 and 3),   -- averías
  con_carta             boolean not null default false,              -- avería con la carta del tema
  con_apoyo             boolean not null default false,              -- fase 1, rama Rescate o barra en rojo
  aciertos              smallint,                  -- manual: cartas bien emparejadas
  total                 smallint,                  -- manual: cartas elegidas
  tiempo_ms             int,
  premio                text check (premio in ('recarga', 'pronostico')),
  creado_en             timestamptz not null default now()
);

-- Cada vez que el juego sube o baja el nivel de un alumno (solo lo ve el maestro).
create table public.ajustes_nivel (
  id             bigint generated always as identity primary key,
  alumno_id      uuid not null references public.alumnos (id) on delete cascade,
  partida_id     uuid references public.partidas (id) on delete set null,
  dia            smallint,
  accion         text not null check (accion in ('sube', 'baja', 'maestro')),
  reto_antes     smallint not null, lectura_antes  smallint not null,
  reto_despues   smallint not null, lectura_despues smallint not null,
  creado_en      timestamptz not null default now()
);

-- Cartas usadas durante la partida (escudo o recurso).
create table public.cartas_usadas (
  id          bigint generated always as identity primary key,
  partida_id  uuid not null references public.partidas (id) on delete cascade,
  carta_id    text not null,                       -- 'C-radiacion'
  tema        text not null,
  tipo        text not null check (tipo in ('escudo', 'recurso')),
  dia         smallint not null,
  creado_en   timestamptz not null default now()
);

create index on public.grupos (maestro_id);
create index on public.alumnos (grupo_id);
create index on public.partidas (alumno_id);
create index on public.pasos (partida_id);
create index on public.respuestas (alumno_id, tema);
create index on public.respuestas (partida_id);
create index on public.cartas_usadas (partida_id);

-- ---------------------------------------------------------------------
-- Alta automática de maestros
-- El registro de maestro manda options.data = { rol: 'maestro', nombre: '...' }.
-- Los alumnos los crea la Edge Function (sin metadatos de rol), así que este
-- trigger no los toca.
-- ---------------------------------------------------------------------

create or replace function public.crear_perfil_maestro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'rol', '') = 'maestro' then
    insert into public.perfiles (id, rol, nombre)
    values (new.id, 'maestro', coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), 'Maestro'));
  end if;
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_maestro();

-- ---------------------------------------------------------------------
-- Funciones auxiliares para RLS (security definer evita recursión)
-- ---------------------------------------------------------------------

create or replace function public.es_maestro_de_alumno(p_alumno uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.alumnos a
    join public.grupos g on g.id = a.grupo_id
    where a.id = p_alumno and g.maestro_id = auth.uid()
  );
$$;

create or replace function public.es_dueno_de_partida(p_partida uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.partidas p where p.id = p_partida and p.alumno_id = auth.uid());
$$;

create or replace function public.grupo_del_alumno()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select grupo_id from public.alumnos where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.perfiles   enable row level security;
alter table public.grupos     enable row level security;
alter table public.alumnos    enable row level security;
alter table public.partidas   enable row level security;
alter table public.pasos      enable row level security;
alter table public.bitacora   enable row level security;
alter table public.respuestas enable row level security;
alter table public.cartas_usadas enable row level security;
alter table public.ajustes_nivel enable row level security;

-- perfiles
create policy "ver mi perfil" on public.perfiles
  for select to authenticated using (id = auth.uid());
create policy "maestro ve perfiles de sus alumnos" on public.perfiles
  for select to authenticated using (public.es_maestro_de_alumno(id));
create policy "editar mi nombre" on public.perfiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- grupos
create policy "maestro administra sus grupos" on public.grupos
  for all to authenticated using (maestro_id = auth.uid()) with check (maestro_id = auth.uid());
create policy "alumno ve su grupo" on public.grupos
  for select to authenticated using (id = public.grupo_del_alumno());

-- alumnos (los crea la Edge Function con la service role, que ignora RLS)
create policy "alumno se ve a sí mismo" on public.alumnos
  for select to authenticated using (id = auth.uid());
create policy "maestro ve a sus alumnos" on public.alumnos
  for select to authenticated using (public.es_maestro_de_alumno(id));
create policy "maestro edita a sus alumnos" on public.alumnos
  for update to authenticated using (public.es_maestro_de_alumno(id)) with check (public.es_maestro_de_alumno(id));
create policy "maestro borra a sus alumnos" on public.alumnos
  for delete to authenticated using (public.es_maestro_de_alumno(id));

-- partidas
create policy "alumno crea sus partidas" on public.partidas
  for insert to authenticated with check (alumno_id = auth.uid());
create policy "alumno ve sus partidas" on public.partidas
  for select to authenticated using (alumno_id = auth.uid());
create policy "alumno cierra sus partidas" on public.partidas
  for update to authenticated using (alumno_id = auth.uid()) with check (alumno_id = auth.uid());
create policy "maestro ve partidas de sus alumnos" on public.partidas
  for select to authenticated using (public.es_maestro_de_alumno(alumno_id));

-- pasos
create policy "alumno registra pasos" on public.pasos
  for insert to authenticated with check (public.es_dueno_de_partida(partida_id));
create policy "alumno ve sus pasos" on public.pasos
  for select to authenticated using (public.es_dueno_de_partida(partida_id));
create policy "maestro ve pasos de sus alumnos" on public.pasos
  for select to authenticated using (
    exists (select 1 from public.partidas p where p.id = partida_id and public.es_maestro_de_alumno(p.alumno_id))
  );

-- bitácora
create policy "alumno desbloquea su bitácora" on public.bitacora
  for insert to authenticated with check (alumno_id = auth.uid());
create policy "alumno lee su bitácora" on public.bitacora
  for select to authenticated using (alumno_id = auth.uid());
create policy "maestro ve bitácoras" on public.bitacora
  for select to authenticated using (public.es_maestro_de_alumno(alumno_id));

-- respuestas (no se editan: son el registro de aprendizaje)
create policy "alumno registra respuestas" on public.respuestas
  for insert to authenticated with check (alumno_id = auth.uid() and public.es_dueno_de_partida(partida_id));
create policy "alumno ve sus respuestas" on public.respuestas
  for select to authenticated using (alumno_id = auth.uid());
create policy "maestro ve respuestas de sus alumnos" on public.respuestas
  for select to authenticated using (public.es_maestro_de_alumno(alumno_id));

-- ajustes de nivel: el juego los registra con la función de abajo; el alumno no los lee
create policy "maestro ve ajustes de nivel" on public.ajustes_nivel
  for select to authenticated using (public.es_maestro_de_alumno(alumno_id));

-- El juego guarda el nivel nuevo del alumno sin darle permiso de editar el resto de su ficha.
create or replace function public.ajustar_mi_nivel(p_partida uuid, p_dia smallint, p_accion text, p_reto smallint, p_lectura smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare a public.alumnos;
begin
  if p_accion not in ('sube', 'baja') or p_reto not between 1 and 3 or p_lectura not between 1 and 3 then
    raise exception 'nivel inválido';
  end if;
  select * into a from public.alumnos where id = auth.uid();
  if not found then raise exception 'solo un alumno puede ajustar su nivel'; end if;
  if abs(p_reto - a.nivel_reto) > 1 or abs(p_lectura - a.nivel_lectura) > 1 then
    raise exception 'el nivel solo cambia de uno en uno';
  end if;
  update public.alumnos set nivel_reto = p_reto, nivel_lectura = p_lectura where id = a.id;
  insert into public.ajustes_nivel (alumno_id, partida_id, dia, accion, reto_antes, lectura_antes, reto_despues, lectura_despues)
  values (a.id, p_partida, p_dia, p_accion, a.nivel_reto, a.nivel_lectura, p_reto, p_lectura);
end;
$$;
revoke all on function public.ajustar_mi_nivel(uuid, smallint, text, smallint, smallint) from public;
grant execute on function public.ajustar_mi_nivel(uuid, smallint, text, smallint, smallint) to authenticated;

-- cartas usadas
create policy "alumno registra cartas usadas" on public.cartas_usadas
  for insert to authenticated with check (public.es_dueno_de_partida(partida_id));
create policy "alumno ve sus cartas usadas" on public.cartas_usadas
  for select to authenticated using (public.es_dueno_de_partida(partida_id));
create policy "maestro ve cartas usadas de sus alumnos" on public.cartas_usadas
  for select to authenticated using (
    exists (select 1 from public.partidas p where p.id = partida_id and public.es_maestro_de_alumno(p.alumno_id))
  );

-- ---------------------------------------------------------------------
-- Vistas para el panel del maestro (security_invoker: respetan la RLS)
-- ---------------------------------------------------------------------

-- % de decisiones correctas por alumno y tema (situaciones y averías)
create view public.v_aciertos_tema with (security_invoker = true) as
select r.alumno_id, r.tema,
       count(*)                                         as decisiones,
       count(*) filter (where r.accion_correcta)        as aciertos,
       round(100.0 * avg(r.accion_correcta::int), 1)    as pct
from public.respuestas r
where r.tipo in ('situacion', 'averia')
group by r.alumno_id, r.tema;

-- Lo que mide cada tipo de reto:
--   prediccion_pct  → entiende la causa (¿qué barra va a cambiar?)
--   accion_pct      → aplica lo que sabe (situaciones)
--   diagnostico_pct → pensamiento crítico: avería resuelta al primer intento
--   manual_pct      → retención: emparejó bien sus consejos al final
create view public.v_habilidades with (security_invoker = true) as
select r.alumno_id,
       round(100.0 * avg(r.prediccion_correcta::int) filter (where r.tipo = 'situacion'), 1) as prediccion_pct,
       round(100.0 * avg(r.accion_correcta::int)     filter (where r.tipo = 'situacion'), 1) as accion_pct,
       round(100.0 * avg(r.accion_correcta::int)     filter (where r.tipo = 'averia'), 1)    as diagnostico_pct,
       round(100.0 * sum(r.aciertos) / nullif(sum(r.total), 0), 1)                          as manual_pct
from public.respuestas r
group by r.alumno_id;

-- Retención: situaciones correctas según de dónde viene el tema
--   esta_partida   → lo vivió hace 2+ días en la misma partida
--   partida_pasada → lo vivió en otra partida (retención diferida)
--   repaso         → ya lo había fallado antes
create view public.v_retencion with (security_invoker = true) as
select r.alumno_id, r.origen,
       count(*)                                      as situaciones,
       round(100.0 * avg(r.accion_correcta::int), 1) as pct
from public.respuestas r
where r.tipo = 'situacion'
group by r.alumno_id, r.origen;

-- Progreso partida por partida
create view public.v_progreso with (security_invoker = true) as
select p.alumno_id, p.numero, p.iniciada_en, p.final, p.estrellas, p.dia_final, p.rama_ev1, p.rama_ev2,
       count(r.id) filter (where r.tipo <> 'manual')                       as retos,
       count(r.id) filter (where r.tipo <> 'manual' and r.accion_correcta) as aciertos,
       cardinality(p.cartas_manual)                                       as cartas_al_manual
from public.partidas p
left join public.respuestas r on r.partida_id = p.id
group by p.id;

-- Temas cuyo último reto falló y que el alumno todavía no ha resuelto después
create view public.v_repasos_pendientes with (security_invoker = true) as
select distinct on (r.alumno_id, r.tema)
       r.alumno_id, r.tema, r.reto_id, r.creado_en as fallado_en
from public.respuestas r
where r.tipo in ('situacion', 'averia') and not r.accion_correcta
  and not exists (
    select 1 from public.respuestas r2
    where r2.alumno_id = r.alumno_id and r2.tema = r.tema
      and r2.tipo in ('situacion', 'averia') and r2.accion_correcta and r2.creado_en > r.creado_en
  )
order by r.alumno_id, r.tema, r.creado_en desc;

-- Resumen del grupo por tema (para el mapa de calor)
create view public.v_grupo_tema with (security_invoker = true) as
select a.grupo_id, r.tema,
       count(distinct r.alumno_id)                   as alumnos,
       count(*)                                      as decisiones,
       round(100.0 * avg(r.accion_correcta::int), 1) as pct
from public.respuestas r
join public.alumnos a on a.id = r.alumno_id
where r.tipo in ('situacion', 'averia')
group by a.grupo_id, r.tema;

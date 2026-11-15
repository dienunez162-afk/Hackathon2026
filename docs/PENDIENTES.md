# Pendientes de G-NOSIS

Revisada el 15 de noviembre de 2026 (rama `correcciones-pendientes`). Probado en local y en `gnosis-kappa.vercel.app`: JUGAR arranca y varias misiones seguidas en modo automático 4× terminan sin errores en consola.

## Solo Diego puede hacerlo (Supabase)
Estado del proyecto `tsidieehhdwspeomdixs` el 15-nov: las tablas de `0001` ya existen; **faltan `0002` y `0004`** (no existen `solicitudes_clase`, `v_records` ni las funciones `buscar_clase`, `pedir_unirme`, `registrar_partida`, `borrar_mi_cuenta`) y **«Confirm email» sigue activado**. Los SQL están listos en `supabase/migrations/` (copia con instrucciones en `space apps/supabase-sql/`).
- [ ] Correr `0002_cuentas_y_clases.sql` y `0004_borrar_cuenta.sql` en el SQL Editor, en ese orden.
- [ ] Authentication > Providers > Email: **desactivar «Confirm email»** (el correo del alias es inventado; con esto activado nadie puede crear cuenta).
- [ ] Poner en Vercel `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `DOMINIO_ALUMNOS`, y hacer redeploy (hoy `public/js/config.js` sale vacío en producción: el menú ☰ dice «cuentas no activas»).
- [ ] Probar que Supabase acepta el dominio `alumnos.g-nosis.local`; si lo rechaza, usar uno propio.
- [ ] Crear un maestro y un grupo de prueba (`0003_datos_de_prueba.sql`) y pasarme el código de la clase.

## Código que sigue pendiente (depende de lo de arriba)
- [ ] **Probar con cuentas reales** el registro, el inicio de sesión, pedir unirse, borrar cuenta y que las reglas de acceso (RLS) impidan leer datos de otros.
- [ ] **Panel del maestro**: aceptar o rechazar solicitudes (`resolver_solicitud`), crear grupos y mostrar el código. Hoy solo existe la maqueta `diseno/panel-maestro`.
- [ ] Guardar también `respuestas` y `pasos` (hoy se guarda solo el resumen de la partida) para que el panel tenga datos de aprendizaje.
- [ ] Restablecer la contraseña de un alumno desde el panel (Edge Function): sin correo no hay otra forma.

## Necesita personas (no se puede automatizar)
- [ ] **Prueba a mano con dedo y mouse**, sobre todo «limpiar el panel» (arrastrar) y el laberinto en tablet. Solo se probó en modo automático y con el navegador emulando celular.
- [ ] **Escuchar la música** y confirmar volumen y estilo.
- [ ] **Grabar los efectos de sonido** que faltan (lista en el README, sección «Efectos de sonido»).
- [ ] **Probar la dificultad con niños.** El balance sale del simulador (`balance` en el grafo).
- [ ] **Revisión de un docente** de las preguntas y los informes. Ayuda previa: hay una prueba automática de lectura; las 3 frases más largas (26 palabras) son `RA1-falta` y `RA2-crater` (lectura) y el informe `F1-D4`.
- [ ] **Verificar con NASA** los datos marcados TODO en `docs/banco-preguntas.md` (CME, hielo lunar, naves de carga, micrometeoritos, Skylab).
- [ ] **Space Apps: qué hay que entregar.** No pude abrir la página de requisitos de entrega (video, descripción, plazos). Hay que revisarla en https://www.spaceappschallenge.org/2026/local-events/monterrey/ . El texto oficial del reto 3 sí se leyó: pide un juego donde se administre una base lunar o marciana con compromisos reales entre soporte vital, protección contra la radiación, energía y alimentos.
- [ ] **Aviso de privacidad** (`public/privacidad.html`): es un borrador. Alguien responsable debe revisarlo y poner el nombre y contacto de quien administra los datos antes de abrirlo a grupos.
- [ ] Elegir 2-3 diferenciadores para la demo (ver `docs/propuestas-diferenciadores.docx`).

## Hecho
- [x] **Herramientas del equipo ocultas.** Solo salen con `?equipo=1` (o `?auto=1`, `?final=...`).
- [x] **Celulares.** En vertical aparece «Gira tu dispositivo para jugar»; en horizontal el juego se escala y se lee.
- [x] **Aviso de privacidad y consentimiento.** Página `privacidad.html`, casilla «un adulto leyó el aviso» al crear cuenta, enlace en el menú ☰ y botón «Borrar mi cuenta» (`0004_borrar_cuenta.sql`).
- [x] **Voz en off visible.** El narrador está activo por defecto y se controla desde el menú de pausa, con selector de voz (Diego, PR #11 y #12).
- [x] **Minijuego del día 12 (E-D12a).** El grafo y los textos (español e inglés) ya dicen «atrapar con la plataforma las piezas que se caen».
- [x] **Rebalanceo con las preguntas del banco.** El simulador ahora modela las llamadas de pregunta con pista y costo por error. Las evacuaciones casi no cambian (±2 puntos) y las 3 estrellas bajan un poco; tabla nueva en `balance` del grafo.
- [x] **Edge Function `crear-alumno` retirada** (flujo antiguo que choca con el alias único).
- [x] **Preguntas omitidas por error** (bug introducido el 15-nov por una guarda mía en `preguntar`, corregido por Diego en `b6ea8c0`): prueba nueva que impide que `preguntar` valide con el esquema del banco.
- [x] **Revisión de lectura**: pruebas automáticas (frases de hasta 28 palabras; nivel 1 con enunciados y opciones cortos).
- [x] **Cuentas, récords y clases con código** (menú ☰ en el menú principal, `cuenta.js`, migración `0002`). Falta activarlo en Supabase.
- [x] **APIs en Vercel.** `/api/donki` (CCMC), `/api/radlab` y `/api/osdr` responden con datos reales.
- [x] **JUGAR / `elegir` duplicada**, guardas contra preguntas inválidas y pruebas del banco.
- [x] Menú de pausa, Laika, escena ajustada a la franja, pantalla completa 16:9, preguntas ligadas a la lectura e inglés (PRs de Diego).
- [x] Cuadros de texto pixel art según la tensión, sprites del HUD, bitácora, música por escenario, finales con «lo que aprendiste».
- [x] **Dificultad.** Ya se puede perder: tabla completa en `balance` del grafo.

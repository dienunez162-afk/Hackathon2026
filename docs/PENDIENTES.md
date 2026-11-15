# Pendientes de G-NOSIS

Revisada el 15 de noviembre de 2026 (rama `correcciones-pendientes`). Probado en local y en `gnosis-kappa.vercel.app`: JUGAR arranca y varias misiones seguidas en modo automático 4× terminan sin errores en consola.

## Solo Diego puede hacerlo (Supabase)
- [ ] **Correr `supabase/migrations/0006_panel_maestro.sql`** en el SQL Editor (copia en `space apps/supabase-sql/`). Hasta entonces: no se guardan las **preguntas del banco** en `respuestas` (el juego guarda las llamadas, averías y el manual), y en el panel del maestro no funcionan **Restablecer contraseña** y **Quitar de la clase** (avisa que falta la migración). Trae también el límite de intentos con códigos de clase.
- [ ] Borrar en Authentication > Users el maestro de prueba `maestro.prueba.claude@example.com` y los alumnos ficticios (`cometa`, `nebulosa`, `orion`, `vega`, `lira`, `andromeda`, `sirio`, `pleyade`, `kepler`, `halley`, `selene`, `tycho`) cuando ya no se necesiten para enseñar el panel. Los alumnos se borran solos con `DEMO_CLAVE=... node herramientas/sembrar-demo.mjs --limpiar` (después hay que borrar a mano el maestro).
- [ ] Crear el maestro y el grupo reales (el panel permite crear grupos; el maestro se registra en `maestro.html`).
- [ ] En Supabase: activar la protección de contraseñas filtradas y un límite de registros por hora.

## Código que sigue pendiente
- [ ] Probar en el panel, con la migración 0006 corrida, **Restablecer contraseña** y **Quitar de la clase** (hoy solo se comprobó que avisan bien cuando falta).
- [ ] El panel del maestro es solo en español.
- [ ] Un maestro puede registrarse sin verificar que lo sea (cualquiera puede crear una cuenta de maestro; solo verá a quien lo acepte). Valorar una lista de correos permitidos.
- [ ] «Un dato que cambia el día»: falta mostrarlo también en la tarjeta final de la misión y volver a correr el simulador de balance con los +3/+6 de radiación (máximo 3 días por misión).

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
- [x] **Panel del maestro real** (`public/maestro.html`, basado en la maqueta): registro y entrada del maestro, grupos con código, solicitudes (aceptar/rechazar), resumen del grupo, aprendizaje partida a partida, temas para reforzar con actividades, matriz alumno × tema, detalle por alumno (nivel, partidas, métricas, repasos pendientes), nivel inicial, restablecer contraseña y quitar de la clase. Enlace desde el menú ☰ del juego.
- [x] **Datos ficticios para enseñarlo**: `herramientas/sembrar-demo.mjs` (maestra «Maestra Ortiz (ficticia)», grupo «4.º B (ficticio)», 10 alumnos con 3 a 6 partidas y 2 solicitudes pendientes).
- [x] **Respuestas y pasos guardados** al terminar cada misión (llamadas, averías, preguntas del banco, manual, nodos visitados y cartas del manual).
- [x] **Costo de cada acción según el nivel** (números en nivel 1, flechas en nivel 2, nada en nivel 3) en decisiones y minijuegos; no en las preguntas de las llamadas, porque darían la respuesta.
- [x] **Prueba de humo automática** (`npm run humo`, también en GitHub Actions): menú, tutorial con clics reales y una misión completa. Se comprobó que detecta el bug de las preguntas omitidas.
- [x] **Auditoría de idioma** (`npm run idioma`): juega en inglés y avisa de todo texto que siga en español.
- [x] **Un dato que cambia el día**: cada día del juego es un día real de la NASA; aviso «El Sol hoy» en el menú ☰, línea en el HUD y +3/+6 de radiación en días de llamarada M/X (máximo 3 por misión).
- [x] **Bugs del documento de pendientes** (capturas del PDF): texto de las barras sobre los juegos (z-index), minijuego del clima espacial con gráfica y sin regalar la respuesta, «eyección de masa coronal» simplificado, y la mezcla español/inglés (pistas de averías, frases con «;», diccionario de la bitácora, datos de la NASA, textos partidos por el diccionario).
- [x] **Detalles de estilo**: casilla y cuadros de confirmación con el arte del juego; aviso de privacidad con el look del juego y al día.
- [x] **Producción probada de punta a punta** (15-nov, commit 68bd82d): el menú ☰ MENÚ sale en `gnosis-kappa.vercel.app`, inicio de sesión con alias, récords, borrar cuenta y que las funciones no se puedan llamar sin sesión.
- [x] **Menú ☰ MENÚ arriba a la derecha del inicio**, desplegable, con el idioma (español/inglés) y la cuenta dentro. Usa el mismo arte que el resto del juego (etiqueta, panel pixel y botones `.op`), se escala con la pantalla, está en español e inglés y desaparece al empezar a jugar. El aviso de sonido se corre a su izquierda.
- [x] **Supabase probado de punta a punta** (15-nov): cuenta de alumno, sesión en el juego (también tras refrescar), partidas y récords (la misión guardada desde el juego sube el contador), maestro con grupo y código, solicitud pendiente, aceptación, visibilidad del maestro solo tras aceptar y tras salir de la clase, un alumno no ve ni escribe datos de otro, errores de alias en español. Para probar el guardado jugando en automático: `?auto=1&vel=4&guardar=1`.
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

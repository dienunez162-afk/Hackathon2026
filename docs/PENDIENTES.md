# Pendientes de G-NOSIS

Revisada el 15 de noviembre de 2026 (rama `correcciones-pendientes`). Probado en local y en `gnosis-kappa.vercel.app`: JUGAR arranca y varias misiones seguidas en modo automático 4× terminan sin errores en consola.

## Solo Diego puede hacerlo (Supabase)
Estado del proyecto `tsidieehhdwspeomdixs` el 15-nov (probado de punta a punta): **ya funciona** el registro con alias, el inicio de sesión desde el juego, guardar partidas, los récords, pedir unirse a una clase, aceptar al alumno y que el maestro vea o deje de ver sus partidas, y el aislamiento entre alumnos. «Confirm email» ya está desactivado y Supabase acepta el dominio `alumnos.g-nosis.local`. Falta:
- [ ] Correr `0004_borrar_cuenta.sql` y luego `0005_permisos_funciones.sql` (comprobado hoy: ninguno de los dos está corrido; el botón «Borrar mi cuenta» no funciona hasta el 0004).
- [ ] **Subir esta rama a main** y poner en Vercel `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `DOMINIO_ALUMNOS` (los valores están en `space apps/supabase-sql/LEEME.md`); luego redeploy. Hoy producción corre un `main` sin el menú de cuentas y sin `config.js`.
- [ ] **Borrar las cuentas de prueba** que dejé en el proyecto (Authentication > Users): alumnos `prueba_claude_090534` (3 partidas, pidió unirse a la clase E30F48), `prueba_b_090936`; maestro `maestro.prueba.claude@example.com` y su grupo «4B prueba». Con el 0004 corrido, el alumno se puede borrar desde el juego (contraseña de prueba `Prueba-123456`).
- [ ] Crear el maestro y el grupo reales (`0003_datos_de_prueba.sql` sirve de plantilla).

## Código que sigue pendiente
- [ ] **Panel del maestro**: aceptar o rechazar solicitudes (`resolver_solicitud`), crear grupos y mostrar el código. Hoy solo existe la maqueta `diseno/panel-maestro`. Las funciones y los permisos ya están probados.
- [ ] Guardar también `respuestas` y `pasos` (hoy se guarda solo el resumen de la partida) para que el panel tenga datos de aprendizaje.
- [ ] Restablecer la contraseña de un alumno desde el panel (Edge Function): sin correo no hay otra forma.
- [ ] Limitar los intentos al escribir un código de clase (hoy se puede probar muchas veces) y activar protección de contraseñas filtradas y límite de registros en Supabase.

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

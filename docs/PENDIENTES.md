# Pendientes de G-NOSIS

Lista revisada el 15 de noviembre de 2026, después de probar `gnosis-kappa.vercel.app` (commit 0d4af7c): JUGAR arranca y dos misiones seguidas en modo automático 4× terminaron sin errores en consola.

## Antes de enseñarlo o entregarlo
- [ ] **Ocultar las herramientas del equipo.** Hoy cualquier niño puede abrirlas, ver los niveles o activar el modo automático. Mostrarlas solo con un parámetro como `?equipo=1`.
- [ ] **Celulares.** El HUD está pensado para pantalla de computadora o tablet. En un celular en vertical el texto se encoge y no se lee.
- [ ] **Prueba a mano.** Solo se probó en modo automático. Alguien tiene que jugar cada minijuego con mouse y con dedo, sobre todo "limpiar el panel" (arrastrar) y el laberinto en tablet.

## Lo que todavía no existe (para vender a escuelas)
- [ ] **Modo Salón de verdad.** Hoy el progreso solo se guarda en el dispositivo. Faltan:
  - el inicio de sesión del alumno con alias y código;
  - conectar el juego a Supabase;
  - el panel del maestro funcionando (ahora es una maqueta en `diseno/panel-maestro`);
  - probar `supabase/migrations/0001_mision_lunar.sql`, que nunca se ha corrido en una base real.
- [ ] **Aviso de privacidad.** Es obligatorio en cuanto se guarden datos de niños en Supabase.

## Supabase: cuentas, récords y clases (rama `supabase-cuentas-salon`)
Decisiones tomadas el 15-nov: cuenta del niño con **alias + contraseña, sin correo**; para entrar a una clase el niño escribe el código y **el maestro lo aprueba**; récords personales = estrellas, estado final de las barras y respuestas a la primera.
- [x] Menú hamburguesa en el menú principal (`public/js/cuenta.js`): crear cuenta, entrar, ver récords, pedir unirse a una clase. Funciona sin llaves (avisa que las cuentas no están activas).
- [x] Migración `supabase/migrations/0002_cuentas_y_clases.sql` (borrador, **nunca se ha corrido**): alumno sin grupo, alias único, solicitudes de clase, funciones `buscar_clase`, `pedir_unirme`, `resolver_solicitud`, `salir_de_clase`, `registrar_partida` y la vista `v_records`.
- [x] Al terminar una misión en modo manual con sesión iniciada se guarda la partida (si no hay red, queda en cola y se reintenta).
- [ ] **Crear el proyecto de Supabase** y correr 0001 y 0002 en orden. Ahí: Authentication > Providers > Email > **desactivar «Confirm email»** (el correo del alias es inventado).
- [ ] Poner en Vercel `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `DOMINIO_ALUMNOS` (el build genera `public/js/config.js`). La service role key nunca va al navegador.
- [ ] Probar con dos cuentas reales: que el alias repetido falle bien, que el maestro solo vea a quien aceptó y que el niño no lea datos de otros (RLS).
- [ ] **Panel del maestro**: aceptar o rechazar solicitudes (`resolver_solicitud`), crear grupos y mostrar el código. Hoy es solo la maqueta en `diseno/panel-maestro`.
- [ ] Guardar también `respuestas` y `pasos` (hoy solo se guarda el resumen de la partida) para que el panel tenga datos de aprendizaje.
- [ ] Restablecer contraseña de un alumno desde el panel (Edge Function). Sin correo no hay otra forma.
- [ ] La Edge Function `crear-alumno` (flujo antiguo) choca con el alias único global; retirarla o adaptarla.
- [ ] Aviso de privacidad y consentimiento de padres antes de abrirlo a niños. Los récords los manda el navegador, así que un niño con conocimientos podría falsearlos: aceptable mientras no haya tablas de posiciones.

## Contenido (opcional)
- [ ] **Voz en off para el niño.** Hoy solo se activa desde las herramientas del equipo. Ayudaría a 1° y 2° como botón visible.
- [ ] **Minijuego del día 12 (E-D12a).** El grafo dice "mantener tres soportes en equilibrio", pero el juego usa "atrapar piezas".

- [ ] **Escuchar la música nueva** y decir si el volumen y el estilo les gustan (no se pudo oír en las pruebas).
- [ ] **Probar la dificultad con niños.** El balance sale del simulador; hay que ver si con niños reales se siente justo.

- [ ] **Grabar los efectos de sonido** que faltan (lista en el README, sección "Efectos de sonido"). Ya están `limpiar-panel` y `cable-conectar`.

- [ ] **Rebalancear con las llamadas nuevas.** Ahora hay ~6 llamadas con costo por error; el simulador (`herramientas/simulador-mision.js`) todavía no las modela, así que la tabla de evacuación del balance es de antes.
- [ ] **Revisar con un docente las 16 preguntas** y los textos de las situaciones (lenguaje para 7-12 años).

## Diferenciadores (ver propuesta en la conversación del 15-nov)
- [ ] Elegir 2-3 para la demo: confianza antes de responder, "Explícaselo a Laika", repaso espaciado entre misiones, misiones cortas de 3 minutos, modo accesibilidad.

## Para Space Apps
- [ ] Revisar en la página del reto qué piden exactamente (normalmente un video corto de demo, la descripción del proyecto y qué datos de la NASA se usan). La tabla de APIs del README sirve para esto último.

## Hecho
- [x] **APIs en Vercel.** `/api/donki` (CCMC), `/api/radlab` y `/api/osdr` responden con datos reales (comprobado el 15-nov).
- [x] **JUGAR / `elegir` duplicada.** Diego renombró la función de preguntas a `elegirRespuesta`; se añadieron guardas (`elegirRespuesta` y `preguntar` omiten una pregunta inválida y lo registran en consola), `validarPregunta` más estricta y pruebas: todo el banco (≥3 opciones, índice válido) y que `juego.js` no repita nombres de función.
- [x] **Partida completa en Vercel** (modo automático 4×, navegador sin datos): dos misiones seguidas, sin errores.
- [x] **Menú de pausa, Laika, escena ajustada a la franja, pantalla completa 16:9, preguntas ligadas a la lectura** (PRs 4-10 de Diego).
- [x] **Pendientes del equipo (PDF).** Menú de cartas retráctil, "Así se juega" con demo animada antes de cada minijuego, sin la tira de días y barras sin rayitas en los segmentos apagados.
- [x] **Cuadros de texto pixel art** con colores según la tensión (normal, llamada, alerta, catástrofe).
- [x] **Bitácora en 0 / HUD encimado**: era el caché del navegador (index.html nuevo con juego.js viejo). Ahora los scripts llevan versión y se revalidan.
- [x] **Preguntas**: llamadas cada 2-3 días, situación en pasos (predice en dos pasos, evidencia, actúa), banco de 16 preguntas en 3 niveles, consulta la bitácora, repaso, costo por error, avería con causa y reparación, Mensaje de la Tierra por situación, medidor sin colores, manual con porqué.
- [x] **Sprites del HUD.** Barras de 10 segmentos, panel de día con luna de noche, botón de bitácora y retratos que hablan.
- [x] **Bitácora.** Cartas, informes, datos reales de la NASA y lo aprendido; se guarda entre misiones.
- [x] **Dificultad.** Ya se puede perder: con 50% de habilidad, 30% de las partidas terminan en evacuación (antes 5%). Tabla completa en `balance` de `datos/grafo-mision-lunar.json`.
- [x] **Finales.** Corte al invernadero apagado en "Despensa vacía", compuerta del refugio abierta en "Radiación", el capitán en la litera en "Capitán agotado" y la tarjeta "Lo que aprendiste" en los 7 finales.
- [x] Juego completo en `public/` (intro, 8 escenarios, 12 minijuegos, llamadas, averías, cartas, manual y dificultad adaptativa).
- [x] APIs conectadas: DONKI, RadLab (CRaTER) y OSDR, con copia guardada si no hay conexión.
- [x] Desplegado en Vercel por el dueño del repo.
- [x] **Música.** Soundtrack en la intro; en la base, acordes sostenidos sin ritmo; `alarma-emergencia.mp3` en eventos fuertes y averías; `final-bueno.mp3` y `final-malo.mp3` en los finales.

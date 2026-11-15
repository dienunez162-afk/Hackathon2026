# Pendientes de G-NOSIS

Lista revisada el 15 de noviembre de 2026, después del primer despliegue en Vercel.

## Revisar en Vercel (5 minutos)
- [ ] **Llave de la NASA.** Abrir `/api/donki` en el dominio de Vercel. Si responde 502, poner `NASA_API_KEY` en Settings → Environment Variables y volver a desplegar. Sin la llave, el pronóstico usa datos de muestra.
- [ ] **Las otras dos APIs.** `/api/radlab` y `/api/osdr` deben responder con datos. En "herramientas del equipo", la línea "Datos" debe decir `real` en las tres.

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

## Contenido (opcional)
- [ ] **Voz en off para el niño.** Hoy solo se activa desde las herramientas del equipo. Ayudaría a 1° y 2° como botón visible.
- [ ] **Minijuego del día 12 (E-D12a).** El grafo dice "mantener tres soportes en equilibrio", pero el juego usa "atrapar piezas".

- [ ] **Escuchar la música nueva** y decir si el volumen y el estilo les gustan (no se pudo oír en las pruebas).
- [ ] **Probar la dificultad con niños.** El balance sale del simulador; hay que ver si con niños reales se siente justo.

## Para Space Apps
- [ ] Revisar en la página del reto qué piden exactamente (normalmente un video corto de demo, la descripción del proyecto y qué datos de la NASA se usan). La tabla de APIs del README sirve para esto último.

## Hecho
- [x] **Dificultad.** Ya se puede perder: con 50% de habilidad, 30% de las partidas terminan en evacuación (antes 5%). Tabla completa en `balance` de `datos/grafo-mision-lunar.json`.
- [x] **Finales.** Corte al invernadero apagado en "Despensa vacía", compuerta del refugio abierta en "Radiación", el capitán en la litera en "Capitán agotado" y la tarjeta "Lo que aprendiste" en los 7 finales.
- [x] Juego completo en `public/` (intro, 8 escenarios, 12 minijuegos, llamadas, averías, cartas, manual y dificultad adaptativa).
- [x] APIs conectadas: DONKI, RadLab (CRaTER) y OSDR, con copia guardada si no hay conexión.
- [x] Desplegado en Vercel por el dueño del repo.
- [x] **Música.** Soundtrack en la intro; en la base, acordes sostenidos sin ritmo; `alarma-emergencia.mp3` en eventos fuertes y averías; `final-bueno.mp3` y `final-malo.mp3` en los finales.

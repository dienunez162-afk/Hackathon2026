# G-NOSIS

Juego educativo de supervivencia en una base lunar durante 14 días, para niños de 7 a 12 años (NASA Space Apps 2026 Monterrey). Está escrito en HTML, CSS y JavaScript sin build: el arte ASCII de la intro y los finales, 8 escenarios, 12 minijuegos, llamadas, averías, cartas, el manual del capitán y una dificultad que se ajusta sola.

## Correr en local
```
npm run dev          # genera public/js/datos.js y sirve public/ + las funciones de /api en http://localhost:3000 (sin dependencias)
npm run dev:vercel   # igual, pero con las funciones de /api (requiere: npm i -g vercel)
npm run check        # revisa la sintaxis de todo
```
Parámetros de prueba: `?auto=1&vel=4` juega solo; `?final=apagon` abre un final.

## Caché del navegador
`vercel.json` pide revalidar `js/` e `img/` en cada visita, y el build (`scripts/generar-datos.mjs`) le pone la versión del despliegue a cada script (`js/juego.js?v=…`). Antes, el navegador guardaba `js/` una hora y mezclaba un `index.html` nuevo con un `juego.js` viejo: eso dejaba la bitácora en 0 y encimaba el HUD.

## Desplegar en Vercel
1. El dueño del repo (dienunez162-afk) entra a vercel.com/new, conecta su GitHub e importa Hackathon2026 (o lo agrega al equipo DAW). Solo el dueño puede darle a Vercel acceso al repo. `vercel.json` ya define el build (`node scripts/generar-datos.mjs`) y la carpeta `public`.
2. En Settings > Environment Variables, pon las variables de `.env.example`.

## APIs de la NASA
El navegador llama a `/api/*` (funciones de Vercel) y nunca directo a la NASA. Las llaves, si las hay, solo viven en variables de entorno.

| Ruta | Fuente | Llave | Uso en el juego |
|---|---|---|---|
| `/api/donki` | [DONKI](https://ccmc.gsfc.nasa.gov/DONKI-API/get/) de NASA CCMC (llamaradas FLR, CME, tormentas geomagnéticas GST) | No necesita (si CCMC falla, usa api.nasa.gov con `NASA_API_KEY`) | Pronóstico del día 5 y probabilidad de la tormenta sorpresa (N-D12b) |
| `/api/radlab` | [RadLab](https://visualization.osdr.nasa.gov/radlab/) · CRaTER del LRO | No necesita | Gráfica de radiación del día 4, con 7 días reales |
| `/api/osdr` | [OSDR](https://osdr.nasa.gov) (estudios biológicos) | No necesita | Estudio real de plantas en el informe del invernadero |

Notas (noviembre de 2026):
- DONKI se lee directo de `ccmc.gsfc.nasa.gov/DONKI-API/get/`, que no pide llave y sí trae las llamaradas (FLR). api.nasa.gov queda solo de respaldo.
- CRaTER en RadLab tiene datos hasta junio de 2024. Por eso se usa mayo-junio de 2024 (`RADLAB_DESDE` / `RADLAB_HASTA`), que incluye las tormentas solares de mayo de 2024.
- Si una API falla, `public/js/apis.js` usa una copia guardada de datos reales (RadLab, OSDR) o una muestra (DONKI), y el juego sigue.

## Estructura
- `public/`: el juego (index.html, js/, audio/)
  - `js/juego.js`: flujo de la partida, HUD, plano y finales
  - `js/minijuegos.js`: los 12 minijuegos
  - `js/escenas.js`: los escenarios ASCII
  - `js/finales.js`, `luna.js`, `espacio.js`, `nave.js`, `musica.js`: el arte original
- `datos/`: el grafo y los retos (JSON). Edítalos aquí y corre `npm run datos`.
- `api/`: funciones serverless.
- `supabase/`: esquema y función para el modo Salón y el panel del maestro (sin probar).
- `herramientas/simulador-mision.js`: simulador para balancear.

## Música
| Archivo | Cuándo suena |
|---|---|
| `public/audio/soundtrack.mp3` | Intro: menú y alunizaje |
| `public/js/musica-base.js` (generada) | Dentro de la base: acordes sostenidos, sin ritmo; de noche en tono menor |
| `public/audio/alarma-emergencia.mp3` | Eventos fuertes (tormentas solares, micrometeoritos, sismo fuerte, calefacción rota) y averías; se repite mientras dure |
| `public/audio/final-bueno.mp3` | Finales con relevo (1, 2 o 3 estrellas), durante la cinemática y el manual |
| `public/audio/final-malo.mp3` | Finales con evacuación |

La música de fondo se genera en el navegador con Web Audio (original, sin licencias externas). Las pistas mp3 son del equipo. Para cambiar qué eventos ponen la alarma, edita `peligroDe()` en `public/js/juego.js`.

## Sprites del HUD
Los originales están en `diseno/sprites/`. `herramientas/recortar-sprites.ps1` les quita el fondo, los recorta a PNG en `public/img/hud/` y mide en `sprites.json` dónde va cada segmento de las barras y el número del día. Si cambian una imagen, vuelvan a correrlo (PowerShell de Windows, sin instalar nada).

| Sprite | Uso |
|---|---|
| `barra-salud / comida / energia / radiacion.png` | Barras de 10 segmentos; cada segmento vale 10 puntos; parpadean en rojo |
| `barra-*-vacia.png` | La misma barra con los segmentos apagados. El HUD la pone debajo y recorta la llena justo en el hueco entre segmentos. Se crea con `python herramientas/barras-vacias.py` |
| `panel-dia.png` | Día de la misión; de noche (días 11-14) el sol cambia por una luna. Es el único indicador de día (se quitó la tira de días 0-14, que repetía lo mismo) |
| `bitacora-icono.png` | Botón de la bitácora, con contador de cosas nuevas |
| `bitacora-libro.png` | Fondo de la bitácora abierta |
| `img/personajes/cientifica.jpg`, `control-mision.jpg` | Retratos de la Dra. Ortiz y Control de Misión; alternan los dos cuadros mientras hablan |

## Llamadas y preguntas
`datos/preguntas-mision-lunar.json` + `public/js/preguntas.js` (lógica sin pantalla, probada con `npm test`).
- **Una llamada cada 2 o 3 días** (días 2 a 13). Se alternan:
  - **Situación** (sin dar la respuesta): 1) predice qué barra cambia primero y cuál después; 2) ¿qué dato lo prueba?; 3) actúa; 4) mira qué pasó + informe de Control (se guarda en la bitácora).
  - **Pregunta del banco** (esquema `{ id, nivel, tipo, enunciado, opciones, indiceCorrecto, fraseEvidencia, explicacion, fuente }` + `tema` y `barra`), elegida según el nivel del niño y de temas que ya leyó.
  - **Consulta la bitácora** (una por partida): la respuesta está en «Datos NASA» (la llamarada más fuerte o la peor tormenta de RadLab).
- **Repaso**: al empezar una misión nueva, una pregunta sobre algo guardado en «Lo aprendido».
- **Costo por error**: la barra del tema baja 3 / 5 / 8 puntos (nivel 1 / 2 / 3), nunca por debajo de 10 (ni la radiación arriba de 90) por una pregunta.
- **Avería**: pistas con irrelevantes; pide la causa y luego la reparación, 2 intentos cada una; cada error cuesta y al final se explica por qué pasó.
- **Mensaje de la Tierra**: una situación y eliges la carta (sin ver su descripción); los distractores son cartas de la misma barra.
- **Medidor de radiación**: sin colores; cada barra dice "xN" de un día normal; pregunta de tendencia si hubo días altos y hoy bajó.
- **Manual**: 2 cartas recomendadas y el porqué.
- **Informes**: se muestran siempre (son la evidencia de las preguntas).

## Cuadros de texto, eventos y misiones
El cuadro de texto (`#consola`), la ventana de minijuegos (`#mj`) y los avisos usan sprites pixel art con el mismo estilo que las barras: marco biselado, pantalla hundida, tornillos y las rayas "//". Se dibujan con `border-image` (9-slice), así que se estiran a cualquier tamaño sin deformar las esquinas.

El color cambia según la tensión del momento. `pantalla()` en `public/js/juego.js` elige el tema y la ventana del minijuego lo hereda:

| Tema | Color | Cuándo |
|---|---|---|
| `tema-normal` | Lavanda, rayas naranjas | Llegada, tareas, decisiones, cartas, manual |
| `tema-llamada` | Turquesa, ondas de radio | Llamadas, misiones y reportes de Control de Misión (calma) |
| `tema-alerta` | Ámbar | Eventos sin alarma (polvo, moho, noche...) |
| `tema-catastrofe` | Rojo con franjas de peligro, el marco late | Eventos con alarma (tormentas, micrometeoritos, sismo fuerte), averías y evacuación |

- Sprites del juego (a 2x): `public/img/dialogo/` (`panel-<tema>.png`, `etiqueta-<tema>.png`, `boton*.png`).
- Kit para reutilizar fuera del juego (1x y 4x, demo, CSS y ayuda para canvas): `diseno/dialogo/`. Abre `diseno/dialogo/demo.html`.
- Para cambiar colores o crear un tema: edita `TEMAS` en `herramientas/generar-sprites-dialogo.py` y corre `python herramientas/generar-sprites-dialogo.py` (requiere `pip install pillow`).

## Cartas y minijuegos en pantalla
- **Cartas:** el botón `CARTAS n / 10` (arriba a la derecha) abre y cierra el panel. Se cierra con ✕, con Esc o tocando fuera. Brilla cuando llega una carta nueva y avisa "ESCUDO LISTO" si hay un escudo armado.
- **Minijuegos:** antes de empezar se muestra "Así se juega": 2 o 3 pasos cortos y una demo animada (`public/img/minijuegos/<tipo>.gif`) donde una manita juega una ronda. El tiempo corre solo después de tocar "¡Empezar!" (o Enter). Los textos están en `COMO_SE_JUEGA` de `public/js/juego.js`; las demos se generan con `python herramientas/generar-demos-minijuegos.py`.

## Bitácora
`public/js/bitacora.js`. Se llena sola y se guarda entre misiones (en el dispositivo):
- **Cartas:** las 10, con su frase, para qué sirve, cuándo usarla y dónde se leyó.
- **Informes:** lo que contó cada evento, con su fuente.
- **Datos NASA:** llamaradas, CME y tormentas reales de DONKI (30 días), la radiación real de CRaTER (RadLab) y estudios reales de OSDR con enlace.
- **Lo aprendido:** las explicaciones de Control de Misión (llamadas) y de la Dra. Ortiz (averías).

## Efectos de sonido
`public/js/sfx.js`. Si el efecto tiene archivo, suena `public/audio/sfx/<nombre>.mp3`; si no, suena uno corto provisional generado en código. Para poner el suyo: guarden el mp3 con ese nombre en `public/audio/sfx/` y agreguen el nombre a `ARCHIVOS` en `sfx.js`.

| Nombre | Dónde suena | Archivo |
|---|---|---|
| `limpiar-panel` | Limpiar el polvo de los paneles: en bucle mientras se arrastra | ✅ del equipo |
| `rayon` | Limpiar: pasar dos veces y rayar el panel | provisional |
| `cable-conectar` | Cables: conexión correcta (el archivo trae 4 tomas; se usa una distinta cada vez) | ✅ del equipo |
| `atrapar` / `caer` | Atrapar cajas o piezas / se cae una | provisional |
| `paso` | Laberinto al refugio: cada paso | provisional |
| `tapar` / `fuga-aire` | Tapar agujeros / se escapa el aire | provisional |
| `perilla` | Ajustar temperatura o alinear la nave | provisional |
| `encontrar` | Buscar plantas enfermas, lechugas o la fuga | provisional |
| `rover-mover` / `radar` | Rover en el cráter | provisional |
| `interruptor` | Repartir la energía de noche | provisional |
| `acierto` / `error` | Secuencias, preguntas de la Tierra, llamadas y averías | provisional |
| `gano` / `perdio` | Al terminar cualquier minijuego | provisional |
| `llamada` | Llamada entrante de Control de Misión | provisional |
| `carta-nueva` | Se descubre una carta | provisional |

## Privacidad
En modo Libre el progreso se guarda solo en el dispositivo (`localStorage`). En modo Salón, los alumnos usan un alias y un código, sin correo.

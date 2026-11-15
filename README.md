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

## Supabase (cuentas, clases y panel del maestro)
- **Base lista:** migraciones `supabase/migrations/0001` y `0002` corridas en el proyecto; «Confirm email» desactivado (el correo de los niños es inventado: `<alias>@alumnos.g-nosis.local`).
- **Niños:** en el menú principal, «Mi cuenta» (debajo del idioma): crear cuenta con alias + contraseña (sin correo ni nombre real), entrar, poner el código de su clase y pedir entrar, ver sus récords. Sin cuenta se juega igual (todo queda en el dispositivo).
- **Qué se guarda con cuenta:** el nivel (se usa en cualquier compu), y al terminar cada misión: la partida, las respuestas de llamadas/averías/manual, las cartas usadas y los informes leídos.
- **Maestros:** `/maestro` (maestro.html): crear cuenta con correo, crear clases (cada una con su código), aceptar o rechazar alumnos y ver su avance (nivel, récords, predicción, acción, diagnóstico, manual y los temas que más cuestan).
- **Llave:** la URL y la publishable key vienen en `api/config.js` (pública por diseño); si se definen `SUPABASE_URL`, `SUPABASE_ANON_KEY` o `DOMINIO_ALUMNOS` en Vercel, esas ganan. La secret key y la contraseña de la base nunca van en el repo.
- **Prueba:** `supabase/pruebas/prueba_flujo.sql` en el SQL Editor recorre todo el flujo con la RLS real (alta, clase, solicitud, aceptar, partida, récords, panel) y no guarda nada.
- Si un niño olvida su contraseña no hay recuperación por correo: hay que restablecerla desde Supabase (Authentication › Users).

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
| `img/personajes/laika.png` | Laika, la ayudante del tutorial: guía el recorrido del día 0 y explica la primera llamada, avería, minijuego y carta (solo en la primera misión; `consejoLaika()` en `juego.js`) |

## Llamadas y preguntas
`datos/preguntas-mision-lunar.json` + `public/js/preguntas.js` (lógica sin pantalla, probada con `npm test`). Objetivo: **que leer sea necesario para acertar**. Validación y pendientes en `docs/VALIDACION-PREGUNTAS.md`.
- **Fijas y deterministas**: misma pregunta y mismo orden de opciones en cada partida; la corrección nunca es aleatoria.
- **Banco** (esquema `{ id, nivel, tipo, enunciado, opciones, indiceCorrecto, fraseEvidencia, explicacion, fuente, pista }` + `tema`, `barra`, `informes` y `lectura`). Cada pregunta depende de un dato de su **lectura** (un informe NASA del juego); la frase de evidencia está tal cual en el texto. Distractores creíbles: causa de otro evento, dato parecido pero equivocado o la acción correcta en el momento equivocado. Transferencia solo en nivel 3.
- **Pregunta antes del texto**: en los informes y en las preguntas de Control primero va la pregunta, luego el texto (1 a 3 oraciones; lo extra en «Saber más») y luego las opciones. La explicación solo aparece después de contestar.
- **Un reintento con pista y costo**: 1.er error → se tacha, aparece la pista y cuesta 2 puntos; 2.º error → respuesta y explicación, costo normal (3 / 5 / 8 según nivel) y se sigue. Igual en la avería. No hay reintentos gratis.
- **«¿Qué frase lo prueba?»** tras acertar: si la elige bien, +3 a la barra más débil; si no, nada.
- **Llamadas** (una cada 2 o 3 días): situación paso a paso (predice primero/después leyendo el informe de Control, qué dato lo prueba, actúa, mira qué pasó y el porqué), pregunta del banco o **Consulta la bitácora** (el día de la llamarada más fuerte; la bitácora dice «M3.5 · fuerte»).
- **Repaso**: al empezar una misión nueva, una pregunta de «Lo aprendido» (de memoria, con botón para abrir la bitácora).
- **Prueba de lectura** (equipo): botón **Prueba: texto oculto** o `?sintexto=1`; cuenta aciertos al primer intento con y sin texto.

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
- **Narrador:** activo por defecto en todos los niveles (`public/js/narrador.js`). Usa la voz del navegador en el idioma del juego y elige la más clara (las "Natural"/"Online" de Edge, las de Google en Chrome o la del sistema). Parte los textos en frases para que Chrome no los corte. La tecla M solo silencia música y efectos: el narrador se apaga con su propio botón en la pausa, donde también se elige y se prueba la voz. Si el dispositivo no tiene voz en ese idioma, la pausa explica cómo agregar una (Windows: Configuración › Hora e idioma › Voz).
- **Bitácora:** sin textos repetidos, marca NUEVO en lo no leído (con contador por pestaña) y pestaña **Diccionario** (24 palabras). En las lecturas, las palabras del diccionario se subrayan y se pueden tocar.
- **Menos repetición:** las llamadas empiezan sin pantalla de «Contestar», y un informe de un tema ya leído (sin pregunta ni carta) se guarda en la bitácora con un aviso, sin pantalla.
- **Misión final:** aterrizar la nave del relevo (motor para frenar, ← → para llegar a la plataforma).
- **Pausa:** Esc, P o el botón ⏸ PAUSA detienen la partida sin perderla, también dentro de un minijuego: su tiempo no corre (`PAUSA` en `musica.js`). Trae volumen de música y de efectos, silenciar, leer en voz alta, letra grande y pantalla completa; se guardan en el dispositivo. «Salir al menú» pide confirmar.
- **Pantalla:** durante la partida todo va en 16:9 (2560x1440 a pantalla completa); la franja de 256 px de abajo lleva con el panel de sistemas (barras en 2 × 2) y el cuadro de texto. Si una pantalla no cabe (llamadas con varios pasos), el cuadro se desplaza solo hasta la pregunta que toca responder. En el menú y los finales no hay franja.
- **Cartas:** el botón `CARTAS n / 10` (arriba a la derecha) abre y cierra el panel. Se cierra con ✕, con Esc o tocando fuera. Brilla cuando llega una carta nueva y avisa "ESCUDO LISTO" si hay un escudo armado.
- **Minijuegos:** antes de empezar se muestra "Así se juega": 2 o 3 pasos cortos y una demo animada (`public/img/minijuegos/<tipo>.gif`) donde una manita juega una ronda. El tiempo corre solo después de tocar "¡Empezar!" (o Enter). Los textos están en `COMO_SE_JUEGA` de `public/js/juego.js`; las demos se generan con `python herramientas/generar-demos-minijuegos.py`.

## Idioma (español / inglés)
- En el menú principal, a la derecha de la Luna, se elige **Español** o **English** (se guarda en `gnosis-idioma`; también `?lang=en`).
- El juego está escrito en español; `public/js/i18n.js` traduce lo que se ve (HTML y canvas) y lo que lee el narrador, sin tocar la lógica.
- Textos: `datos/i18n/textos-es.txt` y `textos-en.txt` (misma numeración). Si cambias textos del juego, corre `node herramientas/i18n-extraer.mjs` (conserva las traducciones que ya había y dice cuántas faltan), traduce las nuevas en `textos-en.txt` y corre `npm run datos`.

## Bitácora
`public/js/bitacora.js`. Se llena sola y se guarda entre misiones (en el dispositivo):
- **Cartas:** las 10, con su frase, para qué sirve, cuándo usarla y dónde se leyó.
- **Informes:** lo que contó cada evento, con su fuente.
- **Datos NASA:** llamaradas, CME y tormentas reales de DONKI (30 días), la radiación real de CRaTER (RadLab) y estudios reales de OSDR con enlace.
- **Lo aprendido:** las explicaciones de Control de Misión (llamadas) y de la Dra. Ortiz (averías).

## Efectos de sonido
`public/js/sfx.js`. Si el efecto tiene archivo, suena `public/audio/sfx/<nombre>.mp3`; si no, suena uno corto provisional generado en código. Para poner el suyo: guarden el mp3 con ese nombre en `public/audio/sfx/` y agreguen el nombre a `ARCHIVOS` en `sfx.js`. Si el mp3 trae silencio o varias tomas, pongan en `TOMAS` los segundos [inicio, fin] de cada pedazo; `VOLUMEN` ajusta el volumen de cada uno.

| Nombre | Dónde suena | Archivo |
|---|---|---|
| `limpiar-panel` | Limpiar el polvo de los paneles: en bucle mientras se arrastra | ✅ del equipo |
| `rayon` | Limpiar: pasar dos veces y rayar el panel | ✅ vidrio rayado |
| `cable-conectar` | Cables: conexión correcta (el archivo trae 4 tomas; se usa una distinta cada vez) | ✅ del equipo |
| `atrapar` / `caer` | Atrapar cajas o piezas / se cae una | provisional |
| `paso` | Laberinto al refugio: cada paso | provisional |
| `tapar` / `fuga-aire` | Tapar agujeros (8 tomas de cinta) / se escapa el aire | ✅ / provisional |
| `perilla` | Ajustar temperatura o alinear la nave | provisional |
| `plantas` / `encontrar` | Buscar plantas enfermas o lechugas / la fuga | ✅ / provisional |
| `rover-mover` / `radar` | Rover en el cráter | ✅ / provisional |
| `interruptor` | Repartir la energía de noche (usa el archivo de `cable-conectar`) | ✅ |
| `sismo` | Cuando empieza a temblar en la base | ✅ |
| `aterrizaje` | Alunizaje de la intro (el golpe cae al tocar el suelo) y la nave que baja en los finales | ✅ |
| `despegue` | La nave despega rumbo a la Tierra en los finales | ✅ |
| `acierto` / `error` | Secuencias, preguntas de la Tierra, llamadas y averías | provisional |
| `gano` / `perdio` | Al terminar cualquier minijuego | provisional |
| `llamada` | Llamada entrante de Control de Misión | provisional |
| `carta-nueva` | Se descubre una carta | provisional |

## Privacidad
En modo Libre el progreso se guarda solo en el dispositivo (`localStorage`). En modo Salón, los alumnos usan un alias y un código, sin correo.

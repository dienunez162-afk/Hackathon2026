# G-NOSIS

Juego educativo de supervivencia en una base lunar durante 14 días, para niños de 7 a 12 años (NASA Space Apps 2026 Monterrey). Está escrito en HTML, CSS y JavaScript sin build: el arte ASCII de la intro y los finales, 8 escenarios, 12 minijuegos, llamadas, averías, cartas, el manual del capitán y una dificultad que se ajusta sola.

## Correr en local
```
npm run dev          # genera public/js/datos.js y sirve public/ en http://localhost:3000
npm run dev:vercel   # igual, pero con las funciones de /api (requiere: npm i -g vercel)
npm run check        # revisa la sintaxis de todo
```
Parámetros de prueba: `?auto=1&vel=4` juega solo; `?final=apagon` abre un final.

## Desplegar en Vercel
1. Sube el repo a GitHub e impórtalo en Vercel. `vercel.json` ya define el build (`node scripts/generar-datos.mjs`) y la carpeta `public`.
2. En Settings > Environment Variables, pon las variables de `.env.example`.

## APIs de la NASA
El navegador llama a `/api/*` (funciones de Vercel) y nunca directo a la NASA. Las llaves, si las hay, solo viven en variables de entorno.

| Ruta | Fuente | Llave | Uso en el juego |
|---|---|---|---|
| `/api/donki` | [DONKI](https://api.nasa.gov) (CME, tormentas geomagnéticas GST, llamaradas FLR) | `NASA_API_KEY` (sin ella usa `DEMO_KEY`, muy limitada) | Pronóstico del día 5 y probabilidad de la tormenta sorpresa (N-D12b) |
| `/api/radlab` | [RadLab](https://visualization.osdr.nasa.gov/radlab/) · CRaTER del LRO | No necesita | Gráfica de radiación del día 4, con 7 días reales |
| `/api/osdr` | [OSDR](https://osdr.nasa.gov) (estudios biológicos) | No necesita | Estudio real de plantas en el informe del invernadero |

Notas (noviembre de 2026):
- `/DONKI/FLR` de api.nasa.gov responde 404. La función usa CME y GST, y vuelve a usar FLR cuando regrese.
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

## Privacidad
En modo Libre el progreso se guarda solo en el dispositivo (`localStorage`). En modo Salón, los alumnos usan un alias y un código, sin correo.

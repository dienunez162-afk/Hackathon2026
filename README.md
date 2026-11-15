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

## APIs (espacio reservado)
Las llaves **solo** viven en variables de entorno. El navegador llama a `/api/*`, nunca directo a la NASA.

| Ruta | Variable | Uso en el juego | Estado |
|---|---|---|---|
| `/api/donki` | `NASA_API_KEY` | Pronóstico (E-D5) y peso dinámico de la tormenta N-D12b | Funciona (FLR de DONKI hoy devuelve 404; se usa CME) |
| `/api/radlab` | `RADLAB_URL`, `RADLAB_API_KEY` | Gráfica de radiación (F1-D4) | Falta la URL; adapta `normalizar()` en `api/radlab.js` |
| `/api/osdr` | `OSDR_URL` | Informes del invernadero (futuro) | Falta la URL |

Si una API falla, `public/js/apis.js` usa datos de muestra marcados como tales y el juego sigue funcionando.

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

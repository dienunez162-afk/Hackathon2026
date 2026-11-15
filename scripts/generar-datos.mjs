// 1. Copia los JSON de datos/ a public/js/datos.js para que el juego los lea sin servidor.
// 2. En Vercel (o con --version), le pone la versión del despliegue a cada script de index.html
//    (js/juego.js?v=abc123). Así el navegador nunca mezcla un index.html nuevo con un juego.js
//    viejo de su caché, que fue lo que dejó la bitácora en 0 y encimó el HUD.
// Uso: npm run datos   (correr después de editar datos/*.json)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (f) => JSON.stringify(JSON.parse(readFileSync(join(raiz, "datos", f), "utf8")));
const js = "/* generado por scripts/generar-datos.mjs: no editar a mano, edita datos/*.json */\n" +
  `window.GRAFO = ${leer("grafo-mision-lunar.json")};\n` +
  `window.RETOS = ${leer("retos-mision-lunar.json")};\n` +
  `window.PREGUNTAS_DATOS = ${leer("preguntas-mision-lunar.json")};\n`;
writeFileSync(join(raiz, "public", "js", "datos.js"), js);
console.log("public/js/datos.js listo (" + js.length + " bytes)");

const pedirVersion = process.argv.includes("--version");
if (process.env.VERCEL || pedirVersion) {
  const version = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 10);
  const ruta = join(raiz, "public", "index.html");
  const html = readFileSync(ruta, "utf8").replace(/(src|href)="(js\/[^"?]+\.js)(\?v=[^"]*)?"/g, `$1="$2?v=${version}"`);
  writeFileSync(ruta, html);
  console.log("index.html: scripts con ?v=" + version);
}

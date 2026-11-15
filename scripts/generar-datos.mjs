// Copia los JSON de datos/ a public/js/datos.js para que el juego los lea sin servidor.
// Uso: npm run datos   (correr después de editar datos/*.json)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (f) => JSON.stringify(JSON.parse(readFileSync(join(raiz, "datos", f), "utf8")));
const js = "/* generado por scripts/generar-datos.mjs: no editar a mano, edita datos/*.json */\n" +
  `window.GRAFO = ${leer("grafo-mision-lunar.json")};\n` +
  `window.RETOS = ${leer("retos-mision-lunar.json")};\n`;
writeFileSync(join(raiz, "public", "js", "datos.js"), js);
console.log("public/js/datos.js listo (" + js.length + " bytes)");

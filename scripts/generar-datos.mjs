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

// 3. Diccionario español -> inglés (datos/i18n/textos-es.txt y textos-en.txt, misma numeración)
const lineas = (f) => {
  const m = new Map();
  for (const l of readFileSync(join(raiz, "datos", "i18n", f), "utf8").split(/\r?\n/)) {
    const k = l.match(/^(\d+)[\t=](.*)$/);
    if (k && k[2]) m.set(k[1], k[2].replace(/\\n/g, "\n"));
  }
  return m;
};
const es = lineas("textos-es.txt"), en = lineas("textos-en.txt"), dic = {};
const marcas = (s) => (s.match(/\{\d+\}/g) || []).sort().join();
for (const [n, t] of en) {
  if (!es.has(n)) continue;
  if (marcas(es.get(n)) !== marcas(t)) console.warn(`i18n: la línea ${n} no tiene los mismos {n} en los dos idiomas`);
  dic[es.get(n)] = t;
}
writeFileSync(join(raiz, "public", "js", "i18n-en.js"), "/* generado por scripts/generar-datos.mjs desde datos/i18n/: no editar a mano */\n" +
  `window.I18N_EN = ${JSON.stringify(dic)};\n`);
console.log(`public/js/i18n-en.js listo (${Object.keys(dic).length} de ${es.size} textos traducidos)`);

const pedirVersion = process.argv.includes("--version");
if (process.env.VERCEL || pedirVersion) {
  const version = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 10);
  const ruta = join(raiz, "public", "index.html");
  const html = readFileSync(ruta, "utf8").replace(/(src|href)="(js\/[^"?]+\.js)(\?v=[^"]*)?"/g, `$1="$2?v=${version}"`);
  writeFileSync(ruta, html);
  console.log("index.html: scripts con ?v=" + version);
}

// 3. Llaves públicas de Supabase para el navegador (solo si están en el entorno; nunca la service role).
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  const cfg = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, dominio: process.env.DOMINIO_ALUMNOS || "alumnos.g-nosis.local" };
  writeFileSync(join(raiz, "public", "js", "config.js"),
    "/* generado por scripts/generar-datos.mjs desde las variables de entorno */\nwindow.GNOSIS_CONFIG = " + JSON.stringify(cfg) + ";\n");
  console.log("public/js/config.js: Supabase activo");
}

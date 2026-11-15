// Saca todos los textos en español del juego para traducirlos (datos/i18n/textos-es.txt).
// Una línea por texto: "n<TAB>texto". En las plantillas, cada ${...} se vuelve {0}, {1}...
// y el HTML se parte en piezas (cada pieza es un texto que queda junto en pantalla).
// Uso: node herramientas/i18n-extraer.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const textos = new Set();
// campos de los datos que son claves de la lógica: no se traducen
const NO_TRADUCIR = new Set(["id", "tema", "barra", "tipo", "escenario", "informes", "cadena", "clave", "modo", "objetivo",
  "cambio", "fases", "temas", "dias", "version", "url", "fecha", "accion", "nodo", "desde", "hasta", "efectos", "rama", "siguiente", "origen", "destino"]);
const esTexto = (s) => typeof s === "string" && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(s) &&
  (/\s/.test(s) || /[áéíóúñ¿¡ÁÉÍÓÚÑ]/.test(s) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(s) || /^[A-ZÁÉÍÓÚÑ]{3,}$/.test(s)) && !/^https?:/.test(s);
const pareceCodigo = (s) => /===|&&|\|\||=>|;\s|\bfunction\b|\breturn\b|class=|style=|data-[a-z]|aria-|\.(png|gif|mp3|jpg|js)\b|rgb\(|var\(--|\bpx\b|getElementById|querySelector|^[a-z][\w-]*$/.test(s);
const agregar = (t) => { t = t.trim(); const solo = t.replace(/\{\d+\}/g, "").trim(); if (solo.length >= 2 && esTexto(solo) && !pareceCodigo(t) && !/^[\d\s.,:;%·/+\-()]+$/.test(solo)) textos.add(t); };

function recorrer(x, clave) {
  if (typeof x === "string") { if (!NO_TRADUCIR.has(clave) && esTexto(x)) agregar(x); return; }
  if (Array.isArray(x)) x.forEach((v) => recorrer(v, clave === "clave" ? "" : clave));   // pistas de las averías
  else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) recorrer(v, k);
}
for (const f of ["grafo-mision-lunar.json", "retos-mision-lunar.json", "preguntas-mision-lunar.json"]) recorrer(JSON.parse(readFileSync(join(raiz, "datos", f), "utf8")), "");

// ---------- analizador de JS: cadenas y plantillas (con plantillas dentro de ${...}) ----------
function analizar(src) {
  let i = 0;
  const leerCadena = (q) => { let s = ""; i++; while (i < src.length && src[i] !== q) { if (src[i] === "\\") { s += src[i + 1]; i += 2; continue; } s += src[i++]; } i++; return s; };
  function leerPlantilla() {           // devuelve el texto con {n} en lugar de cada ${...}
    let s = "", n = 0; i++;
    while (i < src.length && src[i] !== "`") {
      if (src[i] === "\\") { s += src[i + 1]; i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") { i += 2; codigo(true); s += `\u0001${n++}\u0002`; continue; }
      s += src[i++];
    }
    i++;
    // piezas separadas por etiquetas HTML
    for (const p of s.split(/<[^>]*>/)) agregar(p.replace(/\u0001(\d+)\u0002/g, "{$1}"));
    return s;
  }
  function codigo(dentro) {           // recorre código hasta la } que cierra (si dentro) o el final
    let prof = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 2; continue; }
      if (c === '"' || c === "'") { const s = leerCadena(c); agregar(s); continue; }
      if (c === "`") { leerPlantilla(); continue; }
      if (c === "/" && /[(,=:!&|?{};\[]\s*$/.test(src.slice(Math.max(0, i - 3), i))) {   // expresión regular: saltarla
        i++; while (i < src.length && src[i] !== "/") { if (src[i] === "\\") i++; if (src[i] === "[") { while (src[i] !== "]") { if (src[i] === "\\") i++; i++; } } i++; } i++; continue;
      }
      if (c === "{") prof++;
      if (c === "}") { if (dentro && prof === 0) { i++; return; } prof--; }
      i++;
    }
  }
  codigo(false);
}
for (const f of ["juego.js", "minijuegos.js", "finales.js", "escenas.js", "bitacora.js", "musica.js", "nave.js", "preguntas.js"]) analizar(readFileSync(join(raiz, "public", "js", f), "utf8"));

// textos fijos de index.html (interfaz, pausa, bitácora, herramientas)
const html = readFileSync(join(raiz, "public", "index.html"), "utf8").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, "");
for (const m of html.matchAll(/>([^<>]+)</g)) agregar(m[1]);
for (const m of html.matchAll(/(?:title|aria-label|alt)="([^"]+)"/g)) agregar(m[1]);

const lista = [...textos].sort((a, b) => a.localeCompare(b, "es"));
const dir = join(raiz, "datos", "i18n");
mkdirSync(dir, { recursive: true });
// traducciones que ya había (se guardan por texto, no por número, para no perderlas al renumerar)
const leer = (f) => { const m = new Map(); if (!existsSync(join(dir, f))) return m;
  for (const l of readFileSync(join(dir, f), "utf8").split(/\r?\n/)) { const k = l.match(/^(\d+)[\t=](.*)$/); if (k) m.set(k[1], k[2]); } return m; };
const viejoEs = leer("textos-es.txt"), viejoEn = leer("textos-en.txt"), antes = new Map();
for (const [n, t] of viejoEs) if (viejoEn.get(n)) antes.set(t, viejoEn.get(n));
const linea = (t) => t.replace(/\n/g, "\\n");
writeFileSync(join(dir, "textos-es.txt"), lista.map((t, i) => `${i}\t${linea(t)}`).join("\n") + "\n");
const en = lista.map((t, i) => (antes.has(linea(t)) ? `${i}=${antes.get(linea(t))}` : null)).filter(Boolean);
writeFileSync(join(dir, "textos-en.txt"), en.join("\n") + "\n");
console.log("sin traducir:", lista.filter((t) => !antes.has(linea(t))).length);
console.log("textos:", lista.length, "caracteres:", lista.reduce((n, t) => n + t.length, 0));

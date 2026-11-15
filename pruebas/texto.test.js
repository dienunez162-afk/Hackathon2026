// Texto roto del Diccionario: recorre todos los informes (y las lecturas del banco) con las palabras
// del glosario marcadas, y falla si en el texto que se ve queda «">» o «<».
// Correr: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const P = require("../public/js/preguntas.js");
const GRAFO = require("../datos/grafo-mision-lunar.json");
const DATOS = require("../datos/preguntas-mision-lunar.json");

// el glosario vive en bitacora.js (navegador): se carga con un document de mentira
function glosario() {
  const nada = () => null;
  const ctx = { window: { addEventListener: nada }, document: { getElementById: nada, querySelector: nada, querySelectorAll: () => [], addEventListener: nada, createElement: () => ({}) }, localStorage: { getItem: nada, setItem: nada }, console, setTimeout: nada, clearTimeout: nada };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/js/bitacora.js"), "utf8"), ctx);
  return ctx.window.BITACORA.glosario;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const BOTON = /<button type="button" class="palabra" data-palabra="[^"<>]*" title="[^"<>]*">([^<>]*)<\/button>/g;

function revisar(nombre, texto, glo) {
  const html = P.marcarPalabras(esc(texto), glo);
  const visible = html.replace(BOTON, "$1");            // lo que se ve: el texto de los botones, sin etiquetas
  assert.ok(!visible.includes("<"), `${nombre}: quedó «<» en el texto: ${visible}`);
  assert.ok(!visible.includes('">'), `${nombre}: quedó «">» en el texto: ${visible}`);
  assert.equal(visible, esc(texto), `${nombre}: el texto cambió al marcar palabras`);
}

test("el glosario se carga y tiene palabras", () => {
  const glo = glosario();
  assert.ok(Array.isArray(glo) && glo.length >= 10);
});

test("ningún informe sale roto al marcar las palabras del diccionario", () => {
  const glo = glosario();
  let n = 0;
  for (const nodo of GRAFO.nodos) if (nodo.informe && nodo.informe.texto) { revisar(nodo.id, nodo.informe.texto, glo); n++; }
  assert.ok(n > 20, "se revisaron " + n + " informes");
});

test("el informe del refugio (CRaTER + radiación) ya no mete una definición dentro de otra", () => {
  const glo = glosario();
  const t = "El instrumento CRaTER mide la radiación cerca de la Luna desde 2009.";
  revisar("CRaTER", t, glo);
  assert.ok(P.marcarPalabras(esc(t), glo).includes('data-palabra="'), "debe marcar al menos una palabra");
});

test("tampoco se rompen las lecturas del banco de preguntas", () => {
  const glo = glosario();
  for (const q of DATOS.banco) if (q.lectura) revisar(q.id, q.lectura, glo);
});

// Revisión automática de lectura para niños de 7 a 12 años. No reemplaza la revisión de un docente:
// solo evita lo evidente (frases larguísimas, nivel 1 con textos pesados).
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../datos/preguntas-mision-lunar.json");
const G = require("../datos/grafo-mision-lunar.json");

const palabras = (s) => s.trim().split(/\s+/).length;
const frases = (s) => s.split(/(?<=[.!?¿])\s+/).filter((x) => x.length > 2);
const textosDe = (q) => [["enunciado", q.enunciado], ["lectura", q.lectura], ["explicacion", q.explicacion], ["pista", q.pista], ...q.opciones.map((o, i) => ["opción " + (i + 1), o])].filter((x) => x[1]);

test("ninguna frase del banco ni de los informes pasa de 28 palabras", () => {
  const largas = [];
  for (const q of P.banco) for (const [k, t] of textosDe(q)) for (const f of frases(t)) if (palabras(f) > 28) largas.push(`${q.id} ${k}: ${palabras(f)} palabras`);
  for (const n of G.nodos) if (n.informe) for (const f of frases(n.informe.texto)) if (palabras(f) > 28) largas.push(`${n.id} informe: ${palabras(f)} palabras`);
  assert.deepEqual(largas, []);
});

test("nivel 1 (1.º y 2.º): enunciado y opciones cortos", () => {
  const pesadas = [];
  for (const q of P.banco.filter((x) => x.nivel === 1)) {
    if (palabras(q.enunciado) > 22) pesadas.push(q.id + " enunciado");
    q.opciones.forEach((o, i) => { if (palabras(o) > 14) pesadas.push(`${q.id} opción ${i + 1}`); });
  }
  assert.deepEqual(pesadas, []);
});

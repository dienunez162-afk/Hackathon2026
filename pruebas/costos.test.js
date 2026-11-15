// Costo visible de cada acción según el nivel de reto (nivel 1: números, nivel 2: flechas, nivel 3: nada)
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../public/js/preguntas.js");
const G = require("../datos/grafo-mision-lunar.json");

// todos los conjuntos de efectos que el niño puede ver antes de decidir: opciones de eventos y minijuegos (éxito / fallo)
const conjuntos = [];
for (const n of G.nodos) {
  const r = n.resultado || {};
  for (const o of r.opciones || []) conjuntos.push([n.id + " · " + o.texto, o.efectos]);
  if (r.exito) conjuntos.push([n.id + " · éxito", r.exito]);
  if (r.fallo) conjuntos.push([n.id + " · fallo", r.fallo]);
}
const barras = (ef) => Object.entries(ef || {}).filter(([k, v]) => v && ["radiacion", "energia", "comida", "salud"].includes(k));

test("hay opciones y minijuegos con efectos para mostrar", () => {
  assert.ok(conjuntos.length >= 20, "conjuntos: " + conjuntos.length);
  assert.ok(conjuntos.some(([, ef]) => barras(ef).length >= 2), "al menos una acción afecta dos barras (un compromiso real)");
});

test("nivel 1: cada barra que cambia sale con su número", () => {
  for (const [id, ef] of conjuntos) {
    const items = P.describirEfectos(ef, 1).filter((i) => i.tipo === "barra");
    assert.equal(items.length, barras(ef).length, id);
    for (const i of items) { assert.ok(i.numero, id); assert.ok(Number.isFinite(i.v) && i.v !== 0, id); }
  }
});

test("nivel 2: las mismas barras pero solo con la dirección, sin números", () => {
  for (const [id, ef] of conjuntos) {
    const items = P.describirEfectos(ef, 2).filter((i) => i.tipo === "barra");
    assert.equal(items.length, barras(ef).length, id);
    for (const i of items) assert.equal(i.numero, false, id);
  }
});

test("nivel 3: no se muestra nada (el niño lo deduce de lo que leyó)", () => {
  for (const [id, ef] of conjuntos) assert.deepEqual(P.describirEfectos(ef, 3), [], id);
});

test("lo bueno y lo malo: que suba la radiación es malo; que suban energía, comida o salud es bueno", () => {
  assert.equal(P.describirEfectos({ radiacion: 5 }, 1)[0].bueno, false);
  assert.equal(P.describirEfectos({ radiacion: -5 }, 1)[0].bueno, true);
  assert.equal(P.describirEfectos({ energia: 5 }, 1)[0].bueno, true);
  assert.equal(P.describirEfectos({ comida: -5 }, 1)[0].bueno, false);
});

test("efectos vacíos o raros no rompen nada", () => {
  for (const ef of [null, undefined, {}, { energia: 0 }, { mision: 1 }, { barraMasBaja: 12 }, { cosa: 3 }]) assert.ok(Array.isArray(P.describirEfectos(ef, 1)));
});

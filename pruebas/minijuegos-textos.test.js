// Regresión: los textos de los minijuegos usan un ayudante `tx(es, en)`; si una función local
// declara otra cosa con ese nombre, el minijuego revienta («tx is not a function») al abrirse.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "..", "public", "js", "minijuegos.js"), "utf8");

test("el ayudante tx de minijuegos.js se declara una sola vez y nadie lo tapa", () => {
  const decl = src.match(/\b(const|let|var)\s+tx\b|\btx\s*=>|\(tx\b|,\s*tx\s*[,)=]/g) || [];
  assert.strictEqual(decl.length, 1, "tx debe declararse una sola vez: " + decl.join(" | "));
});

test("minijuegos.js no usa nombres de una letra como ayudante de texto", () => {
  assert.ok(!/\$\{L\(/.test(src), "L ya es el número de carriles en varios minijuegos");
});

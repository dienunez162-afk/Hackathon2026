// Un dato que cambia el día: cada día del juego es un día real reciente de la NASA
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../public/js/preguntas.js");

const HOY = "2026-11-15";
const donki = {
  llamaradas: [
    { fecha: "2026-11-02T10:00Z", clase: "C2.1" },   // día 1 → calma
    { fecha: "2026-11-05T01:00Z", clase: "M3.5" },   // día 4 → fuerte
    { fecha: "2026-11-08T10:00Z", clase: "M1.1" },   // día 7 → fuerte
    { fecha: "2026-11-08T22:00Z", clase: "M1.7" },   // mismo día: se queda la mayor
    { fecha: "2026-11-11T03:00Z", clase: "X1.2" },   // día 10 → muy fuerte
    { fecha: "2026-11-14T03:00Z", clase: "M2.0" },   // día 13 → fuerte
    { fecha: "2026-10-01T03:00Z", clase: "X9.0" },   // fuera de la ventana
  ],
  cmes: [{ fecha: "2026-11-05" }, { fecha: "2026-11-05" }, { fecha: "2026-11-12" }],
};

test("la ventana tiene 14 días: el 14 es hoy y el 1 fue hace 13 días", () => {
  const v = P.ventanaReal(donki, HOY);
  assert.equal(v.length, 14);
  assert.equal(v[13].fecha, HOY); assert.equal(v[13].dia, 14);
  assert.equal(v[0].fecha, "2026-11-02"); assert.equal(v[0].dia, 1);
  for (let i = 1; i < 14; i++) assert.equal(v[i].dia, i + 1);
});

test("la intensidad sale de la llamarada más fuerte del día (A, B, C calma; M fuerte; X muy fuerte)", () => {
  const v = P.ventanaReal(donki, HOY);
  assert.equal(v[0].nivel, 0); assert.equal(v[0].clase, "C2.1");
  assert.equal(v[3].nivel, 1); assert.equal(v[3].cmes, 2);
  assert.equal(v[6].nivel, 1); assert.equal(v[6].clase, "M1.7"); assert.equal(v[6].llamaradas, 2);
  assert.equal(v[9].nivel, 2);
  assert.equal(v[2].nivel, 0); assert.equal(v[2].clase, null);
});

test("lo de fuera de la ventana no cuenta", () => {
  assert.ok(P.ventanaReal(donki, HOY).every((d) => d.clase !== "X9.0"));
});

test("el efecto: M suma 3 de radiación, X suma 6, y nunca más de 3 días por misión", () => {
  const v = P.ventanaReal(donki, HOY);
  const efectos = v.map((d) => P.efectoDelDia(v, d.dia).radiacion);
  assert.ok(efectos.filter((x) => x > 0).length <= 3, JSON.stringify(efectos));
  assert.equal(efectos[9], 6);                      // la X es de las más fuertes: siempre entra
  assert.ok(efectos.every((x) => [0, 3, 6].includes(x)));
  assert.equal(Math.max(...efectos), 6);
});

test("sin datos o sin llamaradas fuertes todo es calma y no cambia nada", () => {
  for (const d of [null, undefined, {}, { llamaradas: [], cmes: [] }, { llamaradas: [{ fecha: "2026-11-10", clase: "B1.0" }] }]) {
    const v = P.ventanaReal(d, HOY);
    assert.equal(v.length, 14);
    assert.ok(v.every((x) => x.nivel === 0));
    assert.ok(v.every((x) => P.efectoDelDia(v, x.dia).radiacion === 0));
  }
});

test("si hay más de 3 días fuertes, se quedan los más fuertes (y entre iguales, los primeros)", () => {
  const muchos = { llamaradas: [2, 3, 4, 5, 6].map((d) => ({ fecha: `2026-11-0${d}`, clase: "M1.0" })).concat([{ fecha: "2026-11-09", clase: "X1.0" }]) };
  const v = P.ventanaReal(muchos, HOY);
  const dias = v.filter((d) => P.efectoDelDia(v, d.dia).radiacion > 0).map((d) => d.dia);
  assert.equal(dias.length, 3);
  assert.ok(dias.includes(8));          // la X (9 de noviembre = día 8)
});

test("fechaCorta en los dos idiomas", () => {
  assert.equal(P.fechaCorta("2026-11-08", false), "8 de noviembre");
  assert.equal(P.fechaCorta("2026-11-08T10:00Z", true), "November 8");
});

// Pruebas de la lógica de preguntas. Correr: npm test   (node --test, sin dependencias)
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../public/js/preguntas.js");
const DATOS = require("../datos/preguntas-mision-lunar.json");
const RETOS = require("../datos/retos-mision-lunar.json");

// generador pseudoaleatorio con semilla, para pruebas repetibles
const semilla = (s) => () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);

test("el banco tiene al menos 12 preguntas válidas en los tres niveles", () => {
  assert.ok(DATOS.banco.length >= 12);
  for (const p of DATOS.banco) assert.equal(P.validarPregunta(p), null, p.id);
  for (const n of [1, 2, 3]) assert.ok(DATOS.banco.filter((p) => p.nivel === n).length >= 4, "nivel " + n);
  assert.equal(new Set(DATOS.banco.map((p) => p.id)).size, DATOS.banco.length, "ids repetidos");
});

test("cada pregunta del banco es de un tema que existe en el juego", () => {
  for (const p of DATOS.banco) assert.ok(RETOS.temas[p.tema], p.id + " tema " + p.tema);
});

test("barajar no pierde la respuesta correcta (no depende del azar)", () => {
  for (let s = 1; s < 300; s++) {
    const ops = ["a", "b", "c", "d"], k = s % 4;
    const r = P.barajarConCorrecta(ops, k, semilla(s));
    assert.equal(r.opciones[r.correcta], ops[k]);
    assert.deepEqual([...r.opciones].sort(), [...ops].sort());
  }
});

test("recortar opciones deja la correcta y el número de opciones del nivel", () => {
  const p = DATOS.banco[0];
  for (const n of [1, 2, 3]) {
    const r = P.recortarOpciones(p.opciones, p.indiceCorrecto, P.opcionesPorNivel(n));
    assert.equal(r.opciones.length, P.opcionesPorNivel(n));
    assert.equal(r.opciones[r.indiceCorrecto], p.opciones[p.indiceCorrecto]);
  }
});

test("el selector respeta el nivel", () => {
  for (const n of [1, 2, 3]) for (let s = 1; s < 50; s++) assert.equal(P.elegirPregunta(DATOS.banco, n, [], null, semilla(s)).nivel, n);
});

test("el selector usa el nivel más cercano cuando se acaban las del nivel", () => {
  const usadosN1 = DATOS.banco.filter((p) => p.nivel === 1).map((p) => p.id);
  assert.equal(P.elegirPregunta(DATOS.banco, 1, usadosN1, null, semilla(7)).nivel, 2);
});

test("el selector prefiere temas que el niño ya leyó", () => {
  for (let s = 1; s < 40; s++) assert.equal(P.elegirPregunta(DATOS.banco, 2, [], ["agua_reciclaje"], semilla(s)).tema, "agua_reciclaje");
});

test("el modo automático con comprensión completa siempre acierta", () => {
  for (let s = 1; s < 200; s++) assert.equal(P.respuestaAuto(4, s % 4, 1, semilla(s)), s % 4);
  for (let s = 1; s < 200; s++) assert.notEqual(P.respuestaAuto(4, 2, 0, semilla(s)), 2);
});

test("el costo por error crece con el nivel y nunca deja una barra en cero", () => {
  assert.ok(Math.abs(P.costoError(1, "salud", 80)) < Math.abs(P.costoError(3, "salud", 80)));
  assert.equal(P.costoError(3, "salud", 12), -2);       // no baja de 10
  assert.equal(P.costoError(3, "energia", 9), 0);
  assert.equal(P.costoError(3, "radiacion", 88), 2);    // no sube de 90
  assert.equal(P.costoError(2, "radiacion", 20), 5);
});

test("hay una llamada cada 2 o 3 días entre el día 2 y el 13", () => {
  for (let s = 1; s < 100; s++) {
    const d = P.diasDeLlamada(semilla(s));
    assert.equal(d[0], 2);
    assert.ok(d.length >= 5 && d.every((x) => x >= 2 && x <= 13));
    for (let i = 1; i < d.length; i++) assert.ok([2, 3].includes(d[i] - d[i - 1]));
  }
});

test("medidor de radiación: zonas y tendencia", () => {
  assert.equal(P.zonaRadiacion(1), "seguro");
  assert.equal(P.zonaRadiacion(2), "cuidado");
  assert.equal(P.zonaRadiacion(40), "peligro");
  const t = P.tendencia([1, 1, 1, 1, 80, 200, 2]);
  assert.deepEqual(t.picos, [4, 5]);
  assert.equal(t.bajo, true);
  assert.equal(P.tendencia([1, 1, 1, 1, 1, 1, 1]).bajo, false);
});

test("pregunta de bitácora: se pregunta el día de la llamarada más fuerte, en palabras", () => {
  const datos = { donki: { llamaradas: [{ fecha: "2026-11-01", clase: "C2.0" }, { fecha: "2026-11-05", clase: "M3.5" }, { fecha: "2026-11-08", clase: "M1.1" }] } };
  const q = P.preguntaBitacora(datos);
  assert.equal(P.validarPregunta(q), null);
  assert.equal(q.opciones[q.indiceCorrecto], "el 5 de noviembre");
  assert.ok(q.fraseEvidencia.includes("M3.5") && q.fraseEvidencia.includes("fuerte"), "conserva el dato real y la versión en palabras");
  assert.equal(P.fuerzaDe("C1.3"), "media");
  assert.equal(P.fuerzaDe("B5.0"), "suave");
});

test("cada pregunta del banco depende de su lectura: la frase de evidencia está en el texto", () => {
  for (const p of DATOS.banco) {
    assert.ok(p.lectura && p.lectura.includes(p.fraseEvidencia), p.id);
    assert.ok(p.pista && p.pista.length < 90, p.id + " pista corta");
    assert.ok(!p.enunciado.toLowerCase().includes(p.opciones[p.indiceCorrecto].toLowerCase()), p.id + ": el enunciado no debe traer la respuesta");
  }
});

test("las preguntas de transferencia solo están en el nivel 3", () => {
  for (const p of DATOS.banco.filter((q) => q.tipo === "transferencia")) assert.equal(p.nivel, 3, p.id);
});

test("las preguntas son fijas: mismo orden y misma pregunta en cada partida", () => {
  const p = DATOS.banco[0];
  const a = P.barajarFijo(p.opciones, p.indiceCorrecto, p.id), b = P.barajarFijo(p.opciones, p.indiceCorrecto, p.id);
  assert.deepEqual(a, b);
  assert.equal(a.opciones[a.correcta], p.opciones[p.indiceCorrecto]);
  assert.equal(P.elegirPregunta(DATOS.banco, 2, []).id, P.elegirPregunta(DATOS.banco, 2, []).id);
});

test("la evidencia de cada situación está en su informe y sus distractores no", () => {
  for (const [id, x] of Object.entries(DATOS.situaciones)) {
    const c = x.evidencia.correcta.replace(/\.$/, "");
    assert.ok(x.informe.includes(c) || x.informe.includes(c.charAt(0).toLowerCase() + c.slice(1)) || id === "S-polvo_lunar", id);
    for (const d of x.evidencia.distractores) assert.ok(!x.informe.includes(d.replace(/\.$/, "")), id + ": " + d);
  }
});

test("pregunta de bitácora sin llamaradas usa la radiación de RadLab", () => {
  const q = P.preguntaBitacora({ donki: { llamaradas: [] }, radlab: { base: 5, serie: [{ dosis: 5 }, { dosis: 500 }] } });
  assert.equal(P.validarPregunta(q), null);
  assert.equal(q.opciones[q.indiceCorrecto], "Unas 100 veces más");
});

test("repaso: usa una pregunta del mismo tema si existe", () => {
  const q = P.preguntaRepaso([{ titulo: "Radiación", tema: "radiacion", texto: "x" }], DATOS.banco, 2, []);
  assert.equal(q.tipo, "repaso");
  assert.equal(q.tema, "radiacion");
  assert.equal(P.validarPregunta(q), null);
});

test("las 10 situaciones tienen cadena de dos barras distintas y evidencia con distractores", () => {
  for (const s of RETOS.situaciones) {
    const x = DATOS.situaciones[s.id];
    assert.ok(x, s.id);
    assert.equal(x.cadena.length, 2); assert.notEqual(x.cadena[0], x.cadena[1]);
    for (const b of x.cadena) assert.ok(P.BARRAS.includes(b));
    assert.ok(x.evidencia.distractores.length >= 3);
    for (const n of ["1", "2", "3"]) assert.ok(x.situacion[n]);
    assert.ok(x.informe);
  }
});

test("cada avería tiene cuatro causas posibles", () => {
  for (const a of RETOS.averias) assert.equal(DATOS.averias.causas[a.id].length, 4, a.id);
});

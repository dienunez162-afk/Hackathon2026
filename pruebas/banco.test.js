// Banco de preguntas: validación, rotación sin azar, repaso con otra variante, bitácora y transferencia.
// Correr: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../public/js/preguntas.js");
const DATOS = require("../datos/preguntas-mision-lunar.json");
const RETOS = require("../datos/retos-mision-lunar.json");
const GRAFO = require("../datos/grafo-mision-lunar.json");

const B = DATOS.banco, TEMAS = Object.keys(RETOS.temas);

test("el banco es válido: ids únicos, 3+ opciones, índice válido, fuente NASA y URL", () => {
  assert.deepEqual(P.validarBanco(B, TEMAS), []);
});

test("cada tema tiene al menos 2 preguntas por nivel (sin contar transferencia)", () => {
  for (const t of TEMAS) for (const n of [1, 2, 3]) {
    const v = P.variantes(B, t, n);
    assert.ok(v.length >= 2, `${t} nivel ${n}: ${v.length}`);
    if (n < 3) assert.ok(v.every((q) => q.nivel === n), `${t} nivel ${n} no debe tomar de otro nivel`);
  }
});

test("los niveles 1 y 2 nunca reciben transferencia", () => {
  for (const t of TEMAS) for (const n of [1, 2]) {
    assert.equal(P.variantes(B, t, n, { transferencia: true }).length, 0);
    assert.ok(P.variantes(B, t, n).every((q) => q.tipo !== "transferencia"));
  }
  for (let p = 1; p <= 6; p++) for (let i = 0; i < 6; i++) {
    const q = P.preguntaLlamada(B, TEMAS, 2, p, i, [], true);
    assert.ok(q && q.tipo !== "transferencia", "nivel 2 con transferencia");
  }
});

test("rotación: la regla es variantes[(partida - 1 + evento) % n] y no hay azar", () => {
  for (const t of TEMAS) for (const n of [1, 2, 3]) {
    const v = P.variantes(B, t, n);
    for (let p = 1; p <= 6; p++) for (let e = 0; e < 3; e++) {
      const q = P.rotar(v, p, e);
      assert.equal(q.id, v[(p - 1 + e) % v.length].id);
      assert.equal(P.rotar(v, p, e).id, q.id, "misma entrada, misma pregunta");
    }
  }
});

test("la pregunta de un tema no se repite de una partida a la siguiente", () => {
  for (const t of TEMAS) for (const n of [1, 2, 3]) for (let p = 1; p <= 6; p++) for (let e = 0; e < 3; e++) {
    const v = P.variantes(B, t, n);
    assert.notEqual(P.rotar(v, p, e).id, P.rotar(v, p + 1, e).id, `${t} n${n} partida ${p}`);
  }
});

test("en un informe solo sale una pregunta que se contesta con ese texto", () => {
  let con = 0;
  for (const nodo of GRAFO.nodos) if (nodo.informe) for (const n of [1, 2, 3]) for (let p = 1; p <= 3; p++) {
    const q = P.preguntaParaInforme(B, nodo.informe.tema, nodo.informe.texto, n, p, 0, []);
    if (!q) continue;
    con++;
    assert.ok(nodo.informe.texto.includes(q.fraseEvidencia), `${nodo.id}: ${q.id}`);
    assert.notEqual(q.tipo, "transferencia");
  }
  assert.ok(con > 30, "pocos informes con pregunta: " + con);
});

test("el repaso pregunta el MISMO tema con una variante DISTINTA de la que ya vio", () => {
  for (const t of TEMAS) for (const n of [1, 2, 3]) for (let p = 1; p <= 4; p++) {
    for (const vista of P.variantes(B, t, n)) {
      const r = P.preguntaRepaso([{ clave: "q-" + vista.id, titulo: "x", tema: t, texto: "x" }], B, n, [], p);
      assert.equal(r.tema, t);
      assert.notEqual(r.id, "R-" + vista.id, `${t} n${n}: repitió ${vista.id}`);
    }
  }
});

test("«Consulta tu bitácora» rota entre 3 variantes con el dato en vivo de DONKI", () => {
  const datos = { donki: { llamaradas: [
    { clase: "M3.5", fecha: "2026-11-02T10:00Z" }, { clase: "X1.2", fecha: "2026-11-05T08:00Z" },
    { clase: "C4.0", fecha: "2026-11-07T12:00Z" }, { clase: "M1.1", fecha: "2026-11-09T01:00Z" }] } };
  const ids = [1, 2, 3].map((p) => P.preguntaBitacora(datos, p).id);
  assert.equal(new Set(ids).size, 3, ids.join());
  for (let p = 1; p <= 3; p++) {
    const q = P.preguntaBitacora(datos, p);
    assert.equal(P.validarPregunta(q), null);
    assert.ok(q.opciones.length >= 3, q.id);
    assert.ok(q.fraseEvidencia.includes("X1.2"), "el dato es el de DONKI");
    assert.notEqual(P.preguntaBitacora(datos, p).id, P.preguntaBitacora(datos, p + 1).id);
  }
});

test("transferencia dentro de la misión: nivel 3 y 4 o más bien en los últimos 5 retos", () => {
  assert.equal(P.transferenciaPermitida([true, true, true, true, false], 3), true);
  assert.equal(P.transferenciaPermitida([false, true, true, true, true, false], 3), true);
  assert.equal(P.transferenciaPermitida([true, true, true, false, false], 3), false);
  assert.equal(P.transferenciaPermitida([true, true, true, true], 3), false, "menos de 5 retos");
  assert.equal(P.transferenciaPermitida([true, true, true, true, true], 2), false, "nivel 2");
  const q = P.preguntaLlamada(B, ["radiacion"], 3, 1, 0, [], true);
  assert.equal(q.tipo, "transferencia");
  const r = P.preguntaLlamada(B, ["radiacion"], 3, 1, 0, [], false);
  assert.notEqual(r.tipo, "transferencia");
});

test("las preguntas de transferencia no se responden copiando: la opción correcta no está en la lectura", () => {
  for (const q of B.filter((x) => x.tipo === "transferencia")) {
    assert.ok(!q.lectura.toLowerCase().includes(q.opciones[q.indiceCorrecto].toLowerCase()), q.id);
  }
});

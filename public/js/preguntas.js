/* =========================================================
   G-NOSIS  -  lógica de preguntas (sin pantalla)
   Funciones puras: barajar opciones sin perder la correcta, elegir
   preguntas según el nivel, costos por error, días de llamada,
   preguntas de «consulta la bitácora», repaso y lectura del medidor
   de radiación. Funciona en el navegador (window.PREGUNTAS) y en
   Node (require), así se prueba en pruebas/preguntas.test.js.
   ========================================================= */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.PREGUNTAS = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const BARRAS = ["radiacion", "energia", "comida", "salud"];
  const lim = (x, a, b) => Math.max(a, Math.min(b, x));

  // baraja las opciones y devuelve dónde quedó la correcta (la respuesta no depende del azar)
  function barajarConCorrecta(opciones, indiceCorrecto, rnd = Math.random) {
    const orden = opciones.map((_, i) => i);
    for (let i = orden.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [orden[i], orden[j]] = [orden[j], orden[i]]; }
    return { opciones: orden.map((i) => opciones[i]), correcta: orden.indexOf(indiceCorrecto) };
  }
  // deja la correcta y los primeros distractores, según el nivel (2, 3 o 4 opciones)
  function recortarOpciones(opciones, indiceCorrecto, cuantas) {
    const correcta = opciones[indiceCorrecto], otras = opciones.filter((_, i) => i !== indiceCorrecto).slice(0, Math.max(1, cuantas - 1));
    return { opciones: [correcta, ...otras], indiceCorrecto: 0 };
  }
  const opcionesPorNivel = (nivel) => ({ 1: 2, 2: 3, 3: 4 })[lim(nivel | 0, 1, 3)];

  // elige una pregunta del banco con el nivel pedido; si no queda ninguna, el nivel más cercano.
  // preferirTemas: temas que el niño ya leyó (para que tenga la evidencia)
  function elegirPregunta(banco, nivel, usados = [], preferirTemas = null, rnd = Math.random) {
    const libres = banco.filter((p) => !usados.includes(p.id));
    if (!libres.length) return null;
    for (let d = 0; d <= 2; d++) {
      for (const n of d === 0 ? [nivel] : [nivel - d, nivel + d]) {
        let pool = libres.filter((p) => p.nivel === n);
        if (preferirTemas && preferirTemas.length) { const conTema = pool.filter((p) => preferirTemas.includes(p.tema)); if (conTema.length) pool = conTema; }
        if (pool.length) return pool[Math.floor(rnd() * pool.length)];
      }
    }
    return null;
  }

  // costo visible por equivocarse: pequeño en nivel 1, mayor en nivel 3.
  // Nunca deja una barra bajo 10 (ni la radiación sobre 90) solo por una pregunta.
  const COSTO = { 1: 3, 2: 5, 3: 8 };
  function costoError(nivel, barra, valorActual) {
    const c = COSTO[lim(nivel | 0, 1, 3)];
    if (barra === "radiacion") return lim(Math.min(c, 90 - valorActual), 0, c);          // sube
    const baja = lim(Math.min(c, valorActual - 10), 0, c);                              // baja
    return baja === 0 ? 0 : -baja;
  }

  // una llamada cada 2 o 3 días, entre el día 2 y el 13
  function diasDeLlamada(rnd = Math.random) {
    const dias = []; let d = 2;
    while (d <= 13) { dias.push(d); d += rnd() < 0.5 ? 2 : 3; }
    return dias;
  }

  // respuesta del modo automático: acierta con probabilidad "comprension"
  function respuestaAuto(nOpciones, correcta, comprension, rnd = Math.random) {
    if (rnd() < comprension) return correcta;
    const otras = Array.from({ length: nOpciones }, (_, i) => i).filter((i) => i !== correcta);
    return otras.length ? otras[Math.floor(rnd() * otras.length)] : correcta;
  }

  // ---------- medidor de radiación: comparar contra un día normal, sin colores ----------
  const ZONAS = { seguro: 1.5, cuidado: 3 };
  function zonaRadiacion(veces) { return veces > ZONAS.cuidado ? "peligro" : veces > ZONAS.seguro ? "cuidado" : "seguro"; }
  // ¿hubo días muy altos antes de hoy y hoy bajó?
  function tendencia(veces) {
    const hoy = veces[veces.length - 1], antes = veces.slice(0, -1);
    const picos = antes.map((v, i) => (v > ZONAS.cuidado ? i : -1)).filter((i) => i >= 0);
    return { hoy, picos, bajo: picos.length > 0 && hoy < Math.max(...antes) };
  }

  // ---------- consulta la bitácora (Datos NASA) ----------
  const claseNum = (c) => { const m = /^([ABCMX])(\d*\.?\d*)/i.exec(c || ""); return m ? "ABCMX".indexOf(m[1].toUpperCase()) * 10 + (parseFloat(m[2]) || 0) : -1; };
  function preguntaBitacora(datos, rnd = Math.random) {
    const fl = ((datos && datos.donki && datos.donki.llamaradas) || []).filter((f) => f.clase);
    if (fl.length >= 2) {
      const fuerte = fl.reduce((m, f) => (claseNum(f.clase) > claseNum(m.clase) ? f : m));
      const otras = [...new Set(fl.map((f) => f.clase).filter((c) => c !== fuerte.clase && claseNum(c) < claseNum(fuerte.clase)))];
      for (const extra of ["C1.0", "B5.0", "C3.2", "M1.0"]) if (otras.length < 3 && extra !== fuerte.clase && claseNum(extra) < claseNum(fuerte.clase) && !otras.includes(extra)) otras.push(extra);
      const ops = [fuerte.clase, ...otras.slice(0, 3)];
      return {
        id: "B-llamarada", nivel: 2, tipo: "bitacora", tema: "radiacion", barra: "radiacion",
        enunciado: "Abre tu bitácora en «Datos NASA». ¿Cuál fue la llamarada solar más fuerte de los últimos 30 días?",
        opciones: ops, indiceCorrecto: 0,
        fraseEvidencia: `Datos NASA: la más fuerte fue ${fuerte.clase} el ${String(fuerte.fecha).slice(0, 10)}.`,
        explicacion: "La letra dice qué tan fuerte es: A, B y C son débiles; M y X son fuertes. El número afina dentro de cada letra.",
        fuente: "NASA DONKI",
      };
    }
    const serie = (datos && datos.radlab && datos.radlab.serie) || [], base = (datos && datos.radlab && datos.radlab.base) || 0;
    if (serie.length && base) {
      const max = Math.max(...serie.map((x) => x.dosis / base));
      const r = Math.round(max), ops = [`Unas ${r} veces más`, `Unas ${Math.max(2, Math.round(r / 10))} veces más`, "Igual que un día normal", `Unas ${r * 10} veces más`];
      return {
        id: "B-radiacion", nivel: 2, tipo: "bitacora", tema: "radiacion", barra: "radiacion",
        enunciado: "Abre tu bitácora en «Datos NASA». En la peor tormenta, ¿cuánta radiación hubo comparada con un día normal?",
        opciones: ops, indiceCorrecto: 0,
        fraseEvidencia: `Datos NASA (RadLab): hasta ${r} veces más radiación de lo normal.`,
        explicacion: "En una tormenta solar la radiación puede subir cientos de veces. Por eso el refugio es clave.",
        fuente: "NASA RadLab · CRaTER",
      };
    }
    return null;
  }

  // ---------- repaso: algo guardado en «Lo aprendido» de una misión anterior ----------
  // usa una pregunta del banco del mismo tema si hay; si no, «¿qué aprendiste sobre…?»
  function preguntaRepaso(aprendidos, banco, nivel, otrasExplicaciones = [], rnd = Math.random) {
    if (!aprendidos.length) return null;
    const a = aprendidos[Math.floor(rnd() * aprendidos.length)];
    const delTema = banco.filter((p) => p.tema && p.tema === a.tema);
    if (delTema.length) {
      const p = elegirPregunta(delTema, nivel, [], null, rnd);
      return Object.assign({}, p, { id: "R-" + p.id, tipo: "repaso", recuerdo: a });
    }
    const otras = [...new Set(otrasExplicaciones.filter((t) => t && t !== a.texto))].slice(0, 3);
    if (otras.length < 1) return null;
    return {
      id: "R-" + (a.clave || a.titulo), nivel, tipo: "repaso", tema: a.tema || null, barra: null, recuerdo: a,
      enunciado: `Repaso: en una misión pasada aprendiste sobre «${a.titulo}». ¿Qué te explicaron?`,
      opciones: [a.texto, ...otras], indiceCorrecto: 0,
      fraseEvidencia: `Bitácora, «Lo aprendido»: ${a.titulo}.`, explicacion: a.texto, fuente: a.quien || "Bitácora",
    };
  }

  // valida que una pregunta tenga el esquema completo
  const CAMPOS = ["id", "nivel", "tipo", "enunciado", "opciones", "indiceCorrecto", "fraseEvidencia", "explicacion", "fuente"];
  function validarPregunta(p) {
    const faltan = CAMPOS.filter((c) => p[c] === undefined || p[c] === null || p[c] === "");
    if (faltan.length) return "faltan: " + faltan.join(", ");
    if (![1, 2, 3].includes(p.nivel)) return "nivel inválido";
    if (!Array.isArray(p.opciones) || p.opciones.length < 2) return "pocas opciones";
    if (p.indiceCorrecto < 0 || p.indiceCorrecto >= p.opciones.length) return "indiceCorrecto fuera de rango";
    if (new Set(p.opciones).size !== p.opciones.length) return "opciones repetidas";
    if (p.barra && !BARRAS.includes(p.barra)) return "barra inválida";
    return null;
  }

  return {
    BARRAS, barajarConCorrecta, recortarOpciones, opcionesPorNivel, elegirPregunta, costoError, diasDeLlamada,
    respuestaAuto, zonaRadiacion, tendencia, preguntaBitacora, preguntaRepaso, validarPregunta, claseNum,
  };
});

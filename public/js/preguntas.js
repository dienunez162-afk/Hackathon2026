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

  // generador fijo a partir de un texto (el id de la pregunta): el mismo orden en todas las partidas
  function semilla(texto) {
    let h = 2166136261;
    for (const ch of String(texto)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
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
  // orden fijo por pregunta: misma pregunta, mismo orden de opciones en cada partida
  const barajarFijo = (opciones, indiceCorrecto, clave) => barajarConCorrecta(opciones, indiceCorrecto, semilla(clave));

  // elige una pregunta del banco con el nivel pedido; si no queda ninguna, el nivel más cercano.
  // preferirTemas: temas que el niño ya leyó. Determinista: la primera libre en el orden del banco.
  function elegirPregunta(banco, nivel, usados = [], preferirTemas = null) {
    const libres = banco.filter((p) => !usados.includes(p.id));
    if (!libres.length) return null;
    for (let d = 0; d <= 2; d++) {
      for (const n of d === 0 ? [nivel] : [nivel - d, nivel + d]) {
        let pool = libres.filter((p) => p.nivel === n);
        if (preferirTemas && preferirTemas.length) { const conTema = pool.filter((p) => preferirTemas.includes(p.tema)); if (conTema.length) pool = conTema; }
        if (pool.length) return pool[0];
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
  // la clase de una llamarada en palabras (para 7-8 años), sin quitar el dato real: «M3.5 · fuerte»
  // misma escala que ya explicaba el juego: A, B y C son suaves; M y X son fuertes (X, la más fuerte). TODO NASA: confirmar redacción.
  const fuerzaDe = (c) => ({ X: "muy fuerte", M: "fuerte", C: "suave", B: "suave", A: "suave" })[String(c || "").charAt(0).toUpperCase()] || "";
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaTxt = (f) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(f || "")); return m ? `el ${+m[3]} de ${MESES[+m[2] - 1]}` : String(f || "").slice(0, 10); };
  function preguntaBitacora(datos) {
    const fl = ((datos && datos.donki && datos.donki.llamaradas) || []).filter((f) => f.clase && f.fecha);
    // se pregunta el DÍA de la más fuerte: hay que abrir la bitácora y leer el dato (la letra sola no basta)
    const dias = [...new Map(fl.map((f) => [fechaTxt(f.fecha), f])).values()];
    if (dias.length >= 2) {
      const fuerte = fl.reduce((m, f) => (claseNum(f.clase) > claseNum(m.clase) ? f : m));
      const otras = dias.filter((f) => fechaTxt(f.fecha) !== fechaTxt(fuerte.fecha)).sort((a, b) => claseNum(b.clase) - claseNum(a.clase));
      const ops = [fuerte, ...otras.slice(0, 3)].map((f) => fechaTxt(f.fecha));
      return {
        id: "B-llamarada", nivel: 2, tipo: "bitacora", tema: "radiacion", barra: "radiacion",
        enunciado: "Abre tu bitácora en «Datos NASA». ¿Qué día fue la llamarada solar más fuerte?",
        opciones: ops, indiceCorrecto: 0,
        fraseEvidencia: `Datos NASA: la más fuerte fue ${fuerte.clase} (${fuerzaDe(fuerte.clase)}) ${fechaTxt(fuerte.fecha)}.`,
        explicacion: `La letra dice qué tan fuerte es: A, B y C son suaves; M y X son fuertes. ${fuerte.clase} es ${fuerzaDe(fuerte.clase)}.`,
        fuente: "NASA DONKI", pista: "En la bitácora, busca la línea que dice «la más fuerte fue».",
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
        fuente: "NASA RadLab · CRaTER", pista: "En la bitácora, mira la barra más alta de la gráfica.",
      };
    }
    return null;
  }

  // ---------- repaso: algo guardado en «Lo aprendido» de una misión anterior ----------
  // usa una pregunta del banco del mismo tema si hay; si no, «¿qué aprendiste sobre…?»
  // determinista: repasa lo más reciente
  function preguntaRepaso(aprendidos, banco, nivel, otrasExplicaciones = []) {
    if (!aprendidos.length) return null;
    const a = aprendidos[aprendidos.length - 1];
    const delTema = banco.filter((p) => p.tema && p.tema === a.tema);
    if (delTema.length) {
      const p = elegirPregunta(delTema, nivel, [], null);
      return Object.assign({}, p, { id: "R-" + p.id, tipo: "repaso", recuerdo: a });
    }
    const otras = [...new Set(otrasExplicaciones.filter((t) => t && t !== a.texto))].slice(0, 3);
    if (otras.length < 1) return null;
    return {
      id: "R-" + (a.clave || a.titulo), nivel, tipo: "repaso", tema: a.tema || null, barra: null, recuerdo: a,
      enunciado: `Repaso: en una misión pasada aprendiste sobre «${a.titulo}». ¿Qué te explicaron?`,
      opciones: [a.texto, ...otras], indiceCorrecto: 0,
      fraseEvidencia: `Bitácora, «Lo aprendido»: ${a.titulo}.`, explicacion: a.texto, fuente: a.quien || "Bitácora",
      pista: "Abre tu bitácora en «Lo aprendido» y busca ese título.",
    };
  }

  // valida que una pregunta tenga el esquema completo
  const CAMPOS = ["id", "nivel", "tipo", "enunciado", "opciones", "indiceCorrecto", "fraseEvidencia", "explicacion", "fuente", "pista"];
  function validarPregunta(p) {
    if (!p || typeof p !== "object") return "no es una pregunta";
    const faltan = CAMPOS.filter((c) => p[c] === undefined || p[c] === null || p[c] === "");
    if (faltan.length) return "faltan: " + faltan.join(", ");
    if (![1, 2, 3].includes(p.nivel)) return "nivel inválido";
    if (!Array.isArray(p.opciones) || p.opciones.length < 2) return "pocas opciones";
    if (!p.opciones.every((o) => typeof o === "string" && o.trim())) return "opción vacía o que no es texto";
    if (!Number.isInteger(p.indiceCorrecto)) return "indiceCorrecto no es entero";
    if (p.indiceCorrecto < 0 || p.indiceCorrecto >= p.opciones.length) return "indiceCorrecto fuera de rango";
    if (new Set(p.opciones).size !== p.opciones.length) return "opciones repetidas";
    if (p.barra && !BARRAS.includes(p.barra)) return "barra inválida";
    return null;
  }

  return {
    BARRAS, barajarConCorrecta, barajarFijo, semilla, recortarOpciones, opcionesPorNivel, elegirPregunta, costoError, diasDeLlamada,
    respuestaAuto, zonaRadiacion, tendencia, preguntaBitacora, preguntaRepaso, validarPregunta, claseNum, fuerzaDe, fechaTxt,
  };
});

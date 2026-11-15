// Motor de simulación de la misión lunar: recorre el grafo y aplica barras, cartas, llamadas de situación,
// averías y el manual para el siguiente capitán. Funciona en Node (module.exports) y en el navegador (window.SimMision).
(function (root) {
  const BARRAS = ["radiacion", "energia", "comida", "salud"];

  // barras[b] = { inicio, mejor: "alta"|"baja", verde, rojo }
  function zona(barras, b, v) {
    const z = barras[b];
    if (z.mejor === "baja") return v <= z.verde ? "verde" : v > z.rojo ? "rojo" : "amarillo";
    return v >= z.verde ? "verde" : v < z.rojo ? "rojo" : "amarillo";
  }
  function conteo(barras, st) {
    const c = { verde: 0, amarillo: 0, rojo: 0 };
    for (const b of BARRAS) c[zona(barras, b, st[b])]++;
    return c;
  }
  const CONDICIONES = {
    experto: (c) => c.verde === 4,
    rescate: (c) => c.rojo >= 1,
    normal: (c) => c.verde < 4 && c.rojo === 0,
    tres_estrellas: (c, st) => c.verde === 4 && st.mision >= 3,
    dos_estrellas: (c, st) => c.verde === 4 && st.mision < 3,
    una_estrella: (c) => c.verde < 4,
  };

  const salud = (st, b) => (b === "radiacion" ? 100 - st[b] : st[b]);
  const empeora = (b, v) => (b === "radiacion" ? v > 0 : v < 0);
  const mejora = (b, v) => (b === "radiacion" ? -v : v);   // valor "bueno" para sumar a una barra
  const clip = (x, a, b) => Math.max(a, Math.min(b, x));
  function masDebil(st) {
    return BARRAS.reduce((m, b) => (salud(st, b) < salud(st, m) ? b : m), BARRAS[0]);
  }
  function aplicarBruto(st, ef) {
    if (!ef) return;
    for (const [k, v] of Object.entries(ef)) {
      if (k === "mision") st.mision += v;
      else if (k === "barraMasBaja") { const b = masDebil(st); st[b] += mejora(b, v); }
      else st[k] += v;
    }
    for (const b of BARRAS) st[b] = clip(st[b], 0, 100);
  }
  function suavizar(ef) {
    const o = {};
    for (const [k, v] of Object.entries(ef || {})) o[k] = k !== "mision" && empeora(k, v) ? Math.round(v / 2) : v;
    return o;
  }
  function fracaso(st) {
    if (st.radiacion >= 100) return "radiacion";
    for (const b of ["energia", "comida", "salud"]) if (st[b] <= 0) return b;
    return null;
  }

  /**
   * opts:
   *  habilidad   probabilidad de ganar cada minijuego (0-1)
   *  retencion   probabilidad de entender y aplicar un concepto (0-1): predicciones, acciones, diagnósticos,
   *              uso de cartas y manual. Si no se da, igual a la habilidad.
   *  responder   fn(ctx) => boolean, opcional: reemplaza `retencion` con un modelo propio (ctx.paso dice qué se decide)
   *  retos       contenido de retos-mision-lunar.json (sin él no hay llamadas, averías, cartas ni manual)
   *  modoUso     "libre" (por defecto: empieza en nivel 2 y se calibra) o "educativo" (nivel inicial según el grado)
   *  grado       1 a 6, solo en modo educativo
   *  nivel       si se da junto con adaptar:false, fija el nivel (para pruebas); si no, el nivel se ajusta solo
   *  historial   { temas, repasos, cartas, niveles: { reto, lectura, ventana } } de la partida anterior
   *  rnd         generador aleatorio
   */
  function simular(grafo, opts) {
    opts = opts || {};
    const rnd = opts.rnd || Math.random;
    const habilidad = opts.habilidad != null ? opts.habilidad : 0.6;
    const retencion = opts.retencion != null ? opts.retencion : habilidad;
    const R = opts.retos || null;
    const hist = opts.historial || {};
    // --- nivel adaptativo (dos perillas: reto y lectura); el niño nunca lo ve ---
    const AD = R && R.reglas.adaptacion;
    const adaptar = !!AD && opts.adaptar !== false;
    let nivelInicial;
    if (!adaptar) nivelInicial = clip(+(opts.nivel || 2), 1, 3);
    else if (hist.niveles) nivelInicial = hist.niveles.reto;
    else if (opts.modoUso === "educativo") nivelInicial = AD.modos.educativo.nivelPorGrado[String(opts.grado || 4)] || 2;
    else nivelInicial = AD.modos.libre.nivelInicial;
    const niv = {
      reto: nivelInicial,
      lectura: hist.niveles ? hist.niveles.lectura : nivelInicial,
      ventana: hist.niveles ? hist.niveles.ventana.slice() : [],
      desdeCambio: hist.niveles ? AD.enfriamiento : 0,
      calibrar: adaptar && !hist.niveles && opts.modoUso !== "educativo",
      inicial: { reto: nivelInicial, lectura: hist.niveles ? hist.niveles.lectura : nivelInicial },
      ajustes: [],
    };
    function registrarReto(ok, dia) {
      if (!adaptar) return;
      niv.ventana.push(!!ok); if (niv.ventana.length > AD.ventana) niv.ventana.shift();
      niv.desdeCambio++;
      const bien = niv.ventana.filter(Boolean).length;
      let accion = null;
      if (niv.calibrar && niv.ventana.length === AD.modos.libre.calibracion.retos) {
        niv.calibrar = false;
        if (bien === niv.ventana.length) accion = "sube"; else if (bien === 0) accion = "baja";
      } else if (niv.ventana.length >= AD.ventana && niv.desdeCambio >= AD.enfriamiento) {
        if (bien >= AD.sube) accion = "sube"; else if (bien <= AD.baja) accion = "baja";
      }
      if (!accion) return;
      const antes = { reto: niv.reto, lectura: niv.lectura };
      if (accion === "sube") { if (niv.lectura < niv.reto) niv.lectura++; else if (niv.reto < 3) niv.reto++; }
      else { if (niv.reto > 1) niv.reto--; niv.lectura = Math.min(niv.lectura, niv.reto); }
      if (antes.reto !== niv.reto || antes.lectura !== niv.lectura) {
        niv.ajustes.push({ dia, accion, de: antes, a: { reto: niv.reto, lectura: niv.lectura } });
        niv.ventana = []; niv.desdeCambio = 0;
      }
    }
    // más opciones y pistas que distraen = un poco más difícil acertar
    const ajusteNivel = () => (adaptar || opts.nivel ? (2 - niv.reto) * (AD ? AD.dificultadSimulada : 0) : 0);
    const nodos = Object.fromEntries(grafo.nodos.map((n) => [n.id, n]));
    const salientes = {};
    for (const a of grafo.aristas) (salientes[a.desde] = salientes[a.desde] || []).push(a);
    const st = { mision: 0 };
    for (const b of BARRAS) st[b] = grafo.barras[b].inicio;

    // decide si el niño "entiende" en este paso: modelo propio o probabilidad fija
    const entiende = (ctx, extra) => {
      const dif = ctx.paso === "carta" ? 0 : ajusteNivel();
      if (opts.responder) { const p = opts.responder(ctx); return typeof p === "number" ? rnd() < clip(p + dif, 0.02, 0.98) : !!p; }
      return rnd() < clip(retencion + (extra || 0) + dif, 0.02, 0.98);
    };

    // --- aprendizaje y cartas ---
    const aprendidos = {};            // tema -> día en que lo vivió en esta partida
    const cartas = {};                // tema -> { desde, usada }
    const bitacora = [];
    const registro = [];              // todo lo que el niño decidió (se guarda en Supabase)
    const usos = [];                  // cartas usadas
    for (const t of hist.cartas || []) { cartas[t] = { desde: 0, usada: false, delManual: true }; aprendidos[t] = -99; }

    // un efecto que empeora una barra pasa primero por el escudo de su carta, si el niño decide usarlo
    function aplicar(ef, dia) {
      if (!ef) return;
      const o = { ...ef };
      if (R) for (const [k, v] of Object.entries(o)) {
        if (k === "mision" || !empeora(k, v)) continue;
        const t = Object.keys(cartas).find((t) => !cartas[t].usada && R.temas[t].carta.uso.tipo === "escudo" && R.temas[t].carta.uso.barra === k);
        if (t && entiende({ paso: "carta", tema: t, dia })) { o[k] = Math.round(v / 2); cartas[t].usada = true; usos.push({ carta: R.temas[t].carta.id, tema: t, dia, tipo: "escudo" }); }
      }
      aplicarBruto(st, o);
    }
    // al final del día, una carta de recurso se usa si su barra es la más débil y no está en verde
    function usarRecursos(dia) {
      if (!R) return;
      for (const t of Object.keys(cartas)) {
        const c = R.temas[t].carta, u = c.uso;
        if (cartas[t].usada || u.tipo !== "recurso") continue;
        if (u.soloDeDia && dia > 10) continue;
        if (masDebil(st) !== u.barra || zona(grafo.barras, u.barra, st[u.barra]) === "verde") continue;
        if (entiende({ paso: "carta", tema: t, dia })) { aplicarBruto(st, { [u.barra]: mejora(u.barra, u.valor) }); cartas[t].usada = true; usos.push({ carta: c.id, tema: t, dia, tipo: "recurso" }); }
      }
    }

    // --- llamadas (situaciones) ---
    const repasos = [];                                    // { tema, disponible, intentos }
    const pasados = (hist.repasos || []).slice();
    const preguntados = {};
    let preparado = false, ramaActual = null;
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const diasLlamada = R ? R.reglas.llamadas.ventanas.map((v) => pick(v.dias)) : [];
    const diasAveria = R ? R.reglas.averias.ventanas.map((v) => {
      const libres = v.dias.filter((d) => !diasLlamada.includes(d));
      return pick(libres.length ? libres : v.dias);
    }) : [];
    const hechas = new Set(), averiasHechas = new Set();
    const situacionDe = (t) => R.situaciones.find((s) => s.tema === t);
    // en la fase 1 y en la rama Rescate los errores cuestan la mitad y la científica ayuda desde el inicio
    // (también cuando alguna barra ya está en rojo, para que un error no hunda al niño)
    const conApoyo = () => R && (R.reglas.apoyo.ramas.includes(ramaActual || "fase1") || conteo(grafo.barras, st).rojo > 0);

    function elegirTema(dia, idx) {
      if (idx === 0 && pasados.length) return { tema: pasados.shift(), origen: "repaso", intentos: 1 };
      if (idx === 0 && hist.temas && hist.temas.length) return { tema: pick(hist.temas), origen: "partida_pasada" };
      const rp = idx > 0 && repasos.find((r) => r.disponible <= dia);
      if (rp) { repasos.splice(repasos.indexOf(rp), 1); return { tema: rp.tema, origen: "repaso", intentos: rp.intentos + 1 }; }
      const listos = Object.keys(aprendidos).filter((t) => aprendidos[t] <= dia - 2);
      const pool = listos.length ? listos : Object.keys(aprendidos);
      if (!pool.length) return null;
      const min = Math.min(...pool.map((t) => preguntados[t] || 0));
      return { tema: pick(pool.filter((t) => (preguntados[t] || 0) === min)), origen: "esta_partida" };
    }

    function llamada(n, idx) {
      const sel = elegirTema(n.dia, idx);
      if (!sel) return null;
      const s = situacionDe(sel.tema);
      preguntados[sel.tema] = (preguntados[sel.tema] || 0) + 1;
      const desde = aprendidos[sel.tema] != null && aprendidos[sel.tema] >= 0 ? n.dia - aprendidos[sel.tema] : null;
      const nOpciones = niv.reto + 1;
      const base = { tipo: "situacion", id: s.id, tema: s.tema, origen: sel.origen, dia: n.dia, nivel: niv.reto, nivelLectura: niv.lectura, rama: ramaActual, diasDesdeAprendido: desde };
      const prediccionOk = entiende({ ...base, paso: "prediccion" });
      const accionOk = entiende({ ...base, paso: "accion", prediccionOk }, prediccionOk ? 0.1 : -0.1);
      const accion = accionOk ? s.acciones[s.correcta] : s.acciones[1 + Math.floor(rnd() * (nOpciones - 1))];
      aplicar(!accionOk && conApoyo() ? suavizar(accion.efectos) : accion.efectos, n.dia);
      const r = { ...base, prediccionOk, accionOk, accion: accion.texto, premio: null };
      if (accionOk && prediccionOk) {
        const b = masDebil(st);
        if (zona(grafo.barras, b, st[b]) !== "verde") { r.premio = "recarga"; aplicarBruto(st, { barraMasBaja: R.powerups.recarga.valor }); }
        else { r.premio = "pronostico"; preparado = true; }
      }
      if (!accionOk) {
        const intentos = sel.intentos || 1;
        if (intentos < 2) repasos.push({ tema: s.tema, disponible: n.dia + 2, intentos });
        else diferidos.push(s.tema);
      }
      r.estado = { ...st };
      registro.push(r);
      registrarReto(accionOk, n.dia);
      return r;
    }
    const diferidos = [];

    // --- averías ---
    function averia(n) {
      const fase = n.dia >= 11 ? 3 : 2;
      const pool = R.averias.filter((a) => a.fases.includes(fase));
      const conCarta = pool.filter((a) => a.temas.some((t) => cartas[t]));
      const a = pick(conCarta.length ? conCarta : pool);
      const tieneCarta = a.temas.some((t) => cartas[t]);
      const A = R.reglas.averias, b = a.barra;
      const dano = (v) => ({ [b]: b === "radiacion" ? v : -v });
      const apoyo = conApoyo();
      const porError = apoyo ? Math.round(A.danoPorError / 2) : A.danoPorError;
      aplicar(dano(A.danoInicial), n.dia);
      const base = { tipo: "averia", id: a.id, tema: a.temas[0], dia: n.dia, nivel: niv.reto, nivelLectura: niv.lectura, rama: ramaActual, conCarta: tieneCarta, conApoyo: apoyo };
      let intentos = 1;
      if (!entiende({ ...base, paso: "diagnostico", intento: 1 }, (tieneCarta ? 0.15 : 0) + (apoyo ? 0.1 : 0))) {
        aplicar(dano(porError), n.dia); intentos = 2;
        if (!entiende({ ...base, paso: "diagnostico", intento: 2 }, (1 - retencion) / 2)) { aplicar(dano(porError), n.dia); intentos = 3; }
      }
      if (intentos === 1) aplicarBruto(st, { [b]: mejora(b, A.bonusPrimerIntento) });
      else if (a.temas.every((t) => !repasos.some((r) => r.tema === t))) repasos.push({ tema: a.temas[0], disponible: n.dia + 2, intentos: 1 });
      const r = { ...base, intentos, accionOk: intentos === 1, estado: { ...st } };
      registro.push(r);
      registrarReto(intentos === 1, n.dia);
      return r;
    }

    // --- manual para el siguiente capitán ---
    function manual(dia) {
      if (!R) return [];
      const k = R.reglas.manual.cartasPorNivel[String(niv.reto)];
      const nivel = niv.reto;
      const propias = Object.keys(cartas);
      const elegidas = [];
      while (elegidas.length < k && elegidas.length < propias.length) {
        const t = pick(propias.filter((x) => !elegidas.includes(x)));
        elegidas.push(t);
      }
      const bien = elegidas.filter((t) => entiende({ tipo: "manual", tema: t, paso: "manual", dia, nivel }));
      registro.push({ tipo: "manual", dia, nivel, elegidas, aciertos: bien.length, total: elegidas.length, accionOk: elegidas.length > 0 && bien.length === elegidas.length });
      return bien;
    }

    const camino = [];
    let id = "INICIO";
    const fin = (final, dia) => {
      const paraManual = manual(dia);
      return {
        final, camino, estado: st, bitacora, registro, usos,
        cartas: Object.keys(cartas),
        niveles: { inicial: niv.inicial, final: { reto: niv.reto, lectura: niv.lectura }, ajustes: niv.ajustes },
        // para la siguiente partida
        historialSiguiente: {
          temas: Object.keys(aprendidos).filter((t) => aprendidos[t] >= 0),
          repasos: [...new Set([...pasados, ...diferidos, ...repasos.map((r) => r.tema)])].slice(-3),
          cartas: paraManual,
          niveles: adaptar ? { reto: niv.reto, lectura: niv.lectura, ventana: niv.ventana.slice() } : undefined,
        },
      };
    };

    for (let guard = 0; guard < 100; guard++) {
      const n = nodos[id];
      const paso = { id, dia: n.dia, resultado: null, opcion: null, rama: null };
      const r = n.resultado || {};
      if (r.exito || r.fallo) {
        const ok = rnd() < habilidad;
        paso.resultado = ok ? "exito" : "fallo";
        aplicar(ok ? r.exito : preparado ? suavizar(r.fallo) : r.fallo, n.dia);
        if (preparado) { paso.preparado = true; preparado = false; }
      } else if (r.opciones) {
        const peorTras = (ef) => { const t = { ...st }; aplicarBruto(t, ef); return Math.min(...BARRAS.map((b) => salud(t, b))); };
        const o = rnd() < habilidad ? r.opciones.reduce((m, x) => (peorTras(x.efectos) > peorTras(m.efectos) ? x : m)) : pick(r.opciones);
        paso.opcion = o.texto;
        aplicar(o.efectos, n.dia);
      } else if (r.siempre) aplicar(r.siempre, n.dia);

      // el informe desbloquea la carta del tema
      if (n.informe && n.tipo !== "final") {
        const t = n.informe.tema;
        if (aprendidos[t] == null || aprendidos[t] < 0) aprendidos[t] = aprendidos[t] == null ? n.dia : aprendidos[t];
        if (R && !cartas[t]) { cartas[t] = { desde: n.dia, usada: false }; paso.cartaNueva = R.temas[t].carta.id; }
        bitacora.push({ entrada: n.id, tema: t, dia: n.dia });
      }

      if (n.tipo !== "evaluacion" && n.tipo !== "final" && n.dia >= 1) {
        const c = n.dia >= grafo.consumoDiario.noche.dias[0] ? grafo.consumoDiario.noche : grafo.consumoDiario.dia;
        aplicarBruto(st, { energia: c.energia, comida: c.comida, salud: c.salud, radiacion: c.radiacion });
      }

      let f = fracaso(st);
      if (!f && R && n.tipo !== "evaluacion" && n.tipo !== "final") {
        const idx = diasLlamada.indexOf(n.dia);
        if (idx >= 0 && !hechas.has(idx)) { hechas.add(idx); paso.llamada = llamada(n, idx); f = fracaso(st); }
        const ia = diasAveria.indexOf(n.dia);
        if (!f && ia >= 0 && !averiasHechas.has(ia)) { averiasHechas.add(ia); paso.averia = averia(n); f = fracaso(st); }
        if (!f) usarRecursos(n.dia);
      }
      paso.estado = { ...st };
      camino.push(paso);

      if (f) {
        const fid = "FAIL-" + f;
        camino.push({ id: fid, dia: n.dia, estado: { ...st } });
        return fin(fid, n.dia);
      }
      if (n.tipo === "final") return fin(id, n.dia);

      const out = salientes[id] || [];
      let arista;
      if (out.some((a) => a.condicion)) {
        arista = out.find((a) => CONDICIONES[a.condicion](conteo(grafo.barras, st), st));
        if (["experto", "normal", "rescate"].includes(arista.condicion)) ramaActual = arista.condicion;
      } else {
        const total = out.reduce((s, a) => s + a.peso, 0);
        let x = rnd() * total;
        arista = out.find((a) => (x -= a.peso) < 0) || out[out.length - 1];
      }
      paso.rama = arista.condicion || null;
      id = arista.hacia;
    }
    throw new Error("El grafo tiene un ciclo");
  }

  const api = { BARRAS, zona, conteo, CONDICIONES, simular };
  if (typeof module !== "undefined") module.exports = api;
  else root.SimMision = api;
})(this);

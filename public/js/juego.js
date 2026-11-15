/* =========================================================
   G-NOSIS  -  el juego
   Menú y alunizaje: los de main.js (arte original de la intro).
   Después: la base, día por día. Cada día el niño va en el plano
   al módulo donde pasa algo, juega el minijuego del evento, decide,
   contesta llamadas, diagnostica averías y gana cartas. Al final se
   ve la cinemática de finales.js y escribe el manual del siguiente
   capitán. Reglas y datos: grafo-mision-lunar.json y
   retos-mision-lunar.json (en js/datos.js).
   ========================================================= */
(() => {
  "use strict";
  const G = window.GRAFO, R = window.RETOS, E = window.GNOSIS_ESCENAS, APIS = window.GNOSIS_APIS;
  const PD = window.PREGUNTAS_DATOS, PQ = window.PREGUNTAS;   // banco y lógica de preguntas (preguntas.js)
  const byId = Object.fromEntries(G.nodos.map((n) => [n.id, n]));
  const outE = {};
  for (const a of G.aristas) (outE[a.desde] = outE[a.desde] || []).push(a);
  const BARRAS = ["radiacion", "energia", "comida", "salud"];
  const MAYUS = { radiacion: "RADIACIÓN", energia: "ENERGÍA", comida: "COMIDA", salud: "SALUD" };
  const MINUS = { radiacion: "radiación", energia: "energía", comida: "comida", salud: "salud" };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const barajar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lim = (x, a, b) => Math.max(a, Math.min(b, x));
  const guardarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leerLS = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const CLAVE = "gnosis-progreso-v1";

  // ---------- escenarios, estados y minijuegos de cada nodo ----------
  const NOMBRE_ESC = { exterior: "el exterior de la base", paneles: "los paneles solares", crater: "el cráter de sombra", control: "la sala de control", invernadero: "el invernadero", maquinas: "la sala de máquinas", pasillo: "el pasillo y el refugio", plano: "el plano" };
  const MODULO_DE = { control: "control", invernadero: "invernadero", maquinas: "maquinas", pasillo: "pasillo", paneles: "paneles" };
  const ESTADO_NODO = {
    "F1-D2a": { polvo: true }, "F1-D2b": { sismo: true }, "N-D7": { llamada: true },
    "E-D6": { alarma: true }, "N-D6": { alarma: true }, "R-D6": { alarma: true }, "R-D12": { alarma: true }, "N-D12b": { alarma: true }, "E-D13": { alarma: true, oscuro: true },
    "E-D8a": { agujero: true, alarma: true }, "E-D8b": { moho: true }, "N-D8a": { fuga: true }, "N-D8b": { calor: true },
    "F2-D10": { noche: true }, "R-D11": { ahorro: true }, "E-D11": { radar: true }, "N-D13": { radar: true },
    "E-D12a": { sismo: true, alarma: true }, "E-D12b": { alarma: true }, "N-D12a": { roto: true }, "R-D8": { nave: true }, "F3-D14": { nave: true },
  };
  const ESTADO_AVERIA = {
    "A-polvo": { polvo: true }, "A-golpe": { roto: true }, "A-noche": { noche: true, ahorro: true }, "A-fuga": { fuga: true, alarma: true },
    "A-moho": { moho: true, agua: true }, "A-calor": { calor: true, alarma: true }, "A-compuerta": { compuerta: true, alarma: true },
  };
  const FILTROS = ["Rejilla para lo grande", "Arena para lo fino", "Carbón para olores", "Luz UV para gérmenes", "Tanque de agua limpia"];
  const COSECHA = ["Prender las luces", "Regar lo justo", "Esperar a que crezcan", "Cosechar", "Guardar en el almacén"];
  const PANEL = ["Apagar el panel", "Quitar la pieza rota", "Poner la pieza nueva", "Conectar los cables", "Probar con luz"];
  const MJ_DE = {
    "F1-D1": { tipo: "cables", titulo: "Conecta los cables de los paneles" },
    "F1-D2a": { tipo: "limpiar" },
    "F1-D2b": { tipo: "atrapar", objeto: "caja de comida", titulo: "¡Atrapa las cajas que se caen!" },
    "F1-D4": { tipo: "grafica", modo: "radiacion" },
    "E-D5": { tipo: "grafica", modo: "pronostico" },
    "E-D6": { tipo: "laberinto", tiempo: "corto" }, "N-D6": { tipo: "laberinto" }, "N-D12b": { tipo: "laberinto" },
    "R-D6": { tipo: "laberinto", tiempo: "largo" }, "R-D12": { tipo: "laberinto", tiempo: "largo" },
    "E-D13": { tipo: "laberinto", tiempo: "corto", oscuro: true },
    "E-D7": { tipo: "secuencia", pasos: FILTROS, titulo: "Pon los filtros del agua en orden" },
    "E-D8a": { tipo: "tapar" }, "E-D8b": { tipo: "buscar", objetivo: "enfermas" },
    "N-D5": { tipo: "secuencia", pasos: COSECHA, titulo: "Cosecha paso a paso" },
    "N-D7": { tipo: "quiz" }, "N-D8a": { tipo: "buscar", objetivo: "fuga" }, "N-D8b": { tipo: "ajustar", meta: "enfriar" },
    "R-D7": { tipo: "buscar", objetivo: "maduras" }, "F2-D10": { tipo: "energia" },
    "E-D11": { tipo: "rover" }, "N-D13": { tipo: "rover", guia: true },
    "E-D12a": { tipo: "atrapar", objeto: "pieza", titulo: "¡Sujeta las piezas que se caen!" },
    "E-D12b": { tipo: "cables", titulo: "Reconecta la calefacción" }, "N-D11": { tipo: "ajustar", meta: "calentar" },
    "N-D12a": { tipo: "secuencia", pasos: PANEL, titulo: "Repara el panel en orden" }, "F3-D14": { tipo: "aterrizar", titulo: "Aterriza la nave del relevo" },
  };
  const FINAL_DE = { "FIN-3": "perfecta", "FIN-2": "verde", "FIN-1": "relevo", "FAIL-energia": "apagon", "FAIL-comida": "despensa", "FAIL-radiacion": "radiacion", "FAIL-salud": "agotado" };
  const RECORRIDO = [
    ["paneles", "Paneles solares: con la luz del Sol hacen la energía de la base."],
    ["control", "Sala de control: aquí contestas las llamadas de Control de Misión."],
    ["invernadero", "Invernadero: aquí crece tu comida."],
    ["maquinas", "Máquinas y almacén: el agua, la calefacción y la comida guardada."],
    ["pasillo", "Pasillo y refugio: si llega una tormenta solar, corre aquí."],
  ];

  // ---------- controles del equipo (fuera del juego) ----------
  const qs = new URLSearchParams(location.search);
  const guardadoUso = leerLS("gnosis-uso") || {};
  const ui = {
    uso: guardadoUso.uso || "libre", grado: guardadoUso.grado || 4,
    modo: qs.get("auto") ? "auto" : "manual", vel: +qs.get("vel") || 1, hab: 0.7, comp: 0.65, voz: true, textoGrande: false,
    // prueba de lectura (solo equipo): oculta los textos para comparar aciertos con y sin leer
    sinTexto: qs.get("sintexto") === "1", lecturaStats: { con: { ok: 0, n: 0 }, sin: { ok: 0, n: 0 } },
  };
  const app = $("app"), stage = $("stage"), hud = $("hud"), ctrl = $("ctrl"), $c = $("consola"), $mj = $("mj");
  // las herramientas del equipo (modo automático, niveles, saltar a un final) solo salen con ?equipo=1 (o ?auto / ?final): un niño no debe verlas
  if (!qs.get("equipo") && !qs.get("auto") && !qs.get("final")) ctrl.style.display = "none";
  function pintarCtl() {
    ctrl.querySelectorAll("[data-uso]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.uso === ui.uso)));
    $("l-grado").hidden = ui.uso !== "educativo";
    $("c-grado").value = String(ui.grado);
    ctrl.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === ui.modo)));
    ctrl.querySelectorAll("[data-vel]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.vel === ui.vel)));
    $("c-voz").setAttribute("aria-pressed", String(ui.voz));
    $("c-sintexto").setAttribute("aria-pressed", String(ui.sinTexto));
    const ls = ui.lecturaStats, pct = (x) => (x.n ? Math.round(100 * x.ok / x.n) + "%" : "—");
    $("c-lectura").textContent = `con texto ${ls.con.ok}/${ls.con.n} (${pct(ls.con)}) · sin texto ${ls.sin.ok}/${ls.sin.n} (${pct(ls.sin)})`;
    $("o-hab").textContent = Math.round(ui.hab * 100) + "%";
    $("o-comp").textContent = Math.round(ui.comp * 100) + "%";
    $("c-apis").textContent = `DONKI: ${APIS.estado.donki} · RadLab: ${APIS.estado.radlab} · OSDR: ${APIS.estado.osdr}`;
  }
  ctrl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.uso) { ui.uso = b.dataset.uso; guardarLS("gnosis-uso", { uso: ui.uso, grado: ui.grado }); }
    else if (b.dataset.modo) ui.modo = b.dataset.modo;
    else if (b.dataset.vel) ui.vel = +b.dataset.vel;
    else if (b.id === "c-voz") ui.voz = !ui.voz;
    else if (b.id === "c-sintexto") ui.sinTexto = !ui.sinTexto;
    else if (b.id === "c-reiniciar") {
      if (estado === "menu") elegir("JUGAR");
      else { abortar(); if (typeof finalActual !== "undefined") finalActual = null; entrarJuego(); }   // también desde un final o el alunizaje
    }
    else if (b.id === "c-menu") volverAlMenu();
    else if (b.id === "c-borrar") { historial = null; partidas = 0; if (window.BITACORA) BITACORA.borrar(); try { localStorage.removeItem(CLAVE); } catch (e2) { /* nada */ } toast("Se borró el progreso guardado en este dispositivo."); if (J) pintarEquipo(); }
    else if (b.dataset.final) { abortar(); hud.hidden = true; estado = "final"; iniciarFinal(b.dataset.final, () => volverAlMenu()); MUSICA_BASE.sincronizar(); }
    pintarCtl();
  });
  $("c-hab").addEventListener("input", (e) => { ui.hab = +e.target.value / 100; pintarCtl(); });
  $("c-comp").addEventListener("input", (e) => { ui.comp = +e.target.value / 100; pintarCtl(); });
  $("c-grado").addEventListener("change", (e) => { ui.grado = +e.target.value; guardarLS("gnosis-uso", { uso: ui.uso, grado: ui.grado }); });
  ctrl.addEventListener("toggle", () => setTimeout(ajustar, 0));

  // Con el HUD visible el escenario mide 1280 x 940: la escena 16:9 arriba (completa, sin nada encima)
  // y una franja de 220 px abajo para las barras y el cuadro de texto. En el menú y los finales, solo la escena.
  const FRANJA = 240;
  function ajustar() {
    const alto = 720;                                  // siempre 16:9 (2560x1440 a pantalla completa); la franja va dentro
    const disp = Math.max(160, window.innerHeight - ctrl.offsetHeight);
    const w = Math.min(window.innerWidth, disp * 1280 / alto), h = w * alto / 1280;
    stage.style.width = w + "px"; stage.style.height = h + "px";
    stage.style.setProperty("--k", w / 1280);         // escala para lo que va encima del canvas (selector de idioma)
    hud.style.transform = `scale(${w / 1280})`;
  }
  // zoom de la escena en la partida: lo que va de y = +360 (arriba) a y = -VISTA_ABAJO tiene que caber
  // arriba de la franja de abajo. Se calcula con su alto real: si la franja cambia, la escena se ajusta sola.
  const VISTA_ABAJO = 300;
  function zoomEscena() {
    const f = $("franja"), alto = f ? f.offsetTop : 720;
    return Math.max(1, Math.min(1.8, (360 + VISTA_ABAJO) / Math.max(200, alto)));
  }
  window.addEventListener("resize", ajustar);
  new MutationObserver(ajustar).observe(hud, { attributes: true, attributeFilter: ["hidden"] });
  // el cuadro de texto es bajo: cuando una pantalla crece (llamadas con varios pasos, informes),
  // se desplaza solo para que se vea lo que toca responder ahora, con el texto anterior arriba
  let enfoqueId = 0;
  new MutationObserver(() => {
    cancelAnimationFrame(enfoqueId);
    enfoqueId = requestAnimationFrame(() => {
      const c = $("consola");
      if (c.hidden || c.scrollHeight <= c.clientHeight) return;
      const activos = [...c.querySelectorAll(".ops")].filter((o) => o.querySelector("button:not([disabled])"));
      const meta = activos.length ? activos[activos.length - 1] : c.lastElementChild;
      if (!meta) return;
      const arriba = (el) => { let y = 0; for (let e = el; e && e !== c; e = e.offsetParent) y += e.offsetTop; return y; };
      // se ve la pregunta (lo que va justo antes de los botones) y los botones; si no caben juntos, desde la pregunta
      const pregunta = meta.previousElementSibling || meta, y0 = arriba(pregunta), y1 = arriba(meta) + meta.offsetHeight;
      const top = y1 - y0 + 16 <= c.clientHeight ? y1 - c.clientHeight + 12 : y0 - 6;
      c.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }).observe($("consola"), { childList: true, subtree: true });

  // ---------- menú y alunizaje (de main.js de G-NOSIS) ----------
  const TITLE = "G-NOSIS";
  const MENU = ["JUGAR"];
  const WHITE = "rgb(235,240,255)", DIM = "rgb(110,118,135)", ACCENT = "rgb(255,246,225)";
  const canvas = $("juego");                         // visible, 2560x1440
  const vctx = canvas.getContext("2d");
  const ESCALA = canvas.width / W;                     // 2
  const lienzo = document.createElement("canvas");     // interno, 1280x720
  lienzo.width = W; lienzo.height = H;
  const ctx = lienzo.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  let estado = "menu", menuStart = 0, seqStart = 0, seqT0 = 0, fadeStart = 0, juegoT0 = 0, ultimaEscena = 0;
  let selected = 0, itemRects = [], seq = null, last = 0, estadoVisto = null;

  function drawSpaced(text, font, color, cx, cy, spacing) {
    ctx.font = font; ctx.fillStyle = color;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const ws = [...text].map((c) => ctx.measureText(c).width);
    let x = cx - (ws.reduce((a, b) => a + b, 0) + spacing * (ws.length - 1)) / 2;
    [...text].forEach((c, i) => { ctx.fillText(c, x, cy); x += ws[i] + spacing; });
  }
  function drawMenu(t, uiA = 1) {
    renderScene(ctx, t);
    const a = smooth((t - 1.2) / 1.2) * uiA;
    if (a > 0) {
      const tf = `bold 60px ${FONT_FAMILY}`;
      ctx.globalAlpha = 0.27 * a;
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) drawSpaced(TITLE, tf, "rgb(150,170,220)", W / 2 + dx, 56 + dy, 14);
      ctx.globalAlpha = a;
      drawSpaced(TITLE, tf, WHITE, W / 2, 56, 14);
      ctx.font = `13px ${FONT_FAMILY}`; ctx.fillStyle = DIM; ctx.textAlign = "center";
      ctx.fillText("// mision lunar", W / 2, 98);
      ctx.globalAlpha = 1;
    }
    const b = smooth((t - 2.0) / 1.0) * uiA;
    itemRects = [];
    ctx.font = `bold 26px ${FONT_FAMILY}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    MENU.forEach((item, i) => {
      const y = H - 68 + i * 40 - (MENU.length - 1) * 40;
      const sel = i === selected, blink = sel && Math.sin(t * 5) > -0.3;
      const nombre = window.tr ? tr(item) : item;     // JUGAR / PLAY
      const label = blink ? `>  ${nombre}  <` : `   ${nombre}   `;
      const w = ctx.measureText(label).width;
      ctx.globalAlpha = b;
      ctx.fillStyle = sel ? ACCENT : DIM;
      ctx.fillText(label, W / 2, y);
      itemRects.push({ x: W / 2 - w / 2, y: y - 18, w, h: 36 });
    });
    ctx.font = `13px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(70,76,92)";
    ctx.fillText("ENTER o toca JUGAR  -  F pantalla completa  -  M silenciar", W / 2, H - 22);
    ctx.globalAlpha = 1;
  }
  // la base: escena ASCII a 2560x1440, a ~12 cuadros por segundo (es pesada y no necesita más)
  function drawJuego(now) {
    if (now - ultimaEscena < 1000 / 12) return false;
    ultimaEscena = now;
    const t = (now - juegoT0) / 1000;
    const st = Object.assign({}, J ? J.est : {}, { noche: (J && (J.noche || J.est.noche)) || false, etiquetas: J ? J.escena === "plano" : false, zoom: zoomEscena() });
    try { E.render(vctx, J ? J.escena : "exterior", t, st); } catch (e) { console.error(e); }
    vctx.fillStyle = "rgba(3,5,10,0.22)"; vctx.fillRect(0, 0, canvas.width, canvas.height);
    stage.classList.toggle("tiembla", !!st.sismo);
    return true;
  }
  function elegir(item) {
    if (item !== "JUGAR") return;
    abortar(); hud.hidden = true;
    estado = "aterrizaje";
    seqT0 = (performance.now() - menuStart) / 1000;
    seqStart = performance.now();
    seq = new Aterrizaje(moonRadius());
    if (window.SFX) SFX.play("aterrizaje", 0);          // el golpe del alunizaje cae cuando la nave toca el suelo
  }
  function terminarAterrizaje() { estado = "fundido"; fadeStart = performance.now(); if (window.SFX) SFX.parar("aterrizaje"); }
  function entrarJuego() { estado = "juego"; juegoT0 = performance.now(); ultimaEscena = 0; hud.hidden = false; nuevaPartida(); MUSICA_BASE.sincronizar(); }
  function volverAlMenu() {
    if (PAUSA.activa) { PAUSA.poner(false); $("pausa").hidden = true; }
    abortar(); hud.hidden = true; $mj.hidden = true; stage.classList.remove("tiembla");
    if (typeof finalActual !== "undefined") finalActual = null;
    estado = "menu"; menuStart = performance.now() - 2500;
    MUSICA_BASE.sincronizar();
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    let menuLike = true;
    if (window.CUENTA) CUENTA.visible(estado === "menu");          // hamburguesa de cuenta solo en el menú principal
    if (estado !== estadoVisto) { estadoVisto = estado; if (window.I18N) I18N.enMenu(estado === "menu"); }   // selector de idioma: solo en el menú
    if (estado === "menu") drawMenu(Math.max(0, (now - menuStart) / 1000));
    else if (estado === "aterrizaje") {
      const s = (now - seqStart) / 1000;
      if (seq.done(s)) terminarAterrizaje();
      drawMenu(seqT0 + s, 1 - smooth(s / 0.8));
      seq.draw(ctx, s, dt);
    } else if (estado === "fundido") {
      const k = (now - fadeStart) / 660;
      drawMenu(seqT0 + T_FIN + k, 0);
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, k)})`;
      ctx.fillRect(0, 0, W, H);
      if (k >= 1) entrarJuego();
    } else if (estado === "final" && finalActual) {
      menuLike = false;
      dibujarFinal(vctx, tiempoFinal());
      vctx.save(); vctx.scale(ESCALA, ESCALA); dibujarBotonSonido(vctx); vctx.restore();
    } else {
      menuLike = false;
      if (drawJuego(now)) { vctx.save(); vctx.scale(ESCALA, ESCALA); dibujarBotonSonido(vctx); vctx.restore(); }
    }
    if (menuLike) {
      dibujarBotonSonido(ctx);
      vctx.imageSmoothingEnabled = false;
      vctx.drawImage(lienzo, 0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(frame);
  }
  function toCanvas(ev) {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) * W / r.width, (ev.clientY - r.top) * H / r.height];
  }
  const hit = (p, q) => p[0] >= q.x && p[0] <= q.x + q.w && p[1] >= q.y && p[1] <= q.y + q.h;
  // módulo del plano bajo el puntero (coordenadas centradas, y hacia arriba, como escenas.js)
  function moduloEn(p) {
    const z = zoomEscena(), x = (p[0] - W / 2) * z, y = H / 2 - p[1] * z;   // de la pantalla a la escena (con su zoom)
    const m = E.MODULOS.find((m) => x >= m.x0 && x <= m.x1 && y >= m.y0 && y <= m.y1);
    return m ? m.id : null;
  }
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else { const p = app.requestFullscreen?.(); if (p) p.catch(() => {}); }
  }
  window.addEventListener("keydown", (ev) => {
    const enCampo = ev.target instanceof HTMLButtonElement || ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement;
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) return;
    if (ev.key === "m" || ev.key === "M") return alternarSilencio();
    iniciarMusica();
    if ((ev.key === "f" || ev.key === "F") && !(J && J.enMinijuego)) return fullscreen();
    // en la partida (también en un minijuego), Escape abre o cierra la pausa: ya no se pierde la partida por accidente
    if (estado === "juego" && (ev.key === "Escape" || ev.key === "p" || ev.key === "P")) { ev.preventDefault(); return abrirPausa(!PAUSA.activa); }
    if (PAUSA.activa) return;
    if (estado === "menu") {
      if (ev.key === "ArrowUp" || ev.key === "w") selected = (selected - 1 + MENU.length) % MENU.length;
      else if (ev.key === "ArrowDown" || ev.key === "s") selected = (selected + 1) % MENU.length;
      else if ((ev.key === "Enter" || ev.key === " ") && !enCampo) elegir(MENU[selected]);
    } else if (estado === "aterrizaje") {
      if (["Enter", " ", "Escape"].includes(ev.key)) terminarAterrizaje();
    } else if (estado === "final") {
      if (["Enter", " ", "Escape"].includes(ev.key)) avanzarFinal();
    } else if (estado === "juego" && !(J && J.enMinijuego)) {
      if (ev.key === "Enter" && !enCampo) {
        const b = $c.querySelector(".op.prim:not([disabled])") || (() => { const v = $c.querySelectorAll(".op:not([disabled])"); return v.length === 1 ? v[0] : null; })();
        if (b) b.click();
      }
    }
  });
  canvas.addEventListener("pointermove", (ev) => {
    const p = toCanvas(ev);
    if (estado === "juego") { canvas.style.cursor = hit(p, botonSonido) || (J && J.esperaModulo && moduloEn(p) === J.esperaModulo) ? "pointer" : "default"; return; }
    if (estado !== "menu") { canvas.style.cursor = hit(p, botonSonido) ? "pointer" : "default"; return; }
    itemRects.forEach((q, i) => { if (hit(p, q)) selected = i; });
    canvas.style.cursor = itemRects.some((q) => hit(p, q)) || hit(p, botonSonido) ? "pointer" : "default";
  });
  canvas.addEventListener("pointerdown", (ev) => {
    const p = toCanvas(ev);
    if (hit(p, botonSonido)) return musicaIniciada ? alternarSilencio() : iniciarMusica();
    iniciarMusica();
    if (estado === "menu") itemRects.forEach((q, i) => { if (hit(p, q)) elegir(MENU[i]); });
    else if (estado === "aterrizaje") terminarAterrizaje();
    else if (estado === "final") avanzarFinal();
    else if (estado === "juego" && J && J.esperaModulo) {
      const m = moduloEn(p);
      if (m === J.esperaModulo) { const b = $c.querySelector(".op.prim:not([disabled])"); if (b) b.click(); }
      else if (m) toast("Ese no es: busca el módulo que parpadea.");
    }
  });

  // ---------- reglas (las mismas del simulador) ----------
  const zona = (b, v) => {
    const z = G.barras[b];
    if (z.mejor === "baja") return v <= z.verde ? "verde" : v > z.rojo ? "rojo" : "amarillo";
    return v >= z.verde ? "verde" : v < z.rojo ? "rojo" : "amarillo";
  };
  const conteo = (st) => { const c = { verde: 0, amarillo: 0, rojo: 0 }; for (const b of BARRAS) c[zona(b, st[b])]++; return c; };
  const COND = {
    experto: (c) => c.verde === 4, rescate: (c) => c.rojo >= 1, normal: (c) => c.verde < 4 && c.rojo === 0,
    tres_estrellas: (c, st) => c.verde === 4 && st.mision >= 3, dos_estrellas: (c, st) => c.verde === 4 && st.mision < 3,
    una_estrella: (c) => c.verde < 4,
  };
  const saludDe = (st, b) => (b === "radiacion" ? 100 - st[b] : st[b]);
  const empeora = (b, v) => (b === "radiacion" ? v > 0 : v < 0);
  const mejora = (b, v) => (b === "radiacion" ? -v : v);
  const masDebil = (st) => BARRAS.reduce((m, b) => (saludDe(st, b) < saludDe(st, m) ? b : m), BARRAS[0]);
  const suavizar = (ef) => { const o = {}; for (const [k, v] of Object.entries(ef || {})) o[k] = k !== "mision" && empeora(k, v) ? Math.round(v / 2) : v; return o; };
  function fracaso() {
    if (J.st.radiacion >= 100) return "radiacion";
    for (const b of ["energia", "comida", "salud"]) if (J.st[b] <= 0) return b;
    return null;
  }
  const conApoyo = () => R.reglas.apoyo.ramas.includes(J.rama || "fase1") || conteo(J.st).rojo > 0;

  // ---------- flujo asíncrono con cancelación ----------
  const ABORT = { abort: true };
  let tok = 0, timers = [];
  function abortar() {
    tok++; timers.forEach(clearTimeout); timers = [];
    if (J) { J.esperaModulo = null; J.enMinijuego = false; }
    $mj.hidden = true; $mj.innerHTML = ""; $c.hidden = false;
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
  }
  const timer = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const espera = (ms) => { const t = tok; return new Promise((res, rej) => timer(() => (t === tok ? res() : rej(ABORT)), ms / ui.vel)); };
  function botones(cont, opciones, { auto, delay = 1700 } = {}) {
    if (!cont.isConnected) { const vivo = $c.querySelector("#ops"); console.error("[G-NOSIS] botones sobre un panel que ya no está en pantalla"); if (vivo) cont = vivo; }
    const t = tok;
    return new Promise((res, rej) => {
      cont.innerHTML = opciones.map((o, i) => `<button type="button" class="op ${o.prim ? "prim" : ""} ${o.dis ? "ko" : ""}" data-i="${i}" ${o.dis ? "disabled" : ""}>${o.html}</button>`).join("");
      let hecho = false;
      const fin = (i) => {
        if (hecho) return; hecho = true;
        if (t !== tok) return rej(ABORT);
        cont.querySelectorAll(".op").forEach((b) => (b.disabled = true));
        const b = cont.querySelector(`[data-i="${i}"]`); if (b) b.classList.add("elegida");
        res(i);
      };
      cont.querySelectorAll(".op").forEach((b) => b.addEventListener("click", () => fin(+b.dataset.i)));
      const tick = () => { if (t !== tok || hecho) return; if (ui.modo === "auto" && auto != null) fin(typeof auto === "function" ? auto() : auto); else timer(tick, 400); };
      timer(tick, delay / ui.vel);
    });
  }
  const continuar = (cont, html = "Continuar ▸", delay = 1800) => botones(cont, [{ html, prim: true }], { auto: 0, delay });
  function marcar(cont, i, clase) { const b = cont.querySelector(`[data-i="${i}"]`); if (b) b.classList.add(clase); }
  // narrador: lee en voz alta los textos del juego (activo por defecto, en todos los niveles; se apaga en la pausa)
  // la voz, el idioma y los cortes de frase los maneja narrador.js (lee en español o en inglés)
  function voz(texto, forzar) {
    if ((!ui.voz && !forzar) || !texto || ui.modo === "auto") return;   // M silencia música y efectos, no al narrador
    if (window.NARRADOR) NARRADOR.hablar(texto);
  }
  const callarVoz = () => { if (window.NARRADOR) NARRADOR.callar(); };
  // quien: "control" (Control de Misión) o "cientifica" (Dra. Ortiz): su retrato habla mientras se lee el texto
  const NOMBRE_RETRATO = { control: "CONTROL DE MISIÓN", cientifica: "DRA. ORTIZ", laika: "LAIKA" };
  // tema del cuadro de texto (sprites de img/dialogo): cambia el color según la tensión del momento
  //   normal (lavanda): tareas, decisiones, cartas · llamada (turquesa): Control de Misión, calma
  //   alerta (ámbar): eventos sin alarma · catastrofe (rojo): eventos con alarma, averías y evacuación
  let temaActual = "normal";
  const temaDeHtml = (html) => (/class="tag alarma/.test(html) ? "catastrofe" : /class="tag llamada/.test(html) ? "llamada" : "normal");
  function pantalla(html, quien, tema) {
    temaActual = tema || temaDeHtml(html);
    $c.className = "panel tema-" + temaActual;
    $c.hidden = false;
    $c.innerHTML = quien ? `<div class="con-retrato"><div><div class="retrato ${quien}" role="img" aria-label="${NOMBRE_RETRATO[quien]}"></div><div class="retrato-nombre">${NOMBRE_RETRATO[quien]}</div></div><div class="cuerpo">${html}</div></div>` : html;
    $c.scrollTop = 0;
    if (quien) hablar(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").length);
    return $c;
  }
  // abre y cierra la boca (cambia entre los dos cuadros del sprite) según lo largo del texto
  let hablaId = null;
  function hablar(caracteres) {
    const el = $c.querySelector(".retrato");
    clearInterval(hablaId);
    if (!el) return;
    const fin = performance.now() + Math.max(900, Math.min(4500, caracteres * 40));
    hablaId = setInterval(() => {
      if (!el.isConnected || performance.now() > fin) { el.classList.remove("boca"); clearInterval(hablaId); return; }
      el.classList.toggle("boca");
    }, 150);
  }
  let toastId = null;
  function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastId); toastId = setTimeout(() => el.classList.remove("on"), 3200); }

  // ---------- estado de la partida y progreso guardado ----------
  let J = null;
  const guardado = leerLS(CLAVE);
  let historial = guardado && guardado.historial ? guardado.historial : null;
  let partidas = guardado && guardado.partidas ? guardado.partidas : 0;

  function nuevaPartida() {
    abortar();
    partidas++;
    // nivel adaptativo: dos perillas (reto y lectura) que el niño nunca ve
    const AD = R.reglas.adaptacion, hn = historial && historial.niveles;
    const inicial = hn ? hn.reto : ui.uso === "educativo" ? AD.modos.educativo.nivelPorGrado[String(ui.grado)] : AD.modos.libre.nivelInicial;
    J = {
      partida: partidas, reto: inicial, lectura: hn ? hn.lectura : inicial,
      ventana: hn ? hn.ventana.slice() : [], desdeCambio: hn ? AD.enfriamiento : 0,
      calibrar: !hn && ui.uso !== "educativo", ajustes: hn ? hn.ajustes.slice() : [],
      st: { mision: 0 }, dia: 0, rama: null, noche: false, escena: "exterior", est: {}, esperaModulo: null, enMinijuego: false,
      cartas: {}, aprendidos: {}, repasos: [], pasados: ((historial && historial.repasos) || []).slice(), diferidos: [],
      preguntados: {}, preparado: false, log: [], marcas: {}, hechasL: new Set(), hechasA: new Set(),
      cuenta: { ll: 0, llOk: 0, av: 0, avOk: 0, usos: 0, mj: 0, mjOk: 0, pq: 0, pq1: 0 },
      sol: null,            // un dato que cambia el día: se calcula al empezar el día 1, cuando ya llegaron los datos de la NASA
      registro: [], pasos: [], guardada: null,      // lo que el niño decidió y los nodos que visitó (se mandan a Supabase al terminar)
    };
    for (const b of BARRAS) J.st[b] = G.barras[b].inicio;
    for (const t of (historial && historial.cartas) || []) { J.cartas[t] = { usada: false, armada: false }; J.aprendidos[t] = -99; }
    J.diasLlamada = PQ.diasDeLlamada();          // una llamada cada 2 o 3 días
    J.usadas = []; J.bitacoraHecha = false; J.inicio = Date.now();
    J.diasAveria = R.reglas.averias.ventanas.map((v) => { const l = v.dias.filter((d) => !J.diasLlamada.includes(d)); return pick(l.length ? l : v.dias); });
    crearBarras(); pintarCartas(); pintarTrack(); pintarExtra(); $("log").innerHTML = "";
    if (window.BITACORA) for (const t of Object.keys(J.cartas)) BITACORA.registrar("carta", t, {});
    if (historial && historial.cartas && historial.cartas.length) log(`Empieza con ${historial.cartas.length} carta(s) del manual del capitán anterior.`);
    correr().catch((e) => { if (e !== ABORT) console.error(e); });
  }

  // ---------- HUD ----------
  // barras con sprites (img/hud/barra-*.png, 760x160): 10 segmentos, cada uno vale 10 puntos.
  // Debajo va la barra vacía (barra-*-vacia.png, de herramientas/barras-vacias.py) y encima la llena,
  // recortada justo en el hueco entre dos segmentos: así los apagados se ven completos y sin rayitas.
  // Los segmentos empiezan en x = 180 + 45·k (img/hud/sprites.json); el hueco está 2.5 px antes.
  const ORDEN_BARRAS = ["salud", "comida", "energia", "radiacion"];
  const SPRITE_W = 760, corteBarra = (n) => (n >= 10 ? 0 : (100 * (SPRITE_W - (177.5 + 45 * n)) / SPRITE_W).toFixed(2));
  function crearBarras() {
    $("barras").innerHTML = ORDEN_BARRAS.map((b) => `<div class="barra" data-b="${b}" role="meter" aria-label="${MAYUS[b]}" aria-valuemin="0" aria-valuemax="100">` +
      `<span class="lbl">${MAYUS[b]}${b === "radiacion" ? " · BAJA = MEJOR" : ""}</span><div class="marco"><img class="vacia" src="img/hud/barra-${b}-vacia.png" alt="">` +
      `<img class="llena" src="img/hud/barra-${b}.png" alt=""><span class="delta"></span></div></div>`).join("");
    pintarBarras();
  }
  function pintarBarras() {
    for (const b of BARRAS) {
      const el = $("barras").querySelector(`[data-b="${b}"]`), v = J.st[b], z = zona(b, v), encendidos = Math.ceil(v / 10);
      el.querySelector(".llena").style.clipPath = `inset(0 ${corteBarra(encendidos)}% 0 0)`;
      el.classList.toggle("z-rojo", z === "rojo");
      el.setAttribute("aria-valuenow", String(v));
      el.title = `${MAYUS[b]}: ${v} de 100`;
    }
  }
  function mostrarDeltas(antes) {
    pintarBarras();
    for (const b of BARRAS) {
      const d = J.st[b] - antes[b];
      if (!d) continue;
      const el = $("barras").querySelector(`[data-b="${b}"]`), de = el.querySelector(".delta");
      de.textContent = (d > 0 ? "+" : "") + d;
      de.className = "delta on " + (mejora(b, d) > 0 ? "bueno" : "malo");
      el.classList.remove("pulsa"); void el.offsetWidth; el.classList.add("pulsa");
      setTimeout(() => de.classList.remove("on"), 1800);
    }
  }
  const RAMA_TXT = { experto: "experto", normal: "normal", rescate: "rescate" };
  // lo que ve el niño: nada de niveles, ramas ni "apoyo"
  function pintarExtra() {
    $("extra").innerHTML = `<span>Tareas de Control de Misión: <b>${J.st.mision}</b> / 3</span>` +
      (J.preparado ? `<span><b>Pronóstico activo</b>: si pierdes el próximo minijuego, el daño será la mitad.</span>` : "");
    pintarEquipo();
  }
  // lo que ve el equipo, fuera del juego
  function pintarEquipo() {
    const ult = J.ajustes.slice(-3).map((a) => `D${a.dia} ${a.accion === "sube" ? "↑" : "↓"} r${a.a.reto}/l${a.a.lectura}`).join(", ");
    $("c-equipo").textContent = `${ui.uso === "educativo" ? `salón ${ui.grado}°` : "libre"} · partida ${J.partida} · reto ${J.reto} · lectura ${J.lectura} · ` +
      `últimos retos ${J.ventana.map((x) => (x ? "✓" : "✗")).join("") || "—"} · rama ${J.rama ? RAMA_TXT[J.rama] : "—"} · apoyo ${conApoyo() ? "sí" : "no"} · ` +
      `minijuegos ${J.cuenta.mjOk}/${J.cuenta.mj} · música ${J.animo || "calma"}` + (ult ? ` · ajustes: ${ult}` : "");
  }
  // lo que el niño decidió en cada reto, con la forma de la tabla `respuestas` (solo se manda si hay sesión)
  const ORIGEN = { "repaso": "repaso", "de la partida pasada": "partida_pasada", "de esta partida": "esta_partida" };
  function anotar(tipo, d) {
    if (!J || !J.registro) return;
    J.registro.push(Object.assign({ tipo, nivel_reto: J.reto, nivel_lectura: J.lectura, dia: J.dia | 0, rama: J.rama || null }, d));
  }
  // ventana de 5 retos, enfriamiento de 3, calibración rápida en modo libre
  function registrarReto(ok) {
    const AD = R.reglas.adaptacion;
    J.ventana.push(!!ok); if (J.ventana.length > AD.ventana) J.ventana.shift();
    J.desdeCambio++;
    const bien = J.ventana.filter(Boolean).length;
    let accion = null;
    if (J.calibrar && J.ventana.length === AD.modos.libre.calibracion.retos) {
      J.calibrar = false;
      if (bien === J.ventana.length) accion = "sube"; else if (bien === 0) accion = "baja";
    } else if (J.ventana.length >= AD.ventana && J.desdeCambio >= AD.enfriamiento) {
      if (bien >= AD.sube) accion = "sube"; else if (bien <= AD.baja) accion = "baja";
    }
    if (accion) {
      const antes = { reto: J.reto, lectura: J.lectura };
      if (accion === "sube") { if (J.lectura < J.reto) J.lectura++; else if (J.reto < 3) J.reto++; }
      else { if (J.reto > 1) J.reto--; J.lectura = Math.min(J.lectura, J.reto); }
      if (antes.reto !== J.reto || antes.lectura !== J.lectura) {
        J.ajustes.push({ dia: J.dia, accion, de: antes, a: { reto: J.reto, lectura: J.lectura } });
        J.ventana = []; J.desdeCambio = 0;
      }
    }
    pintarEquipo();
  }
  // ---------- menú de pausa ----------
  // Escape, P o el botón ⏸ detienen la partida (y el tiempo de los minijuegos) sin perderla.
  function abrirPausa(on) {
    if (on && estado !== "juego") return;
    PAUSA.poner(on);
    $("pausa").hidden = !on;
    if (on) callarVoz();        // pausar la voz del navegador falla a veces: mejor callarla
    $("btn-pausa").setAttribute("aria-expanded", String(on));
    if (on) { abrirCartas(false); pintarPausa(); $("p-continuar").focus(); }
    if (!on) $("p-salir").dataset.confirma = "";
  }
  function pintarPausa() {
    $("p-musica").value = Math.round(AJUSTES_AUDIO.musica * 100); $("o-musica").textContent = $("p-musica").value + "%";
    $("p-efectos").value = Math.round(AJUSTES_AUDIO.efectos * 100); $("o-efectos").textContent = $("p-efectos").value + "%";
    const marca = (id, v) => { $(id).setAttribute("aria-pressed", String(v)); $(id).querySelector("b").textContent = v ? "SÍ" : "NO"; };
    marca("p-silencio", silenciado); marca("p-voz", ui.voz); marca("p-texto", ui.textoGrande);
    marca("p-pantalla", !!document.fullscreenElement);
    $("p-dia").textContent = J ? `Día ${J.dia} de 14 · tu partida sigue aquí.` : "";
    pintarVoces();
  }
  // elegir y probar la voz del narrador
  function pintarVoces() {
    const sel = $("p-vozsel"), aviso = $("p-vozaviso");
    if (!window.NARRADOR || !NARRADOR.hay) {
      sel.hidden = true; $("p-probar").hidden = true; aviso.hidden = false;
      aviso.textContent = "Este navegador no puede leer en voz alta. Prueba con Chrome o Edge.";
      return;
    }
    const lista = NARRADOR.voces(), actual = NARRADOR.voz;
    sel.innerHTML = lista.map((v) => `<option value="${esc(v.name)}"${actual && v.name === actual.name ? " selected" : ""}>${esc(v.name.replace(/^Microsoft /, "").replace(/ - .*$/, ""))} · ${esc(v.lang)}</option>`).join("");
    sel.disabled = !lista.length;
    aviso.hidden = lista.length > 0;
    if (!lista.length) aviso.textContent = "Este dispositivo no tiene voz en este idioma. En Windows: Configuración › Hora e idioma › Voz › Agregar voces. En Chrome o Edge suele haber voces más claras.";
  }
  $("p-vozsel").addEventListener("change", (e) => { NARRADOR.elegir(e.target.value); NARRADOR.hablar("Hola, capitán. Así suena tu narrador."); });
  $("p-probar").addEventListener("click", () => { if (window.NARRADOR) NARRADOR.hablar("Hola, capitán. Así suena tu narrador."); });
  if (window.NARRADOR) NARRADOR.alCambiar(() => { if (!$("pausa").hidden) pintarVoces(); });
  $("btn-pausa").addEventListener("click", () => abrirPausa(true));
  $("p-continuar").addEventListener("click", () => abrirPausa(false));
  $("p-musica").addEventListener("input", (e) => { AJUSTES_AUDIO.musica = +e.target.value / 100; $("o-musica").textContent = e.target.value + "%"; guardarAudio(); });
  $("p-efectos").addEventListener("input", (e) => { AJUSTES_AUDIO.efectos = +e.target.value / 100; $("o-efectos").textContent = e.target.value + "%"; guardarAudio(); });
  $("p-efectos").addEventListener("change", () => { if (window.SFX) SFX.play("acierto"); });   // para oír el volumen nuevo
  $("p-musica").addEventListener("change", () => { if (window.MUSICA_BASE) MUSICA_BASE.sincronizar(); });
  $("p-silencio").addEventListener("click", () => { alternarSilencio(); pintarPausa(); });
  $("p-voz").addEventListener("click", () => {
    ui.voz = !ui.voz; guardarLS("gnosis-pref", { voz: ui.voz, textoGrande: ui.textoGrande }); pintarPausa(); pintarCtl();
    callarVoz();
    if (ui.voz) voz("Narrador activado. Voy a leer los textos del juego.");
  });
  $("p-texto").addEventListener("click", () => { ui.textoGrande = !ui.textoGrande; app.classList.toggle("texto-grande", ui.textoGrande); guardarLS("gnosis-pref", { voz: ui.voz, textoGrande: ui.textoGrande }); pintarPausa(); });
  $("p-pantalla").addEventListener("click", () => { fullscreen(); setTimeout(pintarPausa, 300); });
  $("p-salir").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (b.dataset.confirma !== "1") { b.dataset.confirma = "1"; b.querySelector("span").textContent = "¿Seguro? Toca otra vez: se pierde esta partida (tu bitácora se guarda)"; return; }
    abrirPausa(false); volverAlMenu();
  });
  { const pref = leerLS("gnosis-pref"); if (pref) { ui.voz = pref.voz !== false; ui.textoGrande = !!pref.textoGrande; app.classList.toggle("texto-grande", ui.textoGrande); } }

  // menú de cartas retráctil: un botón arriba a la derecha lo abre y lo cierra
  function abrirCartas(abrir) {
    const p = $("panel-cartas"), b = $("btn-cartas");
    p.hidden = !abrir; b.setAttribute("aria-expanded", String(abrir));
    if (abrir) b.classList.remove("nueva");
  }
  $("btn-cartas").addEventListener("click", () => abrirCartas($("panel-cartas").hidden));
  $("cerrar-cartas").addEventListener("click", () => abrirCartas(false));
  document.addEventListener("pointerdown", (e) => {
    if (!$("panel-cartas").hidden && !e.target.closest("#panel-cartas, #btn-cartas")) abrirCartas(false);
  });
  // Escape cierra las cartas primero (en captura, para que no regrese al menú)
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("panel-cartas").hidden) { e.stopImmediatePropagation(); abrirCartas(false); } }, true);
  function pintarCartas(nueva) {
    const temas = Object.keys(R.temas);
    $("n-cartas").textContent = Object.keys(J.cartas).length + " / " + temas.length;
    $("n-cartas-btn").textContent = Object.keys(J.cartas).length + " / " + temas.length;
    $("btn-cartas").classList.toggle("armada", Object.values(J.cartas).some((c) => c.armada && !c.usada));
    if (nueva && $("panel-cartas").hidden) { const b = $("btn-cartas"); b.classList.remove("nueva"); void b.offsetWidth; b.classList.add("nueva"); }
    $("cartas").innerHTML = temas.map((t) => {
      const c = J.cartas[t], k = R.temas[t].carta, u = k.uso;
      if (!c) return `<button type="button" class="carta bloq" disabled aria-label="Carta sin descubrir">???<small>sin descubrir</small></button>`;
      const tipo = u.tipo === "escudo" ? `ESCUDO · ${MAYUS[u.barra]}` : `+${u.valor} ${MAYUS[u.barra]}`;
      const cls = ["carta", c.usada ? "usada" : "", c.armada ? "armada" : "", t === nueva ? "nueva" : ""].join(" ");
      return `<button type="button" class="${cls}" data-t="${t}" ${c.usada ? "disabled" : ""} title="${esc(k.frase)}">${esc(k.nombre)}<small>${c.usada ? "USADA" : c.armada ? "LISTA" : tipo}</small></button>`;
    }).join("");
  }
  $("cartas").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b && J) usarCarta(b.dataset.t); });
  function usarCarta(t) {
    const c = J.cartas[t]; if (!c || c.usada) return;
    const k = R.temas[t].carta, u = k.uso;
    if (u.tipo === "escudo") {
      c.armada = !c.armada;
      toast(c.armada ? `${k.nombre} está lista: frenará la mitad del próximo daño a la ${MINUS[u.barra]}.` : `Guardaste ${k.nombre}.`);
    } else {
      if (u.soloDeDia && J.dia > 10) { toast(`${k.nombre} solo sirve cuando hay Sol.`); return; }
      const antes = { ...J.st };
      J.st[u.barra] = lim(J.st[u.barra] + mejora(u.barra, u.valor), 0, 100);
      c.usada = true; J.cuenta.usos++;
      mostrarDeltas(antes);
      log(`Usó ${k.nombre}: +${u.valor} de ${MINUS[u.barra]}.`);
    }
    pintarCartas(); pintarExtra();
  }
  // panel del día (la tira de días 0-14 se quitó: repetía lo mismo que el panel)
  function pintarTrack() {
    $("h-num").textContent = String(J.dia).padStart(2, "0");
    $("h-dia").classList.toggle("noche", J.dia >= 11);
    $("h-dia").title = `Día ${J.dia} de 14`;
    $("h-fase").textContent = faseTxt(J.dia);
  }
  const faseTxt = (d) => (d === 0 ? "LLEGADA" : d <= 4 ? "FASE 1 · BIENVENIDA · SOL" : d <= 10 ? "FASE 2 · CLIMA ESPACIAL · SOL" : "FASE 3 · NOCHE LUNAR");
  const marca = (k) => { (J.marcas[J.dia] = J.marcas[J.dia] || {})[k] = true; pintarTrack(); };
  function log(t) {
    J.log.push(`D${String(J.dia).padStart(2, "0")} · ${t}`);
    $("log").innerHTML = J.log.slice(-6).map((x) => `<div>${esc(x)}</div>`).join("");
  }
  // costo visible de una acción antes de elegirla (según el nivel; ver PQ.describirEfectos)
  function costoHtml(ef) {
    const items = PQ.describirEfectos(ef, J.reto);
    if (!items.length) return "";
    return '<span class="costos">' + items.map((i) => {
      const cls = i.bueno ? "bueno" : "malo";
      if (i.tipo === "mision") return `<span class="costo bueno">+${i.v} tarea de Control</span>`;
      if (i.tipo === "recarga") return `<span class="costo bueno">+${i.v} a la barra más débil</span>`;
      if (i.numero) return `<span class="costo ${cls}">${i.v > 0 ? "+" : ""}${i.v} ${MINUS[i.clave]}</span>`;
      return `<span class="costo ${cls}"><span aria-hidden="true">${i.v > 0 ? "▲" : "▼"}</span> ${MINUS[i.clave]}<span class="oculto"> ${window.I18N && window.I18N.idioma === "en" ? (i.v > 0 ? "rises" : "drops") : (i.v > 0 ? "sube" : "baja")}</span></span>`;
    }).join("") + "</span>";
  }
  // lo que se juega en un minijuego: si lo logras / si fallas (niveles 1 y 2)
  function apuestaHtml(exito, fallo) {
    if (J.reto >= 3) return "";
    const f = J.preparado ? suavizar(fallo) : fallo;
    const una = (ef) => costoHtml(ef) || '<span class="costo">sin cambios</span>';
    return `<div class="apuesta"><span>Si lo logras:</span> ${una(exito)} <span>Si fallas:</span> ${una(f)}</div>`;
  }
  function efectosTxt(ef) {
    const p = [];
    for (const [k, v] of Object.entries(ef || {})) {
      if (k === "mision") p.push(`<span class="bueno">+${v} tarea de Control</span>`);
      else if (k === "barraMasBaja") p.push(`<span class="bueno">+${v} a la barra más débil</span>`);
      else if (v) p.push(`<span class="${mejora(k, v) > 0 ? "bueno" : "malo"}">${v > 0 ? "+" : ""}${v} ${MINUS[k]}</span>`);
    }
    return p.length ? p.join(" · ") : `<span class="sub">sin cambios</span>`;
  }
  // aplica efectos; un escudo listo (o, en automático, uno que el niño decide usar) frena la mitad
  function aplicar(ef) {
    const antes = { ...J.st }, o = { ...(ef || {}) }, frenos = [];
    for (const [k, v] of Object.entries(o)) {
      if (k === "mision") { J.st.mision += v; continue; }
      if (k === "barraMasBaja") { const b = masDebil(J.st); J.st[b] = lim(J.st[b] + mejora(b, v), 0, 100); continue; }
      let val = v;
      if (empeora(k, v)) {
        const t = Object.keys(J.cartas).find((t) => {
          const c = J.cartas[t], u = R.temas[t].carta.uso;
          return !c.usada && u.tipo === "escudo" && u.barra === k && (c.armada || (ui.modo === "auto" && Math.random() < ui.comp));
        });
        if (t) { val = Math.round(v / 2); J.cartas[t].usada = true; J.cartas[t].armada = false; J.cuenta.usos++; frenos.push(t); }
      }
      J.st[k] = lim(J.st[k] + val, 0, 100);
    }
    mostrarDeltas(antes); pintarCartas(); pintarExtra();
    for (const t of frenos) { const n = R.temas[t].carta.nombre; toast(`Tu carta ${n} frenó la mitad del daño.`); log(`${n} frenó la mitad del daño.`); }
  }

  // ---------- música ----------
  // peligro -> suena alarma-emergencia.mp3: eventos fuertes (tormentas solares, micrometeoritos,
  //            sismo fuerte, calefacción rota) y averías
  // calma / alerta -> los acordes de fondo (musica-base.js); los finales ponen su propia pista
  const peligroDe = (n) => ((ESTADO_NODO[n.id] || {}).alarma ? "peligro" : n.tipo === "evento" ? "alerta" : "calma");
  function animo(m) {
    if (m === "calma" && conteo(J.st).rojo > 0) m = "alerta";
    J.animo = m;
    MUSICA_BASE.sincronizar();
  }
  // lo que debe sonar ahora; musica-base.js lo pregunta cada 150 ms y en cada cambio
  MUSICA_BASE.deseado = () => {
    const enMenu = estado === "menu" || estado === "aterrizaje" || estado === "fundido";
    let pista = null;
    if (estado === "final" && typeof finalActual !== "undefined" && finalActual) pista = FINALES[finalActual.tipo].gana ? "final-bueno" : "final-malo";
    else if (estado === "juego" && J && J.musicaFinal) pista = J.musicaFinal;          // sigue durante el manual
    else if (estado === "juego" && J && J.animo === "peligro") pista = "alarma-emergencia";
    return { intro: enMenu, base: estado === "juego", pista, noche: !!(J && J.noche) };
  };

  // ---------- escenas: plano de la base y cambio de módulo ----------
  function escena(id, estados) {
    const antes = J.est && J.est.sismo;
    J.escena = id; J.est = Object.assign({}, estados || {});
    if (J.est.sismo && !antes && window.SFX) SFX.play("sismo");   // retumbe cuando empieza a temblar
  }
  async function irA(destino, estados, motivo) {
    const mod = MODULO_DE[destino];
    if (destino === J.escena && !motivo) { escena(destino, estados); return; }
    escena("plano", { resaltar: mod || null, alarma: !!(estados && estados.alarma) });
    const fuera = destino === "exterior" || destino === "crater";
    const tema = estados && estados.alarma ? "catastrofe" : estados && estados.llamada || motivo === MOTIVO.control_mision ? "llamada" : motivo === MOTIVO.evento ? "alerta" : "normal";
    const c = pantalla(`<span class="tag">PLANO DE LA BASE</span><p class="txt">${motivo ? esc(motivo) + " " : ""}<b>${esc(NOMBRE_ESC[destino] || destino)}</b>${motivo && /¡[^!]*$/.test(motivo) ? "!" : "."}</p>` +
      `<p class="sub">${mod ? "Toca en el plano el módulo que parpadea, o el botón." : fuera ? "Ponte el traje: vas a salir de la base." : ""}</p><div class="ops" id="ops"></div>`, null, tema);
    voz((motivo ? motivo + " " : "Ve a ") + (NOMBRE_ESC[destino] || destino) + ".");
    J.esperaModulo = mod || null;
    try { await continuar(c.querySelector("#ops"), fuera ? "Salir ▸" : "Ir ▸", 1300); } finally { J.esperaModulo = null; }
    escena(destino, estados);
  }
  const MOTIVO = { evento: "¡Algo pasa en", tarea: "Tu tarea de hoy es en", decision: "Te esperan en", control_mision: "Control de Misión te llama desde", calma: "Ve a" };

  // ---------- antes de cada minijuego: instrucciones cortas + demo animada (img/minijuegos/<tipo>.gif) ----------
  // Las demos se generan con herramientas/generar-demos-minijuegos.py
  const TITULO_MJ = {
    cables: "Conecta los cables", limpiar: "Limpia el polvo", atrapar: "¡Atrapa lo que se cae!", laberinto: "¡Corre al refugio!",
    tapar: "¡Tapa los agujeros!", secuencia: "Hazlo en orden", ajustar: "Ajusta el medidor", buscar: "Busca y toca",
    grafica: "Lee los datos del Sol", rover: "Busca hielo con el rover", energia: "Cae la noche: reparte la energía", quiz: "Mensaje especial de la Tierra",
    aterrizar: "Aterriza la nave del relevo",
  };
  const BUSCAR_QUE = { enfermas: "las plantas enfermas (@)", maduras: "las plantas listas para cosechar", fuga: "las fugas de agua" };
  const COMO_SE_JUEGA = {
    cables: () => ["Toca un cable de la izquierda.", "Luego toca el del mismo color a la derecha.", "¡Conéctalos todos!"],
    limpiar: () => ["Pasa el dedo o el ratón sobre el panel.", "Cada cuadro se limpia con una pasada.", "No pases dos veces: ¡se raya!"],
    atrapar: (s) => ["Mueve la plataforma con ← → o tocando un carril.", `Atrapa cada ${s.objeto || "cosa"} que cae.`],
    laberinto: (s) => ["Muévete con las flechas o tocando una casilla vecina.", "Llega a la R antes de que se acabe el tiempo."].concat(s.oscuro ? ["Está oscuro: solo ves cerca de ti."] : []),
    tapar: () => ["Toca cada agujero en cuanto aparezca.", "¡Rápido, antes de que se escape el aire!"],
    secuencia: () => ["Toca los pasos en el orden correcto.", "Empieza por el primero."],
    ajustar: (s) => (s.movil ? ["La zona verde se mueve: síguela con − y + (o ← →).", "Mantén la nave adentro hasta llenar la barra.", "Si te sales, la barra baja."]
      : ["Usa − y + (o ← →) para mover la aguja.", "Mantenla en la zona verde hasta llenar la barra."]),
    buscar: (s) => (s.objetivo === "fuga" ? ["Busca la tubería que gotea: ═💧═", "Las válvulas ═◘═ están bien: no las toques."] : [`Toca solo ${BUSCAR_QUE[s.objetivo] || "lo que buscas"}.`, "¡No toques las demás!"]),
    grafica: (s) => (s.modo === "radiacion" ? ["Cada barra es un día de radiación.", "La última es hoy: ¿es seguro salir?"] : ["Mira la gráfica: cada barra es un día de alertas del Sol.", "Encuentra el día con más alertas y decide cuándo tener listo el refugio."]),
    rover: (s) => ["Mueve el rover con las flechas.", "El radar te dice si el hielo está cerca."].concat(s.guia ? ["Sigue la flecha de Control de Misión."] : ["¡Cuida la batería!"]),
    energia: () => ["Apaga lo que no necesitas.", "Cuando la barra quede en verde, confirma."],
    quiz: () => ["Lee la carta.", "Elige cuándo sirve."],
    aterrizar: () => ["Mantén ▲ MOTOR (o Espacio) para frenar: gasta combustible.", "Usa ← → para llegar a la plataforma verde.", "Toca el suelo despacio: la velocidad debe estar en verde."],
  };
  async function comoSeJuega(spec) {
    const pasos = (COMO_SE_JUEGA[spec.tipo] || (() => []))(spec);
    const titulo = spec.titulo || (spec.tipo === "grafica" && spec.modo === "radiacion" ? "Lee el medidor de radiación" : TITULO_MJ[spec.tipo] || "Minijuego");
    $mj.innerHTML = `<div class="mj mj-intro"><div class="mj-cab"><span class="mj-tag">MINIJUEGO · ASÍ SE JUEGA</span><h3 class="mj-tit">${esc(titulo)}</h3></div>` +
      `<div class="mj-demo"><img src="img/minijuegos/${spec.movil ? spec.tipo + "-movil" : spec.tipo}.gif" alt="Demostración: así se juega ${esc(titulo)}">` +
      `<ol class="mj-pasos">${pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div><div class="ops" id="mj-ops"></div></div>`;
    voz(titulo + ". " + pasos.join(" "));
    // Enter también empieza (durante el minijuego el teclado es del juego)
    const enter = (e) => { if (e.key === "Enter") { const b = $mj.querySelector("#mj-ops .op.prim:not([disabled])"); if (b) { e.preventDefault(); b.click(); } } };
    window.addEventListener("keydown", enter);
    try { await continuar($mj.querySelector("#mj-ops"), "¡Empezar! ▸", 2600); } finally { window.removeEventListener("keydown", enter); }
  }

  async function minijuego(n, spec) {
    const t = tok;
    await consejoLaika("minijuego", "¡Hora de un minijuego! Mira la demo y lee los pasos antes de empezar. El tiempo corre cuando tocas «¡Empezar!».");
    J.enMinijuego = true; $c.hidden = true; $mj.hidden = false;
    $mj.className = "panel tema-" + temaActual;
    try { await comoSeJuega(spec); } catch (e) { J.enMinijuego = false; throw e; }
    if (t !== tok) { J.enMinijuego = false; throw ABORT; }
    const todas = Object.values(R.temas).map((x) => x.carta);
    let r;
    try {
      r = await MJ.jugar(spec.tipo, Object.assign({}, spec, {
        cont: $mj, nivel: J.reto, dificultad: n.reto || 2, auto: ui.modo === "auto", hab: ui.hab, vel: ui.vel,
        datos: APIS.datos, semana: spec.modo === "radiacion" ? APIS.semanaRadiacion() : null, cartas: Object.keys(J.cartas).map((k) => R.temas[k].carta), todasCartas: todas,
      }));
    } finally { J.enMinijuego = false; }
    if (t !== tok) throw ABORT;
    $mj.hidden = true; $mj.innerHTML = ""; $c.hidden = false;
    J.cuenta.mj++; if (r.gano) J.cuenta.mjOk++;
    return r.gano;
  }

  // ---------- la partida ----------
  async function correr() {
    let id = "INICIO";
    for (let g = 0; g < 100; g++) {
      const n = byId[id];
      if (n.dia != null && n.dia !== J.dia && n.tipo !== "final") { J.dia = n.dia; await bannerDia(); }
      await nodo(n);
      if (n.informe && n.tipo !== "final") await informe(n);
      if (n.tipo !== "evaluacion" && n.tipo !== "final" && n.dia >= 1) {
        consumo(n.dia);
        let f = fracaso();
        const il = J.diasLlamada.indexOf(n.dia);
        if (!f && il >= 0 && !J.hechasL.has(n.dia)) { J.hechasL.add(n.dia); await llamada(n, il); f = fracaso(); }
        if (!f && J.diasAveria.includes(n.dia) && !J.hechasA.has(n.dia)) { J.hechasA.add(n.dia); await averia(n); f = fracaso(); }
        if (!f && ui.modo === "auto") recursosAuto();
        if (f) { await final(byId["FAIL-" + f]); return; }
      }
      if (n.tipo === "final") { await final(n); return; }
      const out = outE[id];
      let a;
      if (out.some((x) => x.condicion)) {
        a = out.find((x) => COND[x.condicion](conteo(J.st), J.st));
        if (RAMA_TXT[a.condicion]) J.rama = a.condicion;
      } else {
        // peso dinámico con datos reales de DONKI
        // (si hubo 2+ llamaradas M/X en 7 días, la arista dinámica sube a 0.7 y las demás se reparten 0.3)
        let pesos = out.map((e) => e.peso);
        const kd = out.findIndex((e) => e.pesoDinamico);
        if (kd >= 0 && APIS.tormentaProbable()) {
          const resto = pesos.reduce((s, p, k) => s + (k === kd ? 0 : p), 0) || 1;
          pesos = pesos.map((p, k) => (k === kd ? 0.7 : (0.3 * p) / resto));
        }
        let x = Math.random() * pesos.reduce((s, p) => s + p, 0);
        a = out.find((_, k) => (x -= pesos[k]) < 0) || out[out.length - 1];
      }
      pintarExtra();
      id = a.hacia;
    }
  }

  // ---------- un dato que cambia el día ----------
  const hoyISO = () => (/^\d{4}-\d{2}-\d{2}$/.test(qs.get("hoy") || "") ? qs.get("hoy") : new Date().toISOString().slice(0, 10));
  const enIng = () => !!(window.I18N && window.I18N.idioma === "en");
  const Tx = (es, en) => (enIng() ? en : es);
  function textoDato(v, ef) {
    const fecha = PQ.fechaCorta(v.fecha, enIng());
    const que = v.clase ? Tx(`llamarada ${v.clase} (${PQ.fuerzaDe(v.clase)})`, `flare ${v.clase} (${PQ.fuerzaDe(v.clase, true)})`)
      : v.cmes ? Tx("nube de material del Sol (CME)", "cloud of material from the Sun (CME)") : Tx("Sol tranquilo", "quiet Sun");
    return `NASA · ${fecha}: ${que}${ef && ef.radiacion ? Tx(` · radiación +${ef.radiacion}`, ` · radiation +${ef.radiacion}`) : ""}`;
  }
  // el menú ☰ del inicio: lo que pasa hoy en el Sol y qué significa para la próxima misión
  function pintarDatoMenu() {
    const el = $("menu-dato"); if (!el) return;
    const donki = APIS.datos && APIS.datos.donki; if (!donki) return;
    const v = PQ.ventanaReal(donki, hoyISO()), hoy = v[13], ult = v.slice().reverse().find((x) => x.nivel > 0);
    const dias = v.filter((x) => PQ.efectoDelDia(v, x.dia).radiacion > 0).length;
    const que = dias
      ? Tx(`En tu próxima misión habrá ${dias} ${dias === 1 ? "día" : "días"} de tormenta solar: los mismos que vivió la NASA en los últimos 14 días.`, `Your next mission will have ${dias} ${dias === 1 ? "day" : "days"} of solar storm: the same ones NASA saw in the last 14 days.`)
      : Tx("En tu próxima misión el Sol estará tranquilo, como estuvo estos 14 días.", "In your next mission the Sun will be quiet, as it was these last 14 days.");
    el.innerHTML = `<h3 class="menu-tit">${Tx("EL SOL HOY", "THE SUN TODAY")}</h3><p class="dato-hoy">${esc(textoDato(hoy))}</p>` +
      (ult && ult !== hoy ? `<p class="cta-nota">${Tx("Última alerta fuerte", "Latest strong alert")}: ${esc(textoDato(ult).replace(/^NASA · /, ""))}</p>` : "") +
      `<p class="cta-nota">${que}</p>` + (donki.muestra ? `<p class="cta-nota">(${Tx("datos de muestra: sin conexión", "sample data: offline")})</p>` : "");
    const av = $("menu-aviso"); if (av) av.hidden = !v.slice(-2).some((x) => x.nivel > 0);   // hubo una llamarada fuerte hoy o ayer
  }
  function pintarDatoHud() {
    const v = J && J.sol && J.sol[J.dia - 1];
    $("h-dato").textContent = v && J.dia >= 1 ? textoDato(v, PQ.efectoDelDia(J.sol, J.dia)) : "";
  }
  async function bannerDia() {
    if (!J.sol) {
      try { await Promise.race([APIS.cargar(), new Promise((res) => setTimeout(res, 2500))]); } catch (e) { /* sin conexión: datos de muestra */ }
      J.sol = PQ.ventanaReal(APIS.datos && APIS.datos.donki, hoyISO());
    }
    pintarTrack();
    const noche = J.dia === 11;
    if (noche) J.noche = true;
    pintarDatoHud();
    const vSol = J.sol && J.sol[J.dia - 1], efSol = vSol ? PQ.efectoDelDia(J.sol, J.dia) : null;
    if (efSol && efSol.radiacion) { aplicar({ radiacion: efSol.radiacion }); log(textoDato(vSol, efSol) + "."); }
    escena("plano", {});
    pantalla(`<div class="grande">DÍA ${String(J.dia).padStart(2, "0")}</div><p class="sub" style="text-align:center">${faseTxt(J.dia)}</p>` +
      (vSol ? `<p class="sub" data-sin-traducir style="text-align:center;color:var(--ambar)">${esc(textoDato(vSol, efSol))}</p>` : "") +
      (noche ? `<p class="txt" style="text-align:center">Se ocultó el Sol. Los paneles ya no cargan: la energía solo puede bajar.</p>` : ""));
    voz(`Día ${J.dia}.` + (noche ? " Se ocultó el Sol. Los paneles ya no cargan." : ""));
    if (noche) log("Cayó la noche lunar.");
    animo("calma");
    await espera(noche ? 2200 : 1100);
  }

  const TIPO = { inicio: "LLEGADA", evento: "EVENTO", tarea: "TAREA", decision: "DECISIÓN", control_mision: "CONTROL DE MISIÓN", calma: "CALMA", evaluacion: "REPORTE DE CONTROL DE MISIÓN" };
  async function nodo(n) {
    if (n.tipo === "final") return;
    if (n.tipo === "evaluacion") { escena(n.escenario || "control", {}); return evaluacion(n); }
    if (n.tipo === "inicio") return recorrido(n);
    animo(peligroDe(n));
    await irA(n.escenario || "control", ESTADO_NODO[n.id] || {}, MOTIVO[n.tipo]);
    const texto = n.niveles ? n.niveles["nivel" + J.lectura].texto : n.mensaje;
    const r = n.resultado || {};
    const prep = !!J.preparado; let resPaso = null, opPaso = null;
    const tema = peligroDe(n) === "peligro" ? "catastrofe" : n.tipo === "evento" ? "alerta" : n.tipo === "control_mision" || n.tipo === "calma" ? "llamada" : "normal";
    const htmlNodo = `<span class="tag ${(ESTADO_NODO[n.id] || {}).alarma ? "alarma" : ""}">${TIPO[n.tipo]}</span><h2 class="titulo">${esc(n.titulo)}</h2><p class="txt">${esc(texto)}</p><div class="ops" id="ops"></div><div id="res"></div>`;
    const quienNodo = n.tipo === "control_mision" || n.tipo === "calma" ? "control" : null;
    const c = pantalla(htmlNodo, quienNodo, tema);
    voz(texto);
    let ops = c.querySelector("#ops"), res = c.querySelector("#res");
    if (r.exito || r.fallo) {
      const spec = MJ_DE[n.id];
      const ap = apuestaHtml(r.exito, r.fallo); if (ap) res.innerHTML = ap;
      await continuar(ops, "¡A jugar! ▸", 1500);
      const gano = spec ? await minijuego(n, spec) : Math.random() < ui.hab;
      if (!ops.isConnected) { const c2 = pantalla(htmlNodo, quienNodo, tema); ops = c2.querySelector("#ops"); res = c2.querySelector("#res"); }
      resPaso = gano ? "exito" : "fallo";
      let ef = gano ? r.exito : r.fallo, nota = "";
      if (!gano && J.preparado) { ef = suavizar(ef); nota = " Estabas preparado por el Pronóstico: el daño fue la mitad."; }
      if (J.preparado) J.preparado = false;
      aplicar(ef);
      animo("calma");
      res.innerHTML = `<div class="res ${gano ? "ok" : "ko"}">${gano ? "¡Lo lograste!" : "No salió esta vez."} ${efectosTxt(ef)}${nota}</div>`;
      log(`${n.titulo}: ${gano ? "minijuego ganado" : "minijuego perdido"}.`);
    } else if (r.opciones) {
      const auto = () => {
        if (Math.random() >= ui.hab) return Math.floor(Math.random() * r.opciones.length);
        const peor = (ef) => { const t = { ...J.st }; for (const [k, v] of Object.entries(ef)) if (t[k] != null) t[k] = lim(t[k] + v, 0, 100); return Math.min(...BARRAS.map((b) => saludDe(t, b))); };
        let m = 0; r.opciones.forEach((o, i) => { if (peor(o.efectos) > peor(r.opciones[m].efectos)) m = i; }); return m;
      };
      if (J.reto <= 2) ops.classList.add("col");
      const i = await botones(ops, r.opciones.map((o) => ({ html: esc(o.texto) + costoHtml(o.efectos) })), { auto, delay: 2000 });
      aplicar(r.opciones[i].efectos); opPaso = r.opciones[i].texto;
      res.innerHTML = `<div class="res">${efectosTxt(r.opciones[i].efectos)}</div>`;
      log(`${n.titulo}: ${r.opciones[i].texto}.`);
    } else if (r.siempre) {
      aplicar(r.siempre);
      res.innerHTML = `<div class="res ok">${efectosTxt(r.siempre)}</div>`;
      log(n.titulo + ".");
    }
    J.pasos.push({ nodo_id: n.id, dia: Math.max(0, Math.min(14, (n.dia != null ? n.dia : J.dia) | 0)), resultado: resPaso, opcion: opPaso ? String(opPaso).slice(0, 200) : null, preparado: prep,
      barras: { radiacion: Math.round(J.st.radiacion), energia: Math.round(J.st.energia), comida: Math.round(J.st.comida), salud: Math.round(J.st.salud) } });
    await continuar(ops, "Continuar ▸", 1600);
  }

  // día 0: recorrido guiado por el plano (el tutorial del nodo INICIO)
  // desde la partida 2, TODAS las pantallas del recorrido traen «Saltar recorrido» (en la 1 se ve completo)
  async function pasoTour(cont, html, delay) {
    if (J.partida <= 1) { await continuar(cont, html, delay); return false; }
    return (await botones(cont, [{ html, prim: true }, { html: "Saltar recorrido ⏭" }], { auto: 0, delay })) === 1;
  }
  async function recorrido(n) {
    await tourLaika(n);
    await repasoInicial();
  }
  async function tourLaika(n) {
    escena("exterior", {});
    animo("calma");
    let c = pantalla(`<span class="tag">${TIPO.inicio}</span><h2 class="titulo">${esc(n.titulo)}</h2><p class="txt">${esc(n.mensaje)}</p><div class="ops" id="ops"></div>`);
    voz(n.mensaje);
    if (await pasoTour(c.querySelector("#ops"), "Conocer la base ▸", 2400)) return;
    c = pantalla(`<span class="tag">LAIKA · TU AYUDANTE</span><p class="txt">¡Guau! Soy Laika y te voy a acompañar. Primero te enseño la base: toca el módulo que parpadea.</p><div class="ops" id="ops"></div>`, "laika");
    voz("¡Guau! Soy Laika y te voy a acompañar. Primero te enseño la base.");
    if (await pasoTour(c.querySelector("#ops"), "¡Vamos! ▸", 1800)) return;
    for (const [mod, txt] of RECORRIDO) {
      escena("plano", { resaltar: mod });
      c = pantalla(`<span class="tag">RECORRIDO POR LA BASE</span><p class="txt">${esc(txt)}</p><div class="ops" id="ops"></div>`, "laika");
      voz(txt);
      J.esperaModulo = mod;
      let saltar = false;
      try { saltar = await pasoTour(c.querySelector("#ops"), "Siguiente ▸", 1300); } finally { J.esperaModulo = null; }
      if (saltar) return;
    }
    c = pantalla(`<span class="tag">LAIKA · TU AYUDANTE</span><p class="txt">Cuida tus cuatro barras durante 14 días. Si alguna llega al límite, tendrás que evacuar. ¡Yo te aviso cuando pase algo nuevo!</p><div class="ops" id="ops"></div>`, "laika");
    await pasoTour(c.querySelector("#ops"), "Comenzar la misión ▸", 1800);
  }
  async function repasoInicial() {
    // repaso: algo que quedó en «Lo aprendido» en una misión anterior
    const previos = window.BITACORA ? BITACORA.aprendidos().filter((a) => a.fecha < J.inicio) : [];
    if (previos.length) {
      const otras = R.situaciones.flatMap((s) => Object.values(s.explicacion)).concat(PD.banco.map((p) => p.explicacion));
      const q = PQ.preguntaRepaso(previos, PD.banco, J.reto, otras, J.partida);   // mismo tema, otra variante
      if (q) { if (window.SFX) SFX.play("llamada"); await preguntaCtrl(q, "REPASO DE TU MISIÓN ANTERIOR"); }
    }
  }

  async function evaluacion(n) {
    const cnt = conteo(J.st);
    const rama = cnt.verde === 4 ? "experto" : cnt.rojo >= 1 ? "rescate" : "normal";
    const MSG = {
      experto: "¡Todo en verde, capitán! Control de Misión te va a mandar misiones especiales.",
      normal: "Vas bien. Sigue cuidando tus barras para dejarlas todas en verde.",
      rescate: "Una barra necesita atención. Control de Misión va a estar más cerca de ti estos días.",
    };
    marca("ev");
    animo("calma");
    const c = pantalla(`<span class="tag">${TIPO.evaluacion}</span><h2 class="titulo">${esc(n.titulo)}</h2>` +
      `<p class="txt">${BARRAS.map((b) => `<span class="z-${zona(b, J.st[b])}">${MAYUS[b]} ${J.st[b]}</span>`).join(" · ")}</p>` +
      `<div class="res ok">${MSG[rama]}</div><div class="ops" id="ops"></div>`, "control", "llamada");
    log("Reporte de Control de Misión.");
    await continuar(c.querySelector("#ops"), "Continuar ▸", 2200);
  }

  // el texto que se lee para contestar: corto, y lo extra en «Saber más» (cerrado por defecto)
  // marca las palabras del diccionario (bitácora): al tocarlas se abre su significado. Una vez cada palabra.
  // (la lógica está en preguntas.js: marca solo en el texto, nunca dentro de un atributo)
  const conPalabras = (textoEsc) => PQ.marcarPalabras(textoEsc, window.BITACORA && BITACORA.glosario);
  document.addEventListener("click", (e) => { const b = e.target.closest("button.palabra"); if (b && window.BITACORA) { e.preventDefault(); BITACORA.abrir("diccionario", b.dataset.palabra); } });
  function lectura(texto, extra = "", titulo = "LEE Y BUSCA LA RESPUESTA") {
    if (ui.sinTexto) return `<div class="lectura"><span class="paso">${titulo}</span><p class="txt sub">[Texto oculto: prueba sin lectura]</p></div>`;
    return `<div class="lectura"><span class="paso">${titulo}</span><p class="txt">${conPalabras(esc(window.tr ? window.tr(texto) : texto))}</p>` +
      (extra ? `<details class="saber"><summary>Saber más</summary>${extra}</details>` : "") + `</div>`;
  }
  // pregunta del banco ligada a un informe: rota sin azar según la partida y cuántos informes de ese tema van
  // (variantes[(partida - 1 + indiceDelEvento) % n]); solo las que se contestan con el texto del informe
  function preguntaDeInforme(n) {
    J.eventosTema = J.eventosTema || {};
    const t = n.informe.tema, k = J.eventosTema[t] || 0;
    J.eventosTema[t] = k + 1;
    return PQ.preguntaParaInforme(PD.banco, t, n.informe.texto, J.reto, J.partida, k, J.usadas);
  }
  async function informe(n) {
    const t = n.informe.tema;
    if (J.aprendidos[t] == null || J.aprendidos[t] < 0) J.aprendidos[t] = J.aprendidos[t] == null ? n.dia : J.aprendidos[t];
    if (window.BITACORA) BITACORA.registrar("informe", n.id, { titulo: n.titulo, texto: n.informe.texto, fuente: n.informe.fuente, tema: t });
    const nueva = !J.cartas[t];
    const k = R.temas[t].carta;
    // en el invernadero, un estudio real de NASA OSDR sobre plantas en el espacio (va en «Saber más»)
    const est = t === "invernadero" ? APIS.estudio() : null;
    const saber = `<p class="sub">Fuente: ${esc(n.informe.fuente || "NASA")} · se guardó en tu bitácora.</p>` +
      (est ? `<p class="sub">La NASA lo estudia de verdad: «${esc(est.titulo)}» (${esc(est.id)}${est.mision ? (window.I18N && window.I18N.idioma === "en" ? ", mission " : ", misión ") + esc(est.mision) : ""}). <a href="${esc(est.url)}" target="_blank" rel="noopener" style="color:var(--cian)">Ver el estudio</a></p>` : "");
    let cab;
    if (nueva) {
      J.cartas[t] = { usada: false, armada: false };
      if (window.BITACORA) BITACORA.registrar("carta", t, {});
      pintarCartas(t);
      if (window.SFX) SFX.play("carta-nueva");
      cab = `<span class="tag">NUEVA CARTA · INFORME</span><h2 class="titulo">${esc(k.nombre)}</h2>` +
        `<p class="sub">${esc(k.frase)} <span>${k.uso.tipo === "escudo" ? `Es un escudo para la ${MINUS[k.uso.barra]}.` : `Suma ${k.uso.valor} de ${MINUS[k.uso.barra]}.`}</span></p>`;
      log(`Nueva carta: ${k.nombre}.`);
    } else cab = `<span class="tag">INFORME</span><h2 class="titulo">${esc(n.titulo)}</h2>`;
    if (nueva && Object.keys(J.cartas).length === 1) J.laikaCarta = true;   // primera carta: Laika explica al terminar
    const q = preguntaDeInforme(n);
    J.temasLeidos = J.temasLeidos || {};
    const repetido = !q && !nueva && J.temasLeidos[t];
    J.temasLeidos[t] = true;
    if (repetido) {   // menos repetición: ya lo leíste; queda en la bitácora con la marca NUEVO
      toast(`Nuevo informe en tu bitácora: «${n.titulo}».`);
      log(`Informe guardado sin pantalla (tema ya leído): ${n.titulo}.`);
      return;
    }
    if (q) {
      J.usadas.push(q.id);
      const c = pantalla(cab + `<p class="txt pregunta-antes"><b>Busca en el texto:</b> ${esc(q.enunciado)}</p>` + lectura(n.informe.texto, saber) +
        `<div class="ops col" id="ops"></div><div id="res"></div>`, "cientifica");
      voz(q.enunciado + (ui.sinTexto ? "" : " " + n.informe.texto));
      await responderBanco(c, q, "INFORME");
    } else {
      const c = pantalla(cab + lectura(n.informe.texto, saber, "INFORME") + `<div class="ops" id="ops"></div>`, "cientifica");
      voz(n.informe.texto);
      await continuar(c.querySelector("#ops"), "Continuar ▸", 2600);
    }
    if (J.laikaCarta) { J.laikaCarta = false; await consejoLaika("carta", "¡Ganaste tu primera carta! Toca el botón CARTAS, arriba a la derecha, y úsala cuando una barra la necesite."); }
  }
  // Laika, la ayudante del tutorial: aparece la primera vez que pasa algo nuevo, solo en la primera misión
  async function consejoLaika(clave, texto) {
    if (J.partida > 1) return;
    J.laikaVistos = J.laikaVistos || {};
    if (J.laikaVistos[clave]) return;
    J.laikaVistos[clave] = true;
    const c = pantalla(`<span class="tag">LAIKA · TU AYUDANTE</span><p class="txt">${esc(texto)}</p><div class="ops" id="ops"></div>`, "laika");
    voz(texto);
    await continuar(c.querySelector("#ops"), "¡Entendido! ▸", 1800);
  }

  function consumo(d) {
    const c = d >= G.consumoDiario.noche.dias[0] ? G.consumoDiario.noche : G.consumoDiario.dia;
    const antes = { ...J.st };
    for (const b of BARRAS) J.st[b] = lim(J.st[b] + c[b], 0, 100);
    mostrarDeltas(antes);
  }
  function recursosAuto() {
    for (const t of Object.keys(J.cartas)) {
      const c = J.cartas[t], u = R.temas[t].carta.uso;
      if (c.usada || u.tipo !== "recurso" || (u.soloDeDia && J.dia > 10)) continue;
      if (masDebil(J.st) !== u.barra || zona(u.barra, J.st[u.barra]) === "verde") continue;
      if (Math.random() < ui.comp) usarCarta(t);
    }
  }

  // ---------- llamada: predecir -> actuar -> ver ----------
  function elegirTema(idx) {
    const hist = historial || {};
    if (idx === 0 && J.pasados.length) return { tema: J.pasados.shift(), origen: "repaso", intentos: 1 };
    if (idx === 0 && hist.temas && hist.temas.length) return { tema: pick(hist.temas), origen: "de la partida pasada" };
    const rp = idx > 0 && J.repasos.find((r) => r.disponible <= J.dia);
    if (rp) { J.repasos.splice(J.repasos.indexOf(rp), 1); return { tema: rp.tema, origen: "repaso", intentos: rp.intentos + 1 }; }
    const listos = Object.keys(J.aprendidos).filter((t) => J.aprendidos[t] <= J.dia - 2);
    const pool = listos.length ? listos : Object.keys(J.aprendidos);
    if (!pool.length) return null;
    const min = Math.min(...pool.map((t) => J.preguntados[t] || 0));
    return { tema: pick(pool.filter((t) => (J.preguntados[t] || 0) === min)), origen: "de esta partida" };
  }
  // error en una pregunta: cuesta puntos visibles en la barra del tema (pequeño en nivel 1, mayor en el 3)
  function cobrarError(barra) {
    const b = barra || masDebil(J.st), d = PQ.costoError(J.reto, b, J.st[b]);
    if (d) { const antes = { ...J.st }; J.st[b] = lim(J.st[b] + d, 0, 100); mostrarDeltas(antes); }
    return d ? ` <span class="malo">${d > 0 ? "+" : ""}${d} ${MINUS[b]}</span>` : "";
  }
  function aprender(clave, titulo, texto, quien, tema) {
    if (window.BITACORA) { const T = window.tr || ((x) => x); BITACORA.registrar("aprendido", clave, { titulo: T(titulo), texto: T(texto), quien: T(quien), tema: tema || null }); }
  }
  // pregunta con opciones; en automático acierta con probabilidad "comprensión"
  // (no se puede llamar elegir: esa es la del menú y si se repite el nombre, JUGAR deja de funcionar)
  async function elegirRespuesta(cont, opciones, correcta, delay = 2000, pAuto = ui.comp) {
    if (!Array.isArray(opciones) || opciones.length < 2 || !(correcta >= 0 && correcta < opciones.length)) {
      console.error("[G-NOSIS] pregunta omitida: opciones o respuesta inválidas", { opciones, correcta });
      if (cont) cont.innerHTML = "";
      return true;
    }
    const i = await botones(cont, opciones.map((o) => ({ html: esc(o) })), { auto: () => PQ.respuestaAuto(opciones.length, correcta, pAuto), delay });
    const ok = i === correcta;
    marcar(cont, i, ok ? "ok" : "ko"); if (!ok) marcar(cont, correcta, "ok");
    if (window.SFX) SFX.play(ok ? "acierto" : "error");
    return ok;
  }

  // costo pequeño del primer error (se ve al instante): radiación sube, las demás bajan; nunca pasa de 10 / 90
  function cobrarPista(barra) {
    const b = barra || masDebil(J.st), n = (PD.reglas && PD.reglas.costoPista) || 2;
    const d = b === "radiacion" ? lim(Math.min(n, 90 - J.st[b]), 0, n) : -lim(Math.min(n, J.st[b] - 10), 0, n);
    if (d) { const antes = { ...J.st }; J.st[b] = lim(J.st[b] + d, 0, 100); mostrarDeltas(antes); }
    return d ? ` <span class="malo">${d > 0 ? "+" : ""}${d} ${MINUS[b]}</span>` : "";
  }
  // pregunta con UN reintento que cuesta (nunca gratis ni ilimitado):
  //   1.er error: se tacha la opción, aparece la pista y cuesta un poco (cobrarPista);
  //   2.º error: se muestra la respuesta y la explicación, se cobra el costo normal y se sigue.
  async function preguntar(cont, q, { delay = 2000, pAuto = ui.comp } = {}) {
    // aquí llegan solo { opciones, correcta, pista, ... }: se revisa ESO (el esquema completo del banco
    // se revisa antes, en responderBanco). Antes se pedía id/enunciado/fuente y TODAS se omitían.
    const invalida = !q || !Array.isArray(q.opciones) || q.opciones.length < 2 || !q.opciones.every((o) => typeof o === "string" && o.trim()) ? "opciones inválidas"
      : !(Number.isInteger(q.correcta) && q.correcta >= 0 && q.correcta < q.opciones.length) ? "correcta fuera de rango" : null;
    if (invalida) { console.error("[G-NOSIS] pregunta omitida (" + (q && q.id) + "): " + invalida); if (cont) cont.innerHTML = ""; return { ok: true, intentos: 0, omitida: true }; }
    const { opciones, correcta } = q, tachadas = new Set();
    let aviso = cont.nextElementSibling;
    if (!aviso || !aviso.classList.contains("aviso-pista")) { aviso = document.createElement("div"); aviso.className = "aviso-pista"; cont.after(aviso); }
    for (let intento = 1; intento <= 2; intento++) {
      const libres = opciones.map((_, i) => i).filter((i) => i !== correcta && !tachadas.has(i));
      const pa = intento === 1 ? pAuto : pAuto + (1 - pAuto) / 2;
      const i = await botones(cont, opciones.map((o, k) => ({ html: esc(o), dis: tachadas.has(k) })), { auto: () => (Math.random() < pa || !libres.length ? correcta : libres[Math.floor(Math.random() * libres.length)]), delay });
      if (i === correcta) { marcar(cont, i, "ok"); if (window.SFX) SFX.play("acierto"); aviso.innerHTML = ""; if (J && J.cuenta) { J.cuenta.pq++; if (intento === 1) J.cuenta.pq1++; } return { ok: true, intentos: intento }; }
      if (window.SFX) SFX.play("error");
      tachadas.add(i);
      if (intento === 1) {
        aviso.innerHTML = `<p class="pista-txt"><b>Pista:</b> ${esc(q.pista || "Vuelve a leer el texto con calma.")}${cobrarPista(q.barra)}</p>`;
        hablar(30);
      } else {
        marcar(cont, i, "ko"); marcar(cont, correcta, "ok");
        aviso.innerHTML = `<div class="res ko">Era «${esc(opciones[correcta])}». ${esc(q.explicacion || "")}${cobrarError(q.barra)}</div>`;
        hablar((q.explicacion || "").length + 20);
        if (J && J.cuenta) J.cuenta.pq++;
        return { ok: false, intentos: 2 };
      }
    }
  }

  async function llamada(n, idx) {
    // se alternan: situación (predice, evidencia, actúa) y pregunta; la tercera es de «consulta la bitácora»
    const tipo = idx === 2 ? "bitacora" : idx % 2 === 0 ? "situacion" : "pregunta";
    marca("ll");
    animo("alerta");
    await irA("control", { llamada: true }, "¡Suena la radio en");
    await consejoLaika("llamada", "¡Guau! Llama Control de Misión. Primero verás la pregunta y luego el informe: léelo para encontrar la respuesta.");
    if (window.SFX) SFX.play("llamada");
    toast("((( Llamada de Control de Misión )))");
    if (tipo === "situacion") { const sel = elegirTema(idx); if (sel) return llamadaSituacion(sel); }
    if (tipo === "bitacora" && !J.bitacoraHecha) { const q = PQ.preguntaBitacora(APIS.datos, J.partida); if (q) { J.bitacoraHecha = true; return preguntaCtrl(q, "CONSULTA TU BITÁCORA"); } }
    // transferencia: solo nivel 3 y con 4 o más bien en los últimos 5 retos (la ventana del nivel adaptativo)
    const AD = R.reglas.adaptacion, conT = PQ.transferenciaPermitida(J.ventana, J.reto, AD.ventana, AD.sube);
    const q = PQ.preguntaLlamada(PD.banco, Object.keys(J.aprendidos), J.reto, J.partida, idx, J.usadas, conT);
    if (q && q.tipo === "transferencia") log("Pregunta de transferencia (le va muy bien en nivel 3).");
    if (q) { J.usadas.push(q.id); return preguntaCtrl(q, "PREGUNTA DE CONTROL DE MISIÓN"); }
    const sel = elegirTema(idx); if (sel) return llamadaSituacion(sel);
  }

  // pregunta del banco, de bitácora o de repaso: la pregunta, luego el texto donde está la respuesta, luego las opciones.
  // El repaso no muestra el texto (es memoria) pero deja abrir «Lo aprendido»; la de bitácora abre «Datos NASA».
  async function preguntaCtrl(q, tag) {
    const enBitacora = q.tipo === "bitacora" ? "datos" : q.tipo === "repaso" ? "aprendido" : null;
    const c = pantalla(`<span class="tag llamada">${esc(tag)}</span><p class="txt pregunta-antes">${esc(q.enunciado)}</p>` +
      (enBitacora ? `<p><button type="button" class="op" id="abrir-bt">Abrir la bitácora ▸</button></p>` : q.lectura ? lectura(q.lectura, "", q.tipo === "transferencia" ? "LEE LA REGLA Y ÚSALA EN ESTE CASO" : undefined) : "") +
      `<div class="ops col" id="ops"></div><div id="res"></div>`, "control");
    voz(q.enunciado + (q.lectura && !enBitacora && !ui.sinTexto ? " " + q.lectura : ""));
    if (enBitacora) c.querySelector("#abrir-bt").addEventListener("click", () => window.BITACORA && BITACORA.abrir(enBitacora));
    const r = await responderBanco(c, q, tag);
    J.cuenta.ll++; if (r.ok && r.intentos === 1) J.cuenta.llOk++;
  }
  // contesta una pregunta del banco ya pintada en la pantalla c (opciones en #ops): reintento con pista,
  // y la explicación y la evidencia SOLO después de contestar
  async function responderBanco(c, q, tag) {
    const mal = PQ.validarPregunta(q);
    if (mal) { console.error("[G-NOSIS] pregunta del banco omitida (" + (q && q.id) + "): " + mal); return { ok: true, intentos: 0, omitida: true }; }
    const fija = q.tipo === "bitacora" || q.tipo === "repaso" && q.id.startsWith("R-") && !PD.banco.some((p) => "R-" + p.id === q.id);
    const base = fija ? { opciones: q.opciones.slice(0, Math.max(2, PQ.opcionesPorNivel(J.reto))), indiceCorrecto: q.indiceCorrecto } : PQ.recortarOpciones(q.opciones, q.indiceCorrecto, PQ.opcionesPorNivel(J.reto));
    const bj = PQ.barajarFijo(base.opciones, base.indiceCorrecto, q.id);
    const r = await preguntar(c.querySelector("#ops"), { opciones: bj.opciones, correcta: bj.correcta, pista: q.pista, explicacion: q.explicacion, barra: q.barra }, { delay: 2300 });
    if (window.BITACORA && BITACORA.abierta()) BITACORA.cerrar();
    c.querySelector("#res").innerHTML = `<div class="res ${r.ok ? "ok" : "ko"}">${r.ok ? "<b>" + (r.intentos === 1 ? "¡Correcto!" : "¡Correcto, con pista!") + "</b> " + esc(q.explicacion) : "Ahora ya lo sabes."}` +
      `<br><span class="sub">Evidencia: «${esc(q.fraseEvidencia)}» · ${esc(q.fuente)}</span></div><div id="frase"></div><div class="ops" id="ops2"></div>`;
    hablar(q.explicacion.length);
    if (r.ok && q.lectura && q.tipo !== "repaso") await fraseQueLoPrueba(c.querySelector("#frase"), q);
    aprender("q-" + q.id.replace(/^R-/, ""), q.tema && R.temas[q.tema] ? R.temas[q.tema].nombre : "Pregunta de Control", q.explicacion + " " + q.fraseEvidencia, "Control de Misión", q.tema);
    log(`${tag} (${q.id}): ${r.ok ? (r.intentos === 1 ? "correcta" : "correcta con pista") : "incorrecta"}${ui.sinTexto ? " [sin texto]" : ""}.`);
    registrarReto(r.ok && r.intentos === 1);
    if (!r.omitida) anotar("pregunta", { reto_id: q.id, tema: q.tema || null, origen: q.tipo === "repaso" ? "repaso" : null, accion_correcta: !!(r.ok && r.intentos === 1), intentos: Math.max(1, Math.min(2, r.intentos || 1)) });
    if (q.lectura && q.tipo !== "repaso" && q.tipo !== "bitacora") contarLectura(r.ok && r.intentos === 1);
    await continuar(c.querySelector("#ops2"), tag === "INFORME" ? "Continuar ▸" : "Colgar ▸", 2600);
    return r;
  }

  // estadística de la prueba de lectura (panel del equipo): aciertos al primer intento con y sin texto
  function contarLectura(ok) { const x = ui.lecturaStats[ui.sinTexto ? "sin" : "con"]; x.n++; if (ok) x.ok++; pintarCtl(); }
  // tras acertar: «¿Qué frase lo prueba?» con 3 o 4 frases (las del texto y, si faltan, de otros informes).
  // Acertar da un bonus pequeño (+3 a la barra más débil); fallar no cuesta nada. Fijo por pregunta.
  const oraciones = (t) => String(t).split(/(?<=[.!?])\s+/).filter((x) => x.length > 8);
  async function fraseQueLoPrueba(caja, q) {
    const propias = oraciones(q.lectura), correcta = propias.find((o) => o.includes(q.fraseEvidencia) || q.fraseEvidencia.includes(o)) || q.fraseEvidencia;
    const otras = propias.filter((o) => o !== correcta);
    for (const p of PD.banco) { if (otras.length >= 3) break; if (p.id !== q.id && p.tema !== q.tema && !otras.includes(p.fraseEvidencia)) otras.push(p.fraseEvidencia); }
    const bj = PQ.barajarFijo([correcta, ...otras.slice(0, 3)], 0, q.id + "-frase");
    caja.innerHTML = `<span class="paso">BONUS · ¿QUÉ FRASE LO PRUEBA?</span><div class="ops col" id="fr"></div><div id="fr-res"></div>`;
    const ok = await elegirRespuesta(caja.querySelector("#fr"), bj.opciones, bj.correcta, 2000);
    const bonus = (PD.reglas.bonusFrase && PD.reglas.bonusFrase.valor) || 3, b = masDebil(J.st);
    if (ok) { aplicar({ barraMasBaja: bonus }); J.cuenta.frases = (J.cuenta.frases || 0) + 1; }
    caja.querySelector("#fr-res").innerHTML = `<p class="sub">${ok ? `¡Bien leído! +${bonus} de ${MINUS[b]}.` : "Esa no era; la de arriba en verde lo prueba. No pasa nada."}</p>`;
  }

  // situación: un paso por pantalla (cabe en la franja). Primero la pregunta, luego el informe de Control,
  // luego las opciones. El porqué se muestra solo al final, cuando ya contestó todo.
  async function llamadaSituacion(sel) {
    const s = R.situaciones.find((x) => x.tema === sel.tema), x = s && PD.situaciones[s.id], nv = String(J.lectura);
    if (!s || !x) return;
    J.preguntados[s.tema] = (J.preguntados[s.tema] || 0) + 1;
    if (s.escenario && s.escenario !== "control") escena(s.escenario, {});
    const cab = `<span class="tag llamada">LLAMADA · CONTROL DE MISIÓN</span><p class="txt">${esc(x.situacion[nv])}</p>`;
    const pista = { pista: x.pista, explicacion: x.porQue, barra: s.prediccion.barra };
    // 1a · qué barra cambia primero
    let c = pantalla(cab + `<span class="paso">1 · PREDICE: ¿QUÉ BARRA CAMBIA PRIMERO?</span>` + lectura(x.informe, "", "INFORME DE CONTROL") + `<div class="ops" id="p"></div>`, "control");
    voz(x.situacion[nv] + (ui.sinTexto ? "" : " " + x.informe));
    const ok1 = (await preguntar(c.querySelector("#p"), Object.assign({ opciones: BARRAS.map((b) => MAYUS[b]), correcta: BARRAS.indexOf(x.cadena[0]) }, pista), { delay: 1900 })).ok;
    await espera(700);
    // 1b · y después
    const resto = BARRAS.filter((b) => b !== x.cadena[0]);
    c = pantalla(cab + `<span class="paso">… PRIMERO CAMBIA ${MAYUS[x.cadena[0]]}. ¿QUÉ BARRA CAMBIA DESPUÉS?</span>` + lectura(x.informe, "", "INFORME DE CONTROL") + `<div class="ops" id="p"></div>`, "control");
    const ok2 = (await preguntar(c.querySelector("#p"), Object.assign({ opciones: resto.map((b) => MAYUS[b]), correcta: resto.indexOf(x.cadena[1]) }, pista), { delay: 1900 })).ok;
    const predOk = ok1 && ok2;
    contarLectura(predOk);
    await espera(700);
    // 2 · qué dato lo prueba (sin el texto: lo acaba de leer)
    const ev = PQ.barajarFijo([x.evidencia.correcta, ...x.evidencia.distractores.slice(0, PQ.opcionesPorNivel(J.reto) - 1)], 0, s.id + "-ev");
    c = pantalla(cab + `<span class="paso">2 · ¿QUÉ DATO DEL INFORME LO PRUEBA?</span><div class="ops col" id="p"></div>`, "control");
    const evOk = (await preguntar(c.querySelector("#p"), { opciones: ev.opciones, correcta: ev.correcta, pista: "La prueba está en el informe de esta llamada, no en otros.", explicacion: "La prueba era: " + x.evidencia.correcta, barra: s.prediccion.barra }, { delay: 2100 })).ok;
    await espera(700);
    // 3 · actúa (una sola oportunidad: tiene efectos en la base)
    const acc0 = s.acciones.slice(0, J.reto + 1).map((a, i) => ({ ...a, i }));
    const fijo = PQ.barajarFijo(acc0, acc0.findIndex((a) => a.i === s.correcta), s.id + "-acc"), acc = fijo.opciones;
    c = pantalla(cab + `<span class="paso">3 · ACTÚA</span><div class="ops col" id="accs"></div><div id="res"></div>`, "control");
    const accs = c.querySelector("#accs"), pos = fijo.correcta;
    const accOk = await elegirRespuesta(accs, acc.map((a) => a.texto), pos, 2300, lim(ui.comp + (predOk ? 0.1 : -0.1), 0.02, 0.98));
    const elegida = acc[accs.querySelector(".elegida") ? +accs.querySelector(".elegida").dataset.i : pos];
    const ef = !accOk && conApoyo() ? suavizar(elegida.efectos) : elegida.efectos;
    aplicar(ef);
    J.cuenta.ll++; if (accOk) J.cuenta.llOk++;
    // 4 · mira qué pasó: ahora sí, el porqué
    let html = `<span class="paso">4 · MIRA QUÉ PASÓ</span><div class="res ${accOk ? "ok" : "ko"}">${efectosTxt(ef)}`;
    if (accOk && predOk && evOk) {
      const b = masDebil(J.st);
      if (zona(b, J.st[b]) !== "verde") { aplicar({ barraMasBaja: R.powerups.recarga.valor }); html += `<br>¡Bien, capitán! Ganaste <b>Recarga</b>: +${R.powerups.recarga.valor} de ${MINUS[b]}.`; }
      else { J.preparado = true; pintarExtra(); html += `<br>¡Bien, capitán! Ganaste <b>Pronóstico</b>: mañana estarás preparado.`; }
    }
    html += `<br><b>Por qué:</b> ${esc(x.porQue)}<br>${esc(s.explicacion[nv])}<br><span class="sub">El informe se guardó en tu bitácora.</span></div>`;
    if (!accOk) { const it = sel.intentos || 1; if (it < 2) J.repasos.push({ tema: s.tema, disponible: J.dia + 2, intentos: it }); else J.diferidos.push(s.tema); }
    c = pantalla(cab + html + `<div class="ops" id="ops"></div>`, "control");
    hablar(s.explicacion[nv].length + x.porQue.length);
    voz(x.porQue + " " + s.explicacion[nv]);
    if (window.BITACORA) BITACORA.registrar("informe", "ll-" + s.id, { titulo: "Control de Misión: " + R.temas[s.tema].nombre, texto: x.informe, fuente: "Control de Misión", tema: s.tema });
    aprender("ll-" + s.tema, R.temas[s.tema].nombre, s.explicacion[nv] + " " + x.porQue, "Control de Misión", s.tema);
    log(`Llamada (${R.temas[s.tema].nombre}): predicción ${predOk ? "bien" : "mal"}, dato ${evOk ? "bien" : "mal"}, acción ${accOk ? "bien" : "mal"}${ui.sinTexto ? " [sin texto]" : ""}.`);
    registrarReto(accOk && predOk);
    anotar("situacion", { reto_id: s.id, tema: s.tema, origen: ORIGEN[sel.origen] || null, prediccion_correcta: !!predOk, accion_correcta: !!accOk, accion: String((elegida && elegida.texto) || "").slice(0, 200), con_apoyo: !!conApoyo() });
    await continuar(c.querySelector("#ops"), "Colgar ▸", 2600);
  }

  // ---------- avería: alarma en el plano -> pistas en el módulo -> diagnóstico ----------
  async function averia(n) {
    const fase = J.dia >= 11 ? 3 : 2, nv = String(J.reto);
    const pool = R.averias.filter((a) => a.fases.includes(fase));
    const conCarta = pool.filter((a) => a.temas.some((t) => J.cartas[t]));
    const a = pick(conCarta.length ? conCarta : pool);
    const carta = a.temas.find((t) => J.cartas[t]);
    const A = R.reglas.averias, NV = A.niveles[nv], b = a.barra, INT = 2;   // un reintento con pista y costo (sin reintento gratis)
    const dano = (v) => ({ [b]: b === "radiacion" ? v : -v });
    marca("av");
    animo("peligro");
    await irA(a.escenario || "maquinas", Object.assign({ alarma: true }, ESTADO_AVERIA[a.id] || {}), "¡Alarma! Algo se descompuso en");
    await consejoLaika("averia", "¡Algo se rompió! Lee las pistas con calma: no todas tienen que ver. Primero busca la causa y luego qué reparar.");
    aplicar(dano(A.danoInicial));
    const nIrr = { 1: 1, 2: 2, 3: 2 }[nv];
    const pistas = barajar([
      ...a.pistas.clave.map((t) => ({ t, clave: true })),
      ...a.pistas.distractores.slice(0, NV.distractores).map((t) => ({ t })),
      ...(NV.enganosa ? [{ t: a.pistas.enganosa }] : []),
      ...barajar(PD.averias.irrelevantes).slice(0, nIrr).map((t) => ({ t })),
    ]);
    const c = pantalla(`<span class="tag alarma">ALARMA</span><h2 class="titulo">${esc(a.alarma)}</h2><p class="sub">Lee las pistas: no todas tienen que ver.</p><div id="pistas"></div><div id="causa"></div><div id="rep"></div><div id="res"></div>`, "cientifica");
    voz(a.alarma);
    const cont = c.querySelector("#pistas");
    let resaltada = false;
    for (const p of pistas) {
      await espera(600);
      const mostrar = carta && p.clave && !resaltada;
      if (mostrar) resaltada = true;
      cont.insertAdjacentHTML("beforeend", `<div class="pista ${mostrar ? "clave" : ""}">${esc(p.t)}${mostrar ? `<br><small class="sub">Tu carta ${esc(R.temas[carta].carta.nombre)} te ayuda a notar esto.</small>` : ""}</div>`);
    }
    const apoyo = conApoyo(), porError = apoyo ? Math.round(A.danoPorError / 2) : A.danoPorError;
    // un paso con intentos limitados: cada error cuesta; al acabarse, la Dra. Ortiz da la respuesta
    async function paso(caja, titulo, opciones, correcta, pista) {
      caja.innerHTML = `<span class="paso">${titulo}</span><div class="ops col"></div><div class="aviso-int"></div>`;
      const ops = caja.querySelector(".ops"), aviso = caja.querySelector(".aviso-int"), tachadas = new Set();
      for (let intento = 1; intento <= INT; intento++) {
        const pAuto = intento === 1 ? ui.comp + (carta ? 0.15 : 0) + (apoyo ? 0.1 : 0) : ui.comp + (1 - ui.comp) / 2;
        const libres = opciones.map((_, i) => i).filter((i) => i !== correcta && !tachadas.has(i));
        const i = await botones(ops, opciones.map((o, k) => ({ html: esc(o), dis: tachadas.has(k) })), { auto: () => (Math.random() < pAuto || !libres.length ? correcta : pick(libres)), delay: 2000 });
        if (i === correcta) { marcar(ops, i, "ok"); if (window.SFX) SFX.play("acierto"); return intento; }
        tachadas.add(i); marcar(ops, i, "ko"); if (window.SFX) SFX.play("error");
        if (intento < INT) {
          // primer error: pista corta y costo pequeño, visible al instante
          const pc = Math.max(1, Math.round(porError / 2));
          aplicar(dano(pc));
          aviso.innerHTML = `<p class="pista-txt"><b>Pista:</b> ${esc(pista)} <span class="malo">${b === "radiacion" ? "+" : "−"}${pc} ${MINUS[b]}</span></p>`;
          hablar(30);
        }
      }
      // segundo error: explicación, costo normal y se sigue (el niño nunca se queda atascado)
      aplicar(dano(porError));
      ops.innerHTML = `<div class="res ko">Dra. Ortiz: era «${esc(opciones[correcta])}». ${esc(a.explicacion)} <span class="malo">${b === "radiacion" ? "+" : "−"}${porError} ${MINUS[b]}</span></div>`;
      aviso.innerHTML = "";
      hablar(opciones[correcta].length + a.explicacion.length);
      await espera(1600);
      return INT + 1;
    }
    const causas = PQ.recortarOpciones(PD.averias.causas[a.id], 0, PQ.opcionesPorNivel(J.reto));
    const bc = PQ.barajarConCorrecta(causas.opciones, 0);
    const iCausa = await paso(c.querySelector("#causa"), "1 · ¿CUÁL ES LA CAUSA?", bc.opciones, bc.correcta, `Vuelve a leer esta pista: «${a.pistas.clave[0]}».`);
    const ops = barajar(a.acciones.slice(0, NV.acciones).map((t, i) => ({ t, i })));
    const iRep = await paso(c.querySelector("#rep"), "2 · ¿QUÉ REPARAS?", ops.map((o) => o.t), ops.findIndex((o) => o.i === a.correcta), "Repara lo que causa el problema, no lo que se ve al final.");
    J.est = Object.assign({}, J.est, { alarma: false });
    animo("calma");
    J.cuenta.av++;
    const primera = iCausa === 1 && iRep === 1;
    if (primera) { J.cuenta.avOk++; aplicar({ [b]: mejora(b, A.bonusPrimerIntento) }); }
    else if (!J.repasos.some((r) => r.tema === a.temas[0])) J.repasos.push({ tema: a.temas[0], disponible: J.dia + 2, intentos: 1 });
    c.querySelector("#res").innerHTML = `<div class="res ${primera ? "ok" : ""}">${primera ? `¡Causa y reparación al primer intento! +${A.bonusPrimerIntento} de ${MINUS[b]}.` : "Avería reparada."}<br><b>Por qué pasó:</b> ${esc(a.explicacion)}</div><div class="ops" id="ops"></div>`;
    voz(a.explicacion);
    hablar(a.explicacion.length);
    aprender("av-" + a.id, a.alarma, a.explicacion, "Dra. Ortiz", a.temas[0]);
    log(`Avería: ${a.alarma} Causa en ${iCausa > INT ? "—" : iCausa} intento(s), reparación en ${iRep > INT ? "—" : iRep}.`);
    registrarReto(primera);
    anotar("averia", { reto_id: a.id, tema: a.temas[0], accion_correcta: !!primera, intentos: Math.max(1, Math.min(3, Math.max(iCausa, iRep) | 0)), con_apoyo: !!conApoyo() });
    await continuar(c.querySelector("#ops"), "Volver a la base ▸", 2600);
    escena(a.escenario || "maquinas", {});
  }

  // ---------- final: cinemática, lo que aprendiste y manual para el siguiente capitán ----------
  function verCinematica(idFinal) {
    const t = tok;
    return new Promise((res, rej) => {
      hud.hidden = true; stage.classList.remove("tiembla");
      estado = "final";
      iniciarFinal(idFinal, () => { estado = "juego"; hud.hidden = false; ultimaEscena = 0; t === tok ? res() : rej(ABORT); });
      // en automático, se salta a la tarjeta y luego se cierra
      const paso = () => {
        if (t !== tok || !finalActual) return;
        if (ui.modo === "auto" && tiempoFinal() > Math.min(tarjetaFinal(), 9 / ui.vel) + 2.5 / ui.vel) avanzarFinal();
        timer(paso, 400);
      };
      timer(paso, 400);
    });
  }
  async function final(n) {
    pintarTrack();
    const ex = n.exito;
    log(ex ? `Fin: ${n.titulo} (${n.estrellas} estrellas).` : `Fin: ${n.titulo}.`);
    J.musicaFinal = ex ? "final-bueno" : "final-malo";
    // récords en la cuenta del niño (no se guardan las partidas del modo automático del equipo)
    if (window.CUENTA && (ui.modo === "manual" || qs.get("guardar"))) {      // ?guardar=1: el equipo prueba el guardado jugando en automático
      const lim100 = (x) => Math.max(0, Math.min(100, Math.round(+x || 0)));
      J.guardada = CUENTA.guardarPartida({ version: (window.GRAFO && GRAFO.version) || "0", nivelReto: J.reto, nivelLectura: J.lectura, final: n.id, estrellas: ex ? Math.max(0, Math.min(3, n.estrellas | 0)) : 0,
        diaFinal: Math.max(0, Math.min(14, J.dia | 0)), barras: { radiacion: lim100(J.st.radiacion), energia: lim100(J.st.energia), comida: lim100(J.st.comida), salud: lim100(J.st.salud) },
        tareas: Math.max(0, J.st.mision | 0), pregTotal: J.cuenta.pq, pregPrimera: Math.min(J.cuenta.pq1, J.cuenta.pq),
        respuestas: J.registro.slice(), pasos: J.pasos.slice() }).then((id) => id, () => null);
    }
    await verCinematica(FINAL_DE[n.id] || (ex ? "relevo" : "apagon"));
    escena("exterior", { nave: !!ex });
    // "lo que aprendiste" ya va en la tarjeta de la cinemática (finales.js)
    let c = pantalla((ex ? `<span class="tag">LLEGÓ EL RELEVO</span><div class="estrellas">${"★".repeat(n.estrellas)}${"☆".repeat(3 - n.estrellas)}</div>` : `<span class="tag alarma">EVACUACIÓN</span>`) +
      `<h2 class="titulo">${esc(n.titulo)}</h2><p class="txt">${esc(n.mensaje)}</p>` +
      `<div class="res" style="padding:5px 10px">Descubriste ${Object.keys(J.cartas).length} de ${Object.keys(R.temas).length} cartas de la Luna.</div>` +
      `<p class="sub" style="font-size:11.5px;line-height:1.25;margin:0">Llamadas resueltas bien: ${J.cuenta.llOk} de ${J.cuenta.ll} · Averías al primer intento: ${J.cuenta.avOk} de ${J.cuenta.av} · Minijuegos ganados: ${J.cuenta.mjOk} de ${J.cuenta.mj} · Cartas usadas: ${J.cuenta.usos}</p><div class="ops" id="ops"></div>`);
    await continuar(c.querySelector("#ops"), "Escribir el manual para el siguiente capitán ▸", 3000);

    escena("control", {});
    const propias = Object.keys(J.cartas);
    const kk = Math.min(2, propias.length);            // siempre 2 recomendaciones (si tiene cartas)
    const elegidas = [], bien = [];
    for (let jj = 0; jj < kk; jj++) {
      const libres = propias.filter((x) => !elegidas.includes(x));
      c = pantalla(`<span class="tag">MANUAL PARA EL SIGUIENTE CAPITÁN</span><p class="txt">Elige una carta para recomendarle (${jj + 1} de ${kk}).</p><div class="ops" id="ops"></div>`);
      const i = await botones(c.querySelector("#ops"), libres.map((x) => ({ html: esc(R.temas[x].carta.nombre) })), { auto: () => Math.floor(Math.random() * libres.length), delay: 1600 });
      const tt = libres[i]; elegidas.push(tt);
      const k2 = R.temas[tt].carta;
      // por qué: razones predefinidas; la correcta es su momento, las demás son de otras cartas
      const razon = (m) => `Porque sirve ${m.charAt(0).toLowerCase() + m.slice(1)}.`;
      const otras = barajar(Object.keys(R.temas).filter((x) => x !== tt)).slice(0, PQ.opcionesPorNivel(J.reto) - 1).map((x) => razon(R.temas[x].carta.momento));
      const rz = PQ.barajarConCorrecta([razon(k2.momento), ...otras], 0);
      c = pantalla(`<span class="tag">MANUAL PARA EL SIGUIENTE CAPITÁN</span><h2 class="titulo">${esc(k2.nombre)}</h2><p class="txt">¿Por qué se la recomiendas?</p><div class="ops col" id="ops"></div><div id="res"></div>`);
      voz("¿Por qué recomiendas " + k2.nombre + "?");
      const ok = await elegirRespuesta(c.querySelector("#ops"), rz.opciones, rz.correcta, 1900);
      if (ok) bien.push(tt);
      c.querySelector("#res").innerHTML = `<div class="res ${ok ? "ok" : "ko"}"><span>${ok ? "¡Buen consejo!" : `Esta carta sirve ${esc(k2.momento.charAt(0).toLowerCase() + k2.momento.slice(1))}.`}</span> ${esc(k2.frase)}</div><div class="ops" id="ops2"></div>`;
      await continuar(c.querySelector("#ops2"), "Siguiente ▸", 1800);
    }
    anotar("manual", { accion_correcta: bien.length === kk, aciertos: bien.length, total: kk });
    if (J.guardada && window.CUENTA) { const filaManual = J.registro[J.registro.length - 1]; J.guardada.then((id) => id && CUENTA.agregarRespuestas(id, [filaManual], bien)); }
    historial = {
      temas: Object.keys(J.aprendidos).filter((x) => J.aprendidos[x] >= 0),
      repasos: [...new Set([...J.pasados, ...J.diferidos, ...J.repasos.map((r) => r.tema)])].slice(-3),
      cartas: bien,
      niveles: { reto: J.reto, lectura: J.lectura, ventana: J.ventana.slice(), ajustes: J.ajustes.slice(-10) },
    };
    // progreso local (modo libre: no sale del dispositivo). En modo salón, aquí se mandaría a Supabase.
    guardarLS(CLAVE, { historial, partidas, fecha: new Date().toISOString() });
    c = pantalla(`<span class="tag">MANUAL TERMINADO</span><h2 class="titulo">${bien.length} de ${kk} recomendaciones con buena razón</h2>` +
      `<p class="txt">${bien.length ? "La siguiente misión empieza con: " + bien.map((x) => esc(R.temas[x].carta.nombre)).join(", ") + "." : "La siguiente misión empieza sin cartas."}</p>` +
      `<div class="ops" id="ops"></div>`);
    const i = await botones(c.querySelector("#ops"), [{ html: "Jugar otra misión ▸", prim: true }, { html: "Volver al menú" }], { auto: 0, delay: 3500 });
    if (i === 0) nuevaPartida(); else volverAlMenu();
  }

  // ---------- arranque ----------
  pintarCtl(); ajustar();
  APIS.cargar().then(() => { pintarCtl(); pintarDatoMenu(); }).catch(() => {});
  pintarDatoMenu();
  if ($("btn-menu")) $("btn-menu").addEventListener("click", pintarDatoMenu);
  (async () => {
    try {
      await Promise.race([
        Promise.all([document.fonts.load(`12px ${FONT_FAMILY}`), document.fonts.load(`bold 60px ${FONT_FAMILY}`)]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch (e) { /* si la fuente falla, se usa la monoespaciada del sistema */ }
    buildAtlas();
    ajustar();
    menuStart = performance.now();
    // ?auto=1 empieza solo (pruebas del equipo); ?final=apagon abre ese final
    const pedido = qs.get("final");
    if (pedido && FINALES[pedido]) { estado = "final"; iniciarFinal(pedido, () => volverAlMenu()); }
    else if (qs.get("auto")) entrarJuego();
    requestAnimationFrame(frame);
  })();
  window.GNOSIS = { finales: ORDEN_FINALES.slice(), estado: () => ({ estado, J }) };
})();

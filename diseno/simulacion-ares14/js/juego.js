/* =========================================================
   ARES-14  -  simulacion de una partida
   Menu y alunizaje: adaptados de main.js (arte original).
   Despues del alunizaje: la base, con barras, cartas, llamadas,
   averias y el manual para el siguiente capitan. Usa los mismos
   datos y reglas que grafo-mision-lunar.json y retos-mision-lunar.json.
   ========================================================= */
(() => {
  "use strict";
  const G = window.GRAFO, R = window.RETOS;
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

  // ---------- controles de la simulacion ----------
  const ui = { uso: "libre", grado: 4, modo: "manual", vel: 1, hab: 0.7, comp: 0.65, voz: false };
  const stage = $("stage"), hud = $("hud"), ctrl = $("ctrl"), $c = $("consola");
  function pintarCtl() {
    ctrl.querySelectorAll("[data-uso]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.uso === ui.uso)));
    $("l-grado").hidden = ui.uso !== "educativo";
    ctrl.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === ui.modo)));
    ctrl.querySelectorAll("[data-vel]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.vel === ui.vel)));
    $("c-voz").setAttribute("aria-pressed", String(ui.voz));
    $("o-hab").textContent = Math.round(ui.hab * 100) + "%";
    $("o-comp").textContent = Math.round(ui.comp * 100) + "%";
  }
  ctrl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.uso) { ui.uso = b.dataset.uso; if (estado === "juego") nuevaPartida(false); }
    else if (b.dataset.modo) ui.modo = b.dataset.modo;
    else if (b.dataset.vel) ui.vel = +b.dataset.vel;
    else if (b.id === "c-voz") ui.voz = !ui.voz;
    else if (b.id === "c-reiniciar") { if (estado === "juego") nuevaPartida(false); else elegir("JUGAR"); }
    else if (b.id === "c-menu") volverAlMenu();
    pintarCtl();
  });
  $("c-hab").addEventListener("input", (e) => { ui.hab = +e.target.value / 100; pintarCtl(); });
  $("c-comp").addEventListener("input", (e) => { ui.comp = +e.target.value / 100; pintarCtl(); });
  $("c-grado").addEventListener("change", (e) => { ui.grado = +e.target.value; if (estado === "juego") nuevaPartida(false); });

  function ajustar() {
    const disp = Math.max(160, window.innerHeight - ctrl.offsetHeight);
    const w = Math.min(window.innerWidth, disp * 16 / 9), h = w * 9 / 16;
    stage.style.width = w + "px"; stage.style.height = h + "px";
    hud.style.transform = `scale(${w / 1280})`;
  }
  window.addEventListener("resize", ajustar);

  // ---------- menu y alunizaje (de main.js de ARES-14) ----------
  const TITLE = "ARES-14";
  const MENU = ["JUGAR", "SIMULACIÓN AUTOMÁTICA"];
  const WHITE = "rgb(235,240,255)", DIM = "rgb(110,118,135)", ACCENT = "rgb(255,246,225)";
  const canvas = $("juego");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  let estado = "menu", menuStart = 0, seqStart = 0, seqT0 = 0, fadeStart = 0, juegoT0 = 0;
  let selected = 0, itemRects = [], seq = null, last = 0;

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
      const label = blink ? `>  ${item}  <` : `   ${item}   `;
      const w = ctx.measureText(label).width;
      ctx.globalAlpha = b;
      ctx.fillStyle = sel ? ACCENT : DIM;
      ctx.fillText(label, W / 2, y);
      itemRects.push({ x: W / 2 - w / 2, y: y - 18, w, h: 36 });
    });
    ctx.font = `13px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(70,76,92)";
    ctx.fillText("ENTER o toca para elegir  -  F pantalla completa  -  M silenciar", W / 2, H - 22);
    ctx.globalAlpha = 1;
  }
  function drawJuego(now) {
    renderScene(ctx, 40 + (now - juegoT0) / 1000);
    ctx.fillStyle = "rgba(3,5,10,0.62)"; ctx.fillRect(0, 0, W, H);
    if (J && J.noche) { ctx.fillStyle = "rgba(4,8,36,0.5)"; ctx.fillRect(0, 0, W, H); }
  }
  function elegir(item) {
    ui.modo = item === "JUGAR" ? "manual" : "auto"; pintarCtl();
    abortar(); hud.hidden = true;
    estado = "aterrizaje";
    seqT0 = (performance.now() - menuStart) / 1000;
    seqStart = performance.now();
    seq = new Aterrizaje(moonRadius());
  }
  function terminarAterrizaje() { estado = "fundido"; fadeStart = performance.now(); }
  function entrarJuego() { estado = "juego"; juegoT0 = performance.now(); hud.hidden = false; nuevaPartida(false); }
  function volverAlMenu() { abortar(); hud.hidden = true; estado = "menu"; menuStart = performance.now() - 2500; }

  function frame(now) {
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
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
    } else drawJuego(now);
    dibujarBotonSonido(ctx);
    requestAnimationFrame(frame);
  }
  function toCanvas(ev) {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) * W / r.width, (ev.clientY - r.top) * H / r.height];
  }
  const hit = (p, q) => p[0] >= q.x && p[0] <= q.x + q.w && p[1] >= q.y && p[1] <= q.y + q.h;
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else { const p = document.documentElement.requestFullscreen?.(); if (p) p.catch(() => {}); }
  }
  window.addEventListener("keydown", (ev) => {
    const enBoton = ev.target instanceof HTMLButtonElement || ev.target instanceof HTMLInputElement;
    if (ev.key === "m" || ev.key === "M") return alternarSilencio();
    iniciarMusica();
    if ((ev.key === "f" || ev.key === "F") && !enBoton) return fullscreen();
    if (estado === "menu") {
      if (ev.key === "ArrowUp" || ev.key === "w") selected = (selected - 1 + MENU.length) % MENU.length;
      else if (ev.key === "ArrowDown" || ev.key === "s") selected = (selected + 1) % MENU.length;
      else if ((ev.key === "Enter" || ev.key === " ") && !enBoton) elegir(MENU[selected]);
    } else if (estado === "aterrizaje") {
      if (["Enter", " ", "Escape"].includes(ev.key)) terminarAterrizaje();
    } else if (estado === "juego") {
      if (ev.key === "Escape") volverAlMenu();
      else if (ev.key === "Enter" && !enBoton) {
        const b = $c.querySelector(".op.prim:not([disabled])") || (() => { const v = $c.querySelectorAll(".op:not([disabled])"); return v.length === 1 ? v[0] : null; })();
        if (b) b.click();
      }
    }
  });
  canvas.addEventListener("pointermove", (ev) => {
    const p = toCanvas(ev);
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

  // ---------- flujo asincrono con cancelacion ----------
  const ABORT = { abort: true };
  let tok = 0, timers = [];
  function abortar() {
    tok++; timers.forEach(clearTimeout); timers = [];
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
  }
  const timer = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const espera = (ms) => { const t = tok; return new Promise((res, rej) => timer(() => (t === tok ? res() : rej(ABORT)), ms / ui.vel)); };
  function botones(cont, opciones, { auto, delay = 1700 } = {}) {
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
  function voz(texto) {
    if (!(ui.voz && J.lectura === 1)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(texto); u.lang = "es-MX"; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) { /* sin voz */ }
  }
  function pantalla(html) { $c.innerHTML = html; $c.scrollTop = 0; return $c; }
  let toastId = null;
  function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastId); toastId = setTimeout(() => el.classList.remove("on"), 3200); }

  // ---------- estado de la partida ----------
  let J = null, historial = null;
  function nuevaPartida(conManual) {
    abortar();
    const n = J ? J.partida + 1 : 1;
    if (!conManual) historial = null;
    // nivel adaptativo: dos perillas (reto y lectura) que el niño nunca ve
    const AD = R.reglas.adaptacion, hn = historial && historial.niveles;
    const inicial = hn ? hn.reto : ui.uso === "educativo" ? AD.modos.educativo.nivelPorGrado[String(ui.grado)] : AD.modos.libre.nivelInicial;
    J = {
      partida: conManual ? n : 1, reto: inicial, lectura: hn ? hn.lectura : inicial,
      ventana: hn ? hn.ventana.slice() : [], desdeCambio: hn ? AD.enfriamiento : 0,
      calibrar: !hn && ui.uso !== "educativo", ajustes: hn ? hn.ajustes.slice() : [],
      st: { mision: 0 }, dia: 0, rama: null, noche: false,
      cartas: {}, aprendidos: {}, repasos: [], pasados: ((historial && historial.repasos) || []).slice(), diferidos: [],
      preguntados: {}, preparado: false, log: [], marcas: {}, hechasL: new Set(), hechasA: new Set(),
      cuenta: { ll: 0, llOk: 0, av: 0, avOk: 0, usos: 0 },
    };
    for (const b of BARRAS) J.st[b] = G.barras[b].inicio;
    for (const t of (historial && historial.cartas) || []) { J.cartas[t] = { usada: false, armada: false }; J.aprendidos[t] = -99; }
    J.diasLlamada = R.reglas.llamadas.ventanas.map((v) => pick(v.dias));
    J.diasAveria = R.reglas.averias.ventanas.map((v) => { const l = v.dias.filter((d) => !J.diasLlamada.includes(d)); return pick(l.length ? l : v.dias); });
    crearBarras(); pintarCartas(); pintarTrack(); pintarExtra(); $("log").innerHTML = "";
    if (historial && historial.cartas && historial.cartas.length) log(`Empiezas con ${historial.cartas.length} carta(s) del manual del capitán anterior.`);
    correr().catch((e) => { if (e !== ABORT) console.error(e); });
  }

  // ---------- HUD ----------
  function crearBarras() {
    $("barras").innerHTML = BARRAS.map((b) => `<div class="barra" data-b="${b}"><span class="lbl">${MAYUS[b]}${b === "radiacion" ? " (baja = mejor)" : ""}</span><span class="val"></span><span class="ascii"></span><span class="delta"></span></div>`).join("");
    pintarBarras();
  }
  function pintarBarras() {
    for (const b of BARRAS) {
      const el = $("barras").querySelector(`[data-b="${b}"]`), v = J.st[b], z = zona(b, v), n = Math.round(v / 5);
      el.querySelector(".val").textContent = v;
      el.querySelector(".val").className = "val z-" + z;
      const a = el.querySelector(".ascii");
      a.textContent = "[" + "#".repeat(n) + ".".repeat(20 - n) + "]";
      a.className = "ascii z-" + z;
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
  const RAMA_TXT = { experto: "EXPERTO", normal: "NORMAL", rescate: "RESCATE" };
  // lo que ve el niño: nada de niveles, ramas ni "apoyo"
  function pintarExtra() {
    $("h-rama").textContent = "";
    $("extra").innerHTML = `<span>Tareas de Control de Misión: <b>${J.st.mision}</b> / 3</span>` +
      (J.preparado ? `<span><b>Pronóstico activo</b>: si pierdes el próximo minijuego, el daño será la mitad.</span>` : "");
    pintarEquipo();
  }
  // lo que ve el equipo, fuera del juego
  function pintarEquipo() {
    const ult = J.ajustes.slice(-3).map((a) => `D${a.dia} ${a.accion === "sube" ? "↑" : "↓"} r${a.a.reto}/l${a.a.lectura}`).join(", ");
    $("c-equipo").textContent = `${ui.uso === "educativo" ? `salón ${ui.grado}°` : "libre"} · partida ${J.partida} · reto ${J.reto} · lectura ${J.lectura} · ` +
      `últimos retos ${J.ventana.map((x) => (x ? "✓" : "✗")).join("") || "—"} · rama ${J.rama ? RAMA_TXT[J.rama].toLowerCase() : "—"} · apoyo ${conApoyo() ? "sí" : "no"}` +
      (ult ? ` · ajustes: ${ult}` : "");
  }
  // mismo ajuste que el simulador: ventana de 5 retos, enfriamiento de 3, calibración rápida en modo libre
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
  function pintarCartas(nueva) {
    const temas = Object.keys(R.temas);
    $("n-cartas").textContent = Object.keys(J.cartas).length + " / " + temas.length;
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
      log(`Usaste ${k.nombre}: +${u.valor} de ${MINUS[u.barra]}.`);
    }
    pintarCartas(); pintarExtra();
  }
  function pintarTrack() {
    let h = "";
    for (let d = 0; d <= 14; d++) {
      const m = J.marcas[d] || {};
      const cls = ["dia", d >= 11 ? "noche" : "", d < J.dia ? "pasado" : "", d === J.dia ? "hoy" : ""].join(" ");
      h += `<span class="${cls}" title="Día ${d}">${d}${m.ll ? '<i class="ll"></i>' : ""}${m.av ? '<i class="av"></i>' : ""}${m.ev ? '<i class="ev"></i>' : ""}</span>`;
    }
    $("h-track").innerHTML = h;
    $("h-dia").innerHTML = `DÍA ${String(J.dia).padStart(2, "0")} / 14<small>${faseTxt(J.dia)}</small>`;
  }
  const faseTxt = (d) => (d === 0 ? "LLEGADA" : d <= 4 ? "FASE 1 · BIENVENIDA · SOL" : d <= 10 ? "FASE 2 · CLIMA ESPACIAL · SOL" : "FASE 3 · NOCHE LUNAR");
  const marca = (k) => { (J.marcas[J.dia] = J.marcas[J.dia] || {})[k] = true; pintarTrack(); };
  function log(t) {
    J.log.push(`D${String(J.dia).padStart(2, "0")} · ${t}`);
    $("log").innerHTML = J.log.slice(-4).map((x) => `<div>${esc(x)}</div>`).join("");
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

  // aplica efectos; un escudo listo (o, en automatico, uno que el nino decide usar) frena la mitad
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
        let x = Math.random() * out.reduce((s, e) => s + e.peso, 0);
        a = out.find((e) => (x -= e.peso) < 0) || out[out.length - 1];
      }
      pintarExtra();
      id = a.hacia;
    }
  }

  async function bannerDia() {
    pintarTrack();
    const noche = J.dia === 11;
    if (noche) J.noche = true;
    pantalla(`<div class="grande">DÍA ${String(J.dia).padStart(2, "0")}</div><p class="sub" style="text-align:center">${faseTxt(J.dia)}</p>` +
      (noche ? `<p class="txt" style="text-align:center">Se ocultó el Sol. Los paneles ya no cargan: la energía solo puede bajar.</p>` : ""));
    if (noche) log("Cayó la noche lunar.");
    await espera(noche ? 2200 : 1000);
  }

  const TIPO = { inicio: "LLEGADA", evento: "EVENTO", tarea: "TAREA", decision: "DECISIÓN", control_mision: "CONTROL DE MISIÓN", calma: "CALMA", evaluacion: "REPORTE DE CONTROL DE MISIÓN" };
  async function nodo(n) {
    if (n.tipo === "final") return;
    if (n.tipo === "evaluacion") return evaluacion(n);
    const texto = n.niveles ? n.niveles["nivel" + J.lectura].texto : n.mensaje;
    const r = n.resultado || {};
    const c = pantalla(`<span class="tag">${TIPO[n.tipo]}</span><h2 class="titulo">${esc(n.titulo)}</h2><p class="txt">${esc(texto)}</p>` +
      (n.minijuego && (r.exito || r.fallo) ? `<p class="sub">Minijuego: ${esc(n.minijuego)}</p>` : "") + `<div class="ops" id="ops"></div><div id="res"></div>`);
    voz(texto);
    const ops = c.querySelector("#ops"), res = c.querySelector("#res");
    if (n.tipo === "inicio") { await continuar(ops, "Comenzar la misión ▸", 2600); return; }
    if (r.exito || r.fallo) {
      const i = await botones(ops, [{ html: "Ganar el minijuego" }, { html: "Perder el minijuego" }], { auto: () => (Math.random() < ui.hab ? 0 : 1), delay: 1500 });
      const gano = i === 0;
      let ef = gano ? r.exito : r.fallo, nota = "";
      if (!gano && J.preparado) { ef = suavizar(ef); nota = " Estabas preparado por el Pronóstico: el daño fue la mitad."; }
      if (J.preparado) J.preparado = false;
      aplicar(ef);
      res.innerHTML = `<div class="res ${gano ? "ok" : "ko"}">${gano ? "Lo lograste." : "No salió esta vez."} ${efectosTxt(ef)}${nota}</div>`;
      log(`${n.titulo}: ${gano ? "minijuego ganado" : "minijuego perdido"}.`);
    } else if (r.opciones) {
      const auto = () => {
        if (Math.random() >= ui.hab) return Math.floor(Math.random() * r.opciones.length);
        const peor = (ef) => { const t = { ...J.st }; for (const [k, v] of Object.entries(ef)) if (t[k] != null) t[k] = lim(t[k] + v, 0, 100); return Math.min(...BARRAS.map((b) => saludDe(t, b))); };
        let m = 0; r.opciones.forEach((o, i) => { if (peor(o.efectos) > peor(r.opciones[m].efectos)) m = i; }); return m;
      };
      const i = await botones(ops, r.opciones.map((o) => ({ html: esc(o.texto) })), { auto, delay: 2000 });
      aplicar(r.opciones[i].efectos);
      res.innerHTML = `<div class="res">${efectosTxt(r.opciones[i].efectos)}</div>`;
      log(`${n.titulo}: ${r.opciones[i].texto}.`);
    } else if (r.siempre) {
      aplicar(r.siempre);
      res.innerHTML = `<div class="res ok">${efectosTxt(r.siempre)}</div>`;
      log(n.titulo + ".");
    }
    await continuar(ops, "Continuar ▸", 1600);
  }

  async function evaluacion(n) {
    const cnt = conteo(J.st);
    const rama = cnt.verde === 4 ? "experto" : cnt.rojo >= 1 ? "rescate" : "normal";
    // el niño no ve el nombre de la rama: solo lo que significa para su misión
    const MSG = {
      experto: "¡Todo en verde, capitán! Control de Misión te va a mandar misiones especiales.",
      normal: "Vas bien. Sigue cuidando tus barras para dejarlas todas en verde.",
      rescate: "Una barra necesita atención. Control de Misión va a estar más cerca de ti estos días.",
    };
    marca("ev");
    const c = pantalla(`<span class="tag">${TIPO.evaluacion}</span><h2 class="titulo">${esc(n.titulo)}</h2>` +
      `<p class="txt">${BARRAS.map((b) => `<span class="z-${zona(b, J.st[b])}">${MAYUS[b]} ${J.st[b]}</span>`).join(" · ")}</p>` +
      `<div class="res ok">${MSG[rama]}</div><div class="ops" id="ops"></div>`);
    log("Reporte de Control de Misión.");
    await continuar(c.querySelector("#ops"), "Continuar ▸", 2200);
  }

  async function informe(n) {
    const t = n.informe.tema;
    if (J.aprendidos[t] == null || J.aprendidos[t] < 0) J.aprendidos[t] = J.aprendidos[t] == null ? n.dia : J.aprendidos[t];
    if (J.cartas[t]) return;
    J.cartas[t] = { usada: false, armada: false };
    pintarCartas(t);
    const k = R.temas[t].carta;
    const c = pantalla(`<span class="tag">NUEVA CARTA</span><h2 class="titulo">${esc(k.nombre)}</h2><p class="txt">${esc(k.frase)}</p>` +
      `<p class="sub">Se guardó en tu bitácora. ${k.uso.tipo === "escudo" ? `Es un escudo para la ${MINUS[k.uso.barra]}.` : `Suma ${k.uso.valor} de ${MINUS[k.uso.barra]}.`} Úsala en el momento justo.</p><div id="inf"></div><div class="ops" id="ops"></div>`);
    voz(k.nombre + ". " + k.frase);
    log(`Nueva carta: ${k.nombre}.`);
    const i = await botones(c.querySelector("#ops"), [{ html: "Continuar ▸", prim: true }, { html: "Leer el informe" }], { auto: 0, delay: 2200 });
    if (i === 1) {
      c.querySelector("#inf").innerHTML = `<p class="txt" style="font-size:15px">${esc(n.informe.texto)}</p><p class="sub">Fuente: ${esc(n.informe.fuente || "NASA")}</p>`;
      await continuar(c.querySelector("#ops"));
    }
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
  async function llamada(n, idx) {
    const sel = elegirTema(idx);
    if (!sel) return;
    const s = R.situaciones.find((x) => x.tema === sel.tema), nv = String(J.lectura);
    J.preguntados[s.tema] = (J.preguntados[s.tema] || 0) + 1;
    marca("ll");
    let c = pantalla(`<span class="tag llamada">LLAMADA ENTRANTE</span><h2 class="titulo">((( Control de Misión )))</h2><p class="sub">${esc(R.temas[s.tema].nombre)}</p><div class="ops" id="ops"></div>`);
    await continuar(c.querySelector("#ops"), "Contestar ▸", 1100);

    c = pantalla(`<span class="tag llamada">LLAMADA · CONTROL DE MISIÓN</span><p class="txt">${esc(s.aviso[nv])}</p>` +
      `<span class="paso">1 · PREDICE</span><p class="sub">${esc(s.prediccion.pregunta)}</p><div class="ops" id="pred"></div><div id="act"></div><div id="res"></div>`);
    voz(s.aviso[nv] + " " + s.prediccion.pregunta);
    const pred = c.querySelector("#pred");
    const okB = BARRAS.indexOf(s.prediccion.barra);
    const ip = await botones(pred, BARRAS.map((b) => ({ html: MAYUS[b] })), { auto: () => (Math.random() < ui.comp ? okB : pick([0, 1, 2, 3].filter((i) => i !== okB))), delay: 1900 });
    const predOk = ip === okB;
    marcar(pred, ip, predOk ? "ok" : "ko"); if (!predOk) marcar(pred, okB, "ok");

    const nOp = J.reto + 1;
    const acc = barajar(s.acciones.slice(0, nOp).map((a, i) => ({ ...a, i })));
    c.querySelector("#act").innerHTML = `<span class="paso">2 · ACTÚA</span><div class="ops col" id="accs"></div>`;
    const accs = c.querySelector("#accs");
    const pos = acc.findIndex((a) => a.i === s.correcta);
    const ia = await botones(accs, acc.map((a) => ({ html: esc(a.texto) })), {
      auto: () => (Math.random() < lim(ui.comp + (predOk ? 0.1 : -0.1), 0.02, 0.98) ? pos : pick(acc.map((_, i) => i).filter((i) => i !== pos))), delay: 2300,
    });
    const accOk = ia === pos;
    marcar(accs, ia, accOk ? "ok" : "ko");
    const elegida = acc[ia];
    const ef = !accOk && conApoyo() ? suavizar(elegida.efectos) : elegida.efectos;
    aplicar(ef);
    J.cuenta.ll++; if (accOk) J.cuenta.llOk++;
    let html = `<span class="paso">3 · MIRA QUÉ PASÓ</span><div class="res ${accOk ? "ok" : "ko"}">${efectosTxt(ef)}`;
    if (accOk && predOk) {
      const b = masDebil(J.st);
      if (zona(b, J.st[b]) !== "verde") { aplicar({ barraMasBaja: R.powerups.recarga.valor }); html += `<br>¡Bien, capitán! Ganaste <b>Recarga</b>: +${R.powerups.recarga.valor} de ${MINUS[b]}.`; }
      else { J.preparado = true; pintarExtra(); html += `<br>¡Bien, capitán! Ganaste <b>Pronóstico</b>: mañana estarás preparado.`; }
    } else if (accOk) html += `<br>Evitaste el daño. La barra que iba a cambiar era la ${MINUS[s.prediccion.barra]}.`;
    else {
      html += `<br>${esc(s.explicacion[nv])}`;
      const it = sel.intentos || 1;
      if (it < 2) J.repasos.push({ tema: s.tema, disponible: J.dia + 2, intentos: it }); else J.diferidos.push(s.tema);
    }
    c.querySelector("#res").innerHTML = html + `</div><div class="ops" id="ops"></div>`;
    if (!accOk) voz(s.explicacion[nv]);
    log(`Llamada (${R.temas[s.tema].nombre}): ${predOk ? "predijo bien" : "predijo mal"}, ${accOk ? "acción correcta" : "acción equivocada"}.`);
    registrarReto(accOk);
    await continuar(c.querySelector("#ops"), "Colgar ▸", 2600);
  }

  // ---------- averia: pistas -> diagnostico ----------
  async function averia(n) {
    const fase = J.dia >= 11 ? 3 : 2, nv = String(J.reto);
    const pool = R.averias.filter((a) => a.fases.includes(fase));
    const conCarta = pool.filter((a) => a.temas.some((t) => J.cartas[t]));
    const a = pick(conCarta.length ? conCarta : pool);
    const carta = a.temas.find((t) => J.cartas[t]);
    const A = R.reglas.averias, NV = A.niveles[nv], b = a.barra;
    const dano = (v) => ({ [b]: b === "radiacion" ? v : -v });
    marca("av");
    aplicar(dano(A.danoInicial));
    const pistas = barajar([
      ...a.pistas.clave.map((t) => ({ t, clave: true })),
      ...a.pistas.distractores.slice(0, NV.distractores).map((t) => ({ t })),
      ...(NV.enganosa ? [{ t: a.pistas.enganosa }] : []),
    ]);
    const c = pantalla(`<span class="tag alarma">ALARMA</span><h2 class="titulo">${esc(a.alarma)}</h2><p class="sub">Recorre la base y busca pistas.</p><div id="pistas"></div><div id="rep"></div><div id="res"></div>`);
    voz(a.alarma);
    const cont = c.querySelector("#pistas");
    let resaltada = false;
    for (const p of pistas) {
      await espera(650);
      const mostrar = carta && p.clave && !resaltada;
      if (mostrar) resaltada = true;
      cont.insertAdjacentHTML("beforeend", `<div class="pista ${mostrar ? "clave" : ""}">${esc(p.t)}${mostrar ? `<br><small class="sub">Tu carta ${esc(R.temas[carta].carta.nombre)} te ayuda a notar esto.</small>` : ""}</div>`);
    }
    c.querySelector("#rep").innerHTML = `<span class="paso">¿QUÉ REPARAS?</span><div class="ops col" id="accs"></div>`;
    const accs = c.querySelector("#accs");
    const ops = barajar(a.acciones.slice(0, NV.acciones).map((t, i) => ({ t, i })));
    const pos = ops.findIndex((o) => o.i === a.correcta);
    const apoyo = conApoyo(), porError = apoyo ? Math.round(A.danoPorError / 2) : A.danoPorError;
    let intentos = 0;
    const tachadas = new Set();
    for (;;) {
      intentos++;
      const pAuto = intentos === 1 ? ui.comp + (carta ? 0.15 : 0) + (apoyo ? 0.1 : 0) : intentos === 2 ? ui.comp + (1 - ui.comp) / 2 : 1;
      const libres = ops.map((_, i) => i).filter((i) => i !== pos && !tachadas.has(i));
      const html = ops.map((o, x) => ({ html: esc(o.t), dis: tachadas.has(x) }));
      const i = await botones(accs, html, { auto: () => (Math.random() < pAuto || !libres.length ? pos : pick(libres)), delay: 2000 });
      if (i === pos) { marcar(accs, i, "ok"); break; }
      tachadas.add(i); marcar(accs, i, "ko");
      aplicar(dano(porError));
      const clave = a.pistas.clave[intentos === 1 ? 0 : 1] || a.pistas.clave[0];
      c.querySelector("#res").innerHTML = `<div class="res ko">Eso no lo arregló. Dra. Ortiz: fíjate en esta pista: «${esc(clave)}».</div>`;
      voz("Fíjate en esta pista: " + clave);
      await espera(900);
    }
    J.cuenta.av++;
    if (intentos === 1) { J.cuenta.avOk++; aplicar({ [b]: mejora(b, A.bonusPrimerIntento) }); }
    else if (!J.repasos.some((r) => r.tema === a.temas[0])) J.repasos.push({ tema: a.temas[0], disponible: J.dia + 2, intentos: 1 });
    c.querySelector("#res").innerHTML = `<div class="res ok">${intentos === 1 ? `¡Diagnóstico al primer intento! +${A.bonusPrimerIntento} de ${MINUS[b]}.` : `Reparado en ${intentos} intentos.`}<br>Dra. Ortiz: ${esc(a.explicacion)}</div><div class="ops" id="ops"></div>`;
    voz(a.explicacion);
    log(`Avería: ${a.alarma} ${intentos === 1 ? "Resuelta al primer intento." : `Resuelta en ${intentos} intentos.`}`);
    registrarReto(intentos === 1);
    await continuar(c.querySelector("#ops"), "Volver a la base ▸", 2600);
  }

  // ---------- final y manual para el siguiente capitan ----------
  async function final(n) {
    J.dia = Math.max(J.dia, 0); pintarTrack();
    const ex = n.exito;
    let c = pantalla((ex ? `<span class="tag">LLEGÓ EL RELEVO</span><div class="estrellas">${"★".repeat(n.estrellas)}${"☆".repeat(3 - n.estrellas)}</div>`
      : `<span class="tag alarma">EVACUACIÓN</span>`) +
      `<h2 class="titulo">${esc(n.titulo)}</h2><p class="txt">${esc(n.mensaje)}</p>` +
      (!ex && n.informe ? `<p class="sub">${esc(n.informe.texto)}</p>` : "") +
      `<p class="sub">Llamadas resueltas bien: ${J.cuenta.llOk} de ${J.cuenta.ll} · Averías al primer intento: ${J.cuenta.avOk} de ${J.cuenta.av} · Cartas usadas: ${J.cuenta.usos} · Tareas de Control: ${J.st.mision}</p><div class="ops" id="ops"></div>`);
    log(ex ? `Fin: ${n.titulo} (${n.estrellas} estrellas).` : `Fin: ${n.titulo}.`);
    await continuar(c.querySelector("#ops"), "Escribir el manual para el siguiente capitán ▸", 3000);

    const propias = Object.keys(J.cartas);
    const k = Math.min(R.reglas.manual.cartasPorNivel[String(J.reto)], propias.length);
    const elegidas = [], bien = [];
    for (let j = 0; j < k; j++) {
      const libres = propias.filter((t) => !elegidas.includes(t));
      c = pantalla(`<span class="tag">MANUAL PARA EL SIGUIENTE CAPITÁN</span><p class="txt">Elige una carta para dejarle un consejo (${j + 1} de ${k}).</p><div class="ops" id="ops"></div>`);
      const i = await botones(c.querySelector("#ops"), libres.map((t) => ({ html: esc(R.temas[t].carta.nombre) })), { auto: () => Math.floor(Math.random() * libres.length), delay: 1600 });
      const t = libres[i]; elegidas.push(t);
      const k2 = R.temas[t].carta;
      const otros = barajar(Object.keys(R.temas).filter((x) => x !== t)).slice(0, 2).map((x) => R.temas[x].carta.momento);
      const momentos = barajar([k2.momento, ...otros]);
      const ok = momentos.indexOf(k2.momento);
      c = pantalla(`<span class="tag">MANUAL PARA EL SIGUIENTE CAPITÁN</span><h2 class="titulo">${esc(k2.nombre)}</h2><p class="txt">¿Cuándo le va a servir esta carta al siguiente capitán?</p><div class="ops col" id="ops"></div><div id="res"></div>`);
      voz("¿Cuándo le va a servir " + k2.nombre + "?");
      const ops = c.querySelector("#ops");
      const im = await botones(ops, momentos.map((m) => ({ html: esc(m) })), { auto: () => (Math.random() < ui.comp ? ok : pick([0, 1, 2].filter((x) => x !== ok))), delay: 1900 });
      marcar(ops, im, im === ok ? "ok" : "ko"); if (im !== ok) marcar(ops, ok, "ok");
      if (im === ok) bien.push(t);
      c.querySelector("#res").innerHTML = `<div class="res ${im === ok ? "ok" : "ko"}">${im === ok ? "¡Buen consejo!" : `Este consejo sirve: «${esc(k2.momento)}».`} ${esc(k2.frase)}</div><div class="ops" id="ops2"></div>`;
      await continuar(c.querySelector("#ops2"), "Siguiente ▸", 1800);
    }
    historial = {
      temas: Object.keys(J.aprendidos).filter((t) => J.aprendidos[t] >= 0),
      repasos: [...new Set([...J.pasados, ...J.diferidos, ...J.repasos.map((r) => r.tema)])].slice(-3),
      cartas: bien,
      niveles: { reto: J.reto, lectura: J.lectura, ventana: J.ventana.slice(), ajustes: J.ajustes.slice() },
    };
    c = pantalla(`<span class="tag">MANUAL TERMINADO</span><h2 class="titulo">${bien.length} de ${k} consejos bien emparejados</h2>` +
      `<p class="txt">${bien.length ? "La siguiente partida empieza con: " + bien.map((t) => esc(R.temas[t].carta.nombre)).join(", ") + "." : "La siguiente partida empieza sin cartas."}</p>` +
      (historial.repasos.length ? `<p class="sub">Temas para repasar en la siguiente partida: ${historial.repasos.map((t) => esc(R.temas[t].nombre)).join(", ")}.</p>` : "") +
      `<div class="ops" id="ops"></div>`);
    const i = await botones(c.querySelector("#ops"), [{ html: "Jugar otra partida con este manual ▸", prim: true }, { html: "Volver al menú" }], { auto: 0, delay: 3500 });
    if (i === 0) nuevaPartida(true); else volverAlMenu();
  }

  // ---------- arranque ----------
  pintarCtl(); ajustar();
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
    requestAnimationFrame(frame);
  })();
})();

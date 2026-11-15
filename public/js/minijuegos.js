/* =========================================================
   G-NOSIS  -  minijuegos
   Cada minijuego dibuja su interfaz dentro de un contenedor y
   devuelve una promesa con { gano }. La dificultad sale del nivel
   de reto del niño (1-3, adaptativo) y del reto del nodo (1-3).
   En modo automático (herramienta del equipo) se simula el
   resultado con la habilidad configurada.
   ========================================================= */
(() => {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const barajar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const porNivel = (n, a) => a[Math.max(0, Math.min(2, n - 1))];
  const sfx = (nombre) => { if (window.SFX) SFX.play(nombre); };   // efectos de sonido (sfx.js)
  // reloj que se detiene en el menú de pausa (musica.js)
  const enPausa = () => !!(window.PAUSA && PAUSA.activa);
  const ahora = () => performance.now() - (window.PAUSA ? PAUSA.pausado() : 0);

  // ---------- armazón comun: título, instrucciones, tiempo y cierre ----------
  function marco(op, titulo, instr) {
    const c = op.cont;
    c.innerHTML = `<div class="mj"><div class="mj-cab"><span class="mj-tag">MINIJUEGO</span><h3 class="mj-tit">${esc(titulo)}</h3>
      <p class="mj-ins">${esc(instr)}</p><div class="mj-tiempo"><i></i></div><p class="mj-estado" aria-live="polite"></p></div><div class="mj-cuerpo"></div></div>`;
    return { cuerpo: c.querySelector(".mj-cuerpo"), barra: c.querySelector(".mj-tiempo i"), estado: c.querySelector(".mj-estado") };
  }
  function sesion(op, ui, segundos, alTerminar) {
    let vivo = true, restante = segundos * 1000;
    const limpiezas = [];
    const t0 = ahora();
    const id = setInterval(() => {
      if (!vivo || enPausa()) return;
      restante = segundos * 1000 - (ahora() - t0);
      ui.barra.style.width = Math.max(0, 100 * restante / (segundos * 1000)) + "%";
      if (restante <= 0) fin(false, "Se acabó el tiempo.");
    }, 100);
    let resolver;
    const promesa = new Promise((r) => (resolver = r));
    function fin(gano, msg) {
      if (!vivo) return;
      vivo = false; clearInterval(id); limpiezas.forEach((f) => f());
      if (window.SFX) SFX.pararTodo();
      sfx(gano ? "gano" : "perdio");
      ui.estado.textContent = msg || (gano ? "¡Lo lograste!" : "No salió esta vez.");
      ui.estado.className = "mj-estado " + (gano ? "ok" : "ko");
      setTimeout(() => resolver({ gano }), 900);
    }
    // modo automático: el resultado sale de la habilidad configurada
    if (op.auto) setTimeout(() => fin(Math.random() < op.hab, "Simulación automática."), 1500 / (op.vel || 1));
    return {
      promesa, fin, vivo: () => vivo, estado: (t) => { ui.estado.textContent = t; ui.estado.className = "mj-estado"; },
      teclas(fn) { const h = (e) => { if (vivo && !enPausa()) fn(e); }; window.addEventListener("keydown", h); limpiezas.push(() => window.removeEventListener("keydown", h)); },
      cada(ms, fn) { const i = setInterval(() => { if (vivo && !enPausa()) fn(); }, ms); limpiezas.push(() => clearInterval(i)); },
      segundos: () => restante / 1000,
    };
  }
  const tiempoBase = (op, base) => base * porNivel(op.nivel, [1.3, 1, 0.8]) * (op.tiempo === "corto" ? 0.75 : op.tiempo === "largo" ? 1.35 : 1) * porNivel(op.dificultad || 2, [1.15, 1, 0.9]);

  const COLORES = [["Rojo", "var(--rojo)"], ["Ámbar", "var(--ambar)"], ["Cian", "var(--cian)"], ["Verde", "var(--verde)"], ["Lila", "var(--lila)"]];

  // ---------- 1. cables ----------
  function cables(op) {
    const n = porNivel(op.nivel, [3, 4, 5]), maxErr = porNivel(op.nivel, [3, 2, 1]);
    const ui = marco(op, op.titulo || "Conecta los cables", "Toca un cable de la izquierda y luego el del mismo color a la derecha.");
    const cols = COLORES.slice(0, n), der = barajar(cols);
    ui.cuerpo.innerHTML = `<div class="mj-cables"><div class="col">${cols.map((c, i) => `<button type="button" class="cable" data-l="${i}" style="--c:${c[1]}">● ${c[0]}</button>`).join("")}</div>
      <div class="col">${der.map((c) => `<button type="button" class="cable" data-r="${cols.indexOf(c)}" style="--c:${c[1]}">${c[0]} ●</button>`).join("")}</div></div>`;
    const s = sesion(op, ui, tiempoBase(op, 22));
    let sel = null, hechos = 0, err = 0;
    ui.cuerpo.addEventListener("click", (e) => {
      const b = e.target.closest(".cable"); if (!b || b.disabled || !s.vivo()) return;
      if (b.dataset.l != null) { ui.cuerpo.querySelectorAll("[data-l]").forEach((x) => x.classList.remove("sel")); b.classList.add("sel"); sel = +b.dataset.l; return; }
      if (sel == null) return s.estado("Primero toca un cable de la izquierda.");
      if (+b.dataset.r === sel) {
        sfx("cable-conectar");
        b.disabled = true; b.classList.add("ok");
        const l = ui.cuerpo.querySelector(`[data-l="${sel}"]`); l.disabled = true; l.classList.add("ok"); l.classList.remove("sel");
        sel = null; if (++hechos === n) s.fin(true, "¡Todo conectado!");
      } else { sfx("error"); err++; b.classList.add("mal"); setTimeout(() => b.classList.remove("mal"), 400); s.estado(`Ese no es. Errores: ${err} de ${maxErr}.`); if (err > maxErr) s.fin(false, "Demasiadas conexiones equivocadas."); }
    });
    return s.promesa;
  }

  // ---------- 2. limpiar paneles sin rayarlos ----------
  function limpiar(op) {
    const C = 10, F = 4, maxRayas = porNivel(op.nivel, [6, 4, 2]);
    const ui = marco(op, op.titulo || "Limpia el polvo", "Pasa el dedo o el ratón sobre el panel. Cada celda se limpia con una pasada; si pasas dos veces, el polvo filoso lo raya.");
    ui.cuerpo.innerHTML = `<div class="mj-panel" style="grid-template-columns:repeat(${C},1fr)">${Array.from({ length: C * F }, (_, i) => `<span class="celda polvo" data-i="${i}">#</span>`).join("")}</div><p class="mj-ins">Rayones: <b class="rayas">0</b> de ${maxRayas}</p>`;
    const s = sesion(op, ui, tiempoBase(op, 22));
    const estado = new Array(C * F).fill(0);
    let abajo = false, ultima = -1, limpias = 0, rayas = 0;
    const tocar = (i) => {
      if (i === ultima || !s.vivo()) return; ultima = i;
      const el = ui.cuerpo.querySelector(`[data-i="${i}"]`);
      if (estado[i] === 0) { estado[i] = 1; limpias++; el.className = "celda limpia"; el.textContent = "·"; }
      else if (estado[i] === 1) { sfx("rayon"); estado[i] = 2; rayas++; el.className = "celda raya"; el.textContent = "x"; ui.cuerpo.querySelector(".rayas").textContent = rayas; }
      if (rayas > maxRayas) s.fin(false, "Rayaste demasiado el panel: ahora produce menos.");
      else if (limpias === C * F) s.fin(true, "¡Panel limpio y sin rayones de más!");
    };
    const panel = ui.cuerpo.querySelector(".mj-panel");
    const celdaEn = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.dataset && el.dataset.i != null && panel.contains(el) ? +el.dataset.i : -1; };
    panel.addEventListener("pointerdown", (e) => { abajo = true; ultima = -1; if (s.vivo() && window.SFX) SFX.bucle("limpiar-panel", true); panel.setPointerCapture?.(e.pointerId); const i = celdaEn(e); if (i >= 0) tocar(i); });
    panel.addEventListener("pointermove", (e) => { if (!abajo) return; const i = celdaEn(e); if (i >= 0) tocar(i); });
    window.addEventListener("pointerup", () => { abajo = false; ultima = -1; if (window.SFX) SFX.bucle("limpiar-panel", false); });
    return s.promesa;
  }

  // ---------- 3. atrapar lo que se cae ----------
  function atrapar(op) {
    const L = 5, R = 7, meta = porNivel(op.nivel, [6, 8, 10]), maxFallas = porNivel(op.nivel, [4, 3, 2]);
    const objeto = op.objeto || "caja de comida";
    const ui = marco(op, op.titulo || "¡Atrapa lo que se cae!", `Mueve la plataforma con ← → o tocando un carril. Atrapa cada ${objeto}.`);
    ui.cuerpo.innerHTML = `<div class="mj-carriles" style="grid-template-columns:repeat(${L},1fr)"></div><div class="mj-botones"><button type="button" data-m="-1">←</button><button type="button" data-m="1">→</button></div><p class="mj-ins">Atrapadas <b class="a">0</b> de ${meta} · se cayeron <b class="f">0</b> de ${maxFallas}</p>`;
    const s = sesion(op, ui, tiempoBase(op, 30));
    const grid = ui.cuerpo.querySelector(".mj-carriles");
    let pos = 2, cosas = [], atrapadas = 0, fallas = 0, tick = 0;
    const pintar = () => {
      let h = "";
      for (let r = 0; r < R; r++) for (let c = 0; c < L; c++) {
        const hay = cosas.some((o) => o.c === c && o.r === r);
        h += `<span class="carril ${r === R - 1 && c === pos ? "plataforma" : ""}" data-c="${c}">${r === R - 1 && c === pos ? "▀▀▀" : hay ? "■" : "&nbsp;"}</span>`;
      }
      grid.innerHTML = h;
      ui.cuerpo.querySelector(".a").textContent = atrapadas; ui.cuerpo.querySelector(".f").textContent = fallas;
    };
    const mover = (d) => { pos = Math.max(0, Math.min(L - 1, pos + d)); pintar(); };
    ui.cuerpo.querySelector(".mj-botones").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (b) mover(+b.dataset.m); });
    grid.addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (b) { pos = +b.dataset.c; pintar(); } });
    s.teclas((e) => { if (e.key === "ArrowLeft" || e.key === "a") mover(-1); if (e.key === "ArrowRight" || e.key === "d") mover(1); });
    const vel = porNivel(op.nivel, [260, 210, 170]);
    s.cada(vel, () => {
      tick++;
      for (const o of cosas) o.r++;
      for (const o of cosas.filter((o) => o.r === R - 1)) { if (o.c === pos) { atrapadas++; sfx("atrapar"); } else { fallas++; sfx("caer"); } }
      cosas = cosas.filter((o) => o.r < R - 1);
      if (tick % 3 === 0) cosas.push({ c: Math.floor(Math.random() * L), r: 0 });
      pintar();
      if (atrapadas >= meta) s.fin(true, "¡Todo a salvo!");
      else if (fallas > maxFallas) s.fin(false, `Se rompieron demasiadas: ${objeto}.`);
    });
    pintar();
    return s.promesa;
  }

  // ---------- 4. laberinto hacia el refugio ----------
  function laberinto(op) {
    const [C, F] = porNivel(op.nivel, [[7, 5], [9, 6], [11, 7]]);
    const ui = marco(op, op.titulo || "¡Corre al refugio!", (op.oscuro ? "Está oscuro: solo ves cerca de ti. " : "") + "Usa las flechas, WASD o toca una casilla vecina. Llega a R antes de que se acabe el tiempo.");
    // laberinto por búsqueda en profundidad
    const muros = Array.from({ length: C * F }, () => ({ n: true, s: true, e: true, o: true })), visto = new Array(C * F).fill(false);
    const pila = [0]; visto[0] = true;
    while (pila.length) {
      const k = pila[pila.length - 1], x = k % C, y = Math.floor(k / C);
      const vec = [[0, -1, "n", "s"], [0, 1, "s", "n"], [1, 0, "e", "o"], [-1, 0, "o", "e"]].filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < C && ny < F && !visto[ny * C + nx]; });
      if (!vec.length) { pila.pop(); continue; }
      const [dx, dy, a, b] = pick(vec), nk = (y + dy) * C + x + dx;
      muros[k][a] = false; muros[nk][b] = false; visto[nk] = true; pila.push(nk);
    }
    const meta = C * F - 1;
    let yo = 0;
    ui.cuerpo.innerHTML = `<div class="mj-laberinto" style="grid-template-columns:repeat(${C},1fr)"></div><div class="mj-botones"><button type="button" data-d="o">←</button><button type="button" data-d="n">↑</button><button type="button" data-d="s">↓</button><button type="button" data-d="e">→</button></div>`;
    const grid = ui.cuerpo.querySelector(".mj-laberinto");
    const pintar = () => {
      const yx = yo % C, yy = Math.floor(yo / C);
      grid.innerHTML = muros.map((m, k) => {
        const x = k % C, y = Math.floor(k / C), lejos = op.oscuro && Math.hypot(x - yx, y - yy) > 1.6;
        const b = `border-top:${m.n ? 3 : 0}px solid var(--casco);border-bottom:${m.s ? 3 : 0}px solid var(--casco);border-left:${m.o ? 3 : 0}px solid var(--casco);border-right:${m.e ? 3 : 0}px solid var(--casco)`;
        return `<span class="lab ${lejos ? "oscuro" : ""}" data-k="${k}" style="${lejos ? "" : b}">${k === yo ? "☺" : k === meta ? "R" : ""}</span>`;
      }).join("");
    };
    const s = sesion(op, ui, tiempoBase(op, porNivel(op.nivel, [24, 30, 36])));
    const mover = (d) => {
      if (!s.vivo() || muros[yo][d]) return;
      yo += d === "n" ? -C : d === "s" ? C : d === "e" ? 1 : -1; pintar(); sfx("paso");
      if (yo === meta) s.fin(true, "¡Llegaste al refugio y cerraste la compuerta!");
    };
    s.teclas((e) => { const m = { ArrowUp: "n", w: "n", ArrowDown: "s", s: "s", ArrowRight: "e", d: "e", ArrowLeft: "o", a: "o" }[e.key]; if (m) { e.preventDefault(); mover(m); } });
    ui.cuerpo.querySelector(".mj-botones").addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (b) mover(b.dataset.d); });
    grid.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return; const k = +b.dataset.k;
      if (k === yo - C) mover("n"); else if (k === yo + C) mover("s"); else if (k === yo + 1 && k % C !== 0) mover("e"); else if (k === yo - 1 && yo % C !== 0) mover("o");
    });
    pintar();
    return s.promesa;
  }

  // ---------- 5. tapar agujeros ----------
  function tapar(op) {
    const [C, F] = porNivel(op.nivel, [[3, 3], [4, 3], [4, 4]]), meta = porNivel(op.nivel, [6, 8, 10]), maxFallas = porNivel(op.nivel, [4, 3, 2]);
    const dura = porNivel(op.nivel, [1700, 1350, 1050]);
    const ui = marco(op, op.titulo || "¡Tapa los agujeros!", "Toca cada agujero antes de que se escape el aire.");
    ui.cuerpo.innerHTML = `<div class="mj-paredes" style="grid-template-columns:repeat(${C},1fr)">${Array.from({ length: C * F }, (_, i) => `<button type="button" class="pared-c" data-i="${i}">▒▒</button>`).join("")}</div><p class="mj-ins">Tapados <b class="a">0</b> de ${meta} · escapes <b class="f">0</b> de ${maxFallas}</p>`;
    const s = sesion(op, ui, tiempoBase(op, 30));
    const hoyos = new Map(); let tapados = 0, fallas = 0;
    const act = () => { ui.cuerpo.querySelector(".a").textContent = tapados; ui.cuerpo.querySelector(".f").textContent = fallas; };
    s.cada(porNivel(op.nivel, [900, 750, 600]), () => {
      const libres = [...Array(C * F).keys()].filter((i) => !hoyos.has(i));
      if (!libres.length) return;
      const i = pick(libres), el = ui.cuerpo.querySelector(`[data-i="${i}"]`);
      el.classList.add("hoyo"); el.textContent = "( )";
      hoyos.set(i, setTimeout(() => {
        if (!s.vivo() || !hoyos.has(i)) return;
        hoyos.delete(i); el.classList.remove("hoyo"); el.textContent = "▒▒"; fallas++; act(); sfx("fuga-aire");
        if (fallas > maxFallas) s.fin(false, "Se escapó demasiado aire.");
      }, dura));
    });
    ui.cuerpo.addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]"); if (!b || !s.vivo()) return; const i = +b.dataset.i;
      if (!hoyos.has(i)) return;
      clearTimeout(hoyos.get(i)); hoyos.delete(i); b.classList.remove("hoyo"); b.textContent = "▒▒"; tapados++; act(); sfx("tapar");
      if (tapados >= meta) s.fin(true, "¡Base sellada!");
    });
    return s.promesa;
  }

  // ---------- 6. secuencia en orden ----------
  function secuencia(op) {
    const n = porNivel(op.nivel, [3, 4, 5]), pasos = op.pasos.slice(0, n), maxErr = porNivel(op.nivel, [2, 1, 1]);
    const ui = marco(op, op.titulo || "Hazlo en orden", "Toca los pasos en el orden correcto.");
    ui.cuerpo.innerHTML = `<ol class="mj-hechos"></ol><div class="mj-opciones">${barajar(pasos.map((p, i) => ({ p, i }))).map(({ p, i }) => `<button type="button" class="op" data-i="${i}">${esc(p)}</button>`).join("")}</div>`;
    const s = sesion(op, ui, tiempoBase(op, 26));
    let sig = 0, err = 0;
    ui.cuerpo.addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]"); if (!b || b.disabled || !s.vivo()) return;
      if (+b.dataset.i === sig) {
        sfx("acierto");
        b.disabled = true; b.classList.add("ok"); ui.cuerpo.querySelector(".mj-hechos").insertAdjacentHTML("beforeend", `<li>${esc(pasos[sig])}</li>`);
        if (++sig === n) s.fin(true, "¡Todo en el orden correcto!");
      } else { sfx("error"); err++; b.classList.add("mal"); setTimeout(() => b.classList.remove("mal"), 400); s.estado(`Ese paso va después. Errores: ${err} de ${maxErr}.`); if (err > maxErr) s.fin(false, "El orden no fue el correcto."); }
    });
    return s.promesa;
  }

  // ---------- 7. ajustar una perilla ----------
  function ajustar(op) {
    // op.movil (salida de la Luna): la zona verde se mueve sola y hay que seguirla; si te sales, el avance baja
    const ancho = op.movil ? porNivel(op.nivel, [24, 18, 14]) : porNivel(op.nivel, [30, 22, 15]), necesita = porNivel(op.nivel, [3, 4, 5]);
    const etq = op.que === "alineacion" ? ["izquierda", "derecha", "Alinea la nave con la plataforma"] : op.meta === "calentar" ? ["frío", "calor", "Sube la calefacción a la zona verde"] : ["frío", "calor", "Baja la temperatura a la zona verde"];
    const ui = marco(op, op.titulo || etq[2], op.movil ? `La zona verde se mueve: síguela con − y + (o ← →). Junta ${necesita} segundos adentro; si te sales, baja.` : `Usa − y + (o ← →). Mantén la aguja en la zona verde ${necesita} segundos.`);
    ui.cuerpo.innerHTML = `<div class="mj-medidor"><span>${etq[0]}</span><div class="pista"><i class="zona"></i><i class="aguja"></i></div><span>${etq[1]}</span></div>
      <div class="mj-botones"><button type="button" data-m="-6">−</button><button type="button" data-m="6">+</button></div><p class="mj-ins">En la zona: <b class="z">0.0</b> de ${necesita} s</p>`;
    let zona0 = op.meta === "calentar" ? 60 : op.meta === "enfriar" ? 15 : 40 + Math.random() * 20 - ancho / 2;
    let v = op.meta === "calentar" ? 15 : op.meta === "enfriar" ? 85 : (zona0 > 50 ? 10 : 90), dentro = 0;
    const z = ui.cuerpo.querySelector(".zona"), a = ui.cuerpo.querySelector(".aguja");
    z.style.left = zona0 + "%"; z.style.width = ancho + "%";
    const s = sesion(op, ui, tiempoBase(op, 22));
    const mover = (d) => { v = Math.max(0, Math.min(100, v + d)); a.style.left = v + "%"; };
    // tocar mueve un paso; mantener presionado sigue moviendo (para seguir la zona que se mueve)
    let repite = null;
    const soltar = () => { clearInterval(repite); repite = null; };
    ui.cuerpo.querySelector(".mj-botones").addEventListener("pointerdown", (e) => {
      const b = e.target.closest("[data-m]"); if (!b || !s.vivo()) return;
      e.preventDefault(); soltar(); sfx("perilla"); mover(+b.dataset.m);
      repite = setInterval(() => { if (s.vivo()) mover(+b.dataset.m * 0.6); else soltar(); }, 90);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => ui.cuerpo.querySelector(".mj-botones").addEventListener(ev, soltar));
    window.addEventListener("pointerup", soltar);
    s.teclas((e) => { if (e.key === "ArrowLeft" || e.key === "-") { sfx("perilla"); mover(-6); } if (e.key === "ArrowRight" || e.key === "+") { sfx("perilla"); mover(6); } });
    // zona móvil: dos ondas mezcladas + cambios de rumbo al azar, más rápida en niveles altos
    const vel = porNivel(op.nivel, [0.7, 1.0, 1.35]), t0 = ahora(), fase = Math.random() * 6.28;
    let empuje = 0;
    const moverZona = () => {
      const t = (ahora() - t0) / 1000;
      if (Math.random() < 0.02) empuje = (Math.random() - 0.5) * 30;          // de vez en cuando cambia de rumbo
      const centro = 50 + 28 * Math.sin(t * vel + fase) + 12 * Math.sin(t * vel * 2.3 + fase * 2) + empuje * Math.sin(t * 0.5);
      zona0 = Math.max(0, Math.min(100 - ancho, centro - ancho / 2));
      z.style.left = zona0 + "%";
    };
    s.cada(100, () => {
      if (op.movil) moverZona();
      mover((Math.random() - 0.5) * porNivel(op.nivel, [2.5, 4, 5.5]) + (op.meta === "enfriar" ? 0.6 : op.meta === "calentar" ? -0.6 : 0));
      if (v >= zona0 && v <= zona0 + ancho) dentro += 0.1;
      else if (op.movil) dentro = Math.max(0, dentro - 0.06);
      ui.cuerpo.querySelector(".z").textContent = dentro.toFixed(1);
      if (dentro >= necesita) s.fin(true, "¡Justo en la zona!");
    });
    mover(0);
    return s.promesa;
  }

  // ---------- 8. buscar ----------
  function buscar(op) {
    const [C, F] = porNivel(op.nivel, [[6, 4], [7, 5], [8, 5]]);
    const tipo = { enfermas: { n: [3, 4, 5], bien: "%", mal: "@", tit: "Encuentra las plantas enfermas", ins: "Las enfermas tienen manchas blancas (@). Tócalas." },
      maduras: { n: [3, 4, 5], bien: "o", mal: "%", tit: "Cosecha las lechugas listas", ins: "Las listas se ven grandes y redondas (o). Tócalas." },
      fuga: { n: [1, 2, 2], bien: "═💧═", mal: "═══", tit: "Encuentra la fuga", ins: "Busca la tubería que gotea (═💧═) y tócala. Las válvulas (═◘═) están bien: no las toques." } }[op.objetivo || "enfermas"];
    const meta = porNivel(op.nivel, tipo.n), maxErr = porNivel(op.nivel, [3, 2, 1]);
    const ui = marco(op, op.titulo || tipo.tit, tipo.ins);
    const objetivos = new Set(barajar([...Array(C * F).keys()]).slice(0, meta));
    // en la fuga: tubos normales, algunas válvulas (para distraer) y la que gotea con una gota
    const otro = (i) => (op.objetivo === "fuga" ? (i % 5 === 2 ? "═◘═" : "═══") : "%");
    ui.cuerpo.innerHTML = `<div class="mj-buscar ${op.objetivo || "enfermas"}" style="grid-template-columns:repeat(${C},1fr)">${Array.from({ length: C * F }, (_, i) => `<button type="button" class="b-c" data-i="${i}">${objetivos.has(i) ? (op.objetivo === "enfermas" ? "@" : op.objetivo === "maduras" ? "o" : "═💧═") : otro(i)}</button>`).join("")}</div>`;
    const s = sesion(op, ui, tiempoBase(op, 22));
    let ok = 0, err = 0;
    ui.cuerpo.addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]"); if (!b || b.disabled || !s.vivo()) return;
      if (objetivos.has(+b.dataset.i)) { sfx(op.objetivo === "fuga" ? "encontrar" : "plantas"); b.disabled = true; b.classList.add("ok"); if (++ok === meta) s.fin(true, "¡Las encontraste todas!"); }
      else { sfx("error"); err++; b.classList.add("mal"); setTimeout(() => b.classList.remove("mal"), 400); s.estado(`Esa no. Errores: ${err} de ${maxErr}.`); if (err > maxErr) s.fin(false, "Demasiados errores."); }
    });
    return s.promesa;
  }

  // ---------- 9. leer una gráfica (datos reales o de muestra) ----------
  function grafica(op) {
    const d = op.datos || {};
    if (op.modo === "pronostico") {
      // Gráfica real de las alertas del Sol (NASA DONKI), una barra por día: sube con cada nube de material (CME) o llamarada fuerte (M y X).
      // Paso 1: leer la gráfica (¿qué día hubo más alertas?). Paso 2: recordar lo que leíste en el informe (¿cuándo llega una CME?),
      // sin que la pregunta lo diga.
      const PQ = window.PREGUNTAS, DIAS = 10, iso = (f) => String(f || "").slice(0, 10);
      const donki = d.donki || {};
      const ev = [...(donki.cmes || []), ...(donki.llamaradas || []).filter((l) => /^[MX]/i.test(l.clase || ""))].map((e) => iso(e.fecha)).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f));
      const sumar = (f, k) => new Date(Date.parse(f + "T12:00:00Z") + k * 86400000).toISOString().slice(0, 10);
      const fin = ev.length ? ev.slice().sort().pop() : new Date().toISOString().slice(0, 10);
      let dias = Array.from({ length: DIAS }, (_, i) => sumar(fin, i - (DIAS - 1)));
      let cuenta = dias.map((f) => ev.filter((x) => x === f).length);
      let real = ev.length > 0;
      // sin datos o con empate en el día más alto: datos de muestra con un día claramente más alto
      const tope = Math.max(...cuenta);
      if (!real || tope === 0 || cuenta.filter((n) => n === tope).length > 1) { cuenta = [0, 1, 0, 2, 0, 0, 5, 1, 0, 1]; real = false; dias = Array.from({ length: DIAS }, (_, i) => sumar(new Date().toISOString().slice(0, 10), i - (DIAS - 1))); }
      const maxN = Math.max(...cuenta), iMax = cuenta.indexOf(maxN);
      const nOpc = Math.max(2, op.nivel + 1);
      const otros = barajar(dias.map((f, i) => i).filter((i) => cuenta[i] < maxN)).slice(0, nOpc - 1);
      const op1 = barajar([iMax, ...otros]);
      const lista1 = op1.map((i) => PQ.fechaTxt(dias[i]));
      const op2 = barajar([["En los próximos 1 a 3 días", true], ["Dentro de un mes", false], ["Nunca: el Sol no llega a la Luna", false], ["Hace una semana", false]].slice(0, nOpc));
      const ui = marco(op, "Pronóstico del clima espacial", "Mira la gráfica de alertas del Sol y contesta.");
      const fuente = real ? (donki.fuente || "NASA DONKI") : "NASA DONKI (muestra)";
      ui.cuerpo.innerHTML = `<div class="mj-datos"><p class="mj-ins">Fuente: ${esc(fuente)} · cada barra es un día; sube con cada nube de material del Sol (CME) o llamarada fuerte.</p>
        <div class="mj-barras">${cuenta.map((n, k) => `<div class="mb"><b style="font-size:11px;color:var(--ink)">${n}</b><i style="height:${Math.max(4, Math.round(100 * n / maxN))}%;background:var(--ambar)"></i><span>${esc(dias[k].slice(8) + "/" + dias[k].slice(5, 7))}</span></div>`).join("")}</div></div>
        <p class="mj-tit2" style="font-size:15px">1 · ¿Qué día hubo más alertas del Sol?</p><div class="mj-opciones col" id="r1">${lista1.map((t, i) => `<button type="button" class="op" data-i="${i}">${esc(t)}</button>`).join("")}</div>
        <div id="r2"></div>`;
      const s = sesion(op, ui, tiempoBase(op, 35));
      let ok1 = null;
      ui.cuerpo.querySelector("#r1").addEventListener("click", (e) => {
        const b = e.target.closest("[data-i]"); if (!b || !s.vivo() || ok1 !== null) return;
        ok1 = op1[+b.dataset.i] === iMax; b.classList.add(ok1 ? "ok" : "mal"); sfx(ok1 ? "acierto" : "error");
        const r2 = ui.cuerpo.querySelector("#r2");
        r2.innerHTML = `<p class="mj-tit2" style="font-size:15px">2 · Una nube de material del Sol (CME) salió ese día rumbo a la Luna. ¿Cuándo debes tener listo el refugio?</p>${op.nivel <= 1 ? '<p class="mj-ins">Pista: lo leíste en el informe del Sol.</p>' : ""}<div class="mj-opciones col">${op2.map(([t], i) => `<button type="button" class="op" data-i="${i}">${esc(t)}</button>`).join("")}</div>`;
        r2.querySelector(".mj-opciones").addEventListener("click", (e2) => {
          const b2 = e2.target.closest("[data-i]"); if (!b2 || !s.vivo()) return;
          const ok2 = op2[+b2.dataset.i][1]; b2.classList.add(ok2 ? "ok" : "mal");
          s.fin(ok1 && ok2, ok1 && ok2 ? "¡Buen pronóstico!" : !ok2 ? "Recuerda: una CME tarda de 1 a 3 días en llegar." : "La barra más alta es el día con más alertas.");
        });
      });
      return s.promesa;
    }
    // radiación: 7 días reales de CRaTER (RadLab). Sin colores que den la respuesta: cada barra dice
    // cuántas veces más radiación hubo que en un día normal, con una línea de "día normal" y otra de "x3".
    // Paso 1: ¿cómo está hoy? Paso 2: tendencia (si hubo días muy altos y hoy bajó) o qué hacer hoy.
    const PQ = window.PREGUNTAS;
    const sem = op.semana || { fuente: "CRaTER (datos de muestra)", base: 5, dias: [5, 5.1, 5, 5.2, 5.1, 5, Math.random() < 0.5 ? 5.3 : 220].map((v, k) => ({ fecha: "d" + (k + 1), dosis: v })) };
    const serie = sem.dias, base = sem.base || Math.min(...serie.map((x) => x.dosis));
    const veces = serie.map((x) => x.dosis / base);
    const alto = (v) => Math.round(Math.min(100, 22 + 26 * Math.log10(Math.max(0.6, v))));
    const fmt = (v) => (v < 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v)));
    const zonaHoy = PQ.zonaRadiacion(veces[veces.length - 1]), t = PQ.tendencia(veces);
    const P1 = { seguro: "Casi igual que un día normal (hasta 1.5 veces)", cuidado: "Más alto que lo normal (entre 1.5 y 3 veces)", peligro: "Mucho más alto (más de 3 veces)" };
    const P2 = t.bajo
      ? { pregunta: `Los días ${t.picos.map((i) => "d" + (i + 1)).join(" y ")} fueron muy altos, pero hoy bajó. ¿Ya es seguro salir?`,
        seguro: "Sí: hoy ya está como un día normal", cuidado: "Todavía no del todo: sigue más alto de lo normal, sal poco tiempo", peligro: "No: aunque bajó, sigue mucho más alto de lo normal" }
      : { pregunta: "Con lo que marca hoy, ¿qué haces?", seguro: "Salir a trabajar normal", cuidado: "Salir solo un rato", peligro: "Quedarte en el refugio" };
    // nivel 1: 2 opciones; niveles 2 y 3: las 3
    const opcionesDe = (mapa) => { const z = ["seguro", "cuidado", "peligro"]; const sel = op.nivel === 1 ? [zonaHoy, zonaHoy === "peligro" ? "seguro" : "peligro"] : z; return barajar(sel).map((k) => ({ k, t: mapa[k] })); };
    const o1 = opcionesDe(P1), o2 = opcionesDe(P2);
    const f0 = String(serie[0].fecha), f1 = String(serie[serie.length - 1].fecha);
    const ui = marco(op, "Lee el medidor de radiación", "Cada barra es un día de radiación medida de verdad junto a la Luna; el número dice cuántas veces más que un día normal. La última es hoy.");
    ui.cuerpo.innerHTML = `<div class="mj-datos"><p class="mj-ins">Fuente: ${esc(sem.fuente)}${/^\d{4}/.test(f0) ? ` · del ${esc(f0)} al ${esc(f1)}` : ""}</p>
      <div class="mj-barras" style="position:relative">
        <span style="position:absolute;left:0;right:0;bottom:${alto(1)}%;border-top:2px dashed var(--casco);opacity:.6"></span><span style="position:absolute;right:0;bottom:calc(${alto(1)}% + 2px);font-size:10px;color:var(--casco)">día normal (x1)</span>
        <span style="position:absolute;left:0;right:0;bottom:${alto(3)}%;border-top:1px dotted var(--dim)"></span><span style="position:absolute;left:0;bottom:calc(${alto(3)}% + 2px);font-size:10px;color:var(--dim)">x3</span>
        ${veces.map((v, k) => `<div class="mb"><b style="font-size:11px;color:var(--ink)">x${fmt(v)}</b><i style="height:${alto(v)}%;background:var(--lila)"></i><span>${k === veces.length - 1 ? "hoy" : "d" + (k + 1)}</span></div>`).join("")}
      </div></div>
      <p class="mj-tit2" style="font-size:15px">1 · ¿Cómo está la radiación hoy?</p><div class="mj-opciones col" id="r1">${o1.map((o, i) => `<button type="button" class="op" data-i="${i}">${esc(o.t)}</button>`).join("")}</div>
      <div id="r2"></div>`;
    const s = sesion(op, ui, tiempoBase(op, 35));
    let ok1 = null;
    ui.cuerpo.querySelector("#r1").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]"); if (!b || !s.vivo() || ok1 !== null) return;
      ok1 = o1[+b.dataset.i].k === zonaHoy; b.classList.add(ok1 ? "ok" : "mal"); sfx(ok1 ? "acierto" : "error");
      const r2 = ui.cuerpo.querySelector("#r2");
      r2.innerHTML = `<p class="mj-tit2" style="font-size:15px">2 · ${esc(P2.pregunta)}</p><div class="mj-opciones col">${o2.map((o, i) => `<button type="button" class="op" data-i="${i}">${esc(o.t)}</button>`).join("")}</div>`;
      r2.querySelector(".mj-opciones").addEventListener("click", (e2) => {
        const b2 = e2.target.closest("[data-i]"); if (!b2 || !s.vivo()) return;
        const ok2 = o2[+b2.dataset.i].k === zonaHoy; b2.classList.add(ok2 ? "ok" : "mal");
        const explica = `Hoy hubo x${fmt(veces[veces.length - 1])} de un día normal: ${P1[zonaHoy].toLowerCase()}.${t.bajo ? " Que haya bajado no basta: importa cuánto marca hoy." : ""}`;
        if (window.BITACORA) BITACORA.registrar("aprendido", "mj-radiacion", { titulo: "Leer el medidor de radiación", texto: "Compara contra un día normal: hasta 1.5 veces es seguro, hasta 3 veces sal poco tiempo, más de 3 veces quédate en el refugio. Si bajó, fíjate en cuánto marca hoy.", quien: "Control de Misión", tema: "radiacion" });
        s.fin(ok1 && ok2, ok1 && ok2 ? "¡Bien leído! " + explica : explica);
      });
    });
    return s.promesa;
  }

  // ---------- 10. rover con radar ----------
  function rover(op) {
    const [C, F] = porNivel(op.nivel, [[9, 6], [10, 7], [12, 7]]), bateria0 = porNivel(op.nivel, [26, 22, 18]);
    const ui = marco(op, "Busca hielo con el rover", (op.guia ? "Control de Misión te guía con una flecha. " : "") + "Muévete con las flechas. El radar dice si el hielo está cerca (gasta 1 de batería). En el cráter no hay Sol para recargar.");
    let yo = Math.floor(F / 2) * C, bateria = bateria0;
    const hielos = new Set(barajar([...Array(C * F).keys()].filter((k) => k % C > C / 2)).slice(0, 2));
    const vistos = new Set([yo]);
    ui.cuerpo.innerHTML = `<div class="mj-crater" style="grid-template-columns:repeat(${C},1fr)"></div><div class="mj-botones"><button type="button" data-d="o">←</button><button type="button" data-d="n">↑</button><button type="button" data-d="s">↓</button><button type="button" data-d="e">→</button><button type="button" data-radar="1">Radar</button></div><p class="mj-ins">Batería: <b class="bat"></b> · <span class="rad"></span></p>`;
    const grid = ui.cuerpo.querySelector(".mj-crater");
    const cerca = () => Math.min(...[...hielos].map((h) => Math.abs(h % C - yo % C) + Math.abs(Math.floor(h / C) - Math.floor(yo / C))));
    const flecha = () => { const h = [...hielos].sort((a, b) => (Math.abs(a % C - yo % C) + Math.abs(Math.floor(a / C) - Math.floor(yo / C))) - (Math.abs(b % C - yo % C) + Math.abs(Math.floor(b / C) - Math.floor(yo / C))))[0]; const dx = h % C - yo % C, dy = Math.floor(h / C) - Math.floor(yo / C); return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑"); };
    const pintar = () => {
      grid.innerHTML = Array.from({ length: C * F }, (_, k) => {
        const delante = Math.abs(k % C - yo % C) + Math.abs(Math.floor(k / C) - Math.floor(yo / C)) <= 1;
        return `<span class="cr ${vistos.has(k) || delante ? "visto" : ""}">${k === yo ? "▣" : (delante && hielos.has(k)) ? "*" : vistos.has(k) ? "·" : ""}</span>`;
      }).join("");
      ui.cuerpo.querySelector(".bat").textContent = bateria;
      if (op.guia) ui.cuerpo.querySelector(".rad").textContent = "Guía: " + flecha();
    };
    const s = sesion(op, ui, tiempoBase(op, 45));
    const mover = (d) => {
      if (!s.vivo()) return;
      const x = yo % C, y = Math.floor(yo / C);
      const nx = x + (d === "e" ? 1 : d === "o" ? -1 : 0), ny = y + (d === "s" ? 1 : d === "n" ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= C || ny >= F) return;
      yo = ny * C + nx; vistos.add(yo); bateria--; pintar(); sfx("rover-mover");
      if (hielos.has(yo)) return s.fin(true, "¡Encontraste hielo! Es agua para la base.");
      if (bateria <= 0) s.fin(false, "Se acabó la batería en la oscuridad.");
    };
    ui.cuerpo.querySelector(".mj-botones").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.radar) { if (!s.vivo()) return; sfx("radar"); bateria--; const d = cerca(); ui.cuerpo.querySelector(".rad").textContent = "Radar: " + (d <= 2 ? "¡muy cerca!" : d <= 4 ? "cerca" : "lejos"); pintar(); if (bateria <= 0) s.fin(false, "Se acabó la batería."); }
      else mover(b.dataset.d);
    });
    s.teclas((e) => { const m = { ArrowUp: "n", w: "n", ArrowDown: "s", s: "s", ArrowRight: "e", d: "e", ArrowLeft: "o", a: "o" }[e.key]; if (m) { e.preventDefault(); mover(m); } });
    pintar();
    return s.promesa;
  }

  // ---------- 11. repartir la energía ----------
  function energia(op) {
    const mods = [
      { n: "Calefacción", c: 4, esencial: true, on: true }, { n: "Soporte vital (aire y agua)", c: 3, esencial: true, on: true },
      { n: "Luces de los pasillos", c: 2, on: true }, { n: "Luces del invernadero", c: 3, on: true },
      { n: "Pantallas extra", c: 1, on: true }, { n: "Cargador del rover", c: 3, on: true }, { n: "Música", c: 1, on: true },
    ];
    const tope = porNivel(op.nivel, [10, 9, 8]), maxErr = porNivel(op.nivel, [2, 1, 1]);
    const ui = marco(op, "Cae la noche: reparte la energía", `Sin Sol, solo tienes ${tope} de energía por hora. Apaga lo que no sea necesario y confirma.`);
    const s = sesion(op, ui, tiempoBase(op, 30));
    let err = 0;
    const pintar = () => {
      const total = mods.filter((m) => m.on).reduce((a, m) => a + m.c, 0);
      ui.cuerpo.innerHTML = `<div class="mj-opciones col">${mods.map((m, i) => `<button type="button" class="op interruptor ${m.on ? "on" : "off"}" data-i="${i}">${m.on ? "[ON ]" : "[OFF]"} ${esc(m.n)} · ${m.c}</button>`).join("")}</div>
        <p class="mj-ins">Gasto: <b class="${total > tope ? "malo" : "bueno"}">${total}</b> de ${tope}</p><button type="button" class="op prim" data-ok="1">Confirmar</button>`;
    };
    ui.cuerpo.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || !s.vivo()) return;
      if (b.dataset.i != null) { const m = mods[+b.dataset.i]; m.on = !m.on; sfx("interruptor"); pintar(); return; }
      const total = mods.filter((m) => m.on).reduce((a, m) => a + m.c, 0), sinEsencial = mods.find((m) => m.esencial && !m.on);
      if (sinEsencial) { err++; s.estado(`¡${sinEsencial.n} es indispensable! Afuera hay -133 °C. Errores: ${err} de ${maxErr}.`); }
      else if (total > tope) { err++; s.estado(`Todavía gastas ${total}. Apaga algo más. Errores: ${err} de ${maxErr}.`); }
      else return s.fin(true, "¡Energía repartida para la noche!");
      if (err > maxErr) s.fin(false, "La energía no alcanzó.");
    });
    pintar();
    return s.promesa;
  }

  // ---------- 12. Mensaje de la Tierra: una situación y eliges la carta ----------
  // No se muestra la descripción de la carta: hay que recordarla. Los distractores son cartas
  // que también sirven para la misma barra, pero no son las mejores para esa situación.
  function quiz(op) {
    const cartas = op.cartas || [], todas = op.todasCartas || [];
    const ui = marco(op, "Mensaje especial de la Tierra", "Los científicos te cuentan una situación. ¿Qué carta es la mejor para ese momento?");
    // fijo: las 2 primeras cartas descubiertas y opciones en orden fijo por carta (sin variantes por partida)
    const fijo = (lista, clave) => (window.PREGUNTAS ? PREGUNTAS.barajarFijo(lista, 0, clave).opciones : lista);
    const qs = cartas.slice(0, 2);
    if (!qs.length) { const s = sesion(op, ui, 5); setTimeout(() => s.fin(true, "Mensaje recibido."), 800); return s.promesa; }
    const s = sesion(op, ui, tiempoBase(op, 30) * qs.length);
    let k = 0, bien = 0;
    const siguiente = () => {
      const c = qs[k];
      // distractores creíbles: primero cartas de la misma barra (las confunde quien leyó a medias)
      const misma = todas.filter((x) => x.nombre !== c.nombre && x.uso && c.uso && x.uso.barra === c.uso.barra);
      const resto = todas.filter((x) => x.nombre !== c.nombre && !(x.uso && c.uso && x.uso.barra === c.uso.barra));
      const otros = [...misma, ...resto].slice(0, Math.max(1, op.nivel)).map((x) => x.nombre);
      const opciones = fijo([c.nombre, ...otros], "tierra-" + c.nombre);
      ui.cuerpo.innerHTML = `<p class="mj-tit2">Situación: ${esc(c.momento)}.</p><p class="mj-ins">¿Qué carta usas? (${k + 1} de ${qs.length})</p><div class="mj-opciones col">${opciones.map((o, i) => `<button type="button" class="op" data-i="${i}">${esc(o)}</button>`).join("")}</div><p class="mj-ins" id="por-que"></p>`;
      ui.cuerpo.querySelector(".mj-opciones").onclick = (e) => {
        const b = e.target.closest("[data-i]"); if (!b || !s.vivo() || b.disabled) return;
        ui.cuerpo.querySelectorAll(".mj-opciones .op").forEach((x) => (x.disabled = true));
        const ok = opciones[+b.dataset.i] === c.nombre; b.classList.add(ok ? "ok" : "mal"); sfx(ok ? "acierto" : "error"); if (ok) bien++;
        ui.cuerpo.querySelector("#por-que").textContent = `${ok ? "¡Sí!" : "La mejor era " + c.nombre + "."} ${c.nombre}: ${c.frase}`;
        if (window.BITACORA) BITACORA.registrar("aprendido", "tierra-" + c.nombre, { titulo: "Mensaje de la Tierra: " + c.nombre, texto: `${c.momento}: ${c.nombre}. ${c.frase}`, quien: "Control de Misión" });
        k++;
        setTimeout(() => { if (k < qs.length) siguiente(); else s.fin(bien >= Math.ceil(qs.length / 2), `${bien} de ${qs.length} respuestas para la Tierra.`); }, 1500);
      };
    };
    siguiente();
    return s.promesa;
  }

  // ---------- 13. aterrizar la nave del relevo (misión final) ----------
  // La nave cae por la gravedad: mantener el MOTOR frena (gasta combustible) y ← → la mueven.
  // Gana si toca la plataforma despacio. Fijo: la plataforma siempre está en el mismo lugar.
  function aterrizar(op) {
    const ui = marco(op, op.titulo || "Aterriza la nave del relevo", "Mantén ▲ MOTOR (o Espacio) para frenar y usa ← → para llegar a la plataforma. Toca el suelo despacio.");
    const AN = 440, AL = 250, PISO = 226;
    ui.cuerpo.innerHTML = `<canvas class="mj-aterrizar" width="${AN}" height="${AL}"></canvas>
      <div class="mj-botones"><button type="button" data-m="-1">←</button><button type="button" data-motor="1" class="motor">▲ MOTOR</button><button type="button" data-m="1">→</button></div>
      <p class="mj-ins">Velocidad de bajada: <b class="vel">0</b> (máximo <b class="lim"></b>) · Combustible: <b class="comb">100</b>%</p>`;
    const cv = ui.cuerpo.querySelector("canvas"), g = cv.getContext("2d");
    const grav = porNivel(op.nivel, [20, 26, 32]), EMPUJE = 62, LATERAL = 80;
    const anchoPad = porNivel(op.nivel, [96, 74, 56]), padX = Math.round(AN * 0.62);
    const limite = porNivel(op.nivel, [46, 38, 32]);
    ui.cuerpo.querySelector(".lim").textContent = limite;
    let x = AN * 0.18, y = 18, vx = 0, vy = 8, comb = 100, motor = false, dir = 0, ultimo = ahora();
    const s = sesion(op, ui, tiempoBase(op, 32));
    const btns = ui.cuerpo.querySelector(".mj-botones");
    const soltar = () => { motor = false; dir = 0; };
    btns.addEventListener("pointerdown", (e) => { const b = e.target.closest("button"); if (!b) return; e.preventDefault(); if (b.dataset.motor) motor = true; else dir = +b.dataset.m; });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btns.addEventListener(ev, soltar));
    const kd = (e) => { if (!s.vivo() || enPausa()) return; if ([" ", "ArrowUp", "w"].includes(e.key)) { motor = true; e.preventDefault(); } if (["ArrowLeft", "a"].includes(e.key)) dir = -1; if (["ArrowRight", "d"].includes(e.key)) dir = 1; };
    const ku = (e) => { if ([" ", "ArrowUp", "w"].includes(e.key)) motor = false; if (["ArrowLeft", "a", "ArrowRight", "d"].includes(e.key)) dir = 0; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("pointerup", soltar);
    s.promesa.then(() => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("pointerup", soltar); });
    const estrellas = Array.from({ length: 40 }, (_, k) => [(k * 97) % AN, (k * 53) % (PISO - 30)]);
    function dibujar(fuego) {
      g.fillStyle = "#070914"; g.fillRect(0, 0, AN, AL);
      g.fillStyle = "#8a90b8"; for (const [ex, ey] of estrellas) g.fillRect(ex, ey, 2, 2);
      g.fillStyle = "#3a3870"; g.fillRect(0, PISO, AN, AL - PISO);
      g.fillStyle = "#5ad27a"; g.fillRect(padX, PISO - 4, anchoPad, 6);
      g.fillStyle = "#fff6e1"; for (let k = 0; k < 3; k++) g.fillRect(padX + 6 + k * ((anchoPad - 16) / 2), PISO - 8, 4, 4);
      const spr = window.spriteNave ? spriteNave(Math.floor(ahora() / 300) % 2 === 0, fuego ? 1 : 0) : null;
      g.imageSmoothingEnabled = false;
      if (spr) { const e = 2; g.drawImage(spr, Math.round(x - spr.width * e / 2), Math.round(y - spr.height * e / 2 - 18), spr.width * e, spr.height * e); }
      else { g.fillStyle = "#e8ecf8"; g.fillRect(x - 6, y - 24, 12, 22); }
      const v = Math.round(vy);
      const bv = ui.cuerpo.querySelector(".vel"); bv.textContent = v; bv.style.color = v > limite ? "var(--rojo)" : "var(--verde)";
      ui.cuerpo.querySelector(".comb").textContent = Math.round(comb);
    }
    s.cada(40, () => {
      const t = ahora(), dt = Math.min(0.08, (t - ultimo) / 1000); ultimo = t;
      const enciende = motor && comb > 0;
      if (enciende) { vy -= EMPUJE * dt; comb = Math.max(0, comb - 16 * dt); }
      vy += grav * dt;
      vx = (vx + dir * LATERAL * dt) * 0.97;
      x = Math.max(16, Math.min(AN - 16, x + vx * dt)); y = Math.max(10, y + vy * dt);
      if (y >= PISO) {
        y = PISO; const enPad = x > padX && x < padX + anchoPad;
        dibujar(false);
        if (enPad && vy <= limite) { sfx("aterrizaje"); s.fin(true, "¡Aterrizaje suave en la plataforma!"); }
        else { sfx("caer"); s.fin(false, enPad ? "Bajó muy rápido: hay que frenar antes con el motor." : "Tocó el suelo fuera de la plataforma."); }
        return;
      }
      dibujar(enciende);
    });
    dibujar(false);
    return s.promesa;
  }

  const JUEGOS = { cables, limpiar, atrapar, laberinto, tapar, secuencia, ajustar, buscar, grafica, rover, energia, quiz, aterrizar };
  window.MJ = {
    jugar(tipo, op) {
      const f = JUEGOS[tipo];
      if (!f) return Promise.resolve({ gano: Math.random() < (op.hab || 0.7) });
      return f(op);
    },
    tipos: Object.keys(JUEGOS),
  };
})();

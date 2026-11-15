/* G-NOSIS · biblia de escenarios: visor, tarjetas, paleta y cobertura de eventos */
(() => {
  "use strict";
  const E = window.GNOSIS_ESCENAS, G = window.GRAFO, R = window.RETOS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const META = [
    { id: "menu", nombre: "Menú y alunizaje", tipo: "Pantalla", estado: "existe",
      hace: "Elegir JUGAR y ver a la nave entrar en órbita y alunizar.", seVe: "La Luna en ASCII, el espacio con nebulosas y la nave en pixel art.", estados: [] },
    { id: "plano", nombre: "Plano de la base", tipo: "Mapa", estado: "nuevo",
      hace: "Elegir a qué módulo ir. Es el mapa del día: tocar un módulo lleva a su escenario.",
      seVe: "Qué módulo tiene una avería (parpadea en rojo), si es de día o de noche, y que el refugio está bajo tierra con paredes gruesas.",
      estados: [["noche", "Noche"], ["alarma", "Avería en máquinas"]] },
    { id: "exterior", nombre: "Exterior de la base", tipo: "Exterior", estado: "existe",
      hace: "Llegar, recibir la nave de suministros y al relevo. Aquí ocurren las 7 cinemáticas de final.",
      seVe: "La noche que avanza, la tormenta solar, la alarma en el casco y la señal que viaja a la Tierra.",
      estados: [["noche", "Noche"], ["tormenta", "Tormenta"], ["alarma", "Alarma"], ["senal", "Señal a la Tierra"], ["nave", "Llega una nave"]] },
    { id: "paneles", nombre: "Campo de paneles solares", tipo: "Exterior", estado: "nuevo",
      hace: "Orientar los paneles, limpiar el polvo con cuidado y cambiar el panel golpeado.",
      seVe: "El polvo opaca los paneles y cargan más lento; un golpe deja un agujero; de noche no cargan.",
      estados: [["polvo", "Polvo"], ["roto", "Panel golpeado"], ["noche", "Noche"], ["tormenta", "Tormenta"]] },
    { id: "crater", nombre: "Cráter oscuro", tipo: "Exterior", estado: "nuevo",
      hace: "Manejar el rover con radar y encontrar hielo sin quedarse sin batería.",
      seVe: "El hielo solo brilla donde nunca da el Sol; solo hay la luz del rover.",
      estados: [["radar", "Radar"]] },
    { id: "control", nombre: "Sala de control", tipo: "Interior", estado: "nuevo",
      hace: "Contestar llamadas, leer la radiación, pronosticar tormentas, decidir, recibir reportes, escribir el manual y descansar en la litera.",
      seVe: "La ventana muestra si es de día, de noche o hay tormenta; las pantallas avisan cuando llaman.",
      estados: [["llamada", "Llamada"], ["noche", "Noche"], ["tormenta", "Tormenta"], ["alarma", "Alarma"]] },
    { id: "invernadero", nombre: "Invernadero", tipo: "Interior", estado: "nuevo",
      hace: "Regar lo justo, cosechar, detectar moho y prender o apagar las luces de cultivo.",
      seVe: "Con agua de más aparece moho; sin luz las plantas se apagan; las luces gastan energía.",
      estados: [["moho", "Moho"], ["sinLuz", "Sin luz"], ["agua", "Agua de más"]] },
    { id: "maquinas", nombre: "Sala de máquinas y almacén", tipo: "Interior", estado: "nuevo",
      hace: "Reciclar el agua, cerrar fugas, ajustar calefacción y enfriamiento, repartir la energía y asegurar la comida del almacén.",
      seVe: "El nivel del tanque, la carga de las baterías, la temperatura, los interruptores apagados y las cajas que se caen en un sismo.",
      estados: [["fuga", "Fuga"], ["calor", "Calor"], ["ahorro", "Modo ahorro"], ["noche", "Noche"], ["sismo", "Sismo"], ["alarma", "Alarma"]] },
    { id: "pasillo", nombre: "Pasillo y refugio", tipo: "Interior", estado: "nuevo",
      hace: "Correr al refugio y cerrar la compuerta, tapar agujeros y asegurar soportes en un sismo.",
      seVe: "El refugio tiene paredes gruesas; con la compuerta abierta no protege; por un agujero se escapa el aire.",
      estados: [["compuerta", "Compuerta abierta"], ["agujero", "Agujero"], ["alarma", "Alarma"], ["oscuro", "A oscuras"]] },
    { id: "finales", nombre: "Cinemáticas de final", tipo: "Cinemática", estado: "existe",
      hace: "Ver cómo termina la misión: 3 finales de éxito y 4 de evacuación.",
      seVe: "Las barras que causaron el final, la nave del relevo o de rescate y la tarjeta con estrellas.",
      estados: ORDEN_FINALES.map((f) => [f, FINALES[f].titulo]), unico: true },
  ];
  const porId = Object.fromEntries(META.map((m) => [m.id, m]));

  // ---------- eventos por escenario (de los JSON) ----------
  const EVENTOS = {};
  const add = (k, v) => (EVENTOS[k] = EVENTOS[k] || []).push(v);
  for (const n of G.nodos) {
    if (n.tipo === "final") continue;
    add(n.escenario, { tipo: n.tipo === "evaluacion" ? "Reporte" : "Evento", txt: n.titulo, dia: n.dia });
  }
  for (const s of R.situaciones) add(s.escenario, { tipo: "Llamada", txt: R.temas[s.tema].nombre });
  for (const a of R.averias) add(a.escenario, { tipo: "Avería", txt: a.alarma });
  EVENTOS.finales = G.nodos.filter((n) => n.tipo === "final").map((n) => ({ tipo: "Final", txt: n.titulo }));
  EVENTOS.plano = [{ tipo: "Todos los días", txt: "Elegir a qué módulo ir" }];
  EVENTOS.menu = [{ tipo: "Inicio", txt: "Menú, alunizaje y llegada" }];

  // ---------- lienzos ----------
  const cv = $("visor"), ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const chico = document.createElement("canvas"); chico.width = W; chico.height = H;
  const cctx = chico.getContext("2d"); cctx.imageSmoothingEnabled = false;

  let sel = "menu", estados = {}, etiquetas = true, t0 = performance.now(), ultimo = 0;
  const st = () => ({ ...estados, etiquetas, resaltar: estados.alarma && sel === "plano" ? "maquinas" : null });

  function dibujar(id, t, s) {
    if (id === "menu") {
      renderScene(cctx, t);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(chico, 0, 0, cv.width, cv.height);
      ctx.save(); ctx.scale(2, 2);
      ctx.font = `bold 60px ${FONT_FAMILY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgb(235,240,255)";
      ctx.fillText("G-NOSIS", W / 2, 56);
      ctx.font = `13px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(110,118,135)"; ctx.fillText("// mision lunar", W / 2, 98);
      ctx.font = `bold 26px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(255,246,225)"; ctx.fillText(">  JUGAR  <", W / 2, H - 68);
      ctx.restore();
    } else if (id === "finales") {
      if (!finalActual || finalActual.tipo !== s.final) iniciarFinal(s.final || "perfecta");
      let tf = tiempoFinal();
      if (tf > tarjetaFinal() + 4) { iniciarFinal(finalActual.tipo); tf = 0; }
      dibujarFinal(ctx, tf);
    } else E.render(ctx, id, t, s);
  }

  // ---------- tarjetas ----------
  function tarjetas() {
    $("tarjetas").innerHTML = META.map((m) => `<button type="button" class="tarjeta" data-id="${m.id}" aria-pressed="${m.id === sel}">
      <canvas width="480" height="270" aria-hidden="true"></canvas>
      <span class="t-nombre">${esc(m.nombre)}</span>
      <span class="t-meta"><span class="badge ${m.estado}">${m.estado === "existe" ? "ya existe" : "nuevo"}</span> ${esc(m.tipo)} · ${(EVENTOS[m.id] || []).length} usos</span></button>`).join("");
  }
  $("tarjetas").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) elegir(b.dataset.id, true); });
  async function miniaturas() {
    const lista = [...document.querySelectorAll(".tarjeta canvas")];
    for (let k = 0; k < META.length; k++) {
      const m = META[k], s = { etiquetas: false };
      if (m.id === "finales") { iniciarFinal("perfecta"); finalActual.start = performance.now() - 6500; }
      dibujar(m.id, 3, s);
      lista[k].getContext("2d").drawImage(cv, 0, 0, 480, 270);
      await new Promise((r) => setTimeout(r, 20));
    }
    finalActual = null;
  }

  // ---------- panel lateral ----------
  function panel() {
    const m = porId[sel], evs = EVENTOS[sel] || [];
    $("p-nombre").textContent = m.nombre;
    $("p-meta").innerHTML = `<span class="badge ${m.estado}">${m.estado === "existe" ? "ya existe" : "nuevo"}</span> ${esc(m.tipo)}`;
    $("p-hace").textContent = m.hace;
    $("p-seve").textContent = m.seVe;
    $("p-estados").innerHTML = m.estados.length
      ? m.estados.map(([k, txt]) => `<button type="button" class="chip-btn" data-estado="${k}" aria-pressed="${m.unico ? estados.final === k : !!estados[k]}">${esc(txt)}</button>`).join("")
      : `<span class="nota">Sin estados: es la pantalla que ya tienen.</span>`;
    $("p-n").textContent = evs.length;
    $("p-eventos").innerHTML = evs.map((e) => `<li><span class="ev-tipo ${e.tipo.toLowerCase().replace(/[^a-z]/g, "")}">${esc(e.tipo)}</span> ${esc(e.txt)}</li>`).join("");
  }
  $("p-estados").addEventListener("click", (e) => {
    const b = e.target.closest("[data-estado]"); if (!b) return;
    const m = porId[sel], k = b.dataset.estado;
    if (m.unico) { estados.final = k; finalActual = null; } else estados[k] = !estados[k];
    cv.classList.toggle("tiembla", !!estados.sismo && sel === "maquinas");
    panel();
  });
  $("c-etq").addEventListener("change", (e) => { etiquetas = e.target.checked; });

  function elegir(id, scroll) {
    sel = id; estados = id === "finales" ? { final: "perfecta" } : {};
    finalActual = null; cv.classList.remove("tiembla");
    document.querySelectorAll(".tarjeta").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
    panel();
    if (scroll) $("visor-sec").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // en el plano, tocar un modulo abre su escenario
  cv.addEventListener("click", (ev) => {
    if (sel !== "plano") return;
    const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W - W / 2, y = H / 2 - (ev.clientY - r.top) / r.height * H;
    const m = E.MODULOS.find((q) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
    if (m) elegir(m.id, false);
  });

  // ---------- paleta ----------
  const USO = {
    regolito: "Suelo lunar y montañas", sombra: "Sombras de rocas y cráteres", casco: "Casco de la base, marcos y costillas",
    metal: "Paredes de interior", metalOsc: "Pisos, pasillos y fondos de pantalla", ambar: "Ventanas encendidas, luces de noche y escotillas",
    cian: "Pantallas, luces de techo, radar y señales", panel: "Paneles solares", verde: "Barras en verde y baterías cargadas",
    planta: "Plantas del invernadero", rojo: "Alarmas, averías y barras en rojo", naranja: "Tormenta solar y calor",
    hielo: "Hielo, burbujas y aire que se escapa", agua: "Agua del tanque, fugas y charcos", blanco: "Texto, estrellas y astronautas",
  };
  $("paleta").innerHTML = Object.entries(E.PAL).map(([k, c]) => `<div class="sw"><span class="sw-c" style="background:rgb(${c})"></span><span><b>${k}</b><br><span class="nota">${USO[k] || ""}</span><br><code>rgb(${c.join(", ")})</code></span></div>`).join("");

  // ---------- cobertura ----------
  const filas = META.filter((m) => EVENTOS[m.id]).map((m) => `<tr><th scope="row">${esc(m.nombre)}</th><td>${(EVENTOS[m.id] || []).length}</td><td>${(EVENTOS[m.id] || []).map((e) => esc(e.txt)).join(" · ")}</td></tr>`).join("");
  $("cobertura").innerHTML = `<tr><th>Escenario</th><th>Usos</th><th>Eventos, llamadas y averías</th></tr>${filas}`;

  // ---------- bucle ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - ultimo < 70) return;            // ~14 cuadros por segundo: suficiente para ASCII
    ultimo = now;
    dibujar(sel, (now - t0) / 1000, st());
  }

  (async () => {
    try { await Promise.race([document.fonts.load(`12px ${FONT_FAMILY}`), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fuente del sistema */ }
    buildAtlas();
    tarjetas(); panel();
    await miniaturas();
    elegir("plano", false);
    requestAnimationFrame(frame);
  })();
})();

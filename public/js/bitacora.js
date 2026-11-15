/* =========================================================
   G-NOSIS  -  bitácora
   El libro donde el niño guarda todo lo que descubre. Se llena solo
   durante las misiones y se conserva entre partidas (en este dispositivo):
     Cartas        las 10 cartas: frase, para qué sirve y cuándo usarla
     Informes      lo que contó cada evento, con su fuente
     Datos NASA    clima espacial real (DONKI), radiación real junto a la
                   Luna (RadLab / CRaTER) y estudios reales (OSDR)
     Lo aprendido  las explicaciones de llamadas y averías
   API: BITACORA.registrar(tipo, clave, datos), .abrir(), .cerrar(), .abierta()
   ========================================================= */
(() => {
  "use strict";
  const R = window.RETOS, APIS = window.GNOSIS_APIS;
  const CLAVE = "gnosis-bitacora-v1";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const MINUS = { radiacion: "radiación", energia: "energía", comida: "comida", salud: "salud" };

  let B = { cartas: {}, informes: {}, aprendido: {}, vistos: 0 };
  try { const g = JSON.parse(localStorage.getItem(CLAVE) || "null"); if (g) B = Object.assign(B, g); } catch (e) { /* sin almacenamiento */ }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(B)); } catch (e) { /* nada */ } };
  const total = () => Object.keys(B.cartas).length + Object.keys(B.informes).length + Object.keys(B.aprendido).length;

  const $ = (id) => document.getElementById(id);
  let seccion = "cartas", elegido = null;

  function badge() {
    const n = total() - (B.vistos || 0), el = $("bitacora-nuevos");
    if (!el) return;
    el.hidden = n <= 0; el.textContent = n > 9 ? "9+" : String(n);
  }

  // ---------- registro ----------
  function registrar(tipo, clave, datos) {
    const lista = tipo === "carta" ? B.cartas : tipo === "informe" ? B.informes : B.aprendido;
    if (lista[clave]) return false;
    lista[clave] = Object.assign({ fecha: Date.now() }, datos || {});
    guardar(); badge();
    return true;
  }

  // ---------- páginas ----------
  function listaIzq(items, vacio) {
    if (!items.length) return `<p class="bt-vacio">${esc(vacio)}</p>`;
    return `<ul class="bt-lista">${items.map((it) => `<li><button type="button" class="bt-item ${it.id === elegido ? "sel" : ""} ${it.bloq ? "bloq" : ""}" data-id="${esc(it.id)}" ${it.bloq ? "disabled" : ""}>${esc(it.titulo)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button></li>`).join("")}</ul>`;
  }
  function pagCartas() {
    const temas = Object.keys(R.temas);
    const items = temas.map((t) => B.cartas[t] ? { id: t, titulo: R.temas[t].carta.nombre, sub: R.temas[t].nombre } : { id: t, titulo: "???", sub: "sin descubrir", bloq: true });
    if (!elegido || !B.cartas[elegido]) elegido = (items.find((i) => !i.bloq) || {}).id || null;
    let der = `<p class="bt-vacio">Descubre cartas jugando: cada evento te enseña algo nuevo.</p>`;
    if (elegido) {
      const k = R.temas[elegido].carta, u = k.uso;
      const informes = Object.values(B.informes).filter((i) => i.tema === elegido);
      der = `<h3 class="bt-tit">${esc(k.nombre)}</h3><p class="bt-frase">${esc(k.frase)}</p>
        <p><b>Para qué sirve:</b> ${u.tipo === "escudo" ? `escudo: frena la mitad del próximo daño a la ${esc(MINUS[u.barra])}.` : `suma ${u.valor} de ${esc(MINUS[u.barra])}${u.soloDeDia ? " (solo de día)" : ""}.`}</p>
        <p><b>Cuándo usarla:</b> ${esc(k.momento)}</p>
        ${informes.length ? `<p class="bt-mini">Lo leíste en: ${informes.map((i) => esc(i.titulo)).join(", ")}.</p>` : ""}`;
    }
    return [`<h3 class="bt-tit">Cartas · ${Object.keys(B.cartas).length} de ${temas.length}</h3>` + listaIzq(items, ""), der];
  }
  function pagInformes() {
    const items = Object.entries(B.informes).sort((a, b) => a[1].fecha - b[1].fecha).map(([id, i]) => ({ id, titulo: i.titulo, sub: R.temas[i.tema] ? R.temas[i.tema].nombre : "" }));
    if (!elegido || !B.informes[elegido]) elegido = items.length ? items[items.length - 1].id : null;
    const i = elegido && B.informes[elegido];
    const der = i ? `<h3 class="bt-tit">${esc(i.titulo)}</h3><p>${esc(i.texto)}</p><p class="bt-mini">Fuente: ${esc(i.fuente || "NASA")}</p>`
      : `<p class="bt-vacio">Cada evento de la misión deja un informe. Aquí se guardan todos.</p>`;
    return [`<h3 class="bt-tit">Informes · ${items.length}</h3>` + listaIzq(items, "Todavía no hay informes."), der];
  }
  function pagAprendido() {
    const items = Object.entries(B.aprendido).sort((a, b) => a[1].fecha - b[1].fecha).map(([id, a]) => ({ id, titulo: a.titulo, sub: a.quien || "" }));
    if (!elegido || !B.aprendido[elegido]) elegido = items.length ? items[items.length - 1].id : null;
    const a = elegido && B.aprendido[elegido];
    const der = a ? `<h3 class="bt-tit">${esc(a.titulo)}</h3><p>${esc(a.texto)}</p>${a.quien ? `<p class="bt-mini">— ${esc(a.quien)}</p>` : ""}`
      : `<p class="bt-vacio">Cuando Control de Misión o la Dra. Ortiz te explican algo, se guarda aquí.</p>`;
    return [`<h3 class="bt-tit">Lo aprendido · ${items.length}</h3>` + listaIzq(items, "Contesta llamadas y repara averías para aprender."), der];
  }
  function pagDatos() {
    const d = APIS.datos, est = APIS.estado, dk = d.donki || {}, rl = d.radlab, os = d.osdr;
    const fl = (dk.llamaradas || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const fuerte = fl.reduce((m, f) => (!m || claseNum(f.clase) > claseNum(m.clase) ? f : m), null);
    const kp = Math.max(0, ...(dk.tormentas || []).map((g) => g.kp || 0));
    const etiqueta = (e) => (e === "real" ? "datos en vivo" : "copia guardada");
    const izq = `<h3 class="bt-tit">Clima espacial real</h3>
      <p class="bt-mini">NASA DONKI · últimos 30 días · ${etiqueta(est.donki)}</p>
      <ul class="bt-datos">
        <li><b>${fl.length}</b> llamaradas solares${fuerte ? `; la más fuerte fue <b>${esc(fuerte.clase)} · ${esc(PREGUNTAS.fuerzaDe(fuerte.clase))}</b> ${esc(PREGUNTAS.fechaTxt(fuerte.fecha))}` : ""}</li>
        <li><b>${(dk.cmes || []).length}</b> nubes de material del Sol (CME)</li>
        <li>Tormenta geomagnética más fuerte: <b>Kp ${kp || "—"}</b> ${kp >= 6 ? "(¡fuerte!)" : kp >= 5 ? "(moderada)" : ""}</li>
      </ul>
      <p class="bt-mini">Últimas llamaradas: ${fl.slice(0, 5).map((f) => `${esc(f.clase)} · ${esc(PREGUNTAS.fuerzaDe(f.clase))} (${esc(PREGUNTAS.fechaTxt(f.fecha))})`).join(" · ") || "—"}</p>
      <p class="bt-mini">Las llamaradas A y B son suaves, C media, M fuerte y X muy fuerte. Una CME tarda de 1 a 3 días en llegar a la Luna.</p>`;
    const serie = (rl && rl.serie) || [], base = (rl && rl.base) || 1;
    const maxL = Math.log10(Math.max(1.5, ...serie.map((x) => x.dosis / base)));
    const barras = serie.map((x) => { const r = x.dosis / base, h = Math.max(4, Math.round(100 * Math.log10(Math.max(1, r)) / maxL)); return `<i title="${esc(x.fecha)}: ${r.toFixed(1)} veces lo normal" style="height:${h}%;background:${r > 3 ? "#c8344a" : r > 1.5 ? "#d98a1c" : "#3c9a5a"}"></i>`; }).join("");
    const est1 = os && os.estudios && os.estudios[0];
    const der = `<h3 class="bt-tit">Radiación junto a la Luna</h3>
      <p class="bt-mini">${esc((rl && rl.fuente) || "RadLab · CRaTER")} · ${serie.length ? `del ${esc(serie[0].fecha)} al ${esc(serie[serie.length - 1].fecha)}` : ""}</p>
      <div class="bt-grafica">${barras}</div>
      <p class="bt-mini">Cada barra es un día. Rojo = tormenta solar: hasta ${Math.round(Math.max(0, ...serie.map((x) => x.dosis / base)))} veces más radiación de lo normal.</p>
      <h3 class="bt-tit">La NASA lo estudia</h3>
      ${est1 ? `<ul class="bt-datos">${os.estudios.slice(0, 3).map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.titulo)}</a> <span class="bt-mini">(${esc(e.id)})</span></li>`).join("")}</ul>` : "<p class=\"bt-vacio\">Sin estudios por ahora.</p>"}
      <p class="bt-mini">NASA OSDR · ${etiqueta(est.osdr)}</p>`;
    return [izq, der];
  }
  const claseNum = (c) => { const m = /^([ABCMX])(\d*\.?\d*)/i.exec(c || ""); return m ? "ABCMX".indexOf(m[1].toUpperCase()) * 10 + (parseFloat(m[2]) || 0) : -1; };
  const PAGS = { cartas: pagCartas, informes: pagInformes, datos: pagDatos, aprendido: pagAprendido };

  function pintar() {
    const [izq, der] = PAGS[seccion]();
    $("bt-izq").innerHTML = izq; $("bt-der").innerHTML = der;
    document.querySelectorAll("#bitacora [data-sec]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sec === seccion)));
  }
  function abrir(sec) {
    // en medio de un minijuego no: el tiempo seguiría corriendo
    const s = window.GNOSIS && GNOSIS.estado && GNOSIS.estado();
    if (s && s.J && s.J.enMinijuego) { const b = $("btn-bitacora"); if (b) { b.title = "Termina el minijuego para abrir la bitácora"; } return; }
    if (sec) seccion = sec;
    elegido = null;
    $("bitacora").hidden = false;
    B.vistos = total(); guardar(); badge();
    pintar();
    if (window.SFX) SFX.play("carta-nueva");
  }
  function cerrar() { $("bitacora").hidden = true; }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("#btn-bitacora, #bitacora [data-sec], #bitacora .bt-item, #bt-cerrar");
    if (!t) return;
    if (t.id === "btn-bitacora") { if ($("bitacora").hidden) abrir(); else cerrar(); }
    else if (t.id === "bt-cerrar") cerrar();
    else if (t.dataset.sec) { seccion = t.dataset.sec; elegido = null; pintar(); }
    else if (t.dataset.id) { elegido = t.dataset.id; pintar(); }
  });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("bitacora") && !$("bitacora").hidden) { e.stopPropagation(); cerrar(); } }, true);
  document.addEventListener("DOMContentLoaded", badge);
  setTimeout(badge, 0);

  window.BITACORA = {
    registrar, abrir, cerrar,
    abierta: () => !!$("bitacora") && !$("bitacora").hidden,
    // lo guardado en «Lo aprendido» (para el repaso al empezar otra misión)
    aprendidos: () => Object.entries(B.aprendido).map(([clave, a]) => Object.assign({ clave }, a)),
    cuenta: () => ({ cartas: Object.keys(B.cartas).length, informes: Object.keys(B.informes).length, aprendido: Object.keys(B.aprendido).length }),
    borrar() { B = { cartas: {}, informes: {}, aprendido: {}, vistos: 0 }; guardar(); badge(); },
  };
})();

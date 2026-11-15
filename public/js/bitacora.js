/* =========================================================
   G-NOSIS  -  bitácora
   El libro donde el niño guarda todo lo que descubre. Se llena solo
   durante las misiones y se conserva entre partidas (en este dispositivo):
     Cartas        las 10 cartas: frase, para qué sirve y cuándo usarla
     Informes      lo que contó cada evento, con su fuente
     Datos NASA    clima espacial real (DONKI), radiación real junto a la
                   Luna (RadLab / CRaTER) y estudios reales (OSDR)
     Lo aprendido  las explicaciones de llamadas y averías
     Diccionario   palabras difíciles explicadas para 7-12 años
   Lo nuevo lleva la marca NUEVO hasta que se lee; los textos repetidos no se guardan dos veces.
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
  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-záéíóúñü0-9]+/g, " ").trim();
  // cuántas cosas nuevas (sin leer) hay en cada sección
  const nuevos = (lista) => Object.values(lista).filter((x) => x.nuevo).length;
  const nuevosPor = () => ({ cartas: nuevos(B.cartas), informes: nuevos(B.informes), aprendido: nuevos(B.aprendido), datos: 0, diccionario: 0 });

  // ---------- diccionario: palabras difíciles (definiciones con lo que dicen los informes del juego) ----------
  const GLOSARIO = [
    ["Atmósfera", ["atmósfera"], "La capa de aire que rodea a un planeta. La Luna no tiene una atmósfera gruesa que la proteja."],
    ["Autosuficiente", ["autosuficiente"], "Que produce lo que necesita, sin depender de que le manden cosas. Una base que cultiva su comida es más autosuficiente."],
    ["Campo magnético", ["campo magnético"], "Un escudo invisible que tiene la Tierra y que la protege de la radiación. La Luna no tiene uno."],
    ["CME (eyección de masa coronal)", ["eyección de masa coronal", "CME"], "Una nube de material que lanza el Sol. Suele tardar de 1 a 3 días en llegar."],
    ["Cráter", ["cráteres", "cráter"], "Un hoyo grande en el suelo de la Luna. En los que nunca reciben Sol hay hielo."],
    ["CRaTER", ["CRaTER"], "Un instrumento de la NASA que mide la radiación cerca de la Luna desde 2009."],
    ["DONKI", ["DONKI"], "Una base de datos de la NASA donde se guarda cada tormenta del Sol."],
    ["Hidrógeno", ["hidrógeno"], "Un gas. Si se separa el agua, sale hidrógeno y oxígeno."],
    ["Invernadero", ["invernadero"], "El cuarto de la base donde crecen las plantas con luz y la cantidad justa de agua."],
    ["Llamarada solar", ["llamaradas", "llamarada"], "Un destello fuerte en el Sol. Se nombra con letras: A, B y C son suaves; M y X son fuertes."],
    ["Micrometeorito", ["micrometeoritos", "micrometeorito"], "Una piedrita del espacio que viaja a más de 20 km por segundo: puede hacer un agujero."],
    ["Moho", ["moho"], "Un hongo que crece cuando hay demasiada agua. Puede enfermar a las plantas."],
    ["Noche lunar", ["noche lunar"], "Unos 14 días sin Sol en la Luna, con temperaturas de unos -133 °C."],
    ["Oxígeno", ["oxígeno"], "El gas que respiramos. En la base se obtiene separando el agua."],
    ["Panel solar", ["paneles solares", "panel solar", "paneles"], "Un aparato que convierte la luz del Sol en energía. Produce más cuando la luz le llega de frente."],
    ["Radiación", ["radiación"], "Partículas con mucha energía que llegan del Sol y del espacio. Mucha radiación daña la salud."],
    ["Rayos cósmicos", ["rayos cósmicos"], "Radiación que llega de todas direcciones del espacio, de día y de noche."],
    ["Refugio", ["refugio"], "El cuarto de la base con paredes más gruesas, que frenan las partículas del Sol."],
    ["Regolito", ["regolito"], "El polvo y las piedritas que cubren la Luna. Es filoso como vidrio."],
    ["Relevo", ["relevo"], "El equipo que llega a reemplazarte para cuidar la base."],
    ["Rover", ["rover"], "Un vehículo para explorar la Luna. Sin Sol no puede recargar sus baterías."],
    ["Sismo lunar", ["sismos lunares", "sismo lunar", "sismos", "sismo"], "Un temblor en la Luna. Algunos duran varios minutos."],
    ["Sismómetro", ["sismómetros", "sismómetro"], "Un aparato que mide los temblores. Los astronautas de Apollo dejaron varios en la Luna."],
    ["Tormenta solar", ["tormenta solar", "tormentas solares"], "Cuando el Sol lanza partículas con mucha energía. Las más rápidas pueden llegar en menos de una hora."],
  ].map(([palabra, formas, def]) => ({ palabra, formas, def }));

  const $ = (id) => document.getElementById(id);
  let seccion = "cartas", elegido = null;

  function badge() {
    const p = nuevosPor(), n = p.cartas + p.informes + p.aprendido, el = $("bitacora-nuevos");
    if (!el) return;
    el.hidden = n <= 0; el.textContent = n > 9 ? "9+" : String(n);
  }

  // ---------- registro ----------
  function registrar(tipo, clave, datos) {
    const lista = tipo === "carta" ? B.cartas : tipo === "informe" ? B.informes : B.aprendido;
    if (lista[clave]) return false;
    // no se repiten: si ya hay un texto igual guardado, no se agrega otra vez
    if (datos && datos.texto && Object.values(lista).some((x) => norm(x.texto) === norm(datos.texto))) return false;
    lista[clave] = Object.assign({ fecha: Date.now(), nuevo: true }, datos || {});
    guardar(); badge();
    return true;
  }

  // ---------- páginas ----------
  function listaIzq(items, vacio) {
    if (!items.length) return `<p class="bt-vacio">${esc(vacio)}</p>`;
    return `<ul class="bt-lista">${items.map((it) => `<li><button type="button" class="bt-item ${it.id === elegido ? "sel" : ""} ${it.bloq ? "bloq" : ""}" data-id="${esc(it.id)}" ${it.bloq ? "disabled" : ""}>${it.nuevo ? `<i class="bt-nuevo">NUEVO</i>` : ""}${esc(it.titulo)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button></li>`).join("")}</ul>`;
  }
  // al mostrar un elemento, deja de ser nuevo
  function leido(entrada) { if (entrada && entrada.nuevo) { entrada.nuevo = false; guardar(); badge(); } }
  // quita repetidos al mostrar (por si quedaron guardados de antes)
  const unicos = (pares) => { const vistos = new Set(); return pares.filter(([, x]) => { const k = norm(x.texto) || x.titulo; if (vistos.has(k)) return false; vistos.add(k); return true; }); };
  function pagCartas() {
    const temas = Object.keys(R.temas);
    const items = temas.map((t) => B.cartas[t] ? { id: t, titulo: R.temas[t].carta.nombre, sub: R.temas[t].nombre, nuevo: B.cartas[t].nuevo } : { id: t, titulo: "???", sub: "sin descubrir", bloq: true });
    if (!elegido || !B.cartas[elegido]) elegido = (items.find((i) => i.nuevo) || items.find((i) => !i.bloq) || {}).id || null;
    if (elegido) leido(B.cartas[elegido]);
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
    const items = unicos(Object.entries(B.informes).sort((a, b) => a[1].fecha - b[1].fecha)).map(([id, i]) => ({ id, titulo: i.titulo, sub: R.temas[i.tema] ? R.temas[i.tema].nombre : "", nuevo: i.nuevo }));
    if (!elegido || !B.informes[elegido]) elegido = (items.find((x) => x.nuevo) || items[items.length - 1] || {}).id || null;
    const i = elegido && B.informes[elegido];
    leido(i);
    const der = i ? `<h3 class="bt-tit">${esc(i.titulo)}</h3><p>${esc(i.texto)}</p><p class="bt-mini">Fuente: ${esc(i.fuente || "NASA")}</p>`
      : `<p class="bt-vacio">Cada evento de la misión deja un informe. Aquí se guardan todos.</p>`;
    return [`<h3 class="bt-tit">Informes · ${items.length}</h3>` + listaIzq(items, "Todavía no hay informes."), der];
  }
  function pagAprendido() {
    const items = unicos(Object.entries(B.aprendido).sort((a, b) => a[1].fecha - b[1].fecha)).map(([id, a]) => ({ id, titulo: a.titulo, sub: a.quien || "", nuevo: a.nuevo }));
    if (!elegido || !B.aprendido[elegido]) elegido = (items.find((x) => x.nuevo) || items[items.length - 1] || {}).id || null;
    const a = elegido && B.aprendido[elegido];
    leido(a);
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
      <p class="bt-mini">Las llamaradas A, B y C son suaves; M y X son fuertes. Una CME tarda de 1 a 3 días en llegar a la Luna.</p>`;
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
  function pagDiccionario() {
    const items = GLOSARIO.slice().sort((a, b) => a.palabra.localeCompare(b.palabra, "es")).map((g) => ({ id: g.palabra, titulo: g.palabra }));
    if (!elegido || !GLOSARIO.some((g) => g.palabra === elegido)) elegido = items[0].id;
    const g = GLOSARIO.find((x) => x.palabra === elegido);
    const donde = Object.values(B.informes).filter((i) => g.formas.some((f) => norm(i.texto).includes(norm(f)))).map((i) => i.titulo);
    const der = `<h3 class="bt-tit">${esc(g.palabra)}</h3><p class="bt-frase" style="font-weight:400">${esc(g.def)}</p>` +
      (donde.length ? `<p class="bt-mini">La leíste en: ${[...new Set(donde)].slice(0, 4).map(esc).join(", ")}.</p>` : `<p class="bt-mini">Todavía no aparece en tus informes.</p>`);
    return [`<h3 class="bt-tit">Diccionario · ${items.length} palabras</h3>` + listaIzq(items, ""), der];
  }
  const PAGS = { cartas: pagCartas, informes: pagInformes, datos: pagDatos, aprendido: pagAprendido, diccionario: pagDiccionario };
  const NOMBRES = { cartas: "Cartas", informes: "Informes", datos: "Datos NASA", aprendido: "Lo aprendido", diccionario: "Diccionario" };

  function pintar() {
    const [izq, der] = PAGS[seccion]();
    $("bt-izq").innerHTML = izq; $("bt-der").innerHTML = der;
    const p = nuevosPor();
    document.querySelectorAll("#bitacora [data-sec]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.sec === seccion));
      b.innerHTML = esc(NOMBRES[b.dataset.sec] || b.dataset.sec) + (p[b.dataset.sec] ? ` <b class="bt-n">${p[b.dataset.sec]}</b>` : "");
    });
  }
  function abrir(sec, palabra) {
    // en medio de un minijuego no: el tiempo seguiría corriendo
    const s = window.GNOSIS && GNOSIS.estado && GNOSIS.estado();
    if (s && s.J && s.J.enMinijuego) { const b = $("btn-bitacora"); if (b) { b.title = "Termina el minijuego para abrir la bitácora"; } return; }
    if (sec) seccion = sec;
    else { const p = nuevosPor(); const con = ["cartas", "informes", "aprendido"].find((k) => p[k]); if (con) seccion = con; }   // abre donde hay algo nuevo
    elegido = palabra || null;
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
    registrar, abrir, cerrar, glosario: GLOSARIO,
    abierta: () => !!$("bitacora") && !$("bitacora").hidden,
    // lo guardado en «Lo aprendido» (para el repaso al empezar otra misión)
    aprendidos: () => Object.entries(B.aprendido).map(([clave, a]) => Object.assign({ clave }, a)),
    cuenta: () => ({ cartas: Object.keys(B.cartas).length, informes: Object.keys(B.informes).length, aprendido: Object.keys(B.aprendido).length }),
    borrar() { B = { cartas: {}, informes: {}, aprendido: {}, vistos: 0 }; guardar(); badge(); },
  };
})();

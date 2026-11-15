/* =========================================================
   G-NOSIS  -  idioma (español / inglés)
   El juego está escrito en español. En inglés, este archivo traduce
   lo que se ve y lo que se oye, sin tocar la lógica:
     · la pantalla (texto del HTML, aunque el juego lo cambie después)
     · lo que se dibuja en el canvas (fillText / measureText)
     · lo que lee el narrador (tr() dentro de voz)
   Diccionario: datos/i18n/textos-es.txt + textos-en.txt  ->  js/i18n-en.js
   Las plantillas guardan {0}, {1}... en el lugar de las partes que cambian.
   ========================================================= */
(() => {
  "use strict";
  const CLAVE = "gnosis-idioma";
  let idioma = "es";
  try { idioma = localStorage.getItem(CLAVE) === "en" ? "en" : "es"; } catch (e) { /* sin almacenamiento */ }
  const pedido = new URLSearchParams(location.search).get("lang");
  if (pedido === "en" || pedido === "es") idioma = pedido;
  const EN = idioma === "en";
  document.documentElement.lang = idioma;

  // ---------- diccionario ----------
  // palabras sueltas del panel del equipo que el extractor no alcanza a ver (vienen de claves internas)
  const EXTRA = { despensa: "pantry", agotado: "exhausted", "Datos:": "Data:", conectado: "connected", "sin configurar": "not set up",
    "llave rechazada": "key rejected", "sin conexión": "offline", "revisando…": "checking…" };
  const D = Object.assign({}, EXTRA, window.I18N_EN || {});
  const exacto = new Map(), patrones = [], fragmentos = [], palabras = new Map();
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [es, en] of Object.entries(D)) {
    if (/\{\d+\}/.test(es)) {
      const orden = [];
      const re = new RegExp("^" + escRe(es).replace(/\\\{(\d+)\\\}/g, (_, n) => { orden.push(n); return "([\\s\\S]+?)"; }) + "$");
      patrones.push({ re, orden, en, fijo: es.replace(/\{\d+\}/g, "").length });
    } else {
      exacto.set(es, en);
      if (es.length >= 10 && /\s/.test(es)) fragmentos.push([es, en]);
      else if (/^[\p{L}]{4,}$/u.test(es)) palabras.set(es, en);     // RADIACIÓN, Energía, invernadero...
    }
  }
  const rePalabras = palabras.size ? new RegExp(`(?<!\\p{L})(${[...palabras.keys()].sort((a, b) => b.length - a.length).map(escRe).join("|")})(?!\\p{L})`, "gu") : null;
  patrones.sort((a, b) => b.fijo - a.fijo);           // primero los más específicos
  fragmentos.sort((a, b) => b[0].length - a[0].length);

  const cache = new Map();
  function traducir(t) {
    const x = exacto.get(t);
    if (x !== undefined) return x;
    for (const p of patrones) {
      const m = p.re.exec(t);
      if (!m) continue;
      const val = {}; p.orden.forEach((n, k) => { val[n] = m[k + 1]; });
      return p.en.replace(/\{(\d+)\}/g, (_, n) => (val[n] === undefined ? "" : tr(val[n])));
    }
    // texto armado con varias piezas: cambia cada pieza conocida que aparezca adentro
    let r = t;
    for (const [es, en] of fragmentos) if (r.includes(es)) r = r.split(es).join(en);
    if (rePalabras) r = r.replace(rePalabras, (w) => palabras.get(w));
    return r;
  }
  function tr(s) {
    if (!EN || typeof s !== "string" || s.length < 2) return s;
    const c = cache.get(s);
    if (c !== undefined) return c;
    let r = s;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    if (m[2] && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(m[2])) r = m[1] + traducir(m[2]) + m[3];
    if (cache.size > 6000) cache.clear();
    cache.set(s, r);
    return r;
  }
  window.tr = tr;

  // ---------- canvas: todo lo que se escribe en el canvas pasa por tr ----------
  if (EN && window.CanvasRenderingContext2D) {
    const P = CanvasRenderingContext2D.prototype;
    for (const nombre of ["fillText", "strokeText", "measureText"]) {
      const orig = P[nombre];
      P[nombre] = function (t, ...resto) { return orig.call(this, typeof t === "string" ? tr(t) : t, ...resto); };
    }
  }

  // ---------- pantalla: traduce el HTML y todo lo que el juego escriba después ----------
  const ATR = ["title", "aria-label", "alt", "placeholder"];
  const saltar = (el) => !el || el.closest("script, style, [data-sin-traducir]");
  function nodoTexto(n) {
    if (saltar(n.parentElement)) return;
    const t = tr(n.data);
    if (t !== n.data) n.data = t;
  }
  function atributos(el) {
    for (const a of ATR) { const v = el.getAttribute(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  }
  function recorrer(raiz) {
    if (raiz.nodeType === 3) return nodoTexto(raiz);
    if (raiz.nodeType !== 1 || saltar(raiz)) return;
    atributos(raiz);
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) nodoTexto(n); else if (!saltar(n)) atributos(n); }
  }
  function empezarPantalla() {
    document.title = tr(document.title);
    recorrer(document.body);
    new MutationObserver((lista) => {
      for (const m of lista) {
        if (m.type === "characterData") nodoTexto(m.target);
        else if (m.type === "attributes") { if (!saltar(m.target)) atributos(m.target); }
        else m.addedNodes.forEach(recorrer);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATR });
  }

  // ---------- selector de idioma del menú principal (a la derecha de la Luna) ----------
  function selector() {
    const stage = document.getElementById("stage");
    if (!stage || document.getElementById("idioma")) return;
    const caja = document.createElement("div");
    caja.id = "idioma";
    caja.dataset.sinTraducir = "";
    caja.setAttribute("role", "group");
    caja.setAttribute("aria-label", "Idioma / Language");
    caja.innerHTML = `<span class="i-tit">IDIOMA · LANGUAGE</span>
      <button type="button" data-l="es" aria-pressed="${!EN}"><span class="i-ban" aria-hidden="true">ES</span>Español</button>
      <button type="button" data-l="en" aria-pressed="${EN}"><span class="i-ban" aria-hidden="true">EN</span>English</button>`;
    caja.addEventListener("pointerdown", (e) => e.stopPropagation());
    caja.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-l]");
      if (!b || b.dataset.l === idioma) return;
      try { localStorage.setItem(CLAVE, b.dataset.l); } catch (err) { /* sin almacenamiento */ }
      try { speechSynthesis.cancel(); } catch (err) { /* sin voz */ }
      const u = new URL(location.href); u.searchParams.delete("lang");
      location.href = u.toString();
    });
    stage.appendChild(caja);
  }

  window.I18N = {
    idioma, tr,
    // el juego avisa si está en el menú principal: solo ahí se ve el selector
    enMenu(on) { const c = document.getElementById("idioma"); if (c) c.hidden = !on; },
  };
  const listo = () => { selector(); if (EN) empezarPantalla(); };
  if (document.body) listo(); else document.addEventListener("DOMContentLoaded", listo);
})();

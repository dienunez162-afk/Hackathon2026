/* =========================================================
   G-NOSIS  -  narrador (voz del navegador, sin internet ni archivos extra)
   Arreglos para que lea siempre y completo:
     · elige la voz más clara del idioma del juego (las "Natural"/"Online" de Edge
       o las de Google en Chrome; si no, la del sistema: Helena, Sabina, Zira...)
     · parte los textos largos en frases: Chrome corta en seco lo que dura más de ~15 s
     · espera un instante después de cancel(): si no, Chrome a veces se traga la frase nueva
     · si las voces todavía no cargan, espera a que lleguen y luego lee
     · "despierta" la voz con el primer toque (Safari/iPhone no hablan sin un gesto)
   El niño puede elegir la voz y probarla en el menú de pausa (se guarda en "gnosis-voz").
   ========================================================= */
(() => {
  "use strict";
  const S = window.speechSynthesis;
  const hay = !!S && typeof window.SpeechSynthesisUtterance === "function";
  const CLAVE = "gnosis-voz";
  const idioma = () => (window.I18N ? I18N.idioma : "es");
  const LANG_DEF = { es: "es-MX", en: "en-US" };
  let voces = [], elegida = null, turno = 0, espera = null;
  const vivas = new Set();                   // guardar las frases evita que Chrome las borre a medias
  const avisos = [];
  let pref = {};
  try { pref = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { pref = {}; }

  function puntos(v, l) {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    if (!lang.startsWith(l)) return -1;
    let p = 1;
    if (/natural|neural|online/i.test(v.name)) p += 60;          // Edge: las más claras
    if (/google/i.test(v.name)) p += 35;                          // Chrome
    if (/premium|enhanced|mejorad/i.test(v.name)) p += 30;        // Mac / iPhone
    if (l === "es" && /-(mx|us|419)$/.test(lang)) p += 10;        // español de América
    if (l === "es" && /-es$/.test(lang)) p += 6;
    if (l === "en" && /-us$/.test(lang)) p += 10;
    if (l === "en" && /-gb$/.test(lang)) p += 6;
    if (/sabina|dalia|paulina|monica|helena|laura|jenny|aria|zira|samantha|ava|elsa/i.test(v.name)) p += 3;
    return p;
  }
  function delIdioma() {
    const l = idioma();
    return voces.map((v) => [v, puntos(v, l)]).filter((x) => x[1] >= 0).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  }
  function cargar() {
    if (!hay) return;
    try { voces = S.getVoices() || []; } catch (e) { voces = []; }
    const lista = delIdioma(), quiero = pref[idioma()];
    elegida = lista.find((v) => v.name === quiero) || lista[0] || null;
    if (voces.length && espera) { const f = espera; espera = null; f(); }
    avisos.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
  }
  if (hay) {
    cargar();
    try { S.addEventListener("voiceschanged", cargar); } catch (e) { S.onvoiceschanged = cargar; }
    // algunas versiones no avisan: volver a preguntar unas veces al principio
    let n = 0; const t = setInterval(() => { if (voces.length || ++n > 20) { clearInterval(t); return; } cargar(); }, 250);
  }

  // frases de hasta ~180 letras, cortando en puntos, luego en comas y al final en espacios
  function frases(texto) {
    const limpio = String(texto).replace(/[«»"*_#<>]/g, "").replace(/[═◘💧▸▶◀⏸♪✦]/gu, " ").replace(/\s+/g, " ").trim();
    if (!limpio) return [];
    const out = [];
    for (const f of limpio.split(/(?<=[.!?…])\s+/)) {
      if (f.length <= 180) { out.push(f); continue; }
      let resto = f;
      while (resto.length > 180) {
        let i = resto.lastIndexOf(", ", 180);
        if (i < 60) i = resto.lastIndexOf(" ", 180);
        if (i < 1) i = 180;
        out.push(resto.slice(0, i + 1).trim()); resto = resto.slice(i + 1).trim();
      }
      if (resto) out.push(resto);
    }
    return out.filter((x) => /[\p{L}\d]/u.test(x));
  }

  function decir(partes, mio) {
    if (mio !== turno) return;
    try { if (S.paused) S.resume(); } catch (e) { /* nada */ }
    const l = idioma();
    for (const p of partes) {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = elegida ? elegida.lang : LANG_DEF[l];
      if (elegida) u.voice = elegida;
      u.rate = 0.95; u.pitch = 1; u.volume = 1;
      vivas.add(u);
      u.onend = u.onerror = () => vivas.delete(u);
      S.speak(u);
    }
  }

  function hablar(texto) {
    if (!hay) return false;
    const t = window.tr ? tr(String(texto || "")) : String(texto || "");
    const partes = frases(t);
    const mio = ++turno;
    try { S.cancel(); } catch (e) { /* nada */ }
    vivas.clear();
    if (!partes.length) return false;
    const ir = () => setTimeout(() => decir(partes, mio), 90);
    if (!voces.length) { espera = ir; setTimeout(() => { if (espera === ir) { espera = null; ir(); } }, 1200); }
    else ir();
    return true;
  }
  function callar() { turno++; espera = null; try { S.cancel(); } catch (e) { /* nada */ } vivas.clear(); }

  // primer toque: una frase muda para "abrir" la voz (iPhone/Safari la necesitan)
  function despertar() {
    window.removeEventListener("pointerdown", despertar, true);
    window.removeEventListener("keydown", despertar, true);
    if (!hay) return;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; S.speak(u); } catch (e) { /* nada */ }
    cargar();
  }
  window.addEventListener("pointerdown", despertar, true);
  window.addEventListener("keydown", despertar, true);

  window.NARRADOR = {
    hay, hablar, callar,
    voces: delIdioma,
    get voz() { return elegida; },
    elegir(nombre) {
      const v = delIdioma().find((x) => x.name === nombre);
      if (!v) return;
      elegida = v; pref[idioma()] = v.name;
      try { localStorage.setItem(CLAVE, JSON.stringify(pref)); } catch (e) { /* sin almacenamiento */ }
    },
    alCambiar(f) { avisos.push(f); },
  };
})();

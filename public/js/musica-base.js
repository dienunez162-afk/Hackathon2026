/* =========================================================
   G-NOSIS  -  control de la música
   Un solo lugar decide qué suena. Cada 150 ms (y en cada cambio de
   escena) pregunta al juego qué debería sonar (MUSICA_BASE.deseado)
   y acerca cada fuente a su volumen objetivo. Así, aunque se cambie
   de escena muy rápido, nunca quedan dos músicas encimadas.

   Fuentes:
     intro   audio/soundtrack.mp3          menú y alunizaje
     base    acordes generados aquí        dentro de la base (Web Audio, sin ritmo)
     alarma  audio/alarma-emergencia.mp3   eventos fuertes y averías (se repite)
     bueno   audio/final-bueno.mp3         finales con relevo, hasta el manual
     malo    audio/final-malo.mp3          finales con evacuación, hasta el manual
   Mientras suena una pista (alarma o final), la intro y los acordes se callan.
   ========================================================= */
(() => {
  "use strict";
  const VOL_BASE = 0.28, VOL_PISTA = 0.6;
  const COMPAS = 2.6;                     // segundos por acorde
  // 8 acordes por vuelta. Día: La menor luminoso; noche: Re menor, más grave.
  const ACORDES = {
    dia: [
      [45, 57, 60, 64, 67, 71], [41, 57, 60, 64, 69], [48, 55, 59, 64, 67], [43, 55, 59, 62, 64, 69],
      [38, 53, 57, 60, 64], [41, 53, 57, 60, 65, 67], [45, 57, 60, 64, 71], [40, 52, 57, 59, 64],
    ],   // Am9, Fmaj7, Cmaj7, G6/9, Dm9, Fmaj9, Am(add9), Esus4
    noche: [
      [38, 50, 53, 57, 60, 64], [34, 50, 53, 57, 62], [43, 50, 53, 58, 62], [45, 52, 57, 59, 64],
      [41, 53, 57, 60, 64], [36, 52, 55, 60, 62], [34, 50, 53, 57, 60, 62], [45, 52, 57, 61, 64],
    ],   // Dm9, Bbmaj7, Gm9, Asus2, Fmaj7, Cadd9, Bbmaj9, A
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const silenciadoAhora = () => (typeof silenciado !== "undefined" && silenciado);
  const gestoHecho = () => (typeof musicaIniciada !== "undefined" && musicaIniciada);

  // ---------- acordes de fondo (Web Audio) ----------
  let ac = null, master, siguiente = 0, k = 0, noche = false, baseSonando = false;
  function crear() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    const rev = ac.createConvolver(), largo = Math.floor(ac.sampleRate * 3.6), imp = ac.createBuffer(2, largo, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 2.4); }
    rev.buffer = imp;
    const revG = ac.createGain(); revG.gain.value = 0.5;
    master.connect(comp); master.connect(rev); rev.connect(revG); revG.connect(comp); comp.connect(ac.destination);
    return true;
  }
  const despertar = () => { if (ac && ac.state === "suspended") ac.resume().catch(() => {}); };
  window.addEventListener("pointerdown", despertar, true);
  window.addEventListener("keydown", despertar, true);

  // un acorde sostenido que entra suave y se encima con el siguiente: nunca hay silencio
  function acorde(notas, t) {
    const dur = COMPAS * 2.2;
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 0.3;
    f.frequency.setValueAtTime(noche ? 650 : 900, t);
    f.frequency.linearRampToValueAtTime(noche ? 800 : 1150, t + COMPAS);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5 / notas.length, t + COMPAS * 0.6);
    g.gain.setValueAtTime(0.5 / notas.length, t + COMPAS * 1.1);
    g.gain.linearRampToValueAtTime(0, t + dur);
    f.connect(g); g.connect(master);
    notas.forEach((n, i) => {
      const grave = i === 0;
      for (const det of grave ? [0] : [-6, 5]) {
        const o = ac.createOscillator();
        o.type = grave ? "sine" : "sawtooth"; o.frequency.value = hz(n); o.detune.value = det;
        if (grave) { const gg = ac.createGain(); gg.gain.value = 2.2; o.connect(gg); gg.connect(f); } else o.connect(f);
        o.start(t); o.stop(t + dur + 0.1);
      }
    });
  }
  function programarAcordes() {
    if (!ac || ac.state !== "running" || !baseSonando) return;
    if (siguiente < ac.currentTime) siguiente = ac.currentTime + 0.05;
    while (siguiente < ac.currentTime + 0.3) { acorde((noche ? ACORDES.noche : ACORDES.dia)[k % 8], siguiente); siguiente += COMPAS; k++; }
  }
  let objetivoBase = -1;
  function volumenBase(v) {
    if (!ac || v === objetivoBase) return;
    objetivoBase = v;
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(v, t + (v > 0 ? 2 : 0.8));
  }

  // ---------- pistas mp3 con volumen objetivo ----------
  const PISTAS = {};
  for (const [n, loop] of [["alarma-emergencia", true], ["final-bueno", false], ["final-malo", false]]) {
    const a = new Audio(`audio/${n}.mp3`); a.preload = "auto"; a.loop = loop; a.volume = 0;
    PISTAS[n] = { audio: a, objetivo: 0, velocidad: 0.04 };
  }
  // el soundtrack de la intro (musica.js) entra al mismo control como "__intro"
  function reproducir(a) { if (a.paused) { const p = a.play(); if (p) p.catch(() => {}); } }

  let pistaPrevia = null;
  function sincronizar() {
    const d = typeof window.MUSICA_BASE.deseado === "function" ? window.MUSICA_BASE.deseado() : { intro: true, base: false, pista: null };
    const sil = silenciadoAhora(), gesto = gestoHecho();
    noche = !!d.noche;

    // pista nueva: empieza desde el principio
    if (d.pista !== pistaPrevia) {
      if (d.pista && PISTAS[d.pista] && PISTAS[d.pista].audio.volume < 0.05) PISTAS[d.pista].audio.currentTime = 0;
      pistaPrevia = d.pista;
    }
    for (const n of Object.keys(PISTAS)) {
      if (n === "__intro") continue;
      const p = PISTAS[n], on = gesto && d.pista === n;
      p.audio.muted = sil;
      p.objetivo = on ? VOL_PISTA : 0;
      p.velocidad = on ? (n === "alarma-emergencia" ? 0.08 : 0.03) : 0.06;
      if (on) reproducir(p.audio);
    }
    // intro: solo en el menú y sin pista encima
    if (typeof musica !== "undefined") {
      const intro = PISTAS.__intro || (PISTAS.__intro = { objetivo: 0, velocidad: 0.03 });
      intro.audio = musica;
      const on = gesto && d.intro && !d.pista;
      musica.muted = sil;
      intro.objetivo = on ? MUSICA_VOL : 0;
      intro.velocidad = on ? 0.02 : 0.05;
      if (on) reproducir(musica);
    }
    // acordes de la base: dentro del juego y sin pista encima
    const baseOn = gesto && d.base && !d.pista && !sil;
    if (d.base && gesto && crear()) { despertar(); baseSonando = true; }
    if (!d.base) baseSonando = false;
    volumenBase(baseOn ? VOL_BASE : 0);
    programarAcordes();
  }
  // acerca cada audio a su volumen objetivo; al llegar a 0 lo pausa
  setInterval(() => {
    for (const p of Object.values(PISTAS)) {
      if (!p.audio) continue;
      const a = p.audio, v = a.volume, o = p.objetivo;
      if (Math.abs(v - o) <= p.velocidad) a.volume = o; else a.volume = v + Math.sign(o - v) * p.velocidad;
      if (o === 0 && a.volume === 0 && !a.paused) a.pause();
    }
  }, 50);
  setInterval(() => { if (window.MUSICA_BASE) sincronizar(); }, 150);

  window.MUSICA_BASE = {
    // el juego (juego.js) reemplaza esta función: devuelve { intro, base, pista, noche }
    deseado: null,
    sincronizar,
    sonando: () => {
      const s = Object.entries(PISTAS).filter(([, p]) => p.audio && !p.audio.paused && p.audio.volume > 0.01).map(([n]) => (n === "__intro" ? "intro" : n));
      if (ac && master.gain.value > 0.01) s.push("acordes");
      return s;
    },
  };
})();

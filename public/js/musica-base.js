/* =========================================================
   G-NOSIS  -  música de la base
   - Fondo: acordes sostenidos que se encadenan sin cortes, generados
     aquí con Web Audio (original del proyecto, sin archivos). Sin ritmo
     ni percusión. De noche (días 11-14) la progresión baja a tono menor.
   - Pistas del equipo (public/audio/) que reemplazan al fondo en momentos clave:
       alarma-emergencia.mp3  eventos fuertes (tormentas, impactos, sismo fuerte,
                              calefacción rota) y averías; se repite mientras dure
       final-bueno.mp3        finales con relevo (1, 2 o 3 estrellas)
       final-malo.mp3         finales con evacuación
   El soundtrack de la intro sigue en musica.js.
   API: MUSICA_BASE.activar(), .detener(), .modo("calma"|"alerta"|"peligro", { noche }),
        .pista("final-bueno"|"final-malo"|"alarma-emergencia"|null)
   ========================================================= */
(() => {
  "use strict";
  const VOL = 0.28, VOL_PISTA = 0.6;
  const COMPAS = 2.6;                     // segundos por acorde (lento y constante)
  // 8 acordes por vuelta. Día: La menor luminoso; noche: Re menor, más grave.
  const ACORDES = {
    dia: [
      [45, 57, 60, 64, 67, 71],   // Am9
      [41, 57, 60, 64, 69],       // Fmaj7
      [48, 55, 59, 64, 67],       // Cmaj7
      [43, 55, 59, 62, 64, 69],   // G6/9
      [38, 53, 57, 60, 64],       // Dm9
      [41, 53, 57, 60, 65, 67],   // Fmaj9
      [45, 57, 60, 64, 71],       // Am(add9)
      [40, 52, 57, 59, 64],       // Esus4
    ],
    noche: [
      [38, 50, 53, 57, 60, 64],   // Dm9
      [34, 50, 53, 57, 62],       // Bbmaj7
      [43, 50, 53, 58, 62],       // Gm9
      [45, 52, 57, 59, 64],       // Asus2
      [41, 53, 57, 60, 64],       // Fmaj7
      [36, 52, 55, 60, 62],       // Cadd9
      [34, 50, 53, 57, 60, 62],   // Bbmaj9
      [45, 52, 57, 61, 64],       // A
    ],
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const silenciadoAhora = () => (typeof silenciado !== "undefined" && silenciado);

  let ac = null, master, salida, activo = false, reloj = null, siguiente = 0, k = 0, noche = false;
  let apagando = null, silencioPrevio = null, modoActual = "calma";

  function crear() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0;
    salida = ac.createGain(); salida.gain.value = 1;          // baja a 0 cuando suena una pista
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3;
    // reverberación generada: da el "espacio" de la base
    const rev = ac.createConvolver(), largo = Math.floor(ac.sampleRate * 3.6), imp = ac.createBuffer(2, largo, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 2.4); }
    rev.buffer = imp;
    const revG = ac.createGain(); revG.gain.value = 0.5;
    master.connect(salida); salida.connect(comp); comp.connect(ac.destination);
    master.connect(rev); rev.connect(revG); revG.connect(salida);
    return true;
  }
  const despertar = () => { if (ac && ac.state === "suspended") ac.resume().catch(() => {}); };
  window.addEventListener("pointerdown", despertar, true);
  window.addEventListener("keydown", despertar, true);
  const rampa = (param, valor, seg) => { const t = ac.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(valor, t + seg); };

  // un acorde sostenido: entra suave y se encima con el siguiente, así nunca hay silencio
  function acorde(notas, t) {
    const dur = COMPAS * 2.2;
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 0.3;
    f.frequency.setValueAtTime(noche ? 650 : 900, t);
    f.frequency.linearRampToValueAtTime(noche ? 800 : 1150, t + COMPAS);      // se abre un poco: "respira"
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
        o.type = grave ? "sine" : "sawtooth";
        o.frequency.value = hz(n); o.detune.value = det;
        if (grave) { const gg = ac.createGain(); gg.gain.value = 2.2; o.connect(gg); gg.connect(f); } else o.connect(f);
        o.start(t); o.stop(t + dur + 0.1);
      }
    });
  }
  function tick() {
    if (!ac) return;
    const sil = silenciadoAhora();
    if (sil !== silencioPrevio && activo && !apagando) { silencioPrevio = sil; rampa(master.gain, sil ? 0 : VOL, 0.3); }
    if (pistaActual) pistaActual.muted = sil;
    if (ac.state !== "running") { siguiente = ac.currentTime + 0.1; return; }
    if (siguiente < ac.currentTime) siguiente = ac.currentTime + 0.05;
    while (siguiente < ac.currentTime + 0.3) {
      acorde((noche ? ACORDES.noche : ACORDES.dia)[k % 8], siguiente);
      siguiente += COMPAS; k++;
    }
  }

  // ---------- pistas del equipo (mp3) ----------
  const PISTAS = {};
  for (const [n, loop] of [["alarma-emergencia", true], ["final-bueno", false], ["final-malo", false]]) {
    const a = new Audio(`audio/${n}.mp3`); a.preload = "auto"; a.loop = loop; a.volume = 0;
    PISTAS[n] = a;
  }
  let pistaActual = null, nombreActual = null;
  function fundir(a, objetivo, ms, alFinal) {
    clearInterval(a._fade);
    const desde = a.volume, t0 = performance.now();
    a._fade = setInterval(() => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      a.volume = desde + (objetivo - desde) * u;
      if (u >= 1) { clearInterval(a._fade); if (alFinal) alFinal(); }
    }, 40);
  }
  function pista(nombre) {
    if (nombre === nombreActual) return;
    if (pistaActual) { const vieja = pistaActual; fundir(vieja, 0, 900, () => { if (vieja !== pistaActual) vieja.pause(); }); }
    nombreActual = nombre || null;
    pistaActual = nombre ? PISTAS[nombre] : null;
    if (pistaActual) {
      pistaActual.currentTime = 0; pistaActual.muted = silenciadoAhora();
      const p = pistaActual.play(); if (p) p.catch(() => {});
      fundir(pistaActual, VOL_PISTA, nombre === "alarma-emergencia" ? 400 : 1500);
    }
    // el fondo se calla mientras suena una pista
    if (ac) rampa(salida.gain, pistaActual ? 0 : 1, pistaActual ? 0.6 : 2.5);
  }

  window.MUSICA_BASE = {
    activar() {
      if (!crear()) return;
      despertar();
      clearTimeout(apagando); apagando = null;
      if (!activo) { activo = true; k = 0; siguiente = ac.currentTime + 0.1; reloj = setInterval(tick, 50); }
      silencioPrevio = silenciadoAhora();
      rampa(master.gain, silencioPrevio ? 0 : VOL, 2.5);
      pista(null);
    },
    detener() {
      pista(null);
      if (!ac || !activo) return;
      rampa(master.gain, 0, 1.2);
      clearTimeout(apagando);
      apagando = setTimeout(() => { clearInterval(reloj); activo = false; apagando = null; }, 1500);
    },
    // "peligro" pone la alarma; "calma" y "alerta" dejan los acordes de fondo
    modo(m, op) {
      if (op && typeof op.noche === "boolean") noche = op.noche;
      modoActual = m;
      if (m === "peligro") pista("alarma-emergencia");
      else if (nombreActual === "alarma-emergencia") pista(null);
    },
    pista,
    actual: () => nombreActual || modoActual,
  };
})();

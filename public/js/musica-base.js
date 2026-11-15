/* =========================================================
   G-NOSIS  -  música de la base (dinámica)
   El soundtrack (audio/soundtrack.mp3) suena solo en la intro.
   Dentro de la base la música se genera aquí mismo con Web Audio:
   es original del proyecto, no usa archivos ni licencias externas.
   Tiene tres capas que se mezclan según el peligro de la misión:
     calma   - acordes lentos y campanitas (tareas, decisiones, días tranquilos)
     alerta  - mismos acordes, pulso de bajo y latido (eventos, llamadas, barra en rojo)
     peligro - bajo rápido, arpegio, platillos y alarma (tormentas, impactos, averías)
   De noche (días 11-14) los acordes cambian a una tonalidad menor y más grave.
   API: MUSICA_BASE.activar(), .detener(), .modo("calma"|"alerta"|"peligro", { noche })
   ========================================================= */
(() => {
  "use strict";
  const VOL = 0.3, PASO = 0.125;            // 16avos a 120 pulsos por minuto; un compás = 2 s
  const CAPAS = ["calma", "alerta", "peligro"];
  let ac = null, master, revEnvio, dlyEnvio, ruido, capas = {}, objetivo = { calma: 0, alerta: 0, peligro: 0 };
  let activo = false, reloj = null, siguiente = 0, paso = 0, modoActual = "calma", noche = false, apagando = null, silencioPrevio = null;

  // acordes (notas MIDI): día en La menor / Fa / Do / Sol, noche en Re menor / Si bemol / Sol menor / La
  const ACORDES = {
    dia: [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 59, 64, 67], [55, 59, 62, 64, 69]],
    noche: [[50, 53, 57, 60, 64], [46, 53, 57, 62, 65], [43, 50, 53, 58, 62], [45, 52, 57, 61, 64]],
    peligro: [[50, 53, 57, 62], [46, 50, 53, 58], [48, 51, 55, 60], [45, 49, 52, 57]],
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const silenciadoAhora = () => (typeof silenciado !== "undefined" && silenciado);

  function crear() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    master.connect(comp); comp.connect(ac.destination);
    // reverberación con un impulso generado (ruido que se apaga): da el "espacio" de la base
    const rev = ac.createConvolver(), largo = Math.floor(ac.sampleRate * 3.4), imp = ac.createBuffer(2, largo, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 2.6); }
    rev.buffer = imp;
    revEnvio = ac.createGain(); revEnvio.gain.value = 0.42; revEnvio.connect(rev); rev.connect(master);
    // eco para las campanitas y el arpegio
    const dly = ac.createDelay(1.5), fb = ac.createGain(), sal = ac.createGain();
    dly.delayTime.value = PASO * 3; fb.gain.value = 0.38; sal.gain.value = 0.3;
    dlyEnvio = ac.createGain(); dlyEnvio.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(sal); sal.connect(master); sal.connect(revEnvio);
    // ruido blanco para los platillos
    ruido = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const r = ruido.getChannelData(0); for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;
    for (const k of CAPAS) { const g = ac.createGain(); g.gain.value = 0; g.connect(master); g.connect(revEnvio); capas[k] = g; }
    return true;
  }
  // el navegador solo deja sonar audio después de un toque o una tecla
  const despertar = () => { if (ac && ac.state === "suspended") ac.resume().catch(() => {}); };
  window.addEventListener("pointerdown", despertar, true);
  window.addEventListener("keydown", despertar, true);

  const rampa = (param, valor, seg) => { const t = ac.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(valor, t + seg); };
  const vivo = (k) => objetivo[k] > 0 || capas[k].gain.value > 0.005;

  // ---------- voces ----------
  function env(t, ataque, sostener, soltar, pico, destino) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pico, t + ataque);
    g.gain.setValueAtTime(pico, t + ataque + sostener);
    g.gain.linearRampToValueAtTime(0, t + ataque + sostener + soltar);
    g.connect(destino);
    return g;
  }
  function pad(notas, t, dur, destino, corte, vol) {
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = corte; f.Q.value = 0.4;
    const g = env(t, 1.4, Math.max(0.2, dur - 2.2), 1.6, vol / notas.length, destino);
    f.connect(g);
    for (const n of notas) for (const det of [-7, 6]) {
      const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(n); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.2);
    }
  }
  function campana(n, t, destino, vol) {
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.6);
    g.connect(destino); g.connect(dlyEnvio);
    for (const [mult, tipo, v] of [[1, "sine", 1], [2, "triangle", 0.25], [3.01, "sine", 0.08]]) {
      const o = ac.createOscillator(), gv = ac.createGain(); o.type = tipo; o.frequency.value = hz(n) * mult; gv.gain.value = v;
      o.connect(gv); gv.connect(g); o.start(t); o.stop(t + 2.7);
    }
  }
  function bajo(n, t, dur, destino, vol, tipo, corte) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = env(t, 0.008, dur * 0.5, dur * 0.45, vol, destino);
    o.type = tipo; o.frequency.value = hz(n); f.type = "lowpass"; f.frequency.value = corte; f.Q.value = 3;
    o.connect(f); f.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }
  function platillo(t, destino, vol, largo) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = ruido; f.type = "highpass"; f.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + largo);
    s.connect(f); f.connect(g); g.connect(destino); s.start(t, Math.random() * 0.5); s.stop(t + largo + 0.02);
  }
  function golpe(t, destino, vol, alto) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(alto, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
    o.connect(g); g.connect(destino); o.start(t); o.stop(t + 0.35);
  }
  function sirena(t, destino, vol) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = env(t, 0.6, 1.2, 0.9, vol, destino);
    o.type = "triangle"; f.type = "lowpass"; f.frequency.value = 2200;
    o.frequency.setValueAtTime(hz(74), t); o.frequency.setValueAtTime(hz(73), t + 0.5); o.frequency.setValueAtTime(hz(74), t + 1.0); o.frequency.setValueAtTime(hz(73), t + 1.5);
    o.connect(f); f.connect(g); o.start(t); o.stop(t + 2.8);
  }

  // ---------- partitura: se programa un 16avo a la vez ----------
  function programar(p, t) {
    const compas = Math.floor(p / 16), s = p % 16, k = Math.floor(compas / 2) % 4;
    const ac0 = (noche ? ACORDES.noche : ACORDES.dia)[k];
    if (vivo("calma")) {
      const g = capas.calma;
      if (s === 0 && compas % 2 === 0) pad(ac0, t, 4.1, g, noche ? 700 : 950, 0.5);
      if (s === 0 && compas % 2 === 0) bajo(ac0[0] - 12, t, 3.6, g, 0.16, "sine", 300);
      if (s % 4 === 0 && Math.random() < (noche ? 0.12 : 0.2)) campana(ac0[1 + Math.floor(Math.random() * (ac0.length - 1))] + 12, t, g, 0.09);
    }
    if (vivo("alerta")) {
      const g = capas.alerta;
      if (s === 0 && compas % 2 === 0) pad(ac0, t, 4.1, g, 1400, 0.42);
      if (s % 2 === 0) bajo(ac0[0] - 12, t, PASO * 1.8, g, s % 8 === 0 ? 0.3 : 0.2, "sawtooth", 520);
      if (s === 0 || s === 3) golpe(t, g, 0.45, 90);                     // latido
      if (s % 4 === 2) platillo(t, g, 0.03, 0.05);
      if (s === 8 && compas % 4 === 3) campana(ac0[ac0.length - 1] + 1, t, g, 0.06);   // nota tensa, medio tono arriba
    }
    if (vivo("peligro")) {
      const g = capas.peligro, a = ACORDES.peligro[k];
      if (s === 0 && compas % 2 === 0) pad(a.map((n) => n - 12), t, 4.1, g, 600, 0.35);
      const patron = [0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0, 3, 0, 7, 12];
      bajo(a[0] - 12 + patron[s], t, PASO * 0.9, g, 0.24, "square", 700);
      const arp = [0, 1, 2, 3, 2, 1][p % 6];
      bajo(a[arp] + 12, t, PASO * 0.8, g, 0.07, "sawtooth", 2400 + 1200 * Math.sin(p / 10));
      platillo(t, g, s % 4 === 2 ? 0.07 : 0.025, s % 4 === 2 ? 0.12 : 0.04);
      if (s % 4 === 0) golpe(t, g, 0.7, 130);
      if (s === 0 && compas % 4 === 0) sirena(t, g, 0.06);
    }
  }
  function tick() {
    if (!ac) return;
    const sil = silenciadoAhora();
    if (sil !== silencioPrevio && activo && !apagando) { silencioPrevio = sil; rampa(master.gain, sil ? 0 : VOL, 0.3); }
    if (ac.state !== "running") { siguiente = ac.currentTime + 0.1; return; }
    if (siguiente < ac.currentTime) siguiente = ac.currentTime + 0.05;
    while (siguiente < ac.currentTime + 0.2) { programar(paso, siguiente); siguiente += PASO; paso++; }
  }

  window.MUSICA_BASE = {
    activar() {
      if (!crear()) return;
      despertar();
      clearTimeout(apagando); apagando = null;
      if (!activo) { activo = true; paso = 0; siguiente = ac.currentTime + 0.1; reloj = setInterval(tick, 25); }
      silencioPrevio = silenciadoAhora();
      rampa(master.gain, silencioPrevio ? 0 : VOL, 2);
      this.modo(modoActual, { noche });
    },
    detener() {
      if (!ac || !activo) return;
      rampa(master.gain, 0, 1.2);
      clearTimeout(apagando);
      apagando = setTimeout(() => { clearInterval(reloj); activo = false; apagando = null; }, 1500);
    },
    modo(m, op) {
      if (!CAPAS.includes(m)) m = "calma";
      if (op && typeof op.noche === "boolean") noche = op.noche;
      modoActual = m;
      if (!ac) return;
      for (const k of CAPAS) { objetivo[k] = k === m ? 1 : 0; rampa(capas[k].gain, objetivo[k], k === m ? (m === "peligro" ? 0.8 : 2.5) : 2.5); }
    },
    actual: () => modoActual,
  };
})();

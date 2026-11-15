/* =========================================================
   G-NOSIS  -  efectos de sonido
   Cada efecto tiene un nombre. Si su archivo está en ARCHIVOS, suena
   public/audio/sfx/<nombre>.mp3; si no, suena un efecto corto generado
   aquí (provisional) para saber dónde va. Para cambiar uno:
     1. pon el archivo en public/audio/sfx/<nombre>.mp3
     2. agrega <nombre> a ARCHIVOS
   La lista de efectos y dónde suena cada uno está en el README.
   Uso: SFX.play("acierto")   SFX.bucle("limpiar-panel", true/false)
   ========================================================= */
(() => {
  "use strict";
  // efectos que ya tienen archivo grabado por el equipo
  const ARCHIVOS = ["limpiar-panel", "cable-conectar", "tapar", "rayon", "rover-mover", "plantas", "sismo", "despegue", "aterrizaje", "interruptor"];
  // efectos que usan el archivo de otro (para no repetir el mismo mp3)
  const FUENTE = { interruptor: "cable-conectar" };
  // pedazos de cada archivo: [inicio, fin] en segundos (los mp3 traen silencios o varias tomas).
  // Cada vez que suena se usa la siguiente toma, para que no se oiga siempre igual.
  const TOMAS = {
    "cable-conectar": [[0.45, 1.3], [2.4, 4.1], [5.0, 6.7], [8.2, 9.2]],
    interruptor: [[0.4, 1.3], [8.0, 9.2]],
    tapar: [[0.4, 1.1], [2.9, 3.6], [5.4, 6.1], [8.1, 9.1], [10.6, 11.4], [13.1, 13.9], [19.1, 20.1], [21.6, 22.7]],
    rayon: [[0.4, 1.4]],
    "rover-mover": [[2, 2.7], [6, 6.7], [10, 10.7], [14, 14.7], [18, 18.7], [22, 22.7]],
    plantas: [[2.1, 3.3]],
    sismo: [[0.6, 7.0]],
    despegue: [[0, 4.8]],
    // 0: alunizaje de la intro (el golpe fuerte cae al tocar el suelo, ~9 s) · 1: solo el final, para naves que bajan en 3 s
    aterrizaje: [[0.2, 12.5], [6.6, 11.5]],
  };
  const turno = {};
  const VOL = 0.55;
  const VOLUMEN = { despegue: 0.7, aterrizaje: 0.6, sismo: 0.5, "rover-mover": 0.35 };   // los demás: VOL

  const listo = () => typeof musicaIniciada === "undefined" || musicaIniciada;   // el navegador pide un toque antes de sonar
  const mudo = () => typeof silenciado !== "undefined" && silenciado;

  // ---------- archivos ----------
  const audios = {};
  const archivo = (n) => `audio/sfx/${FUENTE[n] || n}.mp3`;
  for (const n of ARCHIVOS.filter((x) => !TOMAS[x])) { const a = new Audio(archivo(n)); a.preload = "auto"; a.volume = VOL; audios[n] = a; }

  // ---------- provisionales generados (Web Audio) ----------
  let ac = null;
  function crearAC() {
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); }
    return ac;
  }
  function ctx() {
    const c = crearAC();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    return c;
  }
  // los archivos con varias tomas se decodifican una vez y se toca solo el pedazo de cada toma
  const buffers = {}, sonando = {};
  for (const n of Object.keys(TOMAS)) {
    fetch(archivo(n)).then((r) => r.arrayBuffer())
      .then((b) => new Promise((ok, mal) => { const c = crearAC(); if (!c) return mal(); c.decodeAudioData(b, ok, mal); }))
      .then((buf) => { buffers[n] = buf; }).catch(() => {});
  }
  function tocarToma(nombre, cual) {
    const c = ctx(), buf = buffers[nombre], tomas = TOMAS[nombre];
    if (!c || !buf) return false;
    const k = cual != null ? cual % tomas.length : (turno[nombre] = ((turno[nombre] ?? -1) + 1) % tomas.length), [ini, fin] = tomas[k];
    const s = c.createBufferSource(), g = c.createGain(), dur = fin - ini, v = VOLUMEN[nombre] ?? VOL;
    s.buffer = buf; s.connect(g); g.connect(c.destination);
    const t = c.currentTime + 0.01;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0, dur - 0.25)); g.gain.linearRampToValueAtTime(0.0001, t + dur);   // sin cortes bruscos
    s.start(t, ini, dur);
    (sonando[nombre] = sonando[nombre] || new Set()).add(s); s.onended = () => sonando[nombre].delete(s);
    return true;
  }
  function tono(c, t, f0, f1, dur, tipo, vol) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function ruido(c, t, dur, corte, vol) {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = corte; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  const SINT = {
    acierto: (c, t) => { tono(c, t, 660, 660, 0.09, "triangle", 0.18); tono(c, t + 0.08, 990, 990, 0.14, "triangle", 0.18); },
    error: (c, t) => tono(c, t, 220, 150, 0.22, "square", 0.08),
    gano: (c, t) => [523, 659, 784, 1047].forEach((f, i) => tono(c, t + i * 0.09, f, f, 0.22, "triangle", 0.16)),
    perdio: (c, t) => [392, 330, 262].forEach((f, i) => tono(c, t + i * 0.14, f, f * 0.97, 0.3, "triangle", 0.14)),
    "cable-conectar": (c, t) => { ruido(c, t, 0.05, 3000, 0.4); tono(c, t, 880, 1320, 0.08, "square", 0.06); },
    rayon: (c, t) => ruido(c, t, 0.18, 5000, 0.5),
    atrapar: (c, t) => tono(c, t, 300, 600, 0.08, "triangle", 0.18),
    caer: (c, t) => { tono(c, t, 400, 90, 0.25, "sine", 0.18); ruido(c, t + 0.2, 0.1, 400, 0.4); },
    paso: (c, t) => ruido(c, t, 0.04, 1200, 0.25),
    tapar: (c, t) => { tono(c, t, 180, 120, 0.1, "sine", 0.25); ruido(c, t, 0.06, 2000, 0.3); },
    "fuga-aire": (c, t) => ruido(c, t, 0.45, 6000, 0.35),
    perilla: (c, t) => tono(c, t, 1400, 1400, 0.025, "square", 0.05),
    encontrar: (c, t) => tono(c, t, 880, 1760, 0.12, "sine", 0.16),
    "rover-mover": (c, t) => tono(c, t, 110, 140, 0.12, "sawtooth", 0.05),
    radar: (c, t) => { tono(c, t, 1200, 1200, 0.06, "sine", 0.14); tono(c, t + 0.18, 1200, 1200, 0.06, "sine", 0.07); },
    interruptor: (c, t) => { ruido(c, t, 0.03, 2500, 0.5); tono(c, t, 700, 500, 0.04, "square", 0.05); },
    llamada: (c, t) => [0, 0.25].forEach((d) => tono(c, t + d, 1046, 1046, 0.18, "sine", 0.14)),
    "carta-nueva": (c, t) => [784, 1175, 1568].forEach((f, i) => tono(c, t + i * 0.07, f, f, 0.18, "sine", 0.12)),
    "limpiar-panel": (c, t) => ruido(c, t, 0.25, 3500, 0.3),
  };

  const bucles = {};
  window.SFX = {
    nombres: Object.keys(SINT),
    tieneArchivo: (n) => ARCHIVOS.includes(n),
    // play("aterrizaje", 1) toca una toma en particular; sin número, la siguiente
    play(nombre, cual) {
      if (!listo() || mudo()) return;
      if (TOMAS[nombre]) { if (tocarToma(nombre, cual)) return; }   // una sola toma del archivo
      const a = TOMAS[nombre] ? null : audios[nombre];
      if (a) {
        const c = a.paused ? a : a.cloneNode(); c.volume = VOL; c.currentTime = 0;
        const p = c.play(); if (p) p.catch(() => {});
        return;
      }
      const f = SINT[nombre], c = f && ctx();
      if (c) f(c, c.currentTime + 0.01);
    },
    // sonido continuo mientras dura una acción (por ejemplo, arrastrar para limpiar)
    bucle(nombre, on) {
      const a = audios[nombre];
      if (!a) { if (on && !bucles[nombre]) { this.play(nombre); bucles[nombre] = setInterval(() => this.play(nombre), 260); } else if (!on) { clearInterval(bucles[nombre]); bucles[nombre] = null; } return; }
      if (on && listo() && !mudo()) { a.loop = true; a.volume = VOL; if (a.paused) { const p = a.play(); if (p) p.catch(() => {}); } }
      else if (!on && !a.paused) a.pause();
    },
    // corta un sonido largo (p. ej. el alunizaje si se salta la secuencia)
    parar(nombre) { for (const s of sonando[nombre] || []) { try { s.stop(); } catch (e) { /* ya terminó */ } } },
    pararTodo() { for (const n of Object.keys(bucles)) this.bucle(n, false); for (const a of Object.values(audios)) if (a.loop && !a.paused) a.pause(); },
  };
})();

/* =========================================================
   G-NOSIS  -  luna ASCII (port de luna_ascii.py)
   Calcula, para cada celda de la rejilla, el caracter y su color,
   y luego "estampa" los glifos pixel por pixel en un ImageData.
   ========================================================= */

const W = 1280, H = 720;              // lienzo interno (se muestra a 2560x1440)
const CW = 7, CH = 13;                // tamano de cada celda de caracter
const COLS = Math.ceil(W / CW), ROWS = Math.ceil(H / CH);
const SCENE_W = COLS * CW, SCENE_H = ROWS * CH;
const OFF_X = Math.floor((W - SCENE_W) / 2), OFF_Y = Math.floor((H - SCENE_H) / 2);
const NCELLS = COLS * ROWS;
const RAMP = " .,:;-=+*ox%#@";
const MOON_SCALE = 0.34;
const FONT_FAMILY = "'JetBrains Mono', Consolas, 'DejaVu Sans Mono', Menlo, monospace";

// ---------- utilidades ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
function vec(lat, lon) {
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const acosC = x => Math.acos(clamp(x, -1, 1));

// coordenadas en pixeles del centro de cada celda (centradas, Y hacia arriba)
const CELL_PX = new Float32Array(NCELLS), CELL_PY = new Float32Array(NCELLS);
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++) {
    CELL_PX[r * COLS + c] = (c + 0.5) * CW - SCENE_W / 2;
    CELL_PY[r * COLS + c] = -((r + 0.5) * CH - SCENE_H / 2);
  }

// ---------- atlas de glifos ----------
let ATLAS = null;   // array de Uint8Array(CW*CH), uno por caracter
function buildAtlas() {
  const cv = document.createElement("canvas");
  cv.width = CW; cv.height = CH;
  const g = cv.getContext("2d", { willReadFrequently: true });
  ATLAS = [];
  for (const ch of RAMP) {
    g.clearRect(0, 0, CW, CH);
    g.fillStyle = "#fff";
    g.font = `12px ${FONT_FAMILY}`;
    g.textBaseline = "top";
    g.fillText(ch, 0, 1);
    const d = g.getImageData(0, 0, CW, CH).data;
    const m = new Uint8Array(CW * CH);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3];
    ATLAS.push(m);
  }
}

// ---------- superficie lunar ----------
const MARIA = [[33, -16, 17, .55], [28, 17, 10, .5], [8, 31, 12, .5], [17, 59, 7, .55],
  [-8, 51, 9, .45], [-15, 35, 6, .4], [-21, -17, 10, .4], [18, -57, 24, .5],
  [-24, -39, 6, .45], [56, 1, 9, .35], [-1, -25, 10, .35], [40, -45, 12, .4]]
  .map(([la, lo, r, k]) => ({ v: vec(la, lo), r: r * 1.25 * Math.PI / 180, k }));
const TYCHO = vec(-43, -11);
const rngMoon = mulberry32(7);
const CRATERS = [];
for (let i = 0; i < 70; i++) {
  const lat = Math.asin(rngMoon() * 2 - 1) * 180 / Math.PI;
  const lon = rngMoon() * 360 - 180;
  CRATERS.push({ v: vec(lat, lon), r: (2.5 + rngMoon() * 6.5) * Math.PI / 180 });
}
// base tangente de Tycho para los rayos
const T_E1 = (() => { const c = [TYCHO[2], 0, -TYCHO[0]]; const n = Math.hypot(...c); return c.map(x => x / n); })();
const T_E2 = [TYCHO[1] * T_E1[2] - TYCHO[2] * T_E1[1], TYCHO[2] * T_E1[0] - TYCHO[0] * T_E1[2],
  TYCHO[0] * T_E1[1] - TYCHO[1] * T_E1[0]];

function albedo(p) {
  let a = 0.92;
  for (const m of MARIA) a -= m.k * 0.9 * smooth(1 - acosC(dot(p, m.v)) / m.r);
  for (const c of CRATERS) {
    const d = acosC(dot(p, c.v)) / c.r;
    a -= 0.22 * smooth(1 - d);
    a += 0.18 * Math.exp(-(((d - 1) / 0.2) ** 2));
  }
  const dt = acosC(dot(p, TYCHO));
  const bearing = Math.atan2(dot(p, T_E2), dot(p, T_E1));
  const rays = Math.max(0, Math.cos(bearing * 9 + Math.sin(bearing * 4) * 2)) ** 14;
  a += 0.35 * rays * Math.exp(-dt * 2.2) + 0.4 * smooth(1 - dt / 0.05);
  a += 0.05 * Math.sin(p[0] * 41) * Math.sin(p[1] * 37) * Math.sin(p[2] * 29);
  return clamp(a, 0, 1.2);
}

const albCache = new Map();
function albedoMap(R) {
  const key = Math.round(R * 10);
  let m = albCache.get(key);
  if (m) return m;
  if (albCache.size > 64) albCache.clear();
  m = new Float32Array(NCELLS);
  for (let i = 0; i < NCELLS; i++) {
    const X = CELL_PX[i] / R, Y = CELL_PY[i] / R, r2 = X * X + Y * Y;
    if (r2 < 1) m[i] = albedo([X, Y, Math.sqrt(1 - r2)]);
  }
  albCache.set(key, m);
  return m;
}

const moonRadius = () => Math.min(SCENE_W, SCENE_H) * MOON_SCALE;

// ---------- estrellas ----------
const rngStars = mulberry32(3);
const N_STARS = Math.floor(160 * NCELLS / (92 * 58));
const STARS = Array.from({ length: N_STARS }, () => ({
  i: Math.floor(rngStars() * ROWS) * COLS + Math.floor(rngStars() * COLS),
  ph: rngStars() * Math.PI * 2, sp: 1.5 + rngStars() * 3.5, b: 0.15 + rngStars() * 0.55,
}));

// ---------- cuadro ----------
const B = new Float32Array(NCELLS);
const IDX = new Uint8Array(NCELLS);
const CR = new Uint8Array(NCELLS), CG = new Uint8Array(NCELLS), CB = new Uint8Array(NCELLS);
const L_DIR = (() => { const v = [0, 0.12, 1]; const n = Math.hypot(...v); return v.map(x => x / n); })();

function computeCells(t) {
  const zoom = 0.25 + 0.75 * smooth(t / 1.6);
  const R = moonRadius() * zoom;
  const alb = albedoMap(R);
  const glow = smooth(t / 2.2);
  const pulse = 1 + 0.06 * Math.sin(2 * Math.PI * t / 3);
  const flash = 0.5 * Math.exp(-(((t - 0.15) / 0.12) ** 2));

  fondo(t);   // llena BG_B / BG_R / BG_G / BG_BL (espacio.js)

  const starB = new Float32Array(NCELLS);
  for (const s of STARS) {
    const v = s.b * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)) ** 3;
    if (v > starB[s.i]) starB[s.i] = v;
  }

  for (let i = 0; i < NCELLS; i++) {
    const X = CELL_PX[i] / R, Y = CELL_PY[i] / R, r2 = X * X + Y * Y;
    const inside = r2 < 1;
    let b, r, g, bl, useBg = false;
    if (inside) {
      const Z = Math.sqrt(1 - r2);
      const lam = Math.max(0, X * L_DIR[0] + Y * L_DIR[1] + Z * L_DIR[2]);
      b = alb[i] * (0.55 + 0.45 * lam) * (0.75 + 0.25 * Z) * glow * pulse;
      b = clamp(b + flash, 0, 1);
    } else {
      b = r2 < 4 ? 0.11 * glow * pulse * Math.exp(-(Math.sqrt(r2) - 1) * 12) : 0;
      if (starB[i] > b) b = starB[i];
      if (BG_B[i] > b) { b = BG_B[i]; useBg = true; }
    }
    if (b < 0.04) b = 0;
    B[i] = b;
    IDX[i] = Math.min(RAMP.length - 1, Math.floor(Math.pow(b, 0.8) * (RAMP.length - 1) + 0.5));

    // color: azul profundo -> plata -> blanco calido (luna); azulado (halo); capa del fondo
    if (inside) {
      if (b < 0.5) { const k = b / 0.5; r = 40 + 130 * k; g = 60 + 125 * k; bl = 110 + 95 * k; }
      else { const k = (b - 0.5) / 0.5; r = 170 + 85 * k; g = 185 + 61 * k; bl = 205 + 20 * k; }
    } else if (useBg) { r = BG_R[i]; g = BG_G[i]; bl = BG_BL[i]; }
    else { const k = Math.min(1, 0.6 + b); r = 150 * k; g = 170 * k; bl = 210 * k; }
    const fac = useBg ? 0.6 + 0.4 * Math.min(1, b * 2) : 0.35 + 0.65 * Math.min(1, b * 2);
    CR[i] = clamp(r * fac, 0, 255); CG[i] = clamp(g * fac, 0, 255); CB[i] = clamp(bl * fac, 0, 255);
  }
}

// estampa los glifos en un ImageData de SCENE_W x SCENE_H
let sceneImg = null, scene32 = null;
function renderScene(ctx, t) {
  computeCells(t);
  stampCells(ctx);
}

// dibuja IDX / CR / CG / CB (llenados por quien sea) como caracteres en el lienzo
function stampCells(ctx) {
  if (!sceneImg) {
    sceneImg = ctx.createImageData(SCENE_W, SCENE_H);
    scene32 = new Uint32Array(sceneImg.data.buffer);
  }
  scene32.fill(0xFF000000);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col, id = IDX[i];
      if (id === 0) continue;
      const m = ATLAS[id], r = CR[i], g = CG[i], b = CB[i];
      let base = row * CH * SCENE_W + col * CW;
      for (let y = 0, k = 0; y < CH; y++, base += SCENE_W) {
        for (let x = 0; x < CW; x++, k++) {
          const a = m[k];
          if (a) scene32[base + x] = 0xFF000000 | ((b * a >> 8) << 16) | ((g * a >> 8) << 8) | (r * a >> 8);
        }
      }
    }
  }
  ctx.putImageData(sceneImg, OFF_X, OFF_Y);
}

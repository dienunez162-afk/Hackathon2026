/* =========================================================
   ARES-14  -  fondo espacial ASCII (port de espacio.py)
   Nebulosas, galaxias, planeta con anillos, estrellas de colores,
   asteroides y estrellas fugaces. Todo queda detras de la luna.
   fondo(t) llena BG_B (brillo) y BG_R/BG_G/BG_BL (color) por celda.
   ========================================================= */

const BG_B = new Float32Array(NCELLS);
const BG_R = new Float32Array(NCELLS), BG_G = new Float32Array(NCELLS), BG_BL = new Float32Array(NCELLS);
const HALF_W = 640, HALF_H = 360;
const rngSpace = mulberry32(14);
const rnd = (a, b) => a + rngSpace() * (b - a);

function put(i, b, r, g, bl) {          // capa nueva encima donde es mas brillante
  if (b > BG_B[i]) { BG_B[i] = b; BG_R[i] = r; BG_G[i] = g; BG_BL[i] = bl; }
}

// recorre solo las celdas dentro del rectangulo (x0 +- ex, y0 +- ey)
function forBox(x0, y0, ex, ey, fn) {
  const c0 = Math.max(0, Math.floor((x0 - ex + SCENE_W / 2) / CW));
  const c1 = Math.min(COLS - 1, Math.ceil((x0 + ex + SCENE_W / 2) / CW));
  const r0 = Math.max(0, Math.floor((SCENE_H / 2 - (y0 + ey)) / CH));
  const r1 = Math.min(ROWS - 1, Math.ceil((SCENE_H / 2 - (y0 - ey)) / CH));
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const i = r * COLS + c;
      fn(i, CELL_PX[i], CELL_PY[i]);
    }
}

// ---------- nebulosas ----------
const NEB_COL = [[80, 60, 220], [210, 60, 200], [40, 190, 210], [255, 90, 140], [120, 80, 255]];
function nebulosa(t) {
  for (let i = 0; i < NCELLS; i++) {
    const x = CELL_PX[i] / 190 + t * 0.012, y = CELL_PY[i] / 190;
    const n = Math.sin(x * 1.5 + Math.sin(y * 1.2)) * Math.cos(y * 1.05 - x * 0.55)
      + 0.55 * Math.sin(x * 2.9 - y * 2.1 + t * 0.05)
      + 0.3 * Math.sin(x * 5.3 + y * 4.1 - t * 0.08);
    const b = 0.16 * clamp(n - 0.55, 0, 1.2);
    if (b <= 0) { BG_B[i] = 0; continue; }
    const h = (Math.sin(x * 0.55 + 1.3) + Math.cos(y * 0.7 - 0.4) + 2) / 4 * (NEB_COL.length - 1);
    const i0 = Math.floor(h), f = h - i0, a = NEB_COL[i0], c = NEB_COL[Math.min(i0 + 1, NEB_COL.length - 1)];
    BG_B[i] = b;
    BG_R[i] = a[0] * (1 - f) + c[0] * f; BG_G[i] = a[1] * (1 - f) + c[1] * f; BG_BL[i] = a[2] * (1 - f) + c[2] * f;
  }
}

// ---------- galaxias ----------
// x, y, radio, inclinacion, angulo, giro, color brazos, color nucleo, brillo
const GALAXIAS = [
  [-470, 175, 130, .42, .45, .05, [190, 110, 255], [255, 220, 170], .78],
  [470, -170, 110, .5, -.6, -.04, [255, 140, 90], [255, 240, 200], .72],
  [420, 250, 42, .7, 1.2, .08, [90, 200, 255], [220, 245, 255], .6],
  [-330, -280, 36, .6, -.3, -.07, [255, 110, 180], [255, 220, 235], .55],
];
function galaxias(t) {
  for (const [x0, y0, rad, inc, ang, w, cb, cn, amp] of GALAXIAS) {
    const ca = Math.cos(ang), sa = Math.sin(ang), ext = rad * 1.3;
    forBox(x0, y0, ext, ext, (i, px, py) => {
      const dx = px - x0, dy = py - y0;
      const u = (dx * ca + dy * sa) / rad, v = (-dx * sa + dy * ca) / (rad * inc);
      const r = Math.sqrt(u * u + v * v) + 1e-6;
      if (r >= 1.3) return;
      const th = Math.atan2(v, u);
      const brazos = Math.cos(2 * (th - 2.6 * Math.log(r) - w * t));
      const disco = Math.exp(-r * 1.5) * (0.2 + 0.8 * Math.max(0, brazos) ** 2);
      const nucleo = Math.exp(-((r / 0.13) ** 2));
      const k = clamp(nucleo * 2, 0, 1);
      put(i, amp * (disco + 0.9 * nucleo),
        cb[0] * (1 - k) + cn[0] * k, cb[1] * (1 - k) + cn[1] * k, cb[2] * (1 - k) + cn[2] * k);
    });
  }
}

// ---------- planeta con anillos ----------
const PLANETA = [-520, -215, 46];
const BANDAS = [[230, 150, 90], [250, 200, 140], [200, 110, 80], [240, 180, 120]];
function planeta(t) {
  const [x0, y0, rp] = PLANETA, ca = Math.cos(0.35), sa = Math.sin(0.35);
  forBox(x0, y0, rp * 2.2, rp * 1.2, (i, px, py) => {
    const dx = (px - x0) / rp, dy = (py - y0) / rp;
    const u = dx * ca + dy * sa, v = (-dx * sa + dy * ca) / 0.28;
    const rr = Math.sqrt(u * u + v * v), r2 = dx * dx + dy * dy;
    const disco = r2 < 1, anillo = rr > 1.35 && rr < 2.1, delante = v < 0;
    if (anillo && (!disco || delante)) {
      put(i, Math.max(0.38 * (1 - Math.abs(rr - 1.72) / 0.4), 0.12), 200, 190, 230);
    } else if (disco) {
      const z = Math.sqrt(1 - r2);
      const luz = clamp(0.25 + 0.75 * (-0.55 * dx + 0.45 * dy + 0.7 * z), 0, 1);
      const bi = ((Math.floor(dy * 3.2 + 0.2 * Math.sin(dx * 3 + t * 0.3)) % 4) + 4) % 4;
      const c = BANDAS[bi];
      put(i, 0.2 + 0.55 * luz, c[0], c[1], c[2]);
    }
  });
}

// ---------- estrellas de colores ----------
const CE_PAL = [[255, 200, 120], [140, 200, 255], [255, 130, 160], [180, 255, 220], [255, 240, 170]];
const CE = Array.from({ length: 90 }, () => {
  const x = rnd(-HALF_W, HALF_W), y = rnd(-HALF_H, HALF_H);
  return {
    i: Math.min(ROWS - 1, Math.floor((HALF_H - y) / CH)) * COLS + Math.min(COLS - 1, Math.floor((x + HALF_W) / CW)),
    c: CE_PAL[Math.floor(rngSpace() * 5)], ph: rnd(0, 6.28), sp: rnd(1, 3.5),
  };
});
function estrellasColor(t) {
  for (const s of CE) put(s.i, 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)), ...s.c);
}

// ---------- asteroides ----------
const AST_COLS = [[185, 140, 105], [150, 140, 135], [190, 120, 90], [160, 150, 120]];
const AST = Array.from({ length: 10 }, (_, k) => ({
  y: rnd(-HALF_H, HALF_H), x0: rnd(-750, 750), v: rnd(10, 26) * (rngSpace() < 0.5 ? -1 : 1),
  vy: rnd(-4, 4), r: rnd(8, 19), rot: rnd(-0.8, 0.8), s: [rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28)],
  c: AST_COLS[k % AST_COLS.length],
}));
function asteroides(t) {
  const span = 1600;
  for (const a of AST) {
    const x = ((((a.x0 + a.v * t + span / 2) % span) + span) % span) - span / 2;
    const y = a.y + a.vy * t;
    if (Math.abs(x) > HALF_W + 40) continue;
    forBox(x, y, a.r * 1.6, a.r * 1.6, (i, px, py) => {
      const dx = px - x, dy = py - y, r = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx) + a.rot * t;
      const borde = a.r * (1 + 0.25 * Math.sin(2 * th + a.s[0]) + 0.15 * Math.sin(3 * th + a.s[1])
        + 0.1 * Math.sin(5 * th + a.s[2]));
      if (r >= borde) return;
      const luz = 0.55 + 0.45 * clamp((dx * -0.6 + dy * 0.5) / (borde + 1e-6), -1, 1);
      put(i, 0.5 * luz, ...a.c);
    });
  }
}

// ---------- estrellas fugaces ----------
const PERIODO = 4.0;
const FUGAZ_COL = [[220, 235, 255], [150, 255, 230], [255, 200, 150]];
function fugaces(t) {
  const k = Math.floor(t / PERIODO), f = (t - k * PERIODO) / 1.1;
  if (k < 0 || f > 1) return;
  const r = mulberry32(1000 + k);
  const x0 = -560 + r() * 1120, y0 = 100 + r() * 250;
  const ang = r() < 0.5 ? -2.7 + r() * 0.5 : -0.95 + r() * 0.5;
  const vx = Math.cos(ang) * 520, vy = Math.sin(ang) * 520;
  const hx = x0 + vx * f * 1.1, hy = y0 + vy * f * 1.1;
  const fade = Math.sin(Math.PI * f), col = FUGAZ_COL[k % 3];
  const cx = hx - Math.cos(ang) * 75, cy = hy - Math.sin(ang) * 75;
  forBox(cx, cy, 85, 85, (i, px, py) => {
    const dx = px - hx, dy = py - hy;
    const a = -(dx * vx + dy * vy) / 520, perp = Math.abs(dx * vy - dy * vx) / 520;
    if (a > 0 && a < 150 && perp < 5) put(i, 0.8 * (1 - a / 150) * fade, ...col);
  });
}

function fondo(t) {
  nebulosa(t);
  galaxias(t);
  planeta(t);
  estrellasColor(t);
  asteroides(t);
  fugaces(t);
}

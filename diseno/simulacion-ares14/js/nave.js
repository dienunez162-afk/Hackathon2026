/* =========================================================
   ARES-14  -  nave en pixel art y secuencia de aterrizaje
   (port de nave.py): entra en orbita, rodea la luna pasando
   por detras y aluniza en el borde superior derecho.
   ========================================================= */

const NAVE = [
  "......K......",
  ".....KWK.....",
  ".....KWK.....",
  "....KWWWK....",
  "....KWLWK....",
  "...KWWWWWK...",
  "...KWbBBWK...",
  "...KWBbBWK...",
  "...KWBBBWK...",
  "...KGWWWGK...",
  "..KGWWWWWGK..",
  "..KGWRRRWGK..",
  ".KRKGWWWGKRK.",
  "KRRKGGWGGKRRK",
  "KRRKDGGGDKRRK",
  "KRK.KDDDK.KRK",
  "KK...KDK...KK",
  ".....KKK.....",
];
const PALETA = {
  K: [18, 20, 30], W: [232, 236, 248], G: [165, 174, 195], D: [88, 95, 118],
  B: [60, 150, 255], b: [190, 235, 255], R: [225, 60, 75],
};
const LUZ_ON = [255, 90, 90], LUZ_OFF = [120, 30, 40];
const PIX = 4;            // cada pixel del arte mide 4x4 en el lienzo
const CENTRO = 9;         // fila que hace de centro de giro
const FLAMA_MAX = 6;

const T_ORBITA = 6.0, T_TRANSF = 7.6, T_TOQUE = 9.6, T_FIN = 12.0;
const ANG_ATERRIZAJE = 35 * Math.PI / 180;
const VUELTAS = 1.15;

const lerpAng = (a, b, k) => a + ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * k;
function hermite(p0, v0, p1, v1, u) {
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return [h00 * p0[0] + h10 * v0[0] + h01 * p1[0] + h11 * v1[0],
    h00 * p0[1] + h10 * v0[1] + h01 * p1[1] + h11 * v1[1]];
}

// sprite (1 px = 1 pixel del arte) con flama segun el empuje
const SPR_W = NAVE[0].length, SPR_H = 2 * (NAVE.length - CENTRO + FLAMA_MAX);
const sprCanvas = document.createElement("canvas");
sprCanvas.width = SPR_W; sprCanvas.height = SPR_H;
const sprCtx = sprCanvas.getContext("2d");
function spriteNave(luz, empuje) {
  const img = sprCtx.createImageData(SPR_W, SPR_H), d = img.data;
  const set = (x, y, c) => { const k = (y * SPR_W + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; };
  const top = SPR_H / 2 - CENTRO;
  NAVE.forEach((fila, y) => [...fila].forEach((ch, x) => {
    if (ch === "L") set(x, top + y, luz ? LUZ_ON : LUZ_OFF);
    else if (ch !== ".") set(x, top + y, PALETA[ch]);
  }));
  if (empuje > 0) {
    const largo = Math.max(1, Math.floor(FLAMA_MAX * empuje * (0.6 + Math.random() * 0.4)));
    const y0 = top + NAVE.length, cx = SPR_W >> 1;
    for (let j = 0; j < largo && y0 + j < SPR_H; j++) {
      if (j < largo / 2) {
        set(cx - 1, y0 + j, [255, 140, 50]); set(cx + 1, y0 + j, [255, 140, 50]);
        set(cx, y0 + j, [255, 235, 140]);
      } else set(cx, y0 + j, Math.random() < 0.5 ? [255, 170, 60] : [255, 90, 50]);
    }
  }
  sprCtx.putImageData(img, 0, 0);
  return sprCanvas;
}

class Aterrizaje {
  constructor(R) {
    this.R = R;
    this.cx = W / 2; this.cy = H / 2;
    this.trail = []; this.dust = []; this.dustDone = false;
    this.n = [Math.sin(ANG_ATERRIZAJE), -Math.cos(ANG_ATERRIZAJE)];
    this.touch = [this.cx + this.n[0] * R, this.cy + this.n[1] * R];
    this.half = (NAVE.length - CENTRO) * PIX;
    this.hover = [this.touch[0] + this.n[0] * R * 0.55, this.touch[1] + this.n[1] * R * 0.55];
    this.landed = [this.touch[0] + this.n[0] * (this.half - 4), this.touch[1] + this.n[1] * (this.half - 4)];
  }

  orbit(s) {
    const ro = 2.6 - 1.2 * smooth(s / 2.2);
    const phi = Math.PI - 2 * Math.PI * VUELTAS * s / T_ORBITA;
    const x = ro * Math.cos(phi), y = ro * Math.sin(phi) * 0.30, z = ro * Math.sin(phi) * 0.95;
    return { x: this.cx + x * this.R, y: this.cy - y * this.R, z, sc: 1 + 0.25 * z / ro, ro };
  }

  // x, y, z, escala, angulo, empuje, altitud(km)
  state(s) {
    const dt = 1 / 60;
    if (s <= T_ORBITA) {
      const o = this.orbit(s), o2 = this.orbit(s + dt);
      return { ...o, ang: Math.atan2(-(o2.x - o.x), -(o2.y - o.y)), emp: 0.35, alt: (o.ro - 1) * 1737 };
    }
    const nAng = Math.atan2(-this.n[0], -this.n[1]);
    let x, y, ang, emp;
    if (s <= T_TRANSF) {
      const o0 = this.orbit(T_ORBITA), o1 = this.orbit(T_ORBITA + dt);
      const v0 = [(o1.x - o0.x) / dt * 1.6, (o1.y - o0.y) / dt * 1.6];
      const v1 = [-this.n[0] * 60, -this.n[1] * 60];
      const u = (s - T_ORBITA) / (T_TRANSF - T_ORBITA);
      [x, y] = hermite([o0.x, o0.y], v0, this.hover, v1, u);
      const [xa, ya] = hermite([o0.x, o0.y], v0, this.hover, v1, Math.min(1, u + 0.02));
      ang = lerpAng(Math.atan2(-(xa - x), -(ya - y)), nAng, smooth(u * 1.3));
      emp = 0.6;
    } else if (s <= T_TOQUE) {
      const u = (s - T_TRANSF) / (T_TOQUE - T_TRANSF), k = 1 - (1 - u) ** 2.2;
      x = this.hover[0] + (this.landed[0] - this.hover[0]) * k;
      y = this.hover[1] + (this.landed[1] - this.hover[1]) * k;
      ang = nAng; emp = 1;
    } else { [x, y] = this.landed; ang = nAng; emp = 0; }
    const alt = Math.max(0, (Math.hypot(x - this.cx, y - this.cy) - this.R - (this.half - 4)) / this.R * 1737);
    return { x, y, z: 1, sc: 1, ang, emp, alt };
  }

  hidden(x, y, z) { return z < 0 && Math.hypot(x - this.cx, y - this.cy) < this.R; }

  draw(ctx, s, dt) {
    const st = this.state(s), hid = this.hidden(st.x, st.y, st.z);
    const f = dt * 30;   // el polvo se mueve igual a cualquier fps

    // estela de pixeles
    if (s < T_TRANSF) { this.trail.push([st.x, st.y, hid]); if (this.trail.length > 50) this.trail.shift(); }
    else this.trail.shift();
    this.trail.forEach(([tx, ty, th], i) => {
      if (th) return;
      const k = i / Math.max(1, this.trail.length);
      ctx.fillStyle = `rgb(${60 + 140 * k | 0},${110 + 100 * k | 0},${180 + 60 * k | 0})`;
      ctx.fillRect((tx | 0) - 1, (ty | 0) - 1, 2, 2);
    });

    // nave (sin suavizado: pixel art)
    if (!hid) {
      const spr = spriteNave(Math.floor(s * 3) % 2 === 0, st.emp);
      const esc = Math.max(1, Math.round(PIX * st.sc));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(st.x), Math.round(st.y));
      ctx.rotate(-st.ang);
      ctx.drawImage(spr, -SPR_W * esc / 2, -SPR_H * esc / 2, SPR_W * esc, SPR_H * esc);
      ctx.restore();
    }

    // polvo al tocar la superficie
    if (s >= T_TOQUE - 0.15 && !this.dustDone) {
      this.dustDone = true;
      const tx = -this.n[1], ty = this.n[0];
      for (let k = 0; k < 34; k++) {
        const side = Math.random() < 0.5 ? -1 : 1, sp = 15 + Math.random() * 65, up = 5 + Math.random() * 30;
        this.dust.push({ x: this.touch[0], y: this.touch[1],
          vx: side * tx * sp + this.n[0] * up, vy: side * ty * sp + this.n[1] * up,
          life: 0.8 + Math.random(), size: Math.random() < 0.5 ? 2 : 3 });
      }
    }
    for (const d of this.dust) {
      d.x += d.vx / 30 * f; d.y += d.vy / 30 * f;
      d.vx *= 0.94 ** f; d.vy *= 0.94 ** f; d.life -= dt;
      if (d.life > 0) {
        const c = 90 + 120 * Math.min(1, d.life) | 0;
        ctx.fillStyle = `rgb(${c},${c - 10},${c - 25})`;
        ctx.fillRect(d.x | 0, d.y | 0, d.size, d.size);
      }
    }

    // HUD de mision
    const fase = s < 2.2 ? "ENTRADA EN ORBITA" : s < T_ORBITA ? "ORBITA LUNAR"
      : s < T_TRANSF ? "MANIOBRA DE DESCENSO" : s < T_TOQUE ? "DESCENSO FINAL" : "EN SUPERFICIE";
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.textBaseline = "top"; ctx.textAlign = "left";
    ctx.fillStyle = "rgb(120,128,145)";
    ctx.fillText(`ARES-14 // ${fase}`, 16, H - 54);
    ctx.fillText(`ALT  ${st.alt.toFixed(1).padStart(7)} km`, 16, H - 38);
    ctx.fillStyle = "rgb(70,76,92)";
    ctx.textAlign = "right";
    ctx.fillText("ENTER / TOCA = saltar", W - 16, H - 26);

    if (s > T_TOQUE + 0.4) {
      const msg = "ALUNIZAJE COMPLETADO";
      const n = Math.floor((s - T_TOQUE - 0.4) * 18);
      ctx.font = `bold 24px ${FONT_FAMILY}`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgb(255,246,225)";
      ctx.fillText(msg.slice(0, n), W / 2 - ctx.measureText(msg).width / 2, 60);
    }
  }

  done(s) { return s >= T_FIN; }
}

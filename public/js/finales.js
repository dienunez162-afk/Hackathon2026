/* =========================================================
   G-NOSIS  -  cinematicas de los 7 finales
   Misma tecnica que la luna del menu: la escena (suelo lunar,
   montanas, base, la Tierra, estrellas y efectos) se calcula
   celda por celda y se dibuja con caracteres ASCII de color.
   Encima van los sprites en pixel art (nave y astronautas),
   las barras de estado y la tarjeta final.

   Uso:  iniciarFinal("perfecta" | "verde" | "relevo" |
                      "apagon" | "despensa" | "radiacion" | "agotado")
   ========================================================= */

const FINALES = {
  perfecta: {
    titulo: "Misión perfecta", estrellas: 3, gana: true,
    texto: "¡Base impecable y todas las tareas de la Tierra cumplidas! Eres un capitán de verdad.",
    cond: "Si las 4 barras en verde y 3 o más tareas de Control de Misión",
    aprende: ["Capitán completo", "Cuidaste las 4 barras a la vez y cumpliste lo que pidió la Tierra."],
  },
  verde: {
    titulo: "Base en verde", estrellas: 2, gana: true,
    texto: "Entregaste la base con todas las barras en verde. ¡Excelente trabajo!",
    cond: "Si las 4 barras en verde",
    aprende: ["Todo en equilibrio", "Energía, comida, salud y radiación se cuidan al mismo tiempo."],
  },
  relevo: {
    titulo: "Relevo a salvo", estrellas: 1, gana: true,
    texto: "Resististe hasta que llegó el relevo. La próxima vez intenta dejar todo en verde.",
    cond: "Si llegaste al día 14 sin evacuación",
    aprende: ["Planear ayuda", "Usar tus cartas antes de que una barra llegue a rojo deja la base en verde."],
  },
  // en los finales malos, "Lo que aprendiste" es la carta del concepto (retos-mision-lunar.json)
  apagon: {
    titulo: "Apagón: evacuación", estrellas: 0, gana: false,
    texto: "La base se quedó sin energía y una nave de rescate te llevó a casa. Aprendiste que sin Sol hay que ahorrar.",
    cond: "Si la energía llega a 0", tema: "noche_lunar",
  },
  despensa: {
    titulo: "Despensa vacía: evacuación", estrellas: 0, gana: false,
    texto: "Se acabó la comida y una nave de rescate te llevó a casa. En la Luna hay que cultivar y reciclar.",
    cond: "Si la comida llega a 0", tema: "invernadero",
  },
  radiacion: {
    titulo: "Demasiada radiación: evacuación", estrellas: 0, gana: false,
    texto: "Recibiste demasiada radiación y los doctores pidieron que volvieras. El refugio es tu mejor amigo.",
    cond: "Si la radiación llega a 100", tema: "radiacion",
  },
  agotado: {
    titulo: "Capitán agotado: evacuación", estrellas: 0, gana: false,
    texto: "Trabajaste tanto que te agotaste y te llevaron a casa a descansar. Descansar también es parte de la misión.",
    cond: "Si la salud llega a 0", tema: "salud_astronauta",
  },
};
// [nombre, frase] de lo que aprendiste: la carta del tema si los datos del juego están cargados
function aprendizaje(tipo) {
  const f = FINALES[tipo], R = typeof window !== "undefined" && window.RETOS;
  const c = f.tema && R && R.temas && R.temas[f.tema] && R.temas[f.tema].carta;
  if (c) return [c.nombre, c.frase];
  return f.aprende || null;
}

// ---------------- tomas dentro de la base (antes del exterior) ----------------
// Usan las escenas del juego (escenas.js) para que el final conecte con lo que el niño vio:
//   despensa  -> invernadero apagándose      radiacion -> compuerta del refugio abierta
//   agotado   -> el capitán en la sala de control y luego dormido en la litera
const CORTE = { despensa: 3.0, radiacion: 2.6, agotado: 4.2 };
const LITERA = { x: -555, y: -270 };   // la litera de la sala de control (escenas.js)
function insercion(tipo, t) {
  if (!(tipo in CORTE) || t >= CORTE[tipo] || typeof window === "undefined" || !window.GNOSIS_ESCENAS) return null;
  if (tipo === "despensa") return { id: "invernadero", st: { sinLuz: t > 0.9, moho: t > 1.6 } };
  if (tipo === "radiacion") return { id: "pasillo", st: { compuerta: true, alarma: true, sinAstro: true } };
  return { id: "control", st: { noche: true, sinAstro: t > 2.2 } };
}
// fundido a negro en el corte (0 = nada, 1 = negro)
const fundidoCorte = (tipo, t) => (tipo in CORTE ? 1 - smooth(Math.abs(t - CORTE[tipo]) / 0.35) : 0);
const ORDEN_FINALES = ["perfecta", "verde", "relevo", "apagon", "despensa", "radiacion", "agotado"];

// ---------------- rejilla de alta resolucion ----------------
// Los finales se dibujan sobre el lienzo de 2560x1440 con el mismo tamano de
// caracter: el doble de detalle en cada eje que la luna del menu.
// Las coordenadas de la escena siguen en "unidades de 1280x720".
const FC = 2;
const FCOLS = Math.ceil(W * FC / CW), FROWS = Math.ceil(H * FC / CH);
const FSW = FCOLS * CW, FSH = FROWS * CH, FN = FCOLS * FROWS;
const FOX = Math.floor((W * FC - FSW) / 2), FOY = Math.floor((H * FC - FSH) / 2);
const FPX = new Float32Array(FN), FPY = new Float32Array(FN);
for (let r = 0; r < FROWS; r++)
  for (let c = 0; c < FCOLS; c++) {
    FPX[r * FCOLS + c] = ((c + 0.5) * CW - FSW / 2) / FC;
    FPY[r * FCOLS + c] = -((r + 0.5) * CH - FSH / 2) / FC;
  }
const FB = new Float32Array(FN), FIDX = new Uint8Array(FN);
const FCR = new Uint8Array(FN), FCG = new Uint8Array(FN), FCB = new Uint8Array(FN);
let fImg = null, f32 = null;
function stampF(ctx) {
  if (!fImg) { fImg = ctx.createImageData(FSW, FSH); f32 = new Uint32Array(fImg.data.buffer); }
  f32.fill(0xFF000000);
  for (let row = 0; row < FROWS; row++)
    for (let col = 0; col < FCOLS; col++) {
      const i = row * FCOLS + col, id = FIDX[i];
      if (id === 0) continue;
      const m = ATLAS[id], r = FCR[i], g = FCG[i], b = FCB[i];
      let base = row * CH * FSW + col * CW;
      for (let y = 0, k = 0; y < CH; y++, base += FSW)
        for (let x = 0; x < CW; x++, k++) {
          const a = m[k];
          if (a) f32[base + x] = 0xFF000000 | ((b * a >> 8) << 16) | ((g * a >> 8) << 8) | (r * a >> 8);
        }
    }
  ctx.putImageData(fImg, FOX, FOY);
}

// ---------------- geometria de la escena (pixeles centrados, Y hacia arriba) ----------------
const HY = -95;            // horizonte
const GY = -150;           // suelo donde se apoya la base, la nave y los astronautas
const BX = 20;             // borde izquierdo de la base
const PAD_X = -260;        // donde aterriza la nave
const PUERTA_X = BX + 11;  // puerta de la base
const CAIDA_X = -180;      // donde se desploma el capitan agotado
const TIERRA = { x: 470, y: 235, r: 62 };
const ANTENA = { x: BX + 529, y: GY + 246 };

// tipos de celda
const K_CIELO = 0, K_MONTE = 1, K_SUELO = 2, K_CASCO = 3, K_VENTANA = 4, K_PUERTA = 5,
  K_INVERNADERO = 6, K_VENTANA_G = 7, K_BALIZA = 8, K_PANEL = 9;
const SOL = { x: -235, y: 175, r: 44 };
const PANEL = { x0: -150, x1: -40, y0: GY + 8, y1: GY + 48 };

const KIND = new Uint8Array(FN);
const SB = new Float32Array(FN), SR = new Float32Array(FN),
  SG = new Float32Array(FN), SBL = new Float32Array(FN);
const HASH = new Float32Array(FN);
let escenaLista = false;

function cellAt(px, py) {
  const c = Math.floor((px * FC + FSW / 2) / CW), r = Math.floor((FSH / 2 - py * FC) / CH);
  return c < 0 || c >= FCOLS || r < 0 || r >= FROWS ? -1 : r * FCOLS + c;
}
const altMonte = x => 30 + 22 * Math.sin(x / 110 + 1) + 12 * Math.sin(x / 43 + 2) + 6 * Math.sin(x / 17);

function construirEscena() {
  const rng = mulberry32(41);
  const rocas = [];
  for (let k = 0; k < 64; k++) {
    const y = -108 - Math.pow(rng(), 1.3) * 250, x = rng() * 1300 - 650;
    if (x > PANEL.x0 - 30 && x < 650 && y > -190) continue; // no tapar la base ni los paneles
    if (x > PAD_X - 90 && x < PAD_X + 90 && y > -190) continue; // ni la zona de aterrizaje
    const s = 8 + (-y - 100) * 0.12 + rng() * 10;
    rocas.push({ x, y, rw: s * 1.7, rh: s * 0.8 });
  }
  for (let i = 0; i < FN; i++) {
    const px = FPX[i], py = FPY[i];
    let h = Math.sin(i * 12.9898) * 43758.5453; HASH[i] = h - Math.floor(h);
    let k = K_CIELO, b = 0, r = 0, g = 0, bl = 0;
    const mh = altMonte(px);
    if (py <= HY + mh && py > HY) {
      k = K_MONTE; b = 0.16 + 0.14 * (py - HY) / mh; r = 135; g = 125; bl = 210;
    } else if (py <= HY) {
      k = K_SUELO;
      const n = Math.sin(px * 0.13 + py * 0.31) * Math.sin(px * 0.07 - py * 0.19);
      const lejos = 0.8 + 0.2 * clamp((HY - py) / 200, 0, 1);
      b = (0.31 + 0.06 * n + 0.05 * (HASH[i] - 0.5)) * lejos; r = 168; g = 162; bl = 232;
      if (HASH[i] < 0.06) { b = 0.18; r = 110; g = 105; bl = 200; }
    }
    // rocas: sombra a la derecha + roca iluminada arriba
    if (k === K_SUELO) for (const q of rocas) {
      const sx = (px - (q.x + q.rw * 0.55)) / (q.rw * 1.1), sy = (py - (q.y - q.rh * 0.45)) / (q.rh * 0.45);
      if (sx * sx + sy * sy < 1) { b = 0.12; r = 50; g = 50; bl = 135; }
      const dx = (px - q.x) / q.rw, dy = (py - q.y) / q.rh;
      if (dx * dx + dy * dy < 1 && dy > -0.35) {
        const v = Math.max(0, dy);
        b = 0.28 + 0.45 * v - 0.08 * dx;
        r = 60 + 90 * v; g = 70 + 90 * v; bl = 190 + 55 * v;
      }
    }
    // ---- base lunar (BX = borde izquierdo del modulo) ----
    const dentro = (x0, x1, y0, y1) => px >= x0 && px <= x1 && py >= y0 && py <= y1;
    const domo = (cx, cy, rx, ry) => {
      const nx = (px - cx) / rx, ny = (py - cy) / ry;
      if (py < cy || nx * nx + ny * ny >= 1) return null;
      return { nx, ny, nz: Math.sqrt(1 - nx * nx - ny * ny) };
    };
    const casco = (lam, base = 0.4) => { k = K_CASCO; b = base + 0.5 * lam; r = 228; g = 228; bl = 245; };
    const luzDomo = d => clamp(0.5 + 0.5 * (-0.5 * d.nx + 0.4 * d.ny + 0.75 * d.nz), 0, 1);
    // paneles solares inclinados (a la izquierda de la base)
    const sk = (py - GY) * 0.5;
    if (py >= PANEL.y0 && py <= PANEL.y1 && px >= PANEL.x0 + sk && px <= PANEL.x1 + sk) {
      k = K_PANEL;
      const linea = ((px - sk - PANEL.x0) % 22) < 3 || ((py - PANEL.y0) % 13) < 2;
      b = linea ? 0.16 : 0.5; r = linea ? 50 : 70; g = linea ? 60 : 125; bl = linea ? 120 : 245;
    }
    if (dentro(PANEL.x0 + 30, PANEL.x0 + 34, GY, PANEL.y0) || dentro(PANEL.x1 - 10, PANEL.x1 - 6, GY, PANEL.y0)) casco(0.2);
    if (dentro(BX - 10, BX + 600, GY - 10, GY)) { k = K_CASCO; b = 0.3; r = 150; g = 150; bl = 190; }   // patas
    if (dentro(BX, BX + 200, GY, GY + 72)) {                                                         // modulo
      casco(0.5 + 0.3 * ((py - GY) / 72), 0.36);
      if ((py - GY) % 24 < 4) b *= 0.72;
      if (dentro(BX + 30, BX + 92, GY + 26, GY + 52) || dentro(BX + 108, BX + 186, GY + 26, GY + 52)) k = K_VENTANA;
      if (dentro(BX, BX + 22, GY, GY + 46)) { k = K_PUERTA; b = 0.2; r = 90; g = 95; bl = 140; }
    }
    let d = domo(BX + 268, GY, 82, 76);                                                              // invernadero
    if (d) { casco(luzDomo(d)); if (d.nx * d.nx + d.ny * d.ny < 0.5 && d.ny > 0.12) k = K_INVERNADERO; }
    d = domo(BX + 405, GY, 118, 108);                                                                // domo grande
    if (d) { casco(luzDomo(d)); if (dentro(BX + 365, BX + 445, GY + 32, GY + 72)) k = K_VENTANA_G; }
    if (dentro(BX + 525, BX + 533, GY, GY + 230)) casco(0.6);                                        // antena
    if (dentro(BX + 522, BX + 536, GY + 230, GY + 246)) k = K_BALIZA;
    if (dentro(BX + 555, BX + 563, GY, GY + 50)) casco(0.4);                                         // plato
    d = domo(BX + 572, GY + 60, 34, 28);
    if (d && px > BX + 558) casco(0.7 - 0.4 * d.nx);
    KIND[i] = k; SB[i] = b; SR[i] = r; SG[i] = g; SBL[i] = bl;
  }
  // contorno oscuro alrededor de la base para que se lea sobre el suelo y las montanas
  const esBase = i => KIND[i] >= K_CASCO;
  for (let r = 1; r < FROWS - 1; r++)
    for (let c = 1; c < FCOLS - 1; c++) {
      const i = r * FCOLS + c;
      if (esBase(i) || KIND[i] === K_CIELO) continue;
      if (esBase(i - FCOLS) || esBase(i - 1) || esBase(i + 1) || esBase(i + FCOLS)) SB[i] *= 0.15;
    }
  for (let r = 1; r < FROWS; r++)
    for (let c = 0; c < FCOLS; c++) {
      const i = r * FCOLS + c;
      if (KIND[i] === K_CIELO && esBase(i + FCOLS < FN ? i + FCOLS : i)) SB[i] = 0;
    }
  escenaLista = true;
}

// estrellas del cielo
const rngF = mulberry32(77);
const EST_F = [];
for (let k = 0; k < 260; k++) {
  const x = rngF() * 1280 - 640, y = HY + 40 + rngF() * 330;
  const pal = [[255, 255, 255], [140, 190, 255], [255, 150, 80], [190, 150, 255]];
  EST_F.push({ x, y, c: pal[Math.floor(rngF() * 4)], ph: rngF() * 6.28, sp: 0.8 + rngF() * 3, b: 0.25 + rngF() * 0.5 });
}
// particulas de la tormenta solar
const TORM = Array.from({ length: 70 }, () => ({ x: rngF() * 1600 - 800, y: rngF() * 900 - 400, v: 500 + rngF() * 500, l: 30 + rngF() * 50 }));

// ---------------- render ASCII de un cuadro ----------------
// st: luz, ventana[rgb], noche, alarma, tormenta, marchito, senal, fuegos, foco{x,y}
function escenaFinal(t, st) {
  if (!escenaLista) construirEscena();
  const parpadeo = Math.sin(t * 9) > 0;
  const borde = 640 - st.noche * 1500;
  for (let i = 0; i < FN; i++) {
    const px = FPX[i], py = FPY[i], k = KIND[i];
    let b = SB[i], r = SR[i], g = SG[i], bl = SBL[i];

    if (k === K_CIELO) {
      // el Sol (con resplandor; mas grande y naranja en la tormenta)
      const sx = (px - st.sol.x) / SOL.r, sy = (py - st.sol.y) / SOL.r, s2 = sx * sx + sy * sy;
      const halo = 1.9 + 1.2 * st.tormenta;
      if (s2 < 1) { b = 0.98; r = 255; g = 230 - 50 * st.tormenta; bl = 120 - 60 * st.tormenta; }
      else if (s2 < halo * halo) {
        const f = 1 - (Math.sqrt(s2) - 1) / (halo - 1);
        b = 0.5 * f * f; r = 255; g = 190 - 40 * st.tormenta; bl = 80;
      }
      // la Tierra
      const ex = (px - TIERRA.x) / TIERRA.r, ey = (py - TIERRA.y) / TIERRA.r, e2 = ex * ex + ey * ey;
      if (e2 < 1) {
        const ez = Math.sqrt(1 - e2), lon = Math.atan2(ex, ez) + t * 0.08, lat = Math.asin(ey);
        const n = Math.sin(3 * lon + 1.3) * Math.cos(2.2 * lat) + 0.6 * Math.sin(5 * lon - 3 * lat + 0.7) + 0.3 * Math.sin(9 * lon + 4 * lat);
        const nube = Math.sin(7 * lon + t * 0.25 + 3 * lat) * Math.cos(4 * lat - lon) > 0.55;
        const lam = clamp(-0.5 * ex + 0.35 * ey + 0.8 * ez, 0, 1);
        b = 0.18 + 0.75 * lam;
        if (nube) { r = 235; g = 242; bl = 255; } else if (n > 0.35) { r = 80; g = 185; bl = 100; } else { r = 45; g = 115; bl = 235; }
      } else if (e2 < 1.25) { b = 0.14 * (1.25 - e2) / 0.25; r = 120; g = 170; bl = 255; }
    } else if (k === K_VENTANA || k === K_VENTANA_G) {
      const w = st.alarma ? (parpadeo ? [255, 50, 50] : [90, 20, 25]) : st.ventana;
      const on = st.luz * (k === K_VENTANA_G ? 1 : 0.9);
      if (on > 0.02) { b = 0.35 + 0.55 * on + 0.08 * HASH[i]; r = w[0]; g = w[1]; bl = w[2]; }
      else { b = 0.1; r = 45; g = 48; bl = 70; }
    } else if (k === K_INVERNADERO) {
      const m = st.marchito;
      const planta = HASH[i] > 0.35;
      b = planta ? (0.62 - 0.32 * m) * (0.6 + 0.4 * st.luz) : 0.2;
      r = planta ? 70 + 80 * m : 60; g = planta ? 210 - 120 * m : 80; bl = planta ? 90 - 40 * m : 90;
    } else if (k === K_PANEL) {
      const brillo = ((px * 0.01 - py * 0.02 - t * 0.35) % 1 + 1) % 1 < 0.08 ? 0.35 * st.solLuz : 0;
      b = b * (0.55 + 0.45 * st.solLuz) + brillo;
      if (brillo) { r = 200; g = 230; bl = 255; }
    } else if (k === K_BALIZA) {
      const on = st.luz > 0.1 && Math.sin(t * 4) > 0;
      b = on ? 0.95 : 0.15; r = 255; g = on ? 110 : 60; bl = 60;
    }
    // alarma: el casco se tine de rojo al ritmo del parpadeo
    if (st.alarma && parpadeo && (k === K_CASCO || k === K_PUERTA)) { r = r * 0.6 + 100; g *= 0.55; bl *= 0.55; }

    // noche lunar que avanza de derecha a izquierda
    if (st.noche > 0 && k !== K_CIELO) {
      const s = clamp((px - borde) / 120, 0, 1);
      if (s > 0 && !((k === K_VENTANA || k === K_VENTANA_G) && st.luz > 0.02)) {
        const osc = k >= K_CASCO ? 0.35 : 0.6;     // la base se oscurece menos para que se siga viendo
        b *= 1 - osc * s; r = r * (1 - 0.45 * s) + 40 * s; g = g * (1 - 0.45 * s) + 40 * s; bl = Math.min(255, bl * (1 - 0.25 * s) + 80 * s);
      }
    }
    // foco de la nave de rescate
    if (st.foco && k !== K_CIELO && py < st.foco.y) {
      const dx = Math.abs(px - st.foco.x), ancho = (st.foco.y - py) * 0.3 + 8;
      if (dx < ancho) { const f = 1 - dx / ancho; b = Math.max(b, 0.28 + 0.35 * f); r = 255; g = 236; bl = 180; }
    }
    // neblina de la tormenta
    if (st.tormenta > 0 && k === K_CIELO && b < 0.09 * st.tormenta) {
      const n = 0.5 + 0.5 * Math.sin(px * 0.02 + py * 0.03 + t * 2);
      b = n > 0.7 ? 0.04 * st.tormenta + 0.05 * st.tormenta * (n - 0.7) / 0.3 : 0; r = 255; g = 160; bl = 70;
    }
    FB[i] = b; FCR[i] = clamp(r, 0, 255); FCG[i] = clamp(g, 0, 255); FCB[i] = clamp(bl, 0, 255);
  }

  // estrellas (no en tormenta fuerte)
  for (const s of EST_F) {
    const i = cellAt(s.x, s.y);
    if (i < 0 || KIND[i] !== K_CIELO || FB[i] > 0.12) continue;
    const v = s.b * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * (1 - 0.6 * st.tormenta);
    if (v > FB[i]) { FB[i] = v; FCR[i] = s.c[0]; FCG[i] = s.c[1]; FCB[i] = s.c[2]; }
  }
  // rafagas de particulas solares (diagonales)
  if (st.tormenta > 0) {
    const dx = Math.cos(-0.45), dy = Math.sin(-0.45);
    for (const p of TORM) {
      const d = ((p.v * t + p.x) % 1700 + 1700) % 1700 - 850;
      const hx = p.x * 0.5 + dx * d, hy = p.y * 0.6 + 180 + dy * d;
      for (let s = 0; s < p.l; s += 5) {
        const i = cellAt(hx - dx * s, hy - dy * s);
        if (i < 0) continue;
        const v = (0.85 - 0.6 * s / p.l) * st.tormenta;
        if (v > FB[i]) { FB[i] = v; FCR[i] = 255; FCG[i] = 200 - 80 * s / p.l; FCB[i] = 90; }
      }
    }
  }
  // senal de la antena a la Tierra
  if (st.senal > 0) {
    const ax = ANTENA.x, ay = ANTENA.y, tx = TIERRA.x + 30, ty = TIERRA.y - TIERRA.r * 0.8;
    for (let s = 0; s <= 1; s += 1 / 70) {
      if (s > st.senal) break;
      const i = cellAt(ax + (tx - ax) * s, ay + (ty - ay) * s);
      if (i < 0) continue;
      const pulso = ((s * 6 - t * 1.6) % 1 + 1) % 1 < 0.3;
      const v = pulso ? 0.9 : 0.3;
      if (v > FB[i]) { FB[i] = v; FCR[i] = 120; FCG[i] = 245; FCB[i] = 255; }
    }
  }
  // fuegos artificiales ASCII
  if (st.fuegos) {
    const pal = [[255, 90, 120], [255, 205, 80], [120, 220, 255], [160, 255, 140], [220, 140, 255]];
    const cada = st.fuegos;
    const n0 = Math.floor(t / cada);
    for (let n = Math.max(0, n0 - 2); n <= n0; n++) {
      const t0 = n * cada, dt = t - t0;
      if (dt < 0 || dt > 1.5) continue;
      const rr = mulberry32(500 + n);
      const cx = -520 + rr() * 760, cy = 70 + rr() * 220, col = pal[Math.floor(rr() * 5)];
      for (let a = 0; a < 26; a++) {
        const ang = a / 26 * Math.PI * 2, rad = 95 * (1 - Math.exp(-3 * dt));
        const i = cellAt(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.8 - 25 * dt * dt);
        if (i < 0 || KIND[i] !== K_CIELO) continue;
        const v = 0.95 * (1 - dt / 1.5);
        if (v > FB[i]) { FB[i] = v; FCR[i] = col[0]; FCG[i] = col[1]; FCB[i] = col[2]; }
      }
    }
  }
  // brillo -> caracter y color final
  for (let i = 0; i < FN; i++) {
    let b = FB[i];
    if (b < 0.04) b = 0;
    FIDX[i] = Math.min(RAMP.length - 1, Math.floor(Math.pow(b, 0.8) * (RAMP.length - 1) + 0.5));
    const fac = 0.45 + 0.55 * Math.min(1, b * 1.8);
    FCR[i] = clamp(FCR[i] * fac, 0, 255); FCG[i] = clamp(FCG[i] * fac, 0, 255); FCB[i] = clamp(FCB[i] * fac, 0, 255);
  }
}

// ---------------- sprites en pixel art ----------------
const ASTRO_PAL = { W: [235, 238, 248], B: [60, 140, 255], b: [190, 230, 255], G: [165, 172, 196], K: [40, 44, 60], O: [255, 150, 60] };
const ASTRO = {
  a: ["..WWW..", ".WBBBW.", ".WBbBW.", ".WWWWW.", "GWOWWWG", "G.WWW.G", "..WWW..", "..W.W..", "..W.W..", "..W.W..", ".KK.KK."],
  b: ["..WWW..", ".WBBBW.", ".WBbBW.", ".WWWWW.", "GWOWWWG", "G.WWW.G", "..WWW..", "..W.W..", ".W...W.", ".W...W.", "KK...KK"],
  s: [".......", ".......", ".......", "..WWW..", ".WBBBW.", ".WBbBW.", ".WWWWW.", "GWOWWWG", "G.WWW.G", ".WWWWW.", ".KK.KK."],
};
const spriteCache = {};
function spriteAstro(f) {
  if (spriteCache[f]) return spriteCache[f];
  const m = ASTRO[f], cv = document.createElement("canvas");
  cv.width = m[0].length; cv.height = m.length;
  const g = cv.getContext("2d"), img = g.createImageData(cv.width, cv.height);
  m.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ".") return;
    const c = ASTRO_PAL[ch], k = (y * cv.width + x) * 4;
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }));
  g.putImageData(img, 0, 0);
  return (spriteCache[f] = cv);
}
const ESTRELLA = ["....Y....", "...YYY...", "YYYYYYYYY", ".YYYYYYY.", "..YYYYY..", ".YYY.YYY.", "YY.....YY"];
function dibujarEstrella(ctx, x, y, esc, color) {
  ctx.fillStyle = color;
  ESTRELLA.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === "Y") ctx.fillRect(Math.round(x + (c - 4.5) * esc), Math.round(y + (r - 3.5) * esc), esc, esc);
  }));
}

const aPantalla = (x, y) => [Math.round(W / 2 + x), Math.round(H / 2 - y)];
const PIX_ASTRO = 5;          // astronautas grandes para que se vean bien
function dibujarAstro(ctx, x, frame, izquierda, tumbado) {
  const spr = spriteAstro(frame), [sx, sy] = aPantalla(x, GY);
  const w = spr.width * PIX_ASTRO, h = spr.height * PIX_ASTRO;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(sx, sy);
  if (tumbado) { ctx.rotate(-Math.PI / 2); ctx.drawImage(spr, 0, -h / 2, w, h); }
  else { if (izquierda) ctx.scale(-1, 1); ctx.drawImage(spr, -w / 2, -h, w, h); }
  ctx.restore();
}

// ---------------- guion de cada final ----------------
const lerp = (a, b, k) => a + (b - a) * clamp(k, 0, 1);
function guion(tipo, t) {
  const ag = tipo === "agotado";
  const T = { baja0: 5, baja1: 8, camina0: ag ? 8.6 : 8, camina1: ag ? 10.8 : 10, despega: ag ? 10.8 : 10 };
  T.tarjeta = T.despega + 2.3;
  const st = { luz: 1, ventana: [255, 170, 60], noche: 0, alarma: false, tormenta: 0, marchito: 0, senal: 0, fuegos: 0, foco: null,
    sol: { x: SOL.x, y: SOL.y }, solLuz: 1 };
  // barras: energia, comida, radiacion, salud (0-100)
  let barras = [70, 70, 30, 70], aviso = "", tareas = 0;
  const u = smooth(t / 4);
  switch (tipo) {
    case "perfecta":
      barras = [lerp(55, 100, u), lerp(60, 100, u), lerp(45, 5, u), lerp(60, 100, u)];
      st.ventana = u > 0.75 ? [90, 255, 130] : [255, 170, 60];
      tareas = t > 3.6 ? 3 : t > 2.6 ? 2 : t > 1.6 ? 1 : 0;
      st.senal = clamp((t - 3.8) / 1.2, 0, 1);
      st.fuegos = t > 9 ? 0.6 : 0;
      aviso = "INFORME FINAL · DÍA 14";
      break;
    case "verde":
      barras = [lerp(65, 100, u), lerp(70, 100, u), lerp(35, 10, u), lerp(65, 100, u)];
      st.ventana = u > 0.75 ? [90, 255, 130] : [255, 170, 60];
      st.fuegos = t > T.tarjeta - 0.5 ? 1.3 : 0;
      aviso = "INFORME FINAL · DÍA 14";
      break;
    case "relevo":
      barras = [48 + 4 * Math.sin(t), 42 + 3 * Math.sin(t * 1.3), 52 + 3 * Math.sin(t * 0.7), 50 + 4 * Math.sin(t * 0.9)];
      aviso = t < 2.2 ? "DÍA 13" : "DÍA 14 · ¡LO LOGRASTE!";
      break;
    case "apagon":
      barras = [lerp(30, 0, t / 4.5), 55, 30, 60];
      st.noche = smooth((t - 1) / 3.5);
      st.sol.y = lerp(SOL.y, HY - 90, smooth(t / 3.2));
      st.solLuz = 1 - smooth((t - 1) / 2.2);
      st.luz = t < 3.4 ? 1 : t < 4.6 ? (Math.random() < 0.5 ? 1 : 0) * (4.6 - t) : 0;
      if (t > T.baja0 && t < T.despega + 0.4) { const n = posNave(t, T); st.foco = { x: n.x, y: n.y - 30 }; }
      aviso = t < 4.6 ? "¡ENERGÍA BAJA!" : "¡SIN ENERGÍA!";
      break;
    case "despensa":
      barras = [60, lerp(35, 0, t / 4.5), 30, lerp(65, 45, t / 5)];
      st.marchito = smooth((t - 0.5) / 3.5);
      st.luz = 0.8;
      aviso = t < 4.5 ? "¡QUEDA POCA COMIDA!" : "¡SIN COMIDA!";
      break;
    case "radiacion":
      barras = [60, 60, lerp(40, 100, t / 4.5), lerp(70, 40, t / 5)];
      st.tormenta = smooth(t / 1.2) * (1 - smooth((t - 6) / 1.5));
      st.alarma = t > 2.2 && t < T.despega;
      aviso = t < 2.2 ? "¡TORMENTA SOLAR!" : "¡DEMASIADA RADIACIÓN!";
      break;
    case "agotado":
      barras = [60, 60, 30, lerp(35, 0, (t - 0.5) / 4.5)];
      aviso = t < 5 ? "EL CAPITÁN ESTÁ CANSADO" : "¡CAPITÁN AGOTADO!";
      break;
  }
  return { st, T, barras, aviso, tareas };
}

const ESC_NAVE = 5;
function posNave(t, T) {
  const sueloY = GY + (NAVE.length - CENTRO) * ESC_NAVE - 4;   // patas en el suelo
  if (t < T.baja1) {
    const u = clamp((t - T.baja0) / (T.baja1 - T.baja0), 0, 1), k = 1 - (1 - u) ** 2.2;
    return { x: PAD_X + 70 * (1 - k), y: 440 + (sueloY - 440) * k, ang: 0, esc: ESC_NAVE, emp: 1, ve: t >= T.baja0 };
  }
  if (t < T.despega) return { x: PAD_X, y: sueloY, ang: 0, esc: ESC_NAVE, emp: 0, ve: true };
  const u = clamp((t - T.despega) / 2.8, 0, 1), e = u ** 1.5;
  const p0 = [PAD_X, sueloY], p1 = [PAD_X - 20, 260], p2 = [TIERRA.x, TIERRA.y];
  const bz = s => [(1 - s) ** 2 * p0[0] + 2 * (1 - s) * s * p1[0] + s * s * p2[0],
    (1 - s) ** 2 * p0[1] + 2 * (1 - s) * s * p1[1] + s * s * p2[1]];
  const [x, y] = bz(e), [x2, y2] = bz(Math.min(1, e + 0.01));
  const ang = Math.atan2(x2 - x, y2 - y);           // giro del lienzo para apuntar hacia donde va
  return { x, y, ang: e > 0.001 ? ang : 0, esc: Math.max(1, Math.round(ESC_NAVE * (1 - 0.8 * e))), emp: 0.9, ve: u < 0.97 };
}

// ---------------- estado de la cinematica ----------------
let finalActual = null;
function iniciarFinal(tipo, alTerminar) {
  if (!FINALES[tipo]) throw new Error("Final desconocido: " + tipo);
  finalActual = { tipo, start: performance.now(), alTerminar };
  if (typeof fundirVolumen === "function" && musicaIniciada)
    fundirVolumen(FINALES[tipo].gana ? MUSICA_VOL : MUSICA_VOL * 0.45, 1500);
}
function tiempoFinal() { return (performance.now() - finalActual.start) / 1000; }
function tarjetaFinal() { return guion(finalActual.tipo, 0).T.tarjeta; }
// Enter / toque: salta a la tarjeta, o termina si ya se esta mostrando
function avanzarFinal() {
  const t = tiempoFinal(), tc = tarjetaFinal();
  if (t < tc) finalActual.start = performance.now() - tc * 1000;
  else if (t > tc + 0.8) {
    const fn = finalActual.alTerminar;
    finalActual = null;
    if (typeof fundirVolumen === "function" && musicaIniciada) fundirVolumen(MUSICA_VOL, 1500);
    if (fn) fn();
  }
}

// ---------------- dibujo de un cuadro ----------------
// ---------------- narracion para ninos (7-12 anos) ----------------
// [desde, hasta, texto]  -  frases cortas que explican lo que pasa en pantalla
const NARRACION = {
  perfecta: [[0, 2.5, "¡Último día de la misión! Revisemos la base..."],
    [2.5, 5, "¡Todo en verde y las 3 tareas de la Tierra cumplidas!"],
    [5, 8, "Llega la nave con el nuevo equipo."],
    [8, 10, "El nuevo equipo entra y tú subes a la nave."],
    [10, 13, "¡Vuelves a casa como un héroe!"]],
  verde: [[0, 2.5, "¡Último día! Revisemos cómo quedó la base..."],
    [2.5, 5, "¡Las 4 barras están en verde! ¡Muy bien!"],
    [5, 8, "Llega la nave con el nuevo equipo."],
    [8, 10, "Le entregas la base al nuevo equipo."],
    [10, 13, "¡Buen viaje de regreso a la Tierra!"]],
  relevo: [[0, 2.2, "Día 13: la base aguanta... ¡un día más!"],
    [2.2, 5, "¡Día 14! Resististe hasta el final."],
    [5, 8, "Llega la nave con el nuevo equipo."],
    [8, 10, "Cambio de equipo: ¡te toca descansar!"],
    [10, 13, "La próxima vez, ¡intenta dejar todo en verde!"]],
  apagon: [[0, 2, "El Sol se esconde: llega la noche en la Luna."],
    [2, 4.6, "Sin Sol, los paneles solares no cargan la batería..."],
    [4.6, 6, "¡Se acabó la energía! La base se apaga."],
    [6, 8, "¡Una nave de rescate viene a buscarte!"],
    [8, 10, "Subes a la nave con cuidado."],
    [10, 13, "La próxima vez, ¡ahorra energía para la noche!"]],
  despensa: [[0, 1.6, "Las plantas del invernadero son tu comida..."],
    [1.6, 3.0, "Sin luz ni cuidados, las plantas se secaron."],
    [3.0, 4.6, "Y la comida guardada se acabó."],
    [4.6, 6, "¡La despensa está vacía!"],
    [6, 8, "¡Una nave de rescate viene a buscarte!"],
    [8, 10, "Subes a la nave."],
    [10, 13, "Recuerda: en la Luna hay que cultivar y reciclar."]],
  radiacion: [[0, 2.6, "¡Tormenta solar! Y la compuerta del refugio quedó abierta..."],
    [2.6, 4.6, "La radiación sube y sube... ¡suena la alarma!"],
    [4.6, 6, "Los doctores dicen: ¡es hora de volver!"],
    [6, 8, "Llega una nave de rescate."],
    [8, 10, "Subes a la nave rápido."],
    [10, 13, "Recuerda: en una tormenta, ¡corre al refugio!"]],
  agotado: [[0, 2.2, "El capitán trabajó y trabajó sin parar..."],
    [2.2, 4.2, "Tan cansado que fue a la litera... ¡y se quedó dormido!"],
    [4.2, 8.6, "¡Una nave de rescate viene a ayudar!"],
    [8.6, 10.8, "El capitán sube a la nave para descansar."],
    [10.8, 13.5, "Descansar también es parte de la misión."]],
};

// etiquetas con flecha que senalan las cosas importantes
function etiquetas(tipo, t, T, nave) {
  const gana = FINALES[tipo].gana, out = [];
  const add = (t0, t1, txt, x, y, col, lado = 1) => { if (t >= t0 && t < t1) out.push({ txt, x, y, col, lado, a: smooth((t - t0) / 0.3) * (1 - smooth((t - t1 + 0.3) / 0.3)) }); };
  if (!(tipo in CORTE)) add(0.2, 2.4, "Tu base lunar", BX + 405, GY + 80, "rgb(235,240,255)", -1);
  if (tipo === "apagon") { add(0.2, 2.2, "Sol", SOL.x + 40, SOL.y - 30, "rgb(255,220,110)"); add(2.2, 4.6, "Paneles solares", -95, GY + 40, "rgb(120,170,255)", -1); }
  if (tipo === "despensa") {
    add(0.3, 2.7, "Invernadero: aquí crece tu comida", 0, -60, "rgb(140,230,140)", 1);
    add(3.2, 4.8, "Invernadero sin cosecha", BX + 268, GY + 55, "rgb(140,230,140)", -1);
  }
  if (tipo === "radiacion") {
    add(0.3, 2.4, "¡La compuerta del refugio quedó abierta!", 0, 30, "rgb(255,190,90)", 1);
    add(2.8, 4.4, "Tormenta solar", -330, 170, "rgb(255,190,90)");
  }
  if (tipo === "perfecta") add(4.2, 7.5, "Mensaje a la Tierra", ANTENA.x - 20, ANTENA.y + 90, "rgb(140,240,255)", -1);
  if (tipo === "agotado") {
    add(0.3, 2.1, "Capitán", -300, -150, "rgb(235,240,255)", 1);
    add(2.4, 4.0, "Litera para descansar", LITERA.x, LITERA.y + 20, "rgb(190,200,255)", 1);
  }
  if (nave.ve) add(T.baja0 + 1.2, T.camina1, gana ? "Nave del nuevo equipo" : "Nave de rescate", nave.x, nave.y + 40, gana ? "rgb(140,240,160)" : "rgb(255,140,120)", -1);
  add(T.despega + 0.3, T.tarjeta, "La Tierra: ¡a casa!", TIERRA.x, TIERRA.y - TIERRA.r, "rgb(140,200,255)", -1);
  return out;
}

function dibujarEtiqueta(ctx, e) {
  const [tx, ty] = aPantalla(e.x, e.y);
  ctx.font = `bold 17px ${FONT_FAMILY}`;
  const w = ctx.measureText(e.txt).width + 20, h = 30;
  const lx = clamp(tx + e.lado * 70 - (e.lado < 0 ? w : 0), 8, W - w - 8), ly = clamp(ty - 72, 120, H - 160);
  ctx.globalAlpha = e.a;
  ctx.strokeStyle = e.col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lx + w / 2, ly + h); ctx.stroke();
  ctx.fillStyle = e.col; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(10,14,26,0.88)";
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(lx, ly, w, h, 8); else ctx.rect(lx, ly, w, h); ctx.fill();
  ctx.strokeStyle = e.col; ctx.stroke();
  ctx.fillStyle = e.col; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(e.txt, lx + 10, ly + h / 2 + 1);
  ctx.globalAlpha = 1;
}

// iconos dibujados (claros a cualquier tamano)
function icono(ctx, tipo, x, y) {
  ctx.save(); ctx.translate(x, y);
  if (tipo === 0) {          // rayo: energia
    ctx.fillStyle = "rgb(255,215,60)";
    ctx.beginPath(); ctx.moveTo(3, -11); ctx.lineTo(-7, 2); ctx.lineTo(0, 2); ctx.lineTo(-3, 11); ctx.lineTo(8, -3); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill();
  } else if (tipo === 1) {   // manzana: comida
    ctx.fillStyle = "rgb(235,70,70)";
    ctx.beginPath(); ctx.arc(-3.5, 2, 7, 0, Math.PI * 2); ctx.arc(3.5, 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgb(90,200,90)";
    ctx.beginPath(); ctx.ellipse(4, -8, 5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (tipo === 2) {   // radiacion
    ctx.fillStyle = "rgb(255,215,60)";
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgb(20,20,30)";
    for (let k = 0; k < 3; k++) {
      const a0 = -Math.PI / 2 + k * 2 * Math.PI / 3 - 0.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 9, a0, a0 + 1); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgb(255,215,60)"; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgb(20,20,30)"; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
  } else {                   // corazon: salud
    ctx.fillStyle = "rgb(255,90,120)";
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(-14, 0, -9, -12, 0, -4); ctx.bezierCurveTo(9, -12, 14, 0, 0, 10); ctx.fill();
  }
  ctx.restore();
}

function colorBarra(v, inversa) {
  const bueno = inversa ? 100 - v : v;
  return bueno >= 60 ? "rgb(90,220,120)" : bueno >= 30 ? "rgb(255,200,60)" : "rgb(255,80,70)";
}
function envolver(ctx, txt, maxW) {
  const out = []; let linea = "";
  for (const w of txt.split(" ")) {
    const prueba = linea ? linea + " " + w : w;
    if (ctx.measureText(prueba).width > maxW && linea) { out.push(linea); linea = w; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}
function cajaRedonda(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

// ---------------- dibujo de un cuadro ----------------
// ctx es el lienzo de 2560x1440: la escena ASCII va a resolucion completa y
// lo demas (sprites, textos) se dibuja con escala x2 en coordenadas de 1280x720.
function dibujarFinal(ctx, t) {
  const { tipo } = finalActual, info = FINALES[tipo];
  const { st, T, barras, aviso, tareas } = guion(tipo, t);
  const ins = insercion(tipo, t);
  if (ins) window.GNOSIS_ESCENAS.render(ctx, ins.id, t, Object.assign({ etiquetas: false }, ins.st));   // toma dentro de la base
  else { escenaFinal(t, st); stampF(ctx); }
  const negro = fundidoCorte(tipo, t);
  if (negro > 0) { ctx.fillStyle = `rgba(0,0,0,${negro})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
  ctx.save();
  ctx.scale(FC, FC);
  ctx.imageSmoothingEnabled = false;

  // ---- astronautas ----
  const paso = Math.floor(t / 0.15) % 2 ? "a" : "b";
  const zzz = (x, y) => {                     // Zzz grandes que suben
    ctx.font = `bold 24px ${FONT_FAMILY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const [zx, zy] = aPantalla(x, y);
    for (let k = 0; k < 3; k++) {
      const f = (t * 0.6 + k / 3) % 1;
      ctx.globalAlpha = 1 - f; ctx.fillStyle = "rgb(190,200,255)";
      ctx.fillText(k % 2 ? "Z" : "z", zx + 12 + f * 30, zy - f * 55);
    }
    ctx.globalAlpha = 1;
  };
  if (tipo === "agotado") {
    const lento = Math.floor(t / 0.4) % 2 ? "a" : "b";
    if (t >= 2.2 && t < CORTE.agotado) {
      // dormido en la litera de la sala de control
      // acostado sobre el colchón: girado 90°, con la cabeza hacia la izquierda
      const spr = spriteAstro("a"), w = spr.width * PIX_ASTRO, h = spr.height * PIX_ASTRO, [sx, sy] = aPantalla(LITERA.x - h / 2, LITERA.y);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-Math.PI / 2); ctx.drawImage(spr, 0, 0, w, h); ctx.restore();
      if (t > 2.6) zzz(LITERA.x + 30, LITERA.y + 40);
    } else if (t >= T.camina0 && t < T.camina1) {
      // la nave de rescate llega y el capitán sale de la base medio dormido
      const x = lerp(PUERTA_X, PAD_X + 14, (t - T.camina0) / (T.camina1 - T.camina0));
      dibujarAstro(ctx, x, lento, true);
      zzz(x, GY + 30);
    }
  } else if (t >= T.camina0 && t < T.camina1) {
    const k = (t - T.camina0) / (T.camina1 - T.camina0);
    dibujarAstro(ctx, lerp(PUERTA_X, PAD_X + 14, k), paso, true);
    if (info.gana) dibujarAstro(ctx, lerp(PAD_X + 14, PUERTA_X, k), paso, false);
  }

  // ---- nave ----
  const n = posNave(t, T);
  if (n.ve) {
    const spr = spriteNave(Math.floor(t * 3) % 2 === 0, n.emp);
    const [sx, sy] = aPantalla(n.x, n.y);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(n.ang);
    ctx.drawImage(spr, -SPR_W * n.esc / 2, -SPR_H * n.esc / 2, SPR_W * n.esc, SPR_H * n.esc);
    ctx.restore();
  }

  const tc = T.tarjeta, hud = 1 - smooth((t - tc + 0.3) / 0.6);
  if (hud > 0) {
    // ---- etiquetas ----
    for (const e of etiquetas(tipo, t, T, n)) { e.a *= hud; dibujarEtiqueta(ctx, e); }

    // ---- panel de barras con iconos ----
    ctx.globalAlpha = hud;
    const pw = tipo === "perfecta" ? 330 : 300, ph = tipo === "perfecta" ? 176 : 146;
    ctx.fillStyle = "rgba(10,14,26,0.82)"; cajaRedonda(ctx, 14, 14, pw, ph, 10); ctx.fill();
    ctx.strokeStyle = "rgba(90,100,130,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    ["Energía", "Comida", "Radiación", "Salud"].forEach((nom, k) => {
      const y = 40 + k * 32, v = clamp(barras[k], 0, 100), inv = k === 2;
      icono(ctx, k, 36, y);
      ctx.font = `bold 15px ${FONT_FAMILY}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgb(220,225,240)"; ctx.fillText(nom, 56, y);
      ctx.fillStyle = "rgb(40,46,64)"; cajaRedonda(ctx, 160, y - 8, 110, 16, 5); ctx.fill();
      ctx.fillStyle = colorBarra(v, inv); cajaRedonda(ctx, 160, y - 8, Math.max(6, 110 * v / 100), 16, 5); ctx.fill();
      // alerta parpadeante en la barra que provoca el final
      const critica = (inv && v >= 90) || (!inv && v <= 10);
      if (critica && Math.sin(t * 8) > 0) { ctx.strokeStyle = "rgb(255,80,70)"; ctx.lineWidth = 2; cajaRedonda(ctx, 158, y - 10, 114, 20, 6); ctx.stroke(); }
      ctx.font = `13px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(170,178,200)"; ctx.textAlign = "right";
      ctx.fillText(Math.round(v), pw + 4, y);
    });
    if (tipo === "perfecta") {
      ctx.font = `bold 15px ${FONT_FAMILY}`; ctx.textAlign = "left"; ctx.fillStyle = "rgb(220,225,240)";
      ctx.fillText("Tareas de la Tierra", 28, 168);
      for (let k = 0; k < 3; k++) {
        const x = 220 + k * 30;
        ctx.strokeStyle = "rgb(120,130,160)"; ctx.lineWidth = 2; ctx.strokeRect(x, 159, 18, 18);
        if (k < tareas) {
          ctx.strokeStyle = "rgb(90,230,120)"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x + 3, 168); ctx.lineTo(x + 8, 174); ctx.lineTo(x + 16, 161); ctx.stroke();
        }
      }
    }

    // ---- aviso grande arriba ----
    if (aviso) {
      ctx.font = `bold 26px ${FONT_FAMILY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const malo = !info.gana, w = ctx.measureText(aviso).width + 40;
      ctx.fillStyle = malo ? "rgba(70,12,12,0.85)" : "rgba(10,40,24,0.85)";
      cajaRedonda(ctx, W / 2 - w / 2, 16, w, 44, 10); ctx.fill();
      ctx.fillStyle = malo ? (Math.sin(t * 6) > -0.3 ? "rgb(255,110,95)" : "rgb(200,70,60)") : "rgb(150,255,170)";
      ctx.fillText(aviso, W / 2, 39);
    }

    // ---- narracion (subtitulo grande) ----
    const linea = NARRACION[tipo].find(([a, b]) => t >= a && t < b);
    if (linea) {
      const [a0, a1, txt] = linea;
      const fade = smooth((t - a0) / 0.25) * (1 - smooth((t - a1 + 0.25) / 0.25));
      const nCh = Math.floor((t - a0) * 60);
      ctx.font = `bold 26px ${FONT_FAMILY}`;
      const w = Math.min(W - 80, ctx.measureText(txt).width + 56);
      ctx.globalAlpha = hud * fade;
      ctx.fillStyle = "rgba(8,11,22,0.88)"; cajaRedonda(ctx, W / 2 - w / 2, H - 92, w, 60, 14); ctx.fill();
      ctx.strokeStyle = info.gana ? "rgba(140,240,160,0.7)" : "rgba(255,140,120,0.7)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgb(250,250,255)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(txt.slice(0, nCh), W / 2, H - 61);
    }
    ctx.globalAlpha = 1;
    ctx.font = `13px ${FONT_FAMILY}`; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(150,160,185,0.8)";
    ctx.fillText("ENTER o toca = saltar", W - 16, H - 12);
  }

  // ---- tarjeta final (grande y legible) ----
  if (t > tc) {
    const a = smooth((t - tc) / 0.8);
    ctx.fillStyle = `rgba(4,6,14,${0.6 * a})`;
    ctx.fillRect(0, 0, W, H);
    const apr = aprendizaje(tipo);
    const pw = 880, ph = apr ? 450 : 330, px = (W - pw) / 2, py = (H - ph) / 2 - 10 + (1 - a) * 20;
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgb(16,21,33)"; ctx.strokeStyle = info.gana ? "rgb(245,197,66)" : "rgb(235,100,80)"; ctx.lineWidth = 3;
    cajaRedonda(ctx, px, py, pw, ph, 18); ctx.fill(); ctx.stroke();

    let tx = px + 40;
    const cy = py + 56;
    if (info.gana) {
      for (let k = 0; k < 3; k++) {
        const pop = smooth((t - tc - 0.4 - k * 0.25) / 0.25);
        if (pop <= 0) continue;
        const llena = k < info.estrellas;
        dibujarEstrella(ctx, tx + k * 46 + 18, cy, llena ? Math.max(1, Math.round(4 * pop)) : 4, llena ? "rgb(245,197,66)" : "rgb(60,66,84)");
      }
      tx += 3 * 46 + 14;
    }
    ctx.font = `bold 36px ${FONT_FAMILY}`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = info.gana ? "rgb(250,245,230)" : "rgb(240,105,85)";
    ctx.fillText(info.titulo, tx, cy + 2);

    ctx.font = `25px ${FONT_FAMILY}`; ctx.textBaseline = "top";
    const nChars = Math.floor((t - tc - 0.6) * 45);
    let resto = Math.max(0, nChars);
    envolver(ctx, info.texto, pw - 80).forEach((l, k) => {
      const parte = l.slice(0, resto); resto -= Math.min(resto, l.length + 1);
      ctx.fillStyle = "rgb(232,236,245)";
      ctx.fillText(parte, px + 40, py + 108 + k * 36);
    });
    // ---- lo que aprendiste: la carta del concepto ----
    if (apr && nChars > info.texto.length) {
      const b = smooth((nChars - info.texto.length) / 25), bx = px + 40, by = py + 222, bw = pw - 80, bh = 112;
      ctx.globalAlpha = a * b;
      ctx.fillStyle = "rgba(120,245,255,0.07)"; ctx.strokeStyle = "rgba(120,245,255,0.55)"; ctx.lineWidth = 2;
      cajaRedonda(ctx, bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.font = `bold 15px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(120,245,255)";
      ctx.fillText("LO QUE APRENDISTE", bx + 18, by + 14);
      ctx.font = `bold 22px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(250,245,230)";
      ctx.fillText(apr[0], bx + 18, by + 38);
      ctx.font = `19px ${FONT_FAMILY}`; ctx.fillStyle = "rgb(225,232,245)";
      envolver(ctx, apr[1], bw - 36).slice(0, 2).forEach((l, k) => ctx.fillText(l, bx + 18, by + 66 + k * 22));
      ctx.globalAlpha = a;
    }
    if (nChars > info.texto.length) {
      ctx.font = `18px ${FONT_FAMILY}`; ctx.textBaseline = "top"; ctx.fillStyle = "rgb(145,155,178)";
      ctx.fillText(info.cond, px + 40, py + ph - 72);
      if (Math.sin(t * 4) > -0.3) {
        ctx.font = `bold 16px ${FONT_FAMILY}`; ctx.textAlign = "right"; ctx.fillStyle = "rgb(170,178,200)";
        ctx.fillText("ENTER o toca para continuar", px + pw - 30, py + ph - 38);
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

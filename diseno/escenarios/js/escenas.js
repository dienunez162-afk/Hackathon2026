/* =========================================================
   G-NOSIS  -  escenarios del juego en ASCII
   Mismo motor que los finales (finales.js): cada celda de la
   rejilla de 2560x1440 recibe brillo y color, y se estampa con
   los glifos de la luna del menu. Encima van sprites en pixel art
   y etiquetas. Coordenadas: unidades de 1280x720, centro en 0,0,
   Y hacia arriba (igual que finales.js).
   ========================================================= */
(() => {
  "use strict";

  // ---------- paleta unica del proyecto ----------
  const PAL = {
    regolito: [168, 162, 232], sombra: [50, 50, 135], monte: [135, 125, 210], casco: [228, 228, 245],
    metal: [150, 158, 205], metalOsc: [86, 92, 140], ambar: [255, 170, 60], cian: [120, 245, 255],
    panel: [70, 125, 245], verde: [90, 220, 120], planta: [70, 210, 90], rojo: [255, 80, 70],
    naranja: [255, 160, 70], hielo: [205, 240, 255], agua: [70, 150, 255], blanco: [235, 240, 255],
  };

  // ---------- utilidades ----------
  const HS = new Float32Array(FN), HS2 = new Float32Array(FN);
  for (let i = 0; i < FN; i++) {
    const a = Math.sin(i * 12.9898 + 78.233) * 43758.5453; HS[i] = a - Math.floor(a);
    const b = Math.sin(i * 39.3468 + 11.135) * 24634.6345; HS2[i] = b - Math.floor(b);
  }
  const C = { b: 0, r: 0, g: 0, bl: 0 };
  const set = (b, c) => { C.b = b; C.r = c[0]; C.g = c[1]; C.bl = c[2]; };
  const setRGB = (b, r, g, bl) => { C.b = b; C.r = r; C.g = g; C.bl = bl; };
  const enRect = (px, py, x0, x1, y0, y1) => px >= x0 && px <= x1 && py >= y0 && py <= y1;
  const fr = (x) => x - Math.floor(x);

  function cielo(px, py, i, t, st, o) {
    setRGB(0, 0, 0, 0);
    if (HS[i] < 0.013) {
      const pal = [[255, 255, 255], [140, 190, 255], [255, 150, 80], [190, 150, 255]][Math.floor(HS2[i] * 4)];
      const v = (0.25 + 0.45 * HS2[i]) * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (1 + 3 * HS2[i]) + HS[i] * 900)));
      setRGB(v, pal[0], pal[1], pal[2]);
    }
    if (o.sol && !st.noche) {
      const s = o.sol, sx = (px - s.x) / s.r, sy = (py - s.y) / s.r, s2 = sx * sx + sy * sy, halo = 1.9 + 1.2 * (st.tormenta ? 1 : 0);
      if (s2 < 1) setRGB(0.98, 255, st.tormenta ? 180 : 230, st.tormenta ? 60 : 120);
      else if (s2 < halo * halo) { const f = 1 - (Math.sqrt(s2) - 1) / (halo - 1); if (0.5 * f * f > C.b) setRGB(0.5 * f * f, 255, 190, 80); }
    }
    if (o.tierra) {
      const e = o.tierra, ex = (px - e.x) / e.r, ey = (py - e.y) / e.r, e2 = ex * ex + ey * ey;
      if (e2 < 1) {
        const ez = Math.sqrt(1 - e2), lon = Math.atan2(ex, ez) + t * 0.08, lat = Math.asin(ey);
        const n = Math.sin(3 * lon + 1.3) * Math.cos(2.2 * lat) + 0.6 * Math.sin(5 * lon - 3 * lat + 0.7) + 0.3 * Math.sin(9 * lon + 4 * lat);
        const nube = Math.sin(7 * lon + t * 0.25 + 3 * lat) * Math.cos(4 * lat - lon) > 0.55;
        const lam = clamp(-0.5 * ex + 0.35 * ey + 0.8 * ez, 0, 1);
        const c = nube ? [235, 242, 255] : n > 0.35 ? [80, 185, 100] : [45, 115, 235];
        setRGB(0.18 + 0.75 * lam, c[0], c[1], c[2]);
      } else if (e2 < 1.25) setRGB(0.14 * (1.25 - e2) / 0.25, 120, 170, 255);
    }
  }
  function hacerRocas(seed, n, evitar) {
    const rng = mulberry32(seed), out = [];
    for (let k = 0; k < n; k++) {
      const y = -60 - Math.pow(rng(), 1.3) * 300, x = rng() * 1300 - 650;
      if (evitar && evitar(x, y)) continue;
      const s = 8 + (-y - 60) * 0.1 + rng() * 10;
      out.push({ x, y, rw: s * 1.7, rh: s * 0.8 });
    }
    return out;
  }
  function suelo(px, py, i, hy, rocas) {
    const n = Math.sin(px * 0.13 + py * 0.31) * Math.sin(px * 0.07 - py * 0.19);
    const lejos = 0.8 + 0.2 * clamp((hy - py) / 200, 0, 1);
    setRGB((0.31 + 0.06 * n + 0.05 * (HS[i] - 0.5)) * lejos, 168, 162, 232);
    if (HS[i] < 0.06) setRGB(0.18, 110, 105, 200);
    for (const q of rocas) {
      if (q.y > hy - 4) continue;
      const sx = (px - (q.x + q.rw * 0.55)) / (q.rw * 1.1), sy = (py - (q.y - q.rh * 0.45)) / (q.rh * 0.45);
      if (sx * sx + sy * sy < 1) setRGB(0.12, 50, 50, 135);
      const dx = (px - q.x) / q.rw, dy = (py - q.y) / q.rh;
      if (dx * dx + dy * dy < 1 && dy > -0.35) { const v = Math.max(0, dy); setRGB(0.28 + 0.45 * v - 0.08 * dx, 60 + 90 * v, 70 + 90 * v, 190 + 55 * v); }
    }
  }
  function montes(px, py, hy, esc) {
    const mh = altMonte(px * esc) * esc;
    if (py <= hy + mh && py > hy) { setRGB(0.16 + 0.14 * (py - hy) / mh, 135, 125, 210); return true; }
    return false;
  }
  // noche y tormenta para escenas de exterior (mismo criterio que finales.js)
  function postExterior(px, py, i, t, st, esCielo) {
    if (st.noche && !esCielo && !C.luz) {
      C.b *= 0.45; C.r = C.r * 0.55 + 40; C.g = C.g * 0.55 + 40; C.bl = Math.min(255, C.bl * 0.75 + 80);
    }
    if (st.tormenta && esCielo && C.b < 0.09) {
      const n = 0.5 + 0.5 * Math.sin(px * 0.02 + py * 0.03 + t * 2);
      if (n > 0.7) setRGB(0.05 + 0.05 * (n - 0.7) / 0.3, 255, 160, 70);
    }
  }
  function rafagas(t, st, dentro) {
    if (!st.tormenta) return;
    const dx = Math.cos(-0.45), dy = Math.sin(-0.45);
    for (const p of TORM) {
      const d = ((p.v * t + p.x) % 1700 + 1700) % 1700 - 850;
      const hx = p.x * 0.5 + dx * d, hy = p.y * 0.6 + 180 + dy * d;
      for (let s = 0; s < p.l; s += 5) {
        const x = hx - dx * s, y = hy - dy * s;
        if (dentro && !dentro(x, y)) continue;
        const i = cellAt(x, y);
        if (i < 0) continue;
        const v = 0.85 - 0.6 * s / p.l;
        if (v > FB[i]) { FB[i] = v; FCR[i] = 255; FCG[i] = 200 - 80 * s / p.l; FCB[i] = 90; }
      }
    }
  }
  // alarma de interior: las paredes se tiñen de rojo al ritmo del parpadeo
  function postAlarma(t, st) {
    if (!st.alarma || Math.sin(t * 9) <= 0) return;
    if (C.b < 0.62) { C.r = C.r * 0.6 + 100; C.g *= 0.55; C.bl *= 0.55; }
  }

  // ---------- pared metalica de interior ----------
  function pared(px, py, i, ton) {
    const seam = ((px + 640) % 160) < 3 || ((py + 400) % 120) < 3;
    const remache = ((px + 640) % 160) > 10 && ((px + 640) % 160) < 14 && ((py + 400) % 120) > 8 && ((py + 400) % 120) < 12;
    const b = (ton || 0.2) + 0.03 * Math.sin(px * 0.05) + 0.02 * (HS[i] - 0.5);
    set(seam ? b * 0.5 : remache ? b + 0.2 : b, PAL.metal);
  }
  function lucesTecho(px, py, t, st, y0, xs) {
    if (py < y0 || py > y0 + 14) return false;
    for (const x of xs) if (Math.abs(px - x) < 110) {
      if (st.alarma) set(Math.sin(t * 9) > 0 ? 0.95 : 0.35, PAL.rojo);
      else if (st.ahorro || st.oscuro) set(0.15, PAL.metalOsc);
      else if (st.noche) set(0.85, PAL.ambar);
      else set(0.9, PAL.cian);
      return true;
    }
    return false;
  }
  function piso(px, py, i) {
    const linea = (((px + 640) % 40) < 3) || (((py + 400) % 22) < 2);
    set(linea ? 0.08 : 0.16 + 0.02 * HS[i], PAL.metalOsc);
  }

  // =========================================================
  //  ESCENAS
  // =========================================================

  // ----- exterior de la base (es la escena de los finales) -----
  const EXTERIOR = {
    render(ctx, t, st) {
      const s = {
        luz: st.apagon ? 0 : 1, ventana: [255, 170, 60], noche: st.noche ? 1 : 0, alarma: !!st.alarma, tormenta: st.tormenta ? 1 : 0,
        marchito: st.marchito ? 1 : 0, senal: st.senal ? clamp(fr(t / 4) * 1.4, 0, 1) : 0, fuegos: 0, foco: null,
        sol: { x: -235, y: st.noche ? -240 : 175 }, solLuz: st.noche ? 0 : 1,
      };
      if (st.nave) s.foco = { x: PAD_X, y: 120 };
      escenaFinal(t, s);
      stampF(ctx);
      return () => {
        if (st.nave) {
          const spr = spriteNave(Math.floor(t * 3) % 2 === 0, 0.6);
          const [sx, sy] = aPantalla(PAD_X, GY + 60 + 10 * Math.sin(t * 2));
          ctx.drawImage(spr, sx - SPR_W * 5 / 2, sy - SPR_H * 5 / 2, SPR_W * 5, SPR_H * 5);
        }
        astro(ctx, PUERTA_X - 40, GY, Math.floor(t / 0.4) % 2 ? "a" : "b", false);
      };
    },
    etiquetas: (st) => [
      ["Tu base lunar", 425, -70, PAL.blanco, -1], ["Invernadero", 288, -90, PAL.verde, 1], ["Paneles solares", -95, -110, PAL.panel, -1],
      st.nave ? ["Nave del relevo o de suministros", PAD_X, 110, PAL.verde, 1] : ["Plataforma de aterrizaje", PAD_X, -150, PAL.ambar, 1],
    ],
  };

  // ----- campo de paneles solares -----
  const P_HY = 120;
  const ROCAS_P = hacerRocas(5, 70, (x, y) => (y > -260 && x > -460 && x < 520 && y < 80));
  const PANELES = [
    { x: -380, y: 60, w: 200, h: 56, sk: 0.35, cols: 6, rows: 2, leg: 26 },
    { x: 250, y: -20, w: 300, h: 90, sk: 0.4, cols: 8, rows: 3, leg: 40 },
    { x: -170, y: -175, w: 470, h: 150, sk: 0.45, cols: 10, rows: 4, leg: 70, roto: true, hx: -70, hy: -150, hr: 22 },
  ];
  const ESC_PANELES = {
    shade(px, py, i, t, st) {
      let esCielo = false;
      if (py > P_HY + altMonte(px * 0.8) * 0.8) { cielo(px, py, i, t, st, { sol: { x: -430, y: 250, r: 34 }, tierra: { x: 470, y: 250, r: 46 } }); esCielo = true; }
      else if (!montes(px, py, P_HY, 0.8)) suelo(px, py, i, P_HY, ROCAS_P);
      for (const P of PANELES) {
        // patas
        if (Math.abs(px - P.x) < 6 && py < P.y - P.h * 0.5 && py > P.y - P.h * 0.5 - P.leg) set(0.4, PAL.casco);
        const u = (px - P.x - (py - P.y) * P.sk) / P.w, v = (py - P.y) / P.h;
        if (Math.abs(u) > 0.5 || Math.abs(v) > 0.5) continue;
        const marco = Math.abs(u) > 0.485 || Math.abs(v) > 0.46;
        const linea = fr((u + 0.5) * P.cols) < 0.07 || fr((v + 0.5) * P.rows) < 0.09;
        if (marco) { set(0.55, PAL.casco); continue; }
        if (linea) { setRGB(0.16, 50, 60, 120); continue; }
        const solLuz = st.noche ? 0.15 : 1;
        const brillo = fr(px * 0.01 - py * 0.02 - t * 0.35) < 0.07 ? 0.35 * solLuz : 0;
        set((0.42 + 0.1 * v) * (0.55 + 0.45 * solLuz) + brillo, brillo ? [200, 230, 255] : PAL.panel);
        C.luz = true;
        if (st.polvo) { C.b *= 0.5; if (HS[i] < 0.38) set(0.42 + 0.1 * HS2[i], [190, 182, 230]); }
        if (st.roto && P.roto) {
          const dx = px - P.hx, dy = py - P.hy, d = Math.hypot(dx, dy * 1.4);
          if (d < P.hr) setRGB(0.05, 20, 22, 40);
          else if (d < P.hr * 3 && Math.abs(Math.sin(Math.atan2(dy, dx) * 5 + 0.7)) < 0.09) setRGB(0.06, 30, 30, 60);
        }
      }
      postExterior(px, py, i, t, st, esCielo);
      C.luz = false;
    },
    post(t, st) { rafagas(t, st, (x, y) => y > P_HY + 20); },
    sprites(ctx, t) { astro(ctx, 170, -258, Math.floor(t / 0.5) % 2 ? "a" : "b", true); },
    etiquetas: (st) => [
      [st.polvo ? "Paneles con polvo: cargan más lento" : "Paneles al Sol: cargan energía", -170, -110, st.polvo ? [190, 182, 230] : PAL.panel, 1],
      st.roto ? ["Panel golpeado por un micrometeorito", -70, -150, PAL.rojo, -1] : null,
      st.noche ? ["De noche no hay Sol: no cargan", 250, 30, PAL.cian, 1] : ["El Sol", -430, 250, PAL.ambar, 1],
    ],
  };

  // ----- crater oscuro -----
  const CR = { x: 40, y: -120, rx: 600, ry: 190 }, ROVER_POS = { x: -230, y: -140 };
  const ESC_CRATER = {
    shade(px, py, i, t, st) {
      const HYc = 170;
      if (py > HYc + altMonte(px * 1.2) * 0.5) { cielo(px, py, i, t, st, { tierra: { x: -470, y: 270, r: 34 } }); return; }
      if (!montes(px, py, HYc, 0.5)) { suelo(px, py, i, HYc, []); C.b *= 0.55; C.bl = Math.min(255, C.bl + 10); }
      const e = ((px - CR.x) / CR.rx) ** 2 + ((py - CR.y) / CR.ry) ** 2;
      let dentro = false;
      if (e < 1) {
        dentro = true;
        setRGB(0.05 + 0.03 * HS[i], 40, 44, 110);
        if (fr(e * 6) < 0.05) setRGB(0.09, 50, 55, 130);
        if (e > 0.8 && py > CR.y) set(0.25 + 0.3 * (e - 0.8) / 0.2, PAL.regolito);       // borde lejano iluminado
        if (e > 0.9 && py < CR.y) setRGB(0.18, 120, 115, 200);
      }
      // faro del rover
      const lx = ROVER_POS.x + 40, ly = ROVER_POS.y + 6, dx = px - lx, dy = py - ly, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), dirA = -0.1;
      const da = Math.abs(ang - dirA);
      if (dist < 560 && da < 0.3 && dx > 0) {
        const f = (1 - dist / 560) * (1 - da / 0.3);
        if (0.1 + 0.45 * f > C.b) setRGB(0.1 + 0.45 * f, 215, 210, 255);
        if (dentro && HS[i] < 0.17) { const g = 0.5 + 0.45 * f * (0.5 + 0.5 * Math.sin(t * 6 + HS2[i] * 60)); set(Math.max(g, 0.4), PAL.hielo); }
      }
      if (st.radar && dentro) {
        const dr = Math.hypot(px - ROVER_POS.x, (py - ROVER_POS.y) * 1.6), onda = fr((dr - t * 140) / 110);
        if (onda < 0.03) set(0.55, PAL.cian);
        if (HS[i] < 0.17 && fr((dr - t * 140) / 110) < 0.25 && dist > 90) set(0.7, PAL.cian);
      }
    },
    sprites(ctx, t) { dibujarRover(ctx, ROVER_POS.x, ROVER_POS.y, t); },
    etiquetas: (st) => [
      ["Hielo: solo donde nunca da el Sol", 260, -150, PAL.hielo, 1],
      ["El rover no recarga aquí", ROVER_POS.x, ROVER_POS.y + 20, PAL.ambar, -1],
      st.radar ? ["Radar del rover", -40, -60, PAL.cian, 1] : null,
    ],
  };

  // ----- sala de control -----
  const V = { cx: 0, cy: 70, hw: 400, hh: 185, cut: 80 };
  const enOct = (px, py, hw, hh, cut) => {
    const ax = Math.abs(px - V.cx), ay = Math.abs(py - V.cy);
    return ax <= hw && ay <= hh && (ax - (hw - cut)) + (ay - (hh - cut)) <= cut;
  };
  const ROCAS_V = hacerRocas(9, 50, () => false);
  const ESC_CONTROL = {
    shade(px, py, i, t, st) {
      if (enOct(px, py, V.hw, V.hh, V.cut)) {                       // la ventana
        const hyv = V.cy - 50;
        let esCielo = false;
        if (py > hyv + altMonte(px * 1.4) * 0.55) { cielo(px, py, i, t, st, { tierra: { x: 230, y: 175, r: 38 }, sol: { x: -230, y: 190, r: 26 } }); esCielo = true; }
        else if (!montes(px, py, hyv, 0.55)) suelo(px, py * 1.6 + 60, i, hyv * 1.6 + 60, ROCAS_V);
        postExterior(px, py, i, t, st, esCielo);
        C.b *= 0.92;
        return;
      }
      if (enOct(px, py, V.hw + 20, V.hh + 20, V.cut + 8)) { set(0.5 + 0.15 * Math.sign(py - V.cy) * 0.5, PAL.casco); return; }
      if (lucesTecho(px, py, t, st, 300, [-330, 330])) return;
      pared(px, py, i, 0.2);
      if (enRect(px, py, -640, 640, 268, 280) || enRect(px, py, -640, 640, -150, -140)) set(0.38, PAL.casco);
      // pantallas laterales
      for (const [x0, x1, tipo] of [[-610, -450, "texto"], [450, 610, "barras"]]) {
        if (!enRect(px, py, x0, x1, -110, 90)) continue;
        if (!enRect(px, py, x0 + 8, x1 - 8, -102, 82)) { set(0.45, PAL.casco); continue; }
        setRGB(0.14, 15, 35, 70);
        if (tipo === "texto") {
          if (fr((py + 102) / 22) < 0.35 && HS[i] < 0.75 - 0.4 * fr(py * 0.013) && px < x1 - 20 - 50 * fr(py * 0.031)) set(0.6, st.alarma ? PAL.rojo : PAL.cian);
          if (st.llamada) { const d = Math.hypot(px - (x0 + x1) / 2, py + 10); if (fr((d - t * 60) / 30) < 0.12) set(0.75, PAL.cian); }
        } else {
          const col = Math.floor((px - x0 - 12) / 26), alto = 40 + 70 * (0.5 + 0.5 * Math.sin(t * 1.5 + col * 1.7));
          if (fr((px - x0 - 12) / 26) < 0.7 && py < -98 + alto) set(0.65, col % 3 === 0 ? PAL.ambar : PAL.verde);
        }
      }
      // escritorio con botones y onda de comunicacion
      if (enRect(px, py, -640, 640, -210, -192)) set(0.55, PAL.casco);
      if (py < -210) { set(0.13 + 0.02 * HS[i], PAL.metalOsc); if (fr((py + 400) / 30) < 0.12 && Math.abs(px) < 600) C.b = 0.05; }
      if (enRect(px, py, -170, 170, -186, -130)) {
        setRGB(0.12, 15, 35, 70);
        const onda = -158 + 14 * Math.sin(px * 0.05 + t * 4) * (st.llamada ? 1.6 : 0.6);
        if (Math.abs(py - onda) < 3) set(0.8, PAL.cian);
      }
      if (enRect(px, py, -560, 560, -204, -197) && Math.abs(px) > 180 && fr((px + 560) / 34) < 0.35) {
        const k = Math.floor((px + 560) / 34) % 3, on = Math.sin(t * (2 + k) + px) > -0.4;
        set(on ? 0.85 : 0.25, k === 0 ? PAL.ambar : k === 1 ? PAL.verde : PAL.rojo);
      }
      // litera para descansar (esquina inferior izquierda)
      if (enRect(px, py, -640, -470, -330, -290)) set(0.4, PAL.casco);
      if (enRect(px, py, -630, -480, -290, -270)) set(0.35, [120, 130, 200]);
      postAlarma(t, st);
    },
    post(t, st) { rafagas(t, st, (x, y) => enOct(x, y, V.hw, V.hh, V.cut) && y > V.cy - 10); },
    sprites(ctx, t) { astro(ctx, -300, -192, Math.floor(t / 0.6) % 2 ? "a" : "b", false); },
    etiquetas: (st) => [
      st.llamada ? ["Llamada entrante de Control de Misión", -530, 0, PAL.cian, 1] : ["Pantallas de la base", -530, 0, PAL.cian, 1],
      ["La ventana muestra día, noche o tormenta", 120, 150, PAL.blanco, 1],
      ["Litera para descansar", -555, -300, PAL.casco, 1],
    ],
  };

  // ----- invernadero -----
  const DOMO = { cx: 0, cy: -330, rx: 720, ry: 640 };
  const BANDEJAS = [-60, -170, -280];
  const ESC_INVERNADERO = {
    shade(px, py, i, t, st) {
      const e = ((px - DOMO.cx) / DOMO.rx) ** 2 + ((py - DOMO.cy) / DOMO.ry) ** 2;
      const luz = st.sinLuz ? 0.25 : 1;
      if (py < -330) piso(px, py, i);
      else if (e > 1.035) pared(px, py, i, 0.14);
      else if (e > 0.985) set(0.5, PAL.casco);
      else {
        // vidrio del domo: espacio con estrellas, y costillas
        cielo(px, py, i, t, st, { tierra: { x: 420, y: 230, r: 30 } });
        const th = Math.atan2(py - DOMO.cy, px - DOMO.cx);
        if (Math.abs(Math.sin(th * 9)) < 0.045 || Math.abs(e - 0.55) < 0.008) set(0.35, PAL.casco);
        if (py < 140) { set(0.1 + 0.03 * HS[i], PAL.metalOsc); }
      }
      // focos de cultivo
      if (enRect(px, py, -480, 480, 110, 122) && fr((px + 480) / 160) < 0.82) set(st.sinLuz ? 0.15 : 0.92, [255, 228, 255]);
      if (!st.sinLuz && py < 110 && py > -330 && Math.abs(px) < 480 && C.b < 0.2) C.b += 0.05 * (1 - (110 - py) / 440);
      // bandejas y plantas
      BANDEJAS.forEach((y0, k) => {
        if (enRect(px, py, -520, 520, y0 - 16, y0)) set(0.42, PAL.casco);
        if (enRect(px, py, -520, 520, y0 - 22, y0 - 16)) set(0.15, PAL.metalOsc);
        const h = 58 + 16 * Math.sin(px * 0.07 + k) + 10 * Math.sin(px * 0.23 + k * 2);
        if (py > y0 && py < y0 + h && Math.abs(px) < 510 && HS[i] > 0.28) {
          const hoja = (0.42 + 0.22 * Math.sin(px * 0.3 + py * 0.2)) * (0.45 + 0.55 * luz);
          if (st.moho) { if (HS2[i] < 0.24) set(0.62, [235, 235, 225]); else set(hoja * 0.85, [150, 170, 80]); }
          else set(hoja, PAL.planta);
          if (!st.moho && k === 0 && HS2[i] < 0.05 && py > y0 + h * 0.5) set(0.75 * (0.5 + 0.5 * luz), [255, 110, 80]);
        }
        if (st.agua && enRect(px, py, -520, 520, y0 - 40, y0 - 22) && HS[i] < 0.12) {
          const gota = fr((py - t * 80) / 18 + HS2[i]) < 0.3;
          if (gota) set(0.7, PAL.agua);
        }
      });
      if (st.agua && py < -330 && Math.abs(px) < 360 && ((px / 360) ** 2 + ((py + 350) / 18) ** 2) < 1) set(0.42 + 0.1 * Math.sin(px * 0.08 + t * 3), PAL.agua);
      postAlarma(t, st);
    },
    sprites(ctx, t) { astro(ctx, 430, -330, Math.floor(t / 0.6) % 2 ? "a" : "b", true); },
    etiquetas: (st) => [
      st.moho ? ["Moho: demasiada agua", -200, -20, [235, 235, 225], -1] : ["Plantas sanas: comida", -200, -20, PAL.verde, -1],
      st.sinLuz ? ["Sin luz las plantas no crecen", 150, 116, PAL.metal, 1] : ["Luces de cultivo (gastan energía)", 150, 116, [255, 228, 255], 1],
      st.agua ? ["Agua de más", 0, -350, PAL.agua, 1] : null,
    ],
  };

  // ----- sala de maquinas y almacen -----
  const TANQUE = { x0: -520, x1: -300, y0: -260, y1: 140 };
  const ESC_MAQUINAS = {
    shade(px, py, i, t, st) {
      if (py < -300) piso(px, py, i);
      else pared(px, py, i, st.ahorro ? 0.1 : 0.15);
      if (lucesTecho(px, py, t, st, 318, [-400, 0, 400])) return;
      // tuberias horizontales y verticales
      for (const [yc, r] of [[262, 14], [222, 9]]) {
        const d = Math.abs(py - yc);
        if (d < r) { set(0.25 + 0.4 * (1 - d / r), PAL.metal); if (fr((px + 640) / 140) < 0.05) set(0.65, PAL.ambar); }
      }
      if (Math.abs(px + 590) < 12 && py > -300 && py < 262) set(0.25 + 0.4 * (1 - Math.abs(px + 590) / 12), PAL.metal);
      // tanque de agua
      const T = TANQUE;
      if (enRect(px, py, T.x0, T.x1, T.y0, T.y1)) {
        if (!enRect(px, py, T.x0 + 8, T.x1 - 8, T.y0 + 8, T.y1 - 8)) set(0.5, PAL.casco);
        else {
          setRGB(0.08, 20, 30, 60);
          const nivel = T.y0 + (T.y1 - T.y0) * (st.fuga ? 0.4 : 0.72) + 5 * Math.sin(px * 0.05 + t * 2);
          if (py < nivel) { set(0.38 + 0.06 * Math.sin(py * 0.1), PAL.agua); if (HS[i] < 0.02 && fr(t * 0.5 + HS2[i]) < 0.5) set(0.85, PAL.hielo); }
          if (Math.abs(py - nivel) < 2) set(0.7, PAL.hielo);
        }
      }
      // filtros
      [[-250, PAL.blanco], [-180, [170, 175, 200]], [-110, PAL.agua]].forEach(([x, c]) => {
        const d = Math.abs(px - x);
        if (d < 26 && py > -260 && py < 60) set(0.2 + 0.45 * (1 - d / 26), c);
        if (d < 30 && ((py > 60 && py < 72) || (py > -272 && py < -260))) set(0.6, PAL.ambar);
      });
      // baterias
      if (enRect(px, py, 0, 300, -260, 60)) {
        const cx = Math.floor(px / 75), cy = Math.floor((py + 260) / 107), lx = px - cx * 75, ly = py + 260 - cy * 107;
        if (lx < 6 || ly < 6) set(0.45, PAL.casco);
        else {
          setRGB(0.08, 20, 24, 40);
          const carga = st.noche ? clamp(0.55 - fr(t / 6) * 0.5 - cx * 0.04, 0.05, 1) : 0.85 - cx * 0.05;
          if (ly - 6 < (107 - 12) * carga && lx > 12 && lx < 66) set(0.6, carga > 0.55 ? PAL.verde : carga > 0.3 ? PAL.ambar : PAL.rojo);
        }
      }
      // termometro
      if (enRect(px, py, 330, 356, -40, 180)) {
        const alto = -40 + 220 * (st.calor ? 0.92 : 0.45);
        set(0.45, PAL.casco);
        if (enRect(px, py, 336, 350, -36, alto)) set(0.75, st.calor ? PAL.rojo : PAL.naranja);
      }
      // tablero de interruptores
      if (enRect(px, py, 390, 610, -60, 170)) {
        set(0.22, PAL.metalOsc);
        const cx = Math.floor((px - 390) / 44), cy = Math.floor((py + 60) / 57), lx = px - 390 - cx * 44, ly = py + 60 - cy * 57;
        const apagado = st.ahorro && (cx + cy) % 2 === 1;
        if (lx > 12 && lx < 32 && ly > 10 && ly < 44) { const arriba = apagado ? ly < 27 : ly > 27; set(arriba ? 0.6 : 0.18, PAL.casco); }
        if (lx > 18 && lx < 26 && ly > 47 && ly < 53) set(0.85, apagado ? PAL.rojo : PAL.verde);
      }
      // almacen: repisas con cajas de comida
      if (enRect(px, py, 390, 630, -300, -90)) {
        for (const y of [-300, -230, -160, -96]) if (Math.abs(py - y) < 4) set(0.45, PAL.casco);
        const caja = Math.floor((px - 390) / 60), fila = Math.floor((py + 296) / 70), lx = (px - 390) % 60, ly = (py + 296) % 70;
        const caida = st.sismo && (caja + fila) % 3 === 0;
        if (!caida && lx > 6 && lx < 52 && ly > 4 && ly < 52) set(lx < 9 || ly > 49 ? 0.25 : 0.45, [200, 150, 90]);
      }
      if (st.sismo && py < -300 && py > -340 && px > 380 && px < 640 && ((Math.floor((px - 380) / 52) % 2) === 0) && HS[i] > 0.3) set(0.45, [200, 150, 90]);
      // fuga: gotas desde la union de la tuberia y charco en el piso
      if (st.fuga) {
        const dx = Math.abs(px + 300);
        if (dx < 4 && py < 210 && py > -300 && fr((py + t * 160) / 70) < 0.2) set(0.85, PAL.agua);
        if (py < -300 && ((px + 300) / (160 + 20 * Math.sin(t))) ** 2 + ((py + 322) / 18) ** 2 < 1) set(0.42 + 0.1 * Math.sin(px * 0.08 + t * 3), PAL.agua);
      }
      if (st.calor && py > 120 && py < 300) { C.r = Math.min(255, C.r + 60 + 30 * Math.sin(px * 0.03 + t * 3)); C.g *= 0.85; C.bl *= 0.7; }
      postAlarma(t, st);
    },
    sprites(ctx, t) { astro(ctx, -40, -300, Math.floor(t / 0.6) % 2 ? "a" : "b", false); },
    etiquetas: (st) => [
      ["Tanque de agua reciclada", -410, 150, PAL.agua, 1],
      [st.noche ? "Baterías: de noche solo se gastan" : "Baterías", 150, 70, PAL.verde, 1],
      [st.ahorro ? "Modo ahorro: módulos apagados" : "Interruptores de energía", 500, 175, st.ahorro ? PAL.rojo : PAL.casco, -1],
      st.fuga ? ["Fuga: se pierde agua (y oxígeno)", -300, 200, PAL.agua, 1] : null,
      st.calor ? ["Calor: baja la salud", 343, 185, PAL.rojo, -1] : null,
      ["Almacén de comida", 510, -85, [200, 150, 90], -1],
    ],
  };

  // ----- pasillo y refugio -----
  const VP = { x: 0, y: 30 }, W0 = 600, H0 = 330, FONDO = 4;
  const ESC_PASILLO = {
    shade(px, py, i, t, st) {
      const dx = px - VP.x, dy = py - VP.y;
      const s = Math.max(Math.abs(dx) / W0, Math.abs(dy) / H0), z = 1 / Math.max(s, 1e-4);
      if (z >= FONDO) {
        // pared del fondo con la escotilla del refugio (paredes gruesas)
        const rad = Math.hypot(dx, dy), Rd = H0 / FONDO * 0.78;
        set(0.2, PAL.metal);
        if (rad < Rd + 26 && rad >= Rd) { set(0.42, [150, 140, 205]); }                         // pared gruesa
        if (rad < Rd + 34 && rad >= Rd + 26) { const k = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 8)); set(k % 2 ? 0.75 : 0.1, k % 2 ? PAL.ambar : [20, 20, 30]); }
        if (rad < Rd) {
          if (st.compuerta) set(0.32 + 0.1 * Math.sin(t * 2), PAL.ambar);
          else { set(0.45, PAL.casco); if (Math.abs(dx) < 4 || Math.abs(dy) < 4 || Math.abs(rad - Rd * 0.45) < 3) set(0.2, PAL.metalOsc); }
        }
      } else {
        const lado = Math.abs(dx) / W0 > Math.abs(dy) / H0;
        const prof = Math.pow(z, 0.45);
        if (fr(z) < 0.07 * z) set(0.6 / Math.pow(z, 0.3), PAL.casco);                            // costillas
        else if (!lado && dy > 0) {                                                              // techo
          set(0.2 / prof, PAL.metal);
          if (Math.abs(dx) < 0.13 * W0 * s) {
            if (st.alarma) set(Math.sin(t * 9) > 0 ? 0.9 / Math.pow(z, 0.3) : 0.3, PAL.rojo);
            else if (!st.oscuro) set(0.85 / Math.pow(z, 0.3), PAL.cian);
          }
        } else if (!lado) {                                                                      // piso
          const u = dx / (W0 * s);
          set((fr(u * 6) < 0.05 ? 0.08 : 0.17) / Math.pow(z, 0.4), PAL.metalOsc);
        } else {                                                                                 // paredes
          const v = dy / (H0 * s);
          set((fr(v * 4 + 0.5) < 0.05 ? 0.1 : 0.26) / prof + 0.02 * HS[i], PAL.metal);
        }
      }
      // agujero de micrometeorito en la pared derecha
      if (st.agujero) {
        const hx = 420, hy = 20, ex = (px - hx) / 30, ey = (py - hy) / 46, d = Math.hypot(ex, ey) + 0.15 * Math.sin(Math.atan2(ey, ex) * 7);
        if (d < 1) setRGB(0.04, 10, 10, 20);
        else if (d < 1.4) set(0.55, PAL.casco);
        for (let k = 0; k < 18; k++) {
          const f = fr(t * 0.6 + k / 18), sx = hx - 420 * (1 - f) + 30 * Math.sin(k * 3.1), sy = hy + (k % 6 - 2.5) * 30 * (1 - f);
          if (Math.abs(px - sx) < 8 && Math.abs(py - sy) < 2) set(0.6 * f + 0.2, PAL.hielo);
        }
      }
      if (st.oscuro) {
        const ax = px, ay = py + 360, a = Math.atan2(ax, ay), dd = Math.hypot(ax, ay);
        const enCono = Math.abs(a) < 0.32 && dd < 700;
        if (!enCono) C.b *= 0.18; else C.b *= 0.35 + 0.65 * (1 - Math.abs(a) / 0.32);
      }
      if (st.alarma) {
        const barrido = Math.cos(Math.atan2(dy, dx) - t * 3);
        if (barrido > 0.85 && C.b < 0.6) { C.r = Math.min(255, C.r * 0.5 + 160); C.g *= 0.4; C.bl *= 0.4; C.b = Math.max(C.b, 0.25); }
      }
    },
    sprites(ctx, t, st) { astro(ctx, -60 + (st.compuerta ? 40 * fr(t / 3) : 0), -250, Math.floor(t / 0.3) % 2 ? "a" : "b", false); },
    etiquetas: (st) => [
      ["Refugio: paredes gruesas", 0, 30 + H0 / FONDO * 0.78, [150, 140, 205], 1],
      [st.compuerta ? "Compuerta abierta: entra al refugio" : "Compuerta cerrada", 0, 30 - H0 / FONDO * 0.78, PAL.ambar, -1],
      st.agujero ? ["Agujero: se escapa el aire", 420, 70, PAL.hielo, -1] : null,
    ],
  };

  // ----- plano de la base (corte) -----
  const MODULOS = [
    { id: "control", nombre: "Sala de control", x0: -310, x1: -50, y0: -60, y1: 110 },
    { id: "invernadero", nombre: "Invernadero", x0: -20, x1: 280, y0: -60, y1: 90 },
    { id: "maquinas", nombre: "Máquinas y almacén", x0: 300, x1: 520, y0: -60, y1: 70 },
    { id: "pasillo", nombre: "Pasillo y refugio", x0: 20, x1: 240, y0: -300, y1: -70 },
    { id: "paneles", nombre: "Paneles solares", x0: -600, x1: -350, y0: -60, y1: 20 },
  ];
  const ESC_PLANO = {
    shade(px, py, i, t, st) {
      const piso0 = -60;
      if (py > piso0) cielo(px, py, i, t, st, { tierra: { x: 520, y: 260, r: 40 }, sol: { x: -520, y: 260, r: 28 } });
      else { set(0.2 + 0.05 * Math.sin(py * 0.15 + Math.sin(px * 0.02) * 2) + 0.03 * HS[i], [130, 125, 200]); if (py > piso0 - 6) set(0.4, PAL.regolito); }
      const casco = (x0, x1, y0, y1, g) => enRect(px, py, x0, x1, y0, y1) && !enRect(px, py, x0 + g, x1 - g, y0 + g, y1 - g);
      const sel = st.resaltar;
      // control
      if (enRect(px, py, -310, -50, -60, 110)) {
        pared(px, py, i, 0.22);
        if (enRect(px, py, -250, -120, 20, 80)) { set(st.noche ? 0.05 : 0.12, [20, 30, 70]); if (HS[i] < 0.05) set(0.5, PAL.blanco); }
        if (Math.abs(py + 20) < 3 && px > -290 && px < -70) set(0.75, PAL.cian);
        if (enRect(px, py, -300, -220, -52, -36)) set(0.5, [120, 130, 200]);
      }
      if (casco(-310, -50, -60, 110, 8)) set(0.55, PAL.casco);
      // invernadero (domo)
      const ed = ((px - 130) / 150) ** 2 + ((py + 60) / 150) ** 2;
      if (py >= -60 && ed < 1) {
        set(0.12, PAL.metalOsc);
        if (py < 20 && HS[i] > 0.3) set(0.5 + 0.15 * Math.sin(px * 0.3), PAL.planta);
        if (Math.abs(py - 50) < 3 && Math.abs(px - 130) < 90) set(0.8, [255, 228, 255]);
        if (ed > 0.9) set(0.55, PAL.casco);
      }
      // maquinas
      if (enRect(px, py, 300, 520, -60, 70)) {
        pared(px, py, i, 0.16);
        if (Math.abs(py - 40) < 5) set(0.5, PAL.metal);
        if (enRect(px, py, 320, 380, -50, 20)) set(0.42, PAL.agua);
        if (enRect(px, py, 420, 500, -50, 0) && fr((px - 420) / 20) < 0.7) set(0.6, PAL.verde);
      }
      if (casco(300, 520, -60, 70, 8)) set(0.55, PAL.casco);
      // pasillo de conexion
      if (enRect(px, py, -50, 300, -48, -12) && !(ed < 1 && py >= -60)) { set(0.14, PAL.metalOsc); if (Math.abs(py + 22) < 2 && fr(px / 40) < 0.2) set(0.7, PAL.cian); }
      // escalera y refugio bajo tierra
      if (enRect(px, py, 112, 136, -150, -60)) { set(0.14, PAL.metalOsc); if (fr((py + 150) / 14) < 0.2) set(0.5, PAL.casco); }
      if (enRect(px, py, 20, 240, -300, -150)) {
        if (casco(20, 240, -300, -150, 26)) set(0.4, [150, 140, 205]);
        else set(0.3 + 0.05 * Math.sin(t * 2), PAL.ambar);
      }
      // paneles
      const sk = (py + 40) * 0.6;
      if (py > -40 && py < 10 && px > -600 + sk && px < -360 + sk) set(fr((px - sk) / 24) < 0.12 ? 0.15 : 0.5, PAL.panel);
      if ((Math.abs(px + 520) < 4 || Math.abs(px + 420) < 4) && py > -60 && py < -35) set(0.4, PAL.casco);
      // antena
      if (Math.abs(px - 570) < 4 && py > -60 && py < 150) set(0.55, PAL.casco);
      if (Math.abs(px - 570) < 7 && py > 150 && py < 162) set(Math.sin(t * 4) > 0 ? 0.95 : 0.2, PAL.rojo);
      if (st.noche && py > -60 && C.b < 0.3 && !(enRect(px, py, -310, 520, -60, 110))) C.b *= 0.5;
      if (sel && st.alarma) { const m = MODULOS.find((x) => x.id === sel); if (m && enRect(px, py, m.x0, m.x1, m.y0, m.y1) && Math.sin(t * 9) > 0) { C.r = C.r * 0.6 + 100; C.g *= 0.5; C.bl *= 0.5; } }
    },
    etiquetas: () => MODULOS.map((m) => [m.nombre, (m.x0 + m.x1) / 2, m.y1 - 10, m.id === "pasillo" ? [150, 140, 205] : PAL.blanco, m.x0 > 0 ? 1 : -1]),
  };

  // ---------- sprites propios ----------
  const ROVER = [
    ".....A........",
    ".....K........",
    "..KKKKKKKKKK..",
    ".KWWWWWWWWWWKL",
    ".KWBBWWWWGGWKL",
    ".KWWWWWWWWWWK.",
    "KKKKKKKKKKKKKK",
    "KDDK.KDDK.KDDK",
    ".KK...KK...KK.",
  ];
  const ROVER_PAL = { K: [40, 44, 60], W: [235, 238, 248], B: [60, 140, 255], G: [165, 172, 196], D: [120, 126, 150], A: [255, 150, 60], L: [255, 240, 170] };
  let roverCv = null;
  function dibujarRover(ctx, x, y, t) {
    if (!roverCv) {
      roverCv = document.createElement("canvas"); roverCv.width = ROVER[0].length; roverCv.height = ROVER.length;
      const g = roverCv.getContext("2d"), img = g.createImageData(roverCv.width, roverCv.height);
      ROVER.forEach((row, yy) => [...row].forEach((ch, xx) => {
        if (ch === ".") return; const c = ROVER_PAL[ch], k = (yy * roverCv.width + xx) * 4;
        img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
      }));
      g.putImageData(img, 0, 0);
    }
    const [sx, sy] = aPantalla(x, y + Math.sin(t * 3) * 1.5), e = 5;
    ctx.drawImage(roverCv, sx - roverCv.width * e / 2, sy - roverCv.height * e, roverCv.width * e, roverCv.height * e);
  }
  function astro(ctx, x, y, f, izquierda) {
    const spr = spriteAstro(f), [sx, sy] = aPantalla(x, y), w = spr.width * 5, h = spr.height * 5;
    ctx.save(); ctx.translate(sx, sy); if (izquierda) ctx.scale(-1, 1); ctx.drawImage(spr, -w / 2, -h, w, h); ctx.restore();
  }

  // ---------- render generico ----------
  function renderCeldas(ctx, esc, t, st) {
    for (let i = 0; i < FN; i++) {
      C.b = 0; C.r = 0; C.g = 0; C.bl = 0; C.luz = false;
      esc.shade(FPX[i], FPY[i], i, t, st);
      FB[i] = C.b; FCR[i] = clamp(C.r, 0, 255); FCG[i] = clamp(C.g, 0, 255); FCB[i] = clamp(C.bl, 0, 255);
    }
    if (esc.post) esc.post(t, st);
    for (let i = 0; i < FN; i++) {
      let b = FB[i];
      if (b < 0.04) b = 0;
      FIDX[i] = Math.min(RAMP.length - 1, Math.floor(Math.pow(b, 0.8) * (RAMP.length - 1) + 0.5));
      const fac = 0.45 + 0.55 * Math.min(1, b * 1.8);
      FCR[i] = clamp(FCR[i] * fac, 0, 255); FCG[i] = clamp(FCG[i] * fac, 0, 255); FCB[i] = clamp(FCB[i] * fac, 0, 255);
    }
    stampF(ctx);
  }
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  function render(ctx, id, t, st) {
    const esc = ESCENAS[id];
    let encima = null;
    if (esc.render) encima = esc.render(ctx, t, st);
    else renderCeldas(ctx, esc, t, st);
    ctx.save(); ctx.scale(FC, FC); ctx.imageSmoothingEnabled = false;
    if (encima) encima();
    if (esc.sprites) esc.sprites(ctx, t, st);
    if (st.etiquetas !== false && esc.etiquetas) for (const e of esc.etiquetas(st)) if (e) dibujarEtiqueta(ctx, { txt: e[0], x: e[1], y: e[2], col: rgb(e[3]), lado: e[4], a: 1 });
    ctx.restore();
  }

  const ESCENAS = {
    plano: ESC_PLANO, exterior: EXTERIOR, paneles: ESC_PANELES, crater: ESC_CRATER,
    control: ESC_CONTROL, invernadero: ESC_INVERNADERO, maquinas: ESC_MAQUINAS, pasillo: ESC_PASILLO,
  };
  window.GNOSIS_ESCENAS = { render, PAL, MODULOS, ids: Object.keys(ESCENAS) };
})();

/* =========================================================
   G-NOSIS - utilidades para los cuadros de dialogo

   1) mostrarDialogo(elemento, {...})  ->  rellena un .gn-dialogo
      del HTML y escribe el texto letra por letra.
   2) dibujarPanel9(ctx, img, x, y, w, h, corte, escala)  ->  dibuja
      un sprite 9-slice en un <canvas> (para juegos hechos en canvas).
   ========================================================= */

function mostrarDialogo(el, { etiqueta = "", titulo = "", texto = "", boton = "Continuar", velocidad = 28, alPulsar } = {}) {
  el.querySelector(".gn-etiqueta").textContent = etiqueta;
  el.querySelector(".gn-etiqueta").hidden = !etiqueta;
  el.querySelector(".gn-titulo").textContent = titulo;
  const p = el.querySelector(".gn-texto");
  const btn = el.querySelector(".gn-boton");
  btn.querySelector(".gn-txt").textContent = boton;
  btn.hidden = true;
  p.textContent = "";
  clearInterval(el._tw);
  let i = 0;
  const terminar = () => { clearInterval(el._tw); p.textContent = texto; btn.hidden = false; };
  el._tw = setInterval(() => { p.textContent = texto.slice(0, ++i); if (i >= texto.length) terminar(); }, velocidad);
  // tocar el cuadro mientras escribe completa el texto
  el.onclick = e => { if (!btn.contains(e.target) && i < texto.length) { i = texto.length; terminar(); } };
  btn.onclick = () => alPulsar && alPulsar();
}

// ---------- 9-slice en canvas ----------
// img: sprite a 1x (p. ej. dialogo_panel_1x.png), corte: pixeles de esquina a 1x
// (panel = 16, etiqueta = 10, boton = 6), escala: tamano del pixel (p. ej. 4)
function dibujarPanel9(ctx, img, x, y, w, h, corte, escala = 4) {
  const c = corte, C = corte * escala, sw = img.width, sh = img.height;
  const xs = [0, c, sw - c, sw], ys = [0, c, sh - c, sh];
  const dx = [x, x + C, x + w - C, x + w], dy = [y, y + C, y + h - C, y + h];
  ctx.imageSmoothingEnabled = false;
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) {
      const w1 = xs[i + 1] - xs[i], h1 = ys[j + 1] - ys[j];
      const w2 = dx[i + 1] - dx[i], h2 = dy[j + 1] - dy[j];
      if (w1 > 0 && h1 > 0 && w2 > 0 && h2 > 0) ctx.drawImage(img, xs[i], ys[j], w1, h1, dx[i], dy[j], w2, h2);
    }
}

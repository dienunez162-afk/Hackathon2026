/* =========================================================
   G-NOSIS  -  soundtrack
   Los navegadores no dejan sonar audio hasta que el usuario
   interactua, asi que la musica arranca con el primer clic,
   toque o tecla, con un fundido de entrada suave.
   M o el boton de arriba a la derecha = silenciar / activar.
   ========================================================= */

const MUSICA_VOL = 0.55;
const musica = new Audio("audio/soundtrack.mp3");
musica.loop = true;
musica.preload = "auto";
musica.volume = 0;

let musicaIniciada = false;
let introActiva = true;       // false mientras se juega en la base
let silenciado = false;
try { silenciado = localStorage.getItem("gnosis-silencio") === "1"; } catch (e) { }
musica.muted = silenciado;

let fadeId = null;
function fundirVolumen(objetivo, ms) {
  cancelAnimationFrame(fadeId);
  const desde = musica.volume, t0 = performance.now();
  const paso = now => {
    const k = Math.min(1, (now - t0) / ms);
    musica.volume = desde + (objetivo - desde) * k;
    if (k < 1) fadeId = requestAnimationFrame(paso);
  };
  fadeId = requestAnimationFrame(paso);
}

function iniciarMusica() {
  if (musicaIniciada) return;
  musicaIniciada = true;
  if (!introActiva) return;     // dentro de la base no suena el soundtrack
  musica.play()
    .then(() => fundirVolumen(MUSICA_VOL, 2500))
    .catch(() => { musicaIniciada = false; });   // se reintenta en la siguiente interaccion
}

function alternarSilencio() {
  silenciado = !silenciado;
  musica.muted = silenciado;
  try { localStorage.setItem("gnosis-silencio", silenciado ? "1" : "0"); } catch (e) { }
  iniciarMusica();
}

// boton de sonido (arriba a la derecha); devuelve su rectangulo para los clics
let botonSonido = { x: 0, y: 0, w: 0, h: 0 };
function dibujarBotonSonido(ctx) {
  const txt = !musicaIniciada ? "♪ toca para activar el sonido"
    : silenciado ? "♪ SONIDO: NO  [M]" : "♪ SONIDO: SI  [M]";
  ctx.font = `13px ${FONT_FAMILY}`;
  ctx.textAlign = "right"; ctx.textBaseline = "top";
  const w = ctx.measureText(txt).width;
  ctx.fillStyle = !musicaIniciada ? "rgb(150,160,185)" : silenciado ? "rgb(90,96,112)" : "rgb(170,180,205)";
  ctx.fillText(txt, W - 16, 14);
  botonSonido = { x: W - 16 - w - 6, y: 8, w: w + 12, h: 24 };
}

// al entrar a la base: el soundtrack se apaga suave y se pausa
function salirIntro() {
  introActiva = false;
  fundirVolumen(0, 1200);
  setTimeout(() => { if (!introActiva) musica.pause(); }, 1300);
}
// al volver al menú: regresa el soundtrack
function volverIntro() {
  introActiva = true;
  if (!musicaIniciada) return;
  musica.play().then(() => fundirVolumen(MUSICA_VOL, 1800)).catch(() => {});
}

/* =========================================================
   G-NOSIS  -  soundtrack de la intro y botón de sonido
   Los navegadores no dejan sonar audio hasta que el usuario
   interactúa, así que el sonido se habilita con el primer clic,
   toque o tecla. Qué suena en cada momento (intro, acordes de la
   base, alarma o finales) lo decide un solo control en
   musica-base.js, según la escena actual.
   M o el botón de arriba a la derecha = silenciar / activar.
   ========================================================= */

const MUSICA_VOL = 0.55;
const musica = new Audio("audio/soundtrack.mp3");
musica.loop = true;
musica.preload = "auto";
musica.volume = 0;

let musicaIniciada = false;   // true después del primer clic, toque o tecla
let silenciado = false;
try { silenciado = localStorage.getItem("gnosis-silencio") === "1"; } catch (e) { }
musica.muted = silenciado;

function iniciarMusica() {
  if (musicaIniciada) return;
  musicaIniciada = true;
  // se llama dentro del clic, para que el navegador deje reproducir
  if (window.MUSICA_BASE) MUSICA_BASE.sincronizar();
}

function alternarSilencio() {
  silenciado = !silenciado;
  try { localStorage.setItem("gnosis-silencio", silenciado ? "1" : "0"); } catch (e) { }
  iniciarMusica();
  if (window.MUSICA_BASE) MUSICA_BASE.sincronizar();
}

// botón de sonido (arriba a la derecha); devuelve su rectángulo para los clics
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

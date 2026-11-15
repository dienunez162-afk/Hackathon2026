/* G-NOSIS - azar repetible. Con ?semilla=N el azar del juego sale igual cada vez (lo usa la prueba de humo y sirve
   para reproducir un error). Sin el parámetro no hace nada. Debe cargarse antes que los demás scripts. */
(function () {
  const s = new URLSearchParams(location.search).get("semilla");
  if (s == null || s === "") return;
  let a = (parseInt(s, 10) || 1) >>> 0;
  Math.random = function () {            // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

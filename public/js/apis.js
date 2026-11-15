/* =========================================================
   G-NOSIS  -  datos reales de la NASA
   El navegador nunca ve las llaves: pide a las funciones de
   /api (Vercel), que leen las variables de entorno. Si no hay
   conexión o la función no está configurada, el juego usa datos
   de muestra marcados como tales, y sigue funcionando igual.
   ========================================================= */
(() => {
  "use strict";
  const dia = (k) => new Date(Date.now() - k * 864e5).toISOString().slice(0, 10);
  const MUESTRA_DONKI = {
    fuente: "NASA DONKI (datos de muestra, sin conexión)", muestra: true,
    llamaradas: [{ fecha: dia(6), clase: "C4.1" }, { fecha: dia(3), clase: "M1.3" }, { fecha: dia(1), clase: "C8.0" }],
    cmes: [{ fecha: dia(4), nota: "CME hacia el este" }, { fecha: dia(1), nota: "CME lenta" }],
  };
  const conTiempo = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("tiempo agotado")), ms))]);
  async function pedir(url) {
    const r = await conTiempo(fetch(url, { headers: { accept: "application/json" } }), 6000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  const A = {
    // lo que usan los minijuegos y el grafo
    datos: { donki: MUESTRA_DONKI, radlab: null, osdr: null },
    estado: { donki: "muestra", radlab: "muestra", osdr: "muestra" },
    listo: null,
    // base de las funciones; se puede cambiar antes de cargar (por ejemplo, otro dominio)
    base: window.GNOSIS_API_BASE || "/api",
    cargar() {
      if (this.listo) return this.listo;
      // en una vista previa sin servidor (file:// o artifact) no hay /api: se queda con la muestra
      if (location.protocol === "file:") return (this.listo = Promise.resolve(this.datos));
      this.listo = Promise.allSettled([pedir(this.base + "/donki"), pedir(this.base + "/radlab"), pedir(this.base + "/osdr")]).then(([d, r, o]) => {
        if (d.status === "fulfilled" && d.value && Array.isArray(d.value.llamaradas)) { this.datos.donki = d.value; this.estado.donki = "real"; }
        if (r.status === "fulfilled" && r.value && Array.isArray(r.value.serie)) { this.datos.radlab = r.value; this.estado.radlab = "real"; }
        if (o.status === "fulfilled" && o.value && !o.value.pendiente) { this.datos.osdr = o.value; this.estado.osdr = "real"; }
        return this.datos;
      });
      return this.listo;
    },
    // peso dinámico N-D11 -> N-D12b: más probable si hubo 2 o más llamaradas M o X en 7 días
    tormentaProbable() {
      const d = this.datos.donki, hace7 = Date.now() - 7 * 864e5;
      if (!d || !d.llamaradas) return false;
      return d.llamaradas.filter((f) => /^[MX]/i.test(f.clase || "") && Date.parse(f.fecha) >= hace7).length >= 2;
    },
  };
  window.GNOSIS_APIS = A;
})();

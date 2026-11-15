/* =========================================================
   G-NOSIS  -  conexión con Supabase (modo Salón y panel del maestro)
   Lee la URL y la publishable key de /api/config (variables de Vercel) y prueba
   que la llave funcione. Todavía no guarda nada: es la base para las cuentas
   con alias, las clases con código y los récords (supabase/migrations 0001 y 0002).
   En modo libre el juego sigue sin cuentas y guarda todo en el dispositivo.
   ========================================================= */
window.GNOSIS_SUPABASE = (() => {
  "use strict";
  let config = null, estado = "revisando…";
  const avisos = [];
  const avisar = (e) => { estado = e; avisos.forEach((f) => { try { f(e); } catch (err) { /* nada */ } }); };
  function leerConfig() {
    return config || (config = fetch("/api/config").then((r) => r.json()).then((j) => (j && j.supabase) || null).catch(() => null));
  }
  async function probar() {
    const c = await leerConfig();
    if (!c) return avisar("sin configurar");
    try {
      // /auth/v1/settings responde con cualquier llave válida del proyecto y no toca datos de nadie
      const r = await fetch(c.url + "/auth/v1/settings", { headers: { apikey: c.llave } });
      avisar(r.ok ? "conectado" : "llave rechazada");
    } catch (e) { avisar("sin conexión"); }
  }
  probar();
  return {
    config: leerConfig,
    get estado() { return estado; },
    alCambiar(f) { avisos.push(f); },
  };
})();

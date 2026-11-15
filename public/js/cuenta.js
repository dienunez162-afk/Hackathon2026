/* =========================================================
   G-NOSIS  -  «Mi cuenta» en el menú principal (debajo del selector de idioma)
   Sin cuenta se juega igual (modo libre, todo queda en este dispositivo).
   Con cuenta (alias + contraseña, sin correo ni nombre real):
     · las partidas, el nivel y los récords se guardan en Supabase
     · con el código de una clase se pide entrar; el maestro acepta o rechaza
   ========================================================= */
window.CUENTA = (() => {
  "use strict";
  const S = () => window.GNOSIS_SUPABASE;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let btn = null, panel = null, vista = "entrar", mensaje = "", ocupado = false, claseVista = null;
  const CLAVE_CLASE = "gnosis-clase-pedida";

  function crear() {
    const stage = document.getElementById("stage");
    if (!stage || btn) return;
    btn = document.createElement("button");
    btn.type = "button"; btn.id = "btn-cuenta";
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());
    btn.addEventListener("click", () => abrir(true));
    stage.appendChild(btn);
    panel = document.createElement("section");
    panel.id = "cuenta"; panel.hidden = true;
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", "Mi cuenta");
    panel.addEventListener("pointerdown", (e) => e.stopPropagation());
    panel.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") abrir(false); });
    panel.addEventListener("click", clic);
    panel.addEventListener("submit", enviar);
    stage.appendChild(panel);
    pintarBoton();
    if (S()) S().alCambiar(() => { pintarBoton(); if (!panel.hidden && !ocupado) pintar(); });
  }
  function pintarBoton() {
    if (!btn) return;
    const a = S() && S().alumno;
    btn.innerHTML = a ? `<span class="c-ico" aria-hidden="true">●</span> ${esc(a.alias)}` : `<span class="c-ico" aria-hidden="true">○</span> Mi cuenta`;
    btn.title = a ? "Tu cuenta: tus partidas se guardan" : "Crea una cuenta para guardar tus partidas y unirte a tu clase";
  }
  function abrir(on) {
    panel.hidden = !on;
    if (on) { mensaje = ""; vista = S() && S().alumno ? "yo" : "entrar"; pintar(); const i = panel.querySelector("input"); if (i) i.focus(); }
  }
  const aviso = () => (mensaje ? `<p class="c-msg ${mensaje.startsWith("✓") ? "ok" : ""}" role="status">${esc(mensaje)}</p>` : "");
  const estadoSb = () => (S() ? S().estado : "sin configurar");

  async function pintar() {
    const sb = S();
    if (!sb || estadoSb() !== "conectado") {
      panel.innerHTML = `<div class="c-caja"><h2 class="titulo">Mi cuenta</h2><p class="txt">Ahora no hay conexión con el servidor (${esc(estadoSb())}). Puedes jugar sin cuenta: tu progreso queda en este dispositivo.</p><button type="button" class="op" data-a="cerrar">Cerrar ✕</button></div>`;
      return;
    }
    const a = sb.alumno;
    if (!a) {
      const crear = vista === "crear";
      panel.innerHTML = `<div class="c-caja">
        <div class="c-tabs"><button type="button" class="op ${crear ? "" : "prim"}" data-a="entrar">Entrar</button><button type="button" class="op ${crear ? "prim" : ""}" data-a="crear">Crear cuenta</button></div>
        <form class="c-form" data-f="${crear ? "crear" : "entrar"}" autocomplete="off">
          <label>Tu alias <input name="alias" maxlength="20" autocapitalize="none" spellcheck="false" placeholder="ej. capitana_luna" required></label>
          <label>Contraseña <input name="clave" type="password" minlength="6" maxlength="72" required></label>
          ${crear ? `<label>Repite la contraseña <input name="clave2" type="password" minlength="6" maxlength="72" required></label>
          <p class="sub">El alias: de 3 a 20 letras minúsculas, números o _. No uses tu nombre real. Apunta tu contraseña: si la olvidas, tu maestro tiene que ayudarte.</p>` : ""}
          <button type="submit" class="op prim">${crear ? "Crear mi cuenta ▸" : "Entrar ▸"}</button>
        </form>${aviso()}
        <p class="sub">Sin cuenta también puedes jugar: tu progreso queda en este dispositivo.</p>
        <button type="button" class="op" data-a="cerrar">Jugar sin cuenta ✕</button></div>`;
      return;
    }
    const rec = await sb.records();
    const pend = (a.solicitudes || []).find((x) => x.estado === "pendiente");
    const rech = !a.grupo && (a.solicitudes || []).find((x) => x.estado === "rechazada");
    let pedida = null; try { pedida = JSON.parse(localStorage.getItem(CLAVE_CLASE) || "null"); } catch (e) { pedida = null; }
    let clase;
    if (a.grupo) clase = `<p class="txt">Estás en la clase <b>${esc(a.grupo.nombre)}</b> (${esc(a.grupo.grado)}.° grado). Tu maestro ve cómo te va.</p><button type="button" class="op" data-a="salir-clase">Salir de la clase</button>`;
    else if (pend) clase = `<p class="txt">Pediste entrar a <b>${esc(pedida && pedida.nombre || "una clase")}</b>. Falta que tu maestro te acepte.</p><button type="button" class="op" data-a="refrescar">Revisar otra vez ↻</button>`;
    else clase = `${rech ? `<p class="sub">El maestro no aceptó tu solicitud anterior.</p>` : ""}
      <form class="c-form c-fila" data-f="buscar" autocomplete="off"><label>Código de tu clase <input name="codigo" maxlength="8" autocapitalize="characters" spellcheck="false" placeholder="ej. A1B2C3" required></label><button type="submit" class="op">Buscar ▸</button></form>
      ${claseVista ? `<p class="txt">Clase: <b>${esc(claseVista.nombre)}</b> (${esc(claseVista.grado)}.° grado).</p><button type="button" class="op prim" data-a="unirme">Pedir entrar a esta clase ▸</button>` : ""}`;
    panel.innerHTML = `<div class="c-caja">
      <h2 class="titulo">Hola, ${esc(a.alias)}</h2>
      <p class="sub">Tus partidas y tu nivel se guardan en tu cuenta.</p>
      <div class="c-rec"><span>Misiones<b>${rec ? rec.misiones : 0}</b></span><span>Mejores estrellas<b>${rec && rec.mejores_estrellas != null ? "★".repeat(rec.mejores_estrellas) + "☆".repeat(3 - rec.mejores_estrellas) : "—"}</b></span>
        <span>Mejor base<b>${rec && rec.mejor_puntaje_barras != null ? rec.mejor_puntaje_barras + "/400" : "—"}</b></span><span>Aciertos a la primera<b>${rec && rec.mas_aciertos_primera != null ? rec.mas_aciertos_primera : "—"}</b></span></div>
      <h3 class="c-sub">Tu clase</h3>${clase}${aviso()}
      <div class="c-tabs"><button type="button" class="op" data-a="cerrar-sesion">Cerrar sesión</button><button type="button" class="op prim" data-a="cerrar">Listo ✕</button></div></div>`;
  }

  async function hacer(fn) {
    if (ocupado) return; ocupado = true;
    panel.querySelectorAll("button, input").forEach((x) => (x.disabled = true));
    try { await fn(); } finally { ocupado = false; pintarBoton(); pintar(); }
  }
  function clic(e) {
    const b = e.target.closest("[data-a]"); if (!b) return;
    const a = b.dataset.a;
    if (a === "cerrar") return abrir(false);
    if (a === "entrar" || a === "crear") { vista = a; mensaje = ""; return pintar(); }
    if (a === "cerrar-sesion") return hacer(async () => { await S().salir(); claseVista = null; mensaje = "✓ Cerraste sesión. Puedes seguir jugando sin cuenta."; });
    if (a === "refrescar") return hacer(async () => { await S().cargarYo(); mensaje = S().alumno && S().alumno.grupo ? "✓ ¡Tu maestro te aceptó!" : "Todavía no te acepta. Intenta más tarde."; });
    if (a === "salir-clase") return hacer(async () => { const r = await S().salirDeClase(); mensaje = r.ok ? "✓ Saliste de la clase." : r.error; });
    if (a === "unirme") return hacer(async () => {
      const r = await S().pedirUnirme(claseVista.codigo);
      if (r.ok) { try { localStorage.setItem(CLAVE_CLASE, JSON.stringify(claseVista)); } catch (err) { /* nada */ } claseVista = null; mensaje = r.datos === "aceptada" ? "✓ Ya estás en esa clase." : "✓ Listo: tu maestro tiene que aceptarte."; }
      else mensaje = r.error;
    });
  }
  function enviar(e) {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f).entries()), tipo = f.dataset.f;
    if (tipo === "crear" && d.clave !== d.clave2) { mensaje = "Las dos contraseñas no son iguales."; return pintar(); }
    hacer(async () => {
      if (tipo === "buscar") {
        const r = await S().buscarClase(d.codigo);
        claseVista = r.ok ? Object.assign({ codigo: d.codigo.trim().toUpperCase() }, r.datos) : null;
        mensaje = r.ok ? "" : r.error;
        return;
      }
      const r = tipo === "crear" ? await S().crearCuenta(d.alias, d.clave) : await S().entrar(d.alias, d.clave);
      mensaje = r.ok ? (tipo === "crear" ? "✓ ¡Cuenta creada! Ya puedes jugar." : "✓ ¡Hola otra vez!") : r.error;
      if (r.ok) vista = "yo";
    });
  }

  if (document.body) crear(); else document.addEventListener("DOMContentLoaded", crear);
  return {
    // solo en el menú principal se ve el botón (el panel se cierra al empezar a jugar)
    enMenu(on) { if (btn) btn.hidden = !on; if (!on && panel) panel.hidden = true; },
    abierta: () => !!panel && !panel.hidden,
  };
})();

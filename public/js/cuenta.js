/* =========================================================
   G-NOSIS  -  cuenta del niño, récords y clase (Supabase)
   Menú desplegable (hamburguesa) en el menú principal:
     · crear cuenta / entrar con ALIAS + contraseña (sin correo, sin nombre real)
     · mis récords (PR)
     · unirme a una clase con un código (el maestro lo aprueba)
   Si no hay llaves de Supabase (window.GNOSIS_CONFIG vacío) el juego funciona igual,
   solo con el progreso en el dispositivo, y el panel avisa que las cuentas no están activas.
   La librería de Supabase se descarga solo cuando se abre el panel o ya había sesión.
   ========================================================= */
(function () {
  "use strict";
  const C = window.GNOSIS_CONFIG || {};
  const ACTIVO = !!(C.url && C.anon);
  const DOMINIO = C.dominio || "alumnos.g-nosis.local";
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  const COLA = "gnosis-pendientes-v1";
  const ALIAS_OK = /^[a-z0-9_]{3,20}$/;

  let sb = null, cargando = null, usuario = null, vista = "entrar", info = null, mensaje = null, ultimoAlias = "";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const leerCola = () => { try { return JSON.parse(localStorage.getItem(COLA) || "[]"); } catch (e) { return []; } };
  const guardarCola = (a) => { try { localStorage.setItem(COLA, JSON.stringify(a.slice(-20))); } catch (e) { /* sin almacenamiento */ } };

  function cargarLib() {
    if (!ACTIVO) return Promise.reject(new Error("sin-config"));
    if (cargando) return cargando;
    cargando = new Promise((res, rej) => {
      if (window.supabase) return res();
      const s = document.createElement("script");
      s.src = LIB; s.crossOrigin = "anonymous"; s.onload = res; s.onerror = () => rej(new Error("sin-red"));
      document.head.appendChild(s);
    }).then(() => {
      sb = window.supabase.createClient(C.url, C.anon, { auth: { persistSession: true, autoRefreshToken: true } });
    }).catch((e) => { cargando = null; throw e; });
    return cargando;
  }

  // mensajes para un niño de 7 a 12 años (sin jerga)
  function amable(err) {
    const m = String((err && err.message) || err || "");
    if (/sin-red|Failed to fetch|NetworkError/i.test(m)) return "No hay conexión. Tu partida sigue guardada en este dispositivo.";
    if (/Invalid login/i.test(m)) return "El alias o la contraseña no son correctos.";
    if (/already registered|duplicate|alumnos_alias/i.test(m)) return "Ese alias ya lo usa otro capitán. Prueba con otro.";
    if (/Database error|alias inv/i.test(m)) return "El alias debe tener de 3 a 20 letras minúsculas, números o _ (guion bajo), y no puede estar repetido.";
    if (/solo una cuenta de alumno/i.test(m)) return "Esta cuenta no se puede borrar desde aquí.";
    if (/Password should/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
    if (/ese c[oó]digo no existe/i.test(m)) return "Ese código no existe. Revísalo con tu maestro.";
    if (/ya est[aá]s en una clase/i.test(m)) return "Ya estás en una clase. Sal primero de ella.";
    if (/no acept/i.test(m)) return "Tu maestro no aceptó esta solicitud.";
    if (/rate limit/i.test(m)) return "Demasiados intentos. Espera un momento.";
    return "Algo salió mal. Intenta de nuevo.";
  }

  // ---------- sesión ----------
  async function refrescar() {
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    usuario = data && data.session ? data.session.user : null;
    info = null;
    if (!usuario) return;
    const a = await sb.from("alumnos").select("alias, grupo_id, grupos(nombre, grado)").eq("id", usuario.id).maybeSingle();
    const s = await sb.from("solicitudes_clase").select("estado").eq("alumno_id", usuario.id).order("creada_en", { ascending: false }).limit(1);
    const r = await sb.from("v_records").select("*").eq("alumno_id", usuario.id).maybeSingle();
    info = { alias: a.data ? a.data.alias : (usuario.user_metadata || {}).alias || "capitán", clase: a.data && a.data.grupos ? a.data.grupos : null,
      solicitud: s.data && s.data[0] ? s.data[0].estado : null, records: r.data || null, esMaestro: !a.data };
    vaciarCola();
  }

  async function registrar(alias, clave) {
    alias = String(alias || "").trim().toLowerCase();
    if (!ALIAS_OK.test(alias)) throw new Error("alias inv");
    await cargarLib();
    const { data, error } = await sb.auth.signUp({ email: alias + "@" + DOMINIO, password: clave, options: { data: { rol: "alumno", alias } } });
    if (error) throw error;
    if (!data.session) throw new Error("La cuenta se creó pero Supabase pide confirmar el correo: hay que desactivar «Confirm email».");
    await refrescar();
  }
  async function entrar(alias, clave) {
    alias = String(alias || "").trim().toLowerCase();
    await cargarLib();
    const { error } = await sb.auth.signInWithPassword({ email: alias + "@" + DOMINIO, password: clave });
    if (error) throw error;
    await refrescar();
  }
  async function salir() { if (sb) await sb.auth.signOut(); usuario = null; info = null; }

  // ---------- clase ----------
  async function buscarClase(codigo) {
    await cargarLib();
    const { data, error } = await sb.rpc("buscar_clase", { p_codigo: codigo });
    if (error) throw error;
    return data && data[0] ? data[0] : null;
  }
  async function pedirUnirme(codigo) {
    await cargarLib();
    const { data, error } = await sb.rpc("pedir_unirme", { p_codigo: codigo });
    if (error) throw error;
    await refrescar();
    return data;
  }
  async function borrarCuenta() { await cargarLib(); const { error } = await sb.rpc("borrar_mi_cuenta"); if (error) throw error; await sb.auth.signOut(); usuario = null; info = null; }
  async function salirDeClase() { await cargarLib(); const { error } = await sb.rpc("salir_de_clase"); if (error) throw error; await refrescar(); }

  // ---------- partidas (récords). Si falla la red, se guarda en una cola y se reintenta ----------
  async function enviar(r) {
    const { error } = await sb.rpc("registrar_partida", {
      p_version: String(r.version || "0"), p_nivel_reto: r.nivelReto, p_nivel_lectura: r.nivelLectura, p_final: String(r.final || ""),
      p_estrellas: r.estrellas, p_dia_final: r.diaFinal, p_barras: r.barras, p_tareas: r.tareas, p_preg_total: r.pregTotal, p_preg_primera: r.pregPrimera,
    });
    if (error) throw error;
  }
  async function vaciarCola() {
    const cola = leerCola(); if (!cola.length || !usuario) return;
    const resto = [];
    for (const r of cola) { try { await enviar(r); } catch (e) { resto.push(r); } }
    guardarCola(resto);
  }
  // Se llama al terminar una misión. Sin sesión no hace nada (el progreso local lo guarda juego.js).
  async function guardarPartida(r) {
    if (!ACTIVO || !usuario || !sb) return false;
    try { await enviar(r); await refrescar(); return true; }
    catch (e) { guardarCola([...leerCola(), r]); return false; }
  }

  // ---------- panel ----------
  function abierto() { const p = $("panel-cuenta"); return !!p && !p.hidden; }
  function abrir(si) {
    const p = $("panel-cuenta"), b = $("btn-menu-cuenta"); if (!p || !b) return;
    p.hidden = !si; b.setAttribute("aria-expanded", String(si));
    if (si) { mensaje = null; pintar(); if (ACTIVO) cargarLib().then(refrescar).then(pintar).catch((e) => { mensaje = { mal: amable(e) }; pintar(); }); }
    else b.focus();
  }
  function visible(si) { const b = $("btn-menu-cuenta"); if (!b) return; if (b.hidden === !si) return; b.hidden = !si; if (!si) abrir(false); }

  const fmtRecord = (v, suf) => (v == null ? "—" : v + (suf || ""));
  function pintar() {
    const p = $("panel-cuerpo"); if (!p) return;
    const msg = mensaje ? `<p class="cta-msg ${mensaje.mal ? "mal" : "ok"}" role="status">${esc(mensaje.mal || mensaje.ok)}</p>` : "";
    if (!ACTIVO) {
      p.innerHTML = `<h3>Tu cuenta</h3><p>Las cuentas todavía no están activas en esta versión. Puedes jugar igual: tu progreso se guarda en este dispositivo.</p>`;
      return;
    }
    if (!usuario) {
      const nueva = vista === "crear";
      p.innerHTML = `<h3>${nueva ? "Crear mi cuenta" : "Entrar"}</h3>
        <div class="cta-tabs" role="tablist"><button type="button" role="tab" data-v="entrar" aria-selected="${!nueva}">Entrar</button><button type="button" role="tab" data-v="crear" aria-selected="${nueva}">Crear cuenta</button></div>
        <form id="cta-form" autocomplete="off">
          <label>Tu alias<input id="cta-alias" maxlength="20" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(ultimoAlias)}" required></label>
          <label>Contraseña<input id="cta-clave" type="password" minlength="6" autocomplete="${nueva ? "new-password" : "current-password"}" required></label>
          ${nueva ? `<label class="cta-adulto"><input type="checkbox" id="cta-adulto" required> Un adulto leyó conmigo el <a href="privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a></label><p class="cta-nota">Elige un alias inventado, <b>no tu nombre</b>. Usa letras minúsculas, números o _ . Anota tu contraseña: si la olvidas, tu maestro o un adulto tendrá que ayudarte.</p>` : ""}
          <button type="submit" class="cta-prim">${nueva ? "Crear cuenta" : "Entrar"}</button>
        </form>${msg}`;
      return;
    }
    if (info && info.esMaestro) { p.innerHTML = `<h3>Cuenta de maestro</h3><p>El panel del maestro se abre aparte.</p><button type="button" id="cta-salir">Cerrar sesión</button>`; return; }
    const r = (info && info.records) || {};
    let clase;
    if (info && info.clase) clase = `<p>Estás en la clase <b>${esc(info.clase.nombre)}</b>. Tu maestro puede ver tu avance.</p><button type="button" id="cta-salir-clase">Salir de la clase</button>`;
    else if (info && info.solicitud === "pendiente") clase = `<p>Pediste unirte a una clase. Falta que tu maestro te acepte.</p>`;
    else clase = `<form id="cta-clase" autocomplete="off"><label>Código de clase<input id="cta-codigo" maxlength="8" autocapitalize="characters" spellcheck="false" placeholder="ej. A1B2C3"></label><button type="submit" class="cta-prim">Pedir unirme</button></form><div id="cta-clase-info"></div>`;
    p.innerHTML = `<h3>Hola, ${esc(info ? info.alias : "capitán")}</h3>
      <h4>Mis récords</h4>
      <dl class="cta-records"><div><dt>Misiones terminadas</dt><dd>${fmtRecord(r.misiones)}</dd></div>
        <div><dt>Mejores estrellas</dt><dd>${r.mejores_estrellas == null ? "—" : "★".repeat(r.mejores_estrellas) + "☆".repeat(3 - r.mejores_estrellas)}</dd></div>
        <div><dt>Mejor estado de la base</dt><dd>${fmtRecord(r.mejor_puntaje_barras, " / 400")}</dd></div>
        <div><dt>Respuestas a la primera (en una misión)</dt><dd>${fmtRecord(r.mas_aciertos_primera)}</dd></div></dl>
      <h4>Mi clase</h4>${clase}${msg}
      <button type="button" id="cta-cerrar-sesion" class="cta-sec">Cerrar sesión</button> <button type="button" id="cta-borrar" class="cta-sec">Borrar mi cuenta</button><p class="cta-nota"><a href="privacidad.html" target="_blank" rel="noopener">Aviso de privacidad</a></p>`;
  }

  async function accion(fn) {
    try { mensaje = null; await fn(); } catch (e) { mensaje = { mal: amable(e) }; }
    pintar();
  }

  function montar() {
    const b = $("btn-menu-cuenta"), p = $("panel-cuenta"); if (!b || !p) return;
    b.addEventListener("click", () => abrir(p.hidden));
    p.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); abrir(false); } });
    p.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.id === "cta-cerrar") abrir(false);
      else if (t.dataset.v) { vista = t.dataset.v; mensaje = null; pintar(); }
      else if (t.id === "cta-cerrar-sesion" || t.id === "cta-salir") accion(async () => { await salir(); mensaje = { ok: "Cerraste sesión." }; });
      else if (t.id === "cta-salir-clase") accion(salirDeClase);
      else if (t.id === "cta-borrar") { if (window.confirm("¿Seguro? Se borra tu cuenta y todas tus partidas guardadas. No se puede deshacer.")) accion(async () => { await borrarCuenta(); mensaje = { ok: "Tu cuenta se borró." }; }); }
    });
    p.addEventListener("submit", (e) => {
      e.preventDefault();
      if (e.target.id === "cta-form") {
        const alias = $("cta-alias").value, clave = $("cta-clave").value;
        ultimoAlias = alias.trim().toLowerCase();
        accion(() => (vista === "crear" ? registrar(alias, clave) : entrar(alias, clave)));
      } else if (e.target.id === "cta-clase") {
        const codigo = $("cta-codigo").value.trim().toUpperCase(); if (!codigo) return;
        accion(async () => {
          const c = await buscarClase(codigo);
          if (!c) throw new Error("ese código no existe");
          if (!window.confirm(`¿Quieres unirte a la clase «${c.nombre}»?`)) return;
          await pedirUnirme(codigo);
          mensaje = { ok: "Listo. Ahora tu maestro te tiene que aceptar." };
        });
      }
    });
    if (ACTIVO) {
      // si ya había una sesión guardada, se restaura sin que el niño abra nada
      let hay = false;
      try { hay = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch (e) { /* nada */ }
      if (hay) cargarLib().then(refrescar).catch(() => {});
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();

  window.CUENTA = { activo: ACTIVO, visible, abrir, abierto, registrar, entrar, salir, guardarPartida, sesion: () => (usuario ? { alias: info && info.alias } : null) };
})();

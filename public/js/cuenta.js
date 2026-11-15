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
  const EN = !!(window.I18N && window.I18N.idioma === "en");
  const t = (es, en) => (EN ? en : es);
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
    if (/sin-red|Failed to fetch|NetworkError/i.test(m)) return t("No hay conexión. Tu partida sigue guardada en este dispositivo.", "No connection. Your game is still saved on this device.");
    if (/Invalid login/i.test(m)) return t("El alias o la contraseña no son correctos.", "The alias or password is not correct.");
    if (/already registered|duplicate|alumnos_alias/i.test(m)) return t("Ese alias ya lo usa otro capitán. Prueba con otro.", "Another captain already uses that alias. Try another one.");
    if (/Database error|alias inv/i.test(m)) return t("El alias debe tener de 3 a 20 letras minúsculas, números o _ (guion bajo), y no puede estar repetido.", "The alias must have 3 to 20 lowercase letters, numbers or _ (underscore), and cannot be repeated.");
    if (/solo una cuenta de alumno/i.test(m)) return t("Esta cuenta no se puede borrar desde aquí.", "This account cannot be deleted from here.");
    if (/Password should/i.test(m)) return t("La contraseña debe tener al menos 6 caracteres.", "The password must have at least 6 characters.");
    if (/ese c[oó]digo no existe/i.test(m)) return t("Ese código no existe. Revísalo con tu maestro.", "That code does not exist. Check it with your teacher.");
    if (/ya est[aá]s en una clase/i.test(m)) return t("Ya estás en una clase. Sal primero de ella.", "You are already in a class. Leave it first.");
    if (/no acept/i.test(m)) return t("Tu maestro no aceptó esta solicitud.", "Your teacher did not accept this request.");
    if (/rate limit/i.test(m)) return t("Demasiados intentos. Espera un momento.", "Too many tries. Wait a moment.");
    return t("Algo salió mal. Intenta de nuevo.", "Something went wrong. Try again.");
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

  // ---------- partidas, respuestas y pasos. Si falla la red, se guarda en una cola y se reintenta ----------
  const RAMAS = ["experto", "normal", "rescate"], ORIGENES = ["esta_partida", "partida_pasada", "repaso"];
  const ent = (x, a, b, def) => { const n = Math.round(+x); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : def; };
  const fila = (r, id) => ({
    alumno_id: usuario.id, partida_id: id, tipo: r.tipo, reto_id: r.reto_id ? String(r.reto_id).slice(0, 60) : null, tema: r.tema ? String(r.tema).slice(0, 40) : null,
    nivel_reto: ent(r.nivel_reto, 1, 3, 1), nivel_lectura: ent(r.nivel_lectura, 1, 3, 1), origen: ORIGENES.includes(r.origen) ? r.origen : null,
    dia: ent(r.dia, 0, 14, 0), rama: RAMAS.includes(r.rama) ? r.rama : null,
    prediccion_correcta: typeof r.prediccion_correcta === "boolean" ? r.prediccion_correcta : null, accion_correcta: !!r.accion_correcta,
    accion: r.accion ? String(r.accion).slice(0, 200) : null, intentos: r.intentos == null ? null : ent(r.intentos, 1, 3, 1),
    con_carta: !!r.con_carta, con_apoyo: !!r.con_apoyo, aciertos: r.aciertos == null ? null : ent(r.aciertos, 0, 99, 0), total: r.total == null ? null : ent(r.total, 0, 99, 0),
  });
  async function insertar(tabla, filas) {
    if (!filas.length) return;
    let { error } = await sb.from(tabla).insert(filas);
    if (error && tabla === "respuestas" && /respuestas_tipo_check|check constraint/i.test(error.message || "")) {
      // la base todavía no acepta el tipo 'pregunta' (falta la migración 0006): se guardan las demás
      const sin = filas.filter((f) => f.tipo !== "pregunta");
      error = sin.length ? (await sb.from(tabla).insert(sin)).error : null;
    }
    if (error) throw error;
  }
  async function enviar(r) {
    if (!r._id) {
      const { data, error } = await sb.rpc("registrar_partida", {
        p_version: String(r.version || "0"), p_nivel_reto: r.nivelReto, p_nivel_lectura: r.nivelLectura, p_final: String(r.final || ""),
        p_estrellas: r.estrellas, p_dia_final: r.diaFinal, p_barras: r.barras, p_tareas: r.tareas, p_preg_total: r.pregTotal, p_preg_primera: r.pregPrimera,
      });
      if (error) throw error;
      r._id = data;
    }
    const id = r._id;
    if (r.respuestas && r.respuestas.length) { await insertar("respuestas", r.respuestas.map((x) => fila(x, id))); r.respuestas = []; }
    if (r.pasos && r.pasos.length) {
      await insertar("pasos", r.pasos.map((p) => ({ partida_id: id, nodo_id: String(p.nodo_id).slice(0, 40), dia: ent(p.dia, 0, 14, 0), resultado: p.resultado === "exito" || p.resultado === "fallo" ? p.resultado : null,
        opcion: p.opcion ? String(p.opcion).slice(0, 200) : null, preparado: !!p.preparado, barras: p.barras || {} })));
      r.pasos = [];
    }
    return id;
  }
  async function vaciarCola() {
    const cola = leerCola(); if (!cola.length || !usuario) return;
    const resto = [];
    for (const r of cola) { try { await enviar(r); } catch (e) { resto.push(r); } }
    guardarCola(resto);
  }
  // Se llama al terminar una misión. Sin sesión no hace nada (el progreso local lo guarda juego.js). Devuelve el id de la partida.
  async function guardarPartida(r) {
    if (!ACTIVO || !usuario || !sb) return null;
    try { const id = await enviar(r); await refrescar(); return id; }
    catch (e) { guardarCola([...leerCola(), r]); return r._id || null; }
  }
  // filas que llegan después de guardar la partida (el manual para el siguiente capitán)
  async function agregarRespuestas(id, filas, cartasManual) {
    if (!ACTIVO || !usuario || !sb || !id) return false;
    try {
      await insertar("respuestas", filas.map((x) => fila(x, id)));
      if (Array.isArray(cartasManual)) await sb.from("partidas").update({ cartas_manual: cartasManual.map((t) => String(t).slice(0, 40)).slice(0, 12) }).eq("id", id);
      return true;
    } catch (e) { return false; }
  }

  // ---------- menú desplegable (hamburguesa arriba a la derecha del menú principal) ----------
  // cuadro de confirmación con el arte del juego (en vez del cuadro estándar del navegador)
  function confirmar(texto, { si, no, peligro } = {}) {
    const d = $("confirmar"); if (!d) return Promise.resolve(window.confirm(texto));
    return new Promise((res) => {
      const bSi = $("conf-si"), bNo = $("conf-no"), tag = $("conf-tit");
      $("conf-txt").textContent = texto;
      bSi.textContent = si || t("Sí", "Yes"); bNo.textContent = no || t("Cancelar", "Cancel");
      tag.textContent = peligro ? t("¡CUIDADO!", "CAREFUL!") : t("¿SEGURO?", "SURE?");
      tag.classList.toggle("alarma", !!peligro);
      const previo = document.activeElement;
      const cerrar = (v) => { d.hidden = true; d.removeEventListener("keydown", tecla); bSi.onclick = bNo.onclick = null; if (previo && previo.focus) previo.focus(); res(v); };
      const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(false); } else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === bSi ? bNo : bSi).focus(); } };
      bSi.onclick = () => cerrar(true); bNo.onclick = () => cerrar(false);
      d.addEventListener("keydown", tecla);
      d.hidden = false; bNo.focus();          // lo primero que se enfoca es «Cancelar»: borrar nunca pasa por accidente
    });
  }
  function abierto() { const p = $("menu-caja"); return !!p && !p.hidden; }
  function abrir(si) {
    const p = $("menu-caja"), b = $("btn-menu"); if (!p || !b) return;
    const eraFoco = p.contains(document.activeElement);
    p.hidden = !si; b.setAttribute("aria-expanded", String(si));
    if (si) { mensaje = null; pintar(); if (ACTIVO) cargarLib().then(refrescar).then(pintar).catch((e) => { mensaje = { mal: amable(e) }; pintar(); }); }
    else if (eraFoco) b.focus();
  }
  // el menú completo (botón + panel) solo se ve en el menú principal
  function visible(si) { const m = $("menu-inicio"); if (!m || m.hidden === !si) return; m.hidden = !si; if (!si) abrir(false); }

  // ojo en pixel art para mostrar u ocultar la contraseña
  const OJO = '<svg viewBox="0 0 14 7" width="20" height="10" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><rect x="4" y="0" width="6" height="1"/><rect x="2" y="1" width="2" height="1"/><rect x="10" y="1" width="2" height="1"/><rect x="1" y="2" width="1" height="1"/><rect x="12" y="2" width="1" height="1"/><rect x="0" y="3" width="1" height="1"/><rect x="13" y="3" width="1" height="1"/><rect x="1" y="4" width="1" height="1"/><rect x="12" y="4" width="1" height="1"/><rect x="2" y="5" width="2" height="1"/><rect x="10" y="5" width="2" height="1"/><rect x="4" y="6" width="6" height="1"/><rect x="5" y="2" width="4" height="3"/></svg>';
  const OJO_TACHADO = OJO.replace("</svg>", '<rect x="1" y="5" width="2" height="1"/><rect x="3" y="4" width="2" height="1"/><rect x="9" y="2" width="2" height="1"/><rect x="11" y="1" width="2" height="1"/></svg>').replace('<rect x="5" y="2" width="4" height="3"/>', '<rect x="5" y="2" width="4" height="3"/><rect x="5" y="3" width="4" height="1" fill="#0e1022"/>');
  const fmtRecord = (v, suf) => (v == null ? "—" : v + (suf || ""));
  function pintar() { pintarBase(); const p = $("menu-cuenta"); if (p) p.insertAdjacentHTML("beforeend", enlaceMaestro()); }
  function pintarBase() {
    const p = $("menu-cuenta"); if (!p) return;
    const msg = mensaje ? `<p class="cta-msg ${mensaje.mal ? "mal" : "ok"}" role="status">${esc(mensaje.mal || mensaje.ok)}</p>` : "";
    const tit = (x) => `<h3 class="menu-tit">${x}</h3>`;
    if (!ACTIVO) {
      p.innerHTML = tit(t("MI CUENTA", "MY ACCOUNT")) + `<p>${t("Las cuentas todavía no están activas en esta versión. Puedes jugar igual: tu progreso se guarda en este dispositivo.", "Accounts are not active in this version yet. You can still play: your progress is saved on this device.")}</p>`;
      return;
    }
    if (!usuario) {
      const nueva = vista === "crear";
      p.innerHTML = tit(t("MI CUENTA", "MY ACCOUNT")) +
        `<div class="cta-tabs" role="tablist"><button type="button" role="tab" class="op${nueva ? "" : " elegida"}" data-v="entrar" aria-selected="${!nueva}">${t("Entrar", "Log in")}</button><button type="button" role="tab" class="op${nueva ? " elegida" : ""}" data-v="crear" aria-selected="${nueva}">${t("Crear cuenta", "Create account")}</button></div>
        <form id="cta-form" autocomplete="off">
          <label>${t("Tu alias", "Your alias")}<input class="cta-input" id="cta-alias" maxlength="20" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(ultimoAlias)}" required></label>
          <label>${t("Contraseña", "Password")}<span class="cta-clave"><input class="cta-input" id="cta-clave" type="password" minlength="6" autocomplete="${nueva ? "new-password" : "current-password"}" required><button type="button" class="cta-ojo" id="cta-ojo" aria-pressed="false" aria-label="${t("Mostrar contraseña", "Show password")}" title="${t("Mostrar contraseña", "Show password")}">${OJO}</button></span></label>
          ${nueva ? `<label class="cta-adulto"><input type="checkbox" id="cta-adulto" required> <span>${t('Un adulto leyó conmigo el <a href="privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a>', 'An adult read the <a href="privacidad.html" target="_blank" rel="noopener">privacy notice</a> with me')}</span></label><p class="cta-nota">${t("Elige un alias inventado, <b>no tu nombre</b>. Usa letras minúsculas, números o _ . Anota tu contraseña: si la olvidas, tu maestro o un adulto tendrá que ayudarte.", "Pick an invented alias, <b>not your name</b>. Use lowercase letters, numbers or _ . Write your password down: if you forget it, your teacher or an adult will have to help.")}</p>` : ""}
          <button type="submit" class="op prim">${nueva ? t("Crear cuenta", "Create account") : t("Entrar", "Log in")}</button>
        </form>${msg}`;
      return;
    }
    if (info && info.esMaestro) { p.innerHTML = tit(t("CUENTA DE MAESTRO", "TEACHER ACCOUNT")) + `<p>${t("El panel del maestro se abre aparte.", "The teacher panel opens separately.")}</p><button type="button" class="op" id="cta-salir">${t("Cerrar sesión", "Log out")}</button>`; return; }
    const r = (info && info.records) || {};
    let clase;
    if (info && info.clase) clase = `<p>${t("Estás en la clase", "You are in class")} <b>${esc(info.clase.nombre)}</b>. ${t("Tu maestro puede ver tu avance.", "Your teacher can see your progress.")}</p><button type="button" class="op" id="cta-salir-clase">${t("Salir de la clase", "Leave class")}</button>`;
    else if (info && info.solicitud === "pendiente") clase = `<p>${t("Pediste unirte a una clase. Falta que tu maestro te acepte.", "You asked to join a class. Your teacher still has to accept you.")}</p>`;
    else clase = `<form id="cta-clase" autocomplete="off"><label>${t("Código de clase", "Class code")}<input class="cta-input" id="cta-codigo" maxlength="8" autocapitalize="characters" spellcheck="false" placeholder="ej. A1B2C3"></label><button type="submit" class="op prim">${t("Pedir unirme", "Ask to join")}</button></form>`;
    p.innerHTML = tit(`${t("HOLA", "HI")}, ${esc(info ? info.alias : t("capitán", "captain"))}`) +
      `<h4 class="menu-sub">${t("Mis récords", "My records")}</h4>
      <dl class="cta-records"><div><dt>${t("Misiones terminadas", "Missions finished")}</dt><dd>${fmtRecord(r.misiones)}</dd></div>
        <div><dt>${t("Mejores estrellas", "Best stars")}</dt><dd>${r.mejores_estrellas == null ? "—" : "★".repeat(r.mejores_estrellas) + "☆".repeat(3 - r.mejores_estrellas)}</dd></div>
        <div><dt>${t("Mejor estado de la base", "Best base condition")}</dt><dd>${fmtRecord(r.mejor_puntaje_barras, " / 400")}</dd></div>
        <div><dt>${t("Respuestas a la primera (en una misión)", "First-try answers (in one mission)")}</dt><dd>${fmtRecord(r.mas_aciertos_primera)}</dd></div></dl>
      <h4 class="menu-sub">${t("Mi clase", "My class")}</h4>${clase}${msg}
      <div class="cta-fila"><button type="button" class="op" id="cta-cerrar-sesion">${t("Cerrar sesión", "Log out")}</button> <button type="button" class="op" id="cta-borrar">${t("Borrar mi cuenta", "Delete my account")}</button></div><p class="cta-nota"><a href="privacidad.html" target="_blank" rel="noopener">${t("Aviso de privacidad", "Privacy notice")}</a></p>`;
  }
  // enlace para maestros, al final de cualquier vista del menú
  const enlaceMaestro = () => `<p class="cta-nota">${t("¿Eres maestro o maestra?", "Are you a teacher?")} <a href="maestro.html">${t("Panel del maestro", "Teacher panel")}</a></p>`;

  async function accion(fn) {
    try { mensaje = null; await fn(); } catch (e) { mensaje = { mal: amable(e) }; }
    pintar();
  }

  function montar() {
    const b = $("btn-menu"), p = $("menu-caja"); if (!b || !p) return;
    b.addEventListener("click", () => abrir(p.hidden));
    p.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); abrir(false); } });
    p.addEventListener("click", (e) => {
      const x = e.target.closest("button"); if (!x) return;
      if (x.id === "cta-ojo") {
        const campo = $("cta-clave"), ver = campo.type === "password";
        campo.type = ver ? "text" : "password";
        x.setAttribute("aria-pressed", String(ver));
        const txt = ver ? t("Ocultar contraseña", "Hide password") : t("Mostrar contraseña", "Show password");
        x.setAttribute("aria-label", txt); x.title = txt; x.innerHTML = ver ? OJO_TACHADO : OJO;
        campo.focus();
      } else if (x.dataset.v) { vista = x.dataset.v; mensaje = null; pintar(); }
      else if (x.id === "cta-cerrar-sesion" || x.id === "cta-salir") accion(async () => { await salir(); mensaje = { ok: t("Cerraste sesión.", "You logged out.") }; });
      else if (x.id === "cta-salir-clase") accion(salirDeClase);
      else if (x.id === "cta-borrar") {
        confirmar(t("Se borra tu cuenta y todas tus partidas guardadas. No se puede deshacer.", "Your account and all saved games will be deleted. This cannot be undone."), { si: t("Sí, borrar", "Yes, delete"), no: t("Cancelar", "Cancel"), peligro: true })
          .then((ok) => { if (ok) accion(async () => { await borrarCuenta(); mensaje = { ok: t("Tu cuenta se borró.", "Your account was deleted.") }; }); });
      }
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
          if (!(await confirmar(t(`¿Quieres unirte a la clase «${c.nombre}»?`, `Do you want to join the class "${c.nombre}"?`), { si: t("Sí, unirme", "Yes, join"), no: t("Cancelar", "Cancel") }))) return;
          await pedirUnirme(codigo);
          mensaje = { ok: t("Listo. Ahora tu maestro te tiene que aceptar.", "Done. Now your teacher has to accept you.") };
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

  window.CUENTA = { activo: ACTIVO, visible, abrir, abierto, registrar, entrar, salir, guardarPartida, agregarRespuestas, sesion: () => (usuario ? { alias: info && info.alias } : null) };
})();

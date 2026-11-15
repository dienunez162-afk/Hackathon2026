/* =========================================================
   G-NOSIS  -  conexión con Supabase (cuentas, clases, partidas y panel del maestro)
   Lee la URL y la publishable key de /api/config y usa supabase-js (js/vendor).
   Niños: cuenta con ALIAS + contraseña, sin correo ni nombre real. Supabase pide un
   correo, así que se usa uno interno e inventado: <alias>@<DOMINIO_ALUMNOS>.
   Maestros: cuenta con su correo; crean clases con código y aceptan a los alumnos.
   Todo lo protege la RLS de supabase/migrations (0001 y 0002).
   Sin cuenta (modo libre) el juego sigue igual y guarda en el dispositivo.
   ========================================================= */
window.GNOSIS_SUPABASE = (() => {
  "use strict";
  let config = null, cfg = null, sb = null, estado = "revisando…", sesion = null, alumno = null, perfil = null;
  const avisos = [];
  const avisar = (e) => { if (e) estado = e; avisos.forEach((f) => { try { f(estado); } catch (err) { /* nada */ } }); };
  const ALIAS = /^[a-z0-9_]{3,20}$/;
  const normAlias = (a) => String(a || "").trim().toLowerCase();

  function leerConfig() {
    return config || (config = fetch("/api/config", { cache: "no-store" }).then((r) => r.json()).then((j) => (cfg = (j && j.supabase) || null)).catch(() => null));
  }
  async function cliente() {
    if (sb) return sb;
    const c = await leerConfig();
    if (!c || !window.supabase || !window.supabase.createClient) return null;
    sb = window.supabase.createClient(c.url, c.llave, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "gnosis-sesion" } });
    sb.auth.onAuthStateChange((_ev, s) => { sesion = s; if (!s) { alumno = null; perfil = null; } avisar(); });
    return sb;
  }
  // los mensajes de Supabase vienen en inglés: aquí se pasan a palabras para niños
  function error(e) {
    const m = String((e && (e.message || e.error_description || e)) || "");
    if (/already registered|already been registered|duplicate key.*alias|alumnos_alias_unico/i.test(m)) return "Ese alias ya existe. Elige otro.";
    if (/invalid login|invalid credentials/i.test(m)) return "El alias o la contraseña no coinciden.";
    if (/password.*(6|short|least)/i.test(m)) return "La contraseña debe tener al menos 6 letras o números.";
    if (/email not confirmed/i.test(m)) return "Falta desactivar «Confirm email» en Supabase (lo hace el equipo).";
    if (/alias inválido/i.test(m)) return "El alias solo puede tener de 3 a 20 letras minúsculas, números o _.";
    if (/ese código no existe/i.test(m)) return "Ese código de clase no existe. Revísalo con tu maestro.";
    if (/ya estás en una clase/i.test(m)) return "Ya estás en una clase: primero sal de ella.";
    if (/no aceptó/i.test(m)) return "El maestro no aceptó esta solicitud.";
    if (/failed to fetch|network/i.test(m)) return "No hay conexión a internet.";
    if (/rate limit|too many/i.test(m)) return "Muchos intentos seguidos. Espera un minuto.";
    return m || "Algo salió mal. Intenta otra vez.";
  }
  const ok = (datos) => ({ ok: true, datos });
  const mal = (e) => ({ ok: false, error: error(e) });

  async function probar() {
    const c = await leerConfig();
    if (!c) return avisar("sin configurar");
    try {
      const r = await fetch(c.url + "/auth/v1/settings", { headers: { apikey: c.llave } });
      if (!r.ok) return avisar("llave rechazada");
    } catch (e) { return avisar("sin conexión"); }
    const s = await cliente();
    if (!s) return avisar("falta supabase-js");
    const { data } = await s.auth.getSession();
    sesion = data && data.session;
    if (sesion) await cargarYo();
    avisar("conectado");
  }

  // ---------- quién soy ----------
  async function cargarYo() {
    const s = await cliente(); if (!s || !sesion) return null;
    const uid = sesion.user.id;
    const p = await s.from("perfiles").select("id, rol, nombre").eq("id", uid).maybeSingle();
    perfil = p.data || null;
    alumno = null;
    if (perfil && perfil.rol === "alumno") {
      const a = await s.from("alumnos").select("id, alias, grupo_id, nivel_inicial, nivel_reto, nivel_lectura").eq("id", uid).maybeSingle();
      alumno = a.data || null;
      if (alumno && alumno.grupo_id) {
        const g = await s.from("grupos").select("nombre, grado, escuela").eq("id", alumno.grupo_id).maybeSingle();
        alumno.grupo = g.data || null;
      }
      if (alumno) {
        const sol = await s.from("solicitudes_clase").select("id, grupo_id, estado, creada_en").eq("alumno_id", uid).order("creada_en", { ascending: false });
        alumno.solicitudes = sol.data || [];
      }
    }
    avisar();
    return perfil;
  }

  // ---------- cuentas de alumno (alias) ----------
  async function crearCuenta(alias, clave) {
    alias = normAlias(alias);
    if (!ALIAS.test(alias)) return mal("alias inválido");
    if (String(clave || "").length < 6) return mal("password short");
    const s = await cliente(); if (!s) return mal("No hay conexión con Supabase.");
    const { data, error: e } = await s.auth.signUp({ email: `${alias}@${cfg.dominioAlumnos}`, password: clave, options: { data: { rol: "alumno", alias } } });
    if (e) return mal(e);
    if (!data.session) {   // con «Confirm email» activo no hay sesión: se intenta entrar directo
      const r = await s.auth.signInWithPassword({ email: `${alias}@${cfg.dominioAlumnos}`, password: clave });
      if (r.error) return mal(r.error);
    }
    sesion = (await s.auth.getSession()).data.session;
    await cargarYo();
    return ok(alumno);
  }
  async function entrar(alias, clave) {
    alias = normAlias(alias);
    if (!ALIAS.test(alias)) return mal("alias inválido");
    const s = await cliente(); if (!s) return mal("No hay conexión con Supabase.");
    const { error: e } = await s.auth.signInWithPassword({ email: `${alias}@${cfg.dominioAlumnos}`, password: clave });
    if (e) return mal(e);
    sesion = (await s.auth.getSession()).data.session;
    await cargarYo();
    if (!alumno) { await s.auth.signOut(); return mal("Esa cuenta no es de alumno."); }
    return ok(alumno);
  }
  async function salir() { const s = await cliente(); if (s) await s.auth.signOut(); sesion = null; alumno = null; perfil = null; avisar(); }

  // ---------- clases ----------
  async function buscarClase(codigo) {
    const s = await cliente(); if (!s) return mal("No hay conexión con Supabase.");
    const { data, error: e } = await s.rpc("buscar_clase", { p_codigo: String(codigo || "").trim().toUpperCase() });
    if (e) return mal(e);
    return data && data.length ? ok(data[0]) : mal("ese código no existe");
  }
  async function pedirUnirme(codigo) {
    const s = await cliente(); if (!s) return mal("No hay conexión con Supabase.");
    const { data, error: e } = await s.rpc("pedir_unirme", { p_codigo: String(codigo || "").trim().toUpperCase() });
    if (e) return mal(e);
    await cargarYo();
    return ok(data);
  }
  async function salirDeClase() {
    const s = await cliente(); if (!s) return mal("No hay conexión con Supabase.");
    const { error: e } = await s.rpc("salir_de_clase");
    if (e) return mal(e);
    await cargarYo();
    return ok(true);
  }
  async function records() {
    const s = await cliente(); if (!s || !sesion) return null;
    const { data } = await s.from("v_records").select("*").eq("alumno_id", sesion.user.id).maybeSingle();
    return data || null;
  }

  // ---------- lo que manda el juego ----------
  async function ajustarNivel(dia, accion, reto, lectura) {
    if (!alumno) return;
    const s = await cliente(); if (!s) return;
    const { error: e } = await s.rpc("ajustar_mi_nivel", { p_partida: null, p_dia: dia, p_accion: accion, p_reto: reto, p_lectura: lectura });
    if (e) console.warn("[G-NOSIS] no se guardó el nivel:", e.message);
    else { alumno.nivel_reto = reto; alumno.nivel_lectura = lectura; }
  }
  // al terminar la misión: la partida (la numera la base) y luego lo que pasó en ella
  async function guardarPartida(p, extra = {}) {
    if (!alumno) return null;
    const s = await cliente(); if (!s) return null;
    const { data: id, error: e } = await s.rpc("registrar_partida", {
      p_version: String(p.version || "0"), p_nivel_reto: p.nivelReto, p_nivel_lectura: p.nivelLectura, p_final: p.final,
      p_estrellas: p.estrellas, p_dia_final: p.dia, p_barras: p.barras, p_tareas: p.tareas, p_preg_total: p.pregTotal, p_preg_primera: p.pregPrimera,
    });
    if (e) { console.warn("[G-NOSIS] no se guardó la partida:", e.message); return null; }
    const uid = sesion.user.id;
    const avisarError = (que) => (r) => { if (r && r.error) console.warn(`[G-NOSIS] no se guardó ${que}:`, r.error.message); };
    const tareas = [];
    if (extra.respuestas && extra.respuestas.length) tareas.push(s.from("respuestas").insert(extra.respuestas.map((x) => Object.assign({ alumno_id: uid, partida_id: id }, x))).then(avisarError("las respuestas")));
    if (extra.cartas && extra.cartas.length) tareas.push(s.from("cartas_usadas").insert(extra.cartas.map((x) => Object.assign({ partida_id: id }, x))).then(avisarError("las cartas")));
    if (extra.bitacora && extra.bitacora.length) tareas.push(s.from("bitacora").upsert(extra.bitacora.map((x) => Object.assign({ alumno_id: uid, partida_id: id }, x)), { onConflict: "alumno_id,entrada_id", ignoreDuplicates: true }).then(avisarError("la bitácora")));
    if (extra.manual) tareas.push(s.from("partidas").update({ cartas_iniciales: extra.manual.iniciales || [], cartas_manual: extra.manual.final || [], rama_ev1: extra.manual.rama || null }).eq("id", id).then(avisarError("el manual")));
    await Promise.all(tareas);
    return id;
  }

  // ---------- maestro ----------
  async function entrarMaestro(correo, clave) {
    const s = await cliente(); if (!s) return mal("No hay conexión con Supabase.");
    const { error: e } = await s.auth.signInWithPassword({ email: String(correo || "").trim(), password: clave });
    if (e) return mal(e);
    sesion = (await s.auth.getSession()).data.session;
    await cargarYo();
    if (!perfil || perfil.rol !== "maestro") { await s.auth.signOut(); return mal("Esta cuenta no es de maestro."); }
    return ok(perfil);
  }
  async function crearMaestro(correo, clave, nombre) {
    const s = await cliente(); if (!s) return mal("No hay conexión con Supabase.");
    const { data, error: e } = await s.auth.signUp({ email: String(correo || "").trim(), password: clave, options: { data: { rol: "maestro", nombre: String(nombre || "").trim() || "Maestro" } } });
    if (e) return mal(e);
    if (!data.session) return mal("email not confirmed");
    sesion = data.session;
    await cargarYo();
    return ok(perfil);
  }
  const consulta = async (q) => { const { data, error: e } = await q; return e ? mal(e) : ok(data || []); };
  async function misGrupos() { const s = await cliente(); return consulta(s.from("grupos").select("id, nombre, escuela, grado, codigo, creado_en").order("creado_en")); }
  async function crearGrupo(nombre, grado, escuela) {
    const s = await cliente();
    return consulta(s.from("grupos").insert({ maestro_id: sesion.user.id, nombre: String(nombre || "").trim(), grado: +grado, escuela: String(escuela || "").trim() || null }).select().single());
  }
  async function solicitudes(grupoId) {
    const s = await cliente();
    const r = await consulta(s.from("solicitudes_clase").select("id, alumno_id, estado, creada_en").eq("grupo_id", grupoId).eq("estado", "pendiente").order("creada_en"));
    if (!r.ok || !r.datos.length) return r;
    const a = await s.from("alumnos").select("id, alias").in("id", r.datos.map((x) => x.alumno_id));
    const alias = Object.fromEntries((a.data || []).map((x) => [x.id, x.alias]));
    r.datos.forEach((x) => { x.alias = alias[x.alumno_id] || "(alumno)"; });
    return r;
  }
  async function resolver(id, acepta) { const s = await cliente(); return consulta(s.rpc("resolver_solicitud", { p_id: id, p_acepta: !!acepta })); }
  async function alumnosDe(grupoId) {
    const s = await cliente();
    const r = await consulta(s.from("alumnos").select("id, alias, nivel_inicial, nivel_reto, nivel_lectura, creado_en").eq("grupo_id", grupoId).order("alias"));
    if (!r.ok || !r.datos.length) return r;
    const ids = r.datos.map((x) => x.id);
    const [rec, hab] = await Promise.all([s.from("v_records").select("*").in("alumno_id", ids), s.from("v_habilidades").select("*").in("alumno_id", ids)]);
    const R = Object.fromEntries((rec.data || []).map((x) => [x.alumno_id, x])), H = Object.fromEntries((hab.data || []).map((x) => [x.alumno_id, x]));
    r.datos.forEach((x) => { x.records = R[x.id] || null; x.habilidades = H[x.id] || null; });
    return r;
  }
  async function temasDelGrupo(grupoId) { const s = await cliente(); return consulta(s.from("v_grupo_tema").select("*").eq("grupo_id", grupoId)); }
  async function cambiarNivelInicial(alumnoId, nivel) { const s = await cliente(); return consulta(s.from("alumnos").update({ nivel_inicial: +nivel }).eq("id", alumnoId)); }

  probar();
  return {
    config: leerConfig, cliente, cargarYo,
    get estado() { return estado; },
    get sesion() { return sesion; },
    get alumno() { return alumno; },
    get perfil() { return perfil; },
    alCambiar(f) { avisos.push(f); },
    ALIAS, crearCuenta, entrar, salir, buscarClase, pedirUnirme, salirDeClase, records, ajustarNivel, guardarPartida,
    entrarMaestro, crearMaestro, misGrupos, crearGrupo, solicitudes, resolver, alumnosDe, temasDelGrupo, cambiarNivelInicial,
  };
})();

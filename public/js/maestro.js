/* G-NOSIS · panel del maestro (maestro.html): clases con código, solicitudes y avance de cada alumno.
   Usa js/supabase.js; lo que ve el maestro lo limita la RLS (solo sus grupos y sus alumnos). */
(() => {
  "use strict";
  const S = window.GNOSIS_SUPABASE, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const TEMAS = { radiacion: "Radiación y tormentas solares", polvo_lunar: "Polvo lunar", sismos: "Sismos lunares", micrometeoritos: "Micrometeoritos", noche_lunar: "La noche lunar",
    hielo_agua: "Hielo en los cráteres", invernadero: "Cultivar comida", agua_reciclaje: "Reciclar agua y aire", energia_solar: "Energía solar", salud_astronauta: "Salud del astronauta" };
  let grupos = [], elegido = null;

  const pct = (x) => (x == null ? `<span class="pct n">—</span>` : `<span class="pct ${x >= 70 ? "v" : x >= 40 ? "a" : "r"}">${Math.round(x)}%</span>`);
  function msg(el, t, bien) { el.textContent = t || ""; el.classList.toggle("ok", !!bien); }
  async function ocupado(form, fn) { const bs = form.querySelectorAll("button"); bs.forEach((b) => (b.disabled = true)); try { await fn(); } finally { bs.forEach((b) => (b.disabled = false)); } }

  async function iniciar() {
    await S.config();
    const esperar = () => new Promise((r) => { if (S.estado !== "revisando…") return r(); S.alCambiar((e) => { if (e !== "revisando…") r(); }); });
    await esperar();
    if (S.estado !== "conectado") { $("estado").textContent = "Sin conexión con Supabase (" + S.estado + ")."; return; }
    $("estado").textContent = "";
    if (S.perfil && S.perfil.rol === "maestro") return mostrarPanel();
    if (S.sesion && S.perfil && S.perfil.rol !== "maestro") await S.salir();   // un alumno abrió esta página
    $("acceso").hidden = false;
  }

  $("f-entrar").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    ocupado(f, async () => { const r = await S.entrarMaestro(d.correo, d.clave); msg(f.querySelector(".msg"), r.ok ? "" : r.error); if (r.ok) mostrarPanel(); });
  });
  $("f-crear").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    ocupado(f, async () => { const r = await S.crearMaestro(d.correo, d.clave, d.nombre); msg(f.querySelector(".msg"), r.ok ? "" : r.error); if (r.ok) mostrarPanel(); });
  });
  $("salir").addEventListener("click", async () => { await S.salir(); location.reload(); });

  async function mostrarPanel() {
    $("acceso").hidden = true; $("panel").hidden = false; $("salir").hidden = false;
    $("quien").textContent = S.perfil ? S.perfil.nombre : "";
    await cargarGrupos();
  }
  async function cargarGrupos(id) {
    const r = await S.misGrupos();
    if (!r.ok) return msg($("m-grupo"), r.error);
    grupos = r.datos;
    if (id) elegido = id; else if (!grupos.some((g) => g.id === elegido)) elegido = grupos.length ? grupos[grupos.length - 1].id : null;
    $("grupos").innerHTML = grupos.length ? grupos.map((g) => `<button type="button" data-g="${g.id}" aria-pressed="${g.id === elegido}">${esc(g.nombre)} · ${g.grado}.°</button>`).join("")
      : `<p class="sub">Todavía no tienes clases. Crea una abajo.</p>`;
    await pintarGrupo();
  }
  $("grupos").addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (b) cargarGrupos(b.dataset.g); });
  $("f-grupo").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    ocupado(f, async () => {
      const r = await S.crearGrupo(d.nombre, d.grado, d.escuela);
      msg($("m-grupo"), r.ok ? `Clase creada. Código: ${r.datos.codigo}` : r.error, r.ok);
      if (r.ok) { f.reset(); await cargarGrupos(r.datos.id); }
    });
  });
  $("refrescar").addEventListener("click", () => pintarGrupo());

  async function pintarGrupo() {
    const g = grupos.find((x) => x.id === elegido);
    $("detalle").hidden = !g;
    if (!g) return;
    $("g-nombre").textContent = `${g.nombre} · ${g.grado}.° grado${g.escuela ? " · " + g.escuela : ""}`;
    $("g-codigo").textContent = g.codigo;
    const [sol, alu, tem] = await Promise.all([S.solicitudes(g.id), S.alumnosDe(g.id), S.temasDelGrupo(g.id)]);
    $("solicitudes").innerHTML = !sol.ok ? `<p class="msg">${esc(sol.error)}</p>` : sol.datos.length
      ? `<table><tr><th>Alias</th><th>Pidió</th><th></th></tr>${sol.datos.map((s) => `<tr><td>${esc(s.alias)}</td><td>${new Date(s.creada_en).toLocaleString("es-MX")}</td>
        <td><button type="button" class="si" data-r="${s.id}" data-ok="1">Aceptar</button> <button type="button" class="no" data-r="${s.id}" data-ok="0">Rechazar</button></td></tr>`).join("")}</table>`
      : `<p class="sub">No hay solicitudes nuevas.</p>`;
    $("alumnos").innerHTML = !alu.ok ? `<p class="msg">${esc(alu.error)}</p>` : alu.datos.length
      ? `<table><tr><th>Alias</th><th>Nivel (reto / lectura)</th><th>Misiones</th><th>Mejores ★</th><th>Mejor base</th><th>Aciertos a la 1.ª</th><th>Predicción</th><th>Acción</th><th>Diagnóstico</th><th>Manual</th></tr>
        ${alu.datos.map((a) => { const r = a.records || {}, h = a.habilidades || {}; return `<tr><td>${esc(a.alias)}</td><td>${a.nivel_reto} / ${a.nivel_lectura} <span class="sub">(inicial ${a.nivel_inicial})</span></td>
          <td>${r.misiones || 0}</td><td>${r.mejores_estrellas != null ? "★".repeat(r.mejores_estrellas) + "☆".repeat(3 - r.mejores_estrellas) : "—"}</td><td>${r.mejor_puntaje_barras != null ? r.mejor_puntaje_barras + "/400" : "—"}</td>
          <td>${r.mas_aciertos_primera != null ? r.mas_aciertos_primera : "—"}</td><td>${pct(h.prediccion_pct)}</td><td>${pct(h.accion_pct)}</td><td>${pct(h.diagnostico_pct)}</td><td>${pct(h.manual_pct)}</td></tr>`; }).join("")}</table>`
      : `<p class="sub">Todavía no hay alumnos en esta clase. Comparte el código.</p>`;
    $("temas").innerHTML = !tem.ok ? `<p class="msg">${esc(tem.error)}</p>` : tem.datos.length
      ? `<table><tr><th>Tema</th><th>Alumnos</th><th>Decisiones</th><th>Bien</th></tr>${tem.datos.sort((a, b) => a.pct - b.pct).map((t) => `<tr><td>${esc(TEMAS[t.tema] || t.tema)}</td><td>${t.alumnos}</td><td>${t.decisiones}</td><td>${pct(t.pct)}</td></tr>`).join("")}</table>
        <p class="sub">Ordenados del que más cuesta al que menos.</p>`
      : `<p class="sub">Aparecerá cuando tus alumnos terminen misiones.</p>`;
  }
  $("solicitudes").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-r]"); if (!b) return;
    b.disabled = true;
    const r = await S.resolver(b.dataset.r, b.dataset.ok === "1");
    if (!r.ok) alert(r.error);
    pintarGrupo();
  });

  iniciar();
})();

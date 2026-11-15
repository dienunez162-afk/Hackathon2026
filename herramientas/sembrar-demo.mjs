// Crea una maestra y un grupo FICTICIOS en Supabase, con alumnos que jugaron varias partidas, para ver cómo se llena el panel del maestro.
//   DEMO_CLAVE=<contraseña de las cuentas ficticias> node herramientas/sembrar-demo.mjs
//   (opcional) DEMO_CORREO=<correo de la maestra>  SUPABASE_URL=...  SUPABASE_ANON_KEY=...
// Todo es inventado: alias de estrellas, resultados generados al azar con una semilla fija. No toca cuentas reales.
// La contraseña NO está en el repo: pásala por la variable DEMO_CLAVE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_ || !KEY) { const m = /GNOSIS_CONFIG\s*=\s*(\{.*\})/.exec(readFileSync(path.join(raiz, "public/js/config.js"), "utf8")); if (m) { const c = JSON.parse(m[1]); URL_ ||= c.url; KEY ||= c.anon; } }
const CLAVE = process.env.DEMO_CLAVE, CORREO = process.env.DEMO_CORREO || "maestro.prueba.claude@example.com", DOMINIO = "alumnos.g-nosis.local";
if (!URL_ || !KEY || !CLAVE) { console.error("Faltan SUPABASE_URL / SUPABASE_ANON_KEY (o public/js/config.js) o DEMO_CLAVE."); process.exit(1); }
const RETOS = JSON.parse(readFileSync(path.join(raiz, "datos/retos-mision-lunar.json"), "utf8"));
const PREG = JSON.parse(readFileSync(path.join(raiz, "datos/preguntas-mision-lunar.json"), "utf8"));
const GRAFO = JSON.parse(readFileSync(path.join(raiz, "datos/grafo-mision-lunar.json"), "utf8"));
const TEMAS = Object.keys(RETOS.temas);

// azar con semilla fija (siempre sale lo mismo)
let semilla = 20261115;
const azar = () => { semilla = (semilla + 0x6d2b79f5) >>> 0; let t = semilla; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const elige = (a) => a[Math.floor(azar() * a.length)];
const lim = (x, a, b) => Math.max(a, Math.min(b, x));

async function http(metodo, ruta, { token, cuerpo, prefer } = {}) {
  const r = await fetch(URL_ + ruta, { method: metodo, headers: { apikey: KEY, Authorization: "Bearer " + (token || KEY), "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
  return { ok: r.ok, status: r.status, data: j };
}
async function entrar(correo, clave) { const r = await http("POST", "/auth/v1/token?grant_type=password", { cuerpo: { email: correo, password: clave } }); return r.ok ? { token: r.data.access_token, id: r.data.user.id } : null; }
async function registrar(correo, clave, meta) { const r = await http("POST", "/auth/v1/signup", { cuerpo: { email: correo, password: clave, data: meta } }); return r.ok && r.data.access_token ? { token: r.data.access_token, id: r.data.user.id } : (console.log("   signup falló:", JSON.stringify(r.data).slice(0, 160)), null); }
const rpc = (nombre, token, args) => http("POST", "/rest/v1/rpc/" + nombre, { token, cuerpo: args || {} });

// ---------- la maestra y su grupo ----------
console.log("Maestra ficticia:", CORREO);
let maestra = await entrar(CORREO, CLAVE) || await registrar(CORREO, CLAVE, { rol: "maestro", nombre: "Maestra Ortiz (ficticia)" });
if (!maestra) { console.error("No pude entrar ni crear la cuenta de la maestra."); process.exit(1); }
await http("PATCH", `/rest/v1/perfiles?id=eq.${maestra.id}`, { token: maestra.token, cuerpo: { nombre: "Maestra Ortiz (ficticia)" } });
let grupos = (await http("GET", "/rest/v1/grupos?select=id,nombre,codigo&nombre=eq." + encodeURIComponent("4.º B (ficticio)"), { token: maestra.token })).data || [];
let grupo = grupos[0];
if (!grupo) { grupo = (await http("POST", "/rest/v1/grupos", { token: maestra.token, prefer: "return=representation", cuerpo: { maestro_id: maestra.id, nombre: "4.º B (ficticio)", escuela: "Escuela Ficticia «Mar de la Tranquilidad»", grado: 4 } })).data[0]; }
console.log(`Grupo: ${grupo.nombre} · código ${grupo.codigo}`);

// ---------- alumnos ficticios ----------
// habilidad base (0 a 1), cuánto mejoran por partida y cuántas partidas jugaron; los dos últimos solo piden unirse
const ALUMNOS = [
  { alias: "cometa", hab: 0.62, mejora: 0.06, partidas: 5 }, { alias: "nebulosa", hab: 0.5, mejora: 0.09, partidas: 4 }, { alias: "orion", hab: 0.7, mejora: 0.04, partidas: 4 },
  { alias: "vega", hab: 0.72, mejora: 0.05, partidas: 6 }, { alias: "lira", hab: 0.78, mejora: 0.03, partidas: 5 }, { alias: "andromeda", hab: 0.9, mejora: 0.02, partidas: 5 },
  { alias: "sirio", hab: 0.48, mejora: 0.08, partidas: 4 }, { alias: "pleyade", hab: 0.4, mejora: 0.07, partidas: 3 }, { alias: "kepler", hab: 0.58, mejora: 0.03, partidas: 3 },
  { alias: "halley", hab: 0.66, mejora: 0.06, partidas: 3 },
  { alias: "selene", hab: 0.5, mejora: 0.05, partidas: 0 }, { alias: "tycho", hab: 0.5, mejora: 0.05, partidas: 0 },
];
const AVERIAS = RETOS.averias.map((a) => ({ id: a.id, tema: a.temas[0] }));
const SITUACIONES = RETOS.situaciones.map((s) => ({ id: s.id, tema: s.tema }));
const BANCO = PREG.banco.map((q) => ({ id: q.id, tema: q.tema, nivel: q.nivel }));
const NODOS = GRAFO.nodos.filter((n) => n.dia != null && n.tipo !== "final" && n.tipo !== "evaluacion" && n.dia >= 1).sort((a, b) => a.dia - b.dia);

// todas las filas con las mismas columnas (PostgREST lo exige al insertar varias juntas)
const fila = (alumnoId, partidaId, r) => ({ alumno_id: alumnoId, partida_id: partidaId, tipo: null, reto_id: null, tema: null, nivel_reto: 1, nivel_lectura: 1, origen: null, dia: 0, rama: null, prediccion_correcta: null, accion_correcta: false, accion: null, intentos: null, con_carta: false, con_apoyo: false, aciertos: null, total: null, ...r });

function jugarPartida(al, k, nivel, ids) {
  const p = lim(al.hab + al.mejora * (k - 1) + (azar() - 0.5) * 0.12, 0.08, 0.97);
  const filas = [];
  // llamadas (situaciones): 4, con temas distintos; desde la 2.ª, algunas son de partidas pasadas o repasos
  const temasSit = [...SITUACIONES].sort(() => azar() - 0.5).slice(0, 4);
  temasSit.forEach((s, i) => {
    const pred = azar() < lim(p + 0.03, 0, 1), acc = azar() < lim(p + (pred ? 0.08 : -0.08), 0, 1);
    filas.push({ tipo: "situacion", reto_id: s.id, tema: s.tema, nivel_reto: nivel, nivel_lectura: Math.max(1, nivel - (azar() < 0.4 ? 1 : 0)), dia: 3 + i * 3, prediccion_correcta: pred, accion_correcta: acc,
      origen: k === 1 ? "esta_partida" : elige(["esta_partida", "partida_pasada", "partida_pasada", "repaso"]), con_apoyo: !acc && azar() < 0.4 });
  });
  // averías: 2
  [...AVERIAS].sort(() => azar() - 0.5).slice(0, 2).forEach((a, i) => {
    const ok = azar() < lim(p - 0.04, 0, 1);
    filas.push({ tipo: "averia", reto_id: a.id, tema: a.tema, nivel_reto: nivel, nivel_lectura: nivel, dia: 5 + i * 5, accion_correcta: ok, intentos: ok ? 1 : elige([2, 2, 3]), con_carta: azar() < 0.3 });
  });
  // preguntas del banco: 8
  [...BANCO].sort(() => azar() - 0.5).slice(0, 8).forEach((q, i) => {
    const ok = azar() < lim(p + 0.02, 0, 1);
    filas.push({ tipo: "pregunta", reto_id: q.id, tema: q.tema, nivel_reto: nivel, nivel_lectura: nivel, dia: 2 + i, accion_correcta: ok, intentos: ok ? 1 : 2 });
  });
  // manual para el siguiente capitán: 2 cartas
  const aciertos = [0, 1].filter(() => azar() < lim(p + 0.05, 0, 1)).length;
  filas.push({ tipo: "manual", nivel_reto: nivel, nivel_lectura: nivel, dia: 14, accion_correcta: aciertos === 2, aciertos, total: 2 });
  const retos = filas.filter((f) => f.tipo !== "manual"), buenos = retos.filter((f) => f.accion_correcta).length;
  const primera = filas.filter((f) => f.tipo === "pregunta" && f.accion_correcta).length;
  // resultado de la misión según cómo le fue
  const q = buenos / retos.length;
  const evac = q < 0.42 && azar() < 0.7;
  const estrellas = evac ? 0 : q > 0.82 ? 3 : q > 0.62 ? 2 : 1;
  const final = evac ? "FAIL-" + elige(["energia", "comida", "salud"]) : estrellas === 3 ? "FIN-3" : estrellas === 2 ? "FIN-2" : "FIN-1";
  const barras = { radiacion: Math.round(lim(70 - q * 55 + azar() * 15, 8, 92)), energia: Math.round(lim(25 + q * 60 + azar() * 12, 12, 95)), comida: Math.round(lim(30 + q * 55 + azar() * 12, 12, 95)), salud: Math.round(lim(35 + q * 55 + azar() * 10, 12, 98)) };
  const pasos = NODOS.filter((n) => n.dia <= (evac ? 9 : 14)).map((n) => ({ partida_id: ids.partida, nodo_id: n.id, dia: n.dia, resultado: n.resultado && (n.resultado.exito || n.resultado.fallo) ? (azar() < p ? "exito" : "fallo") : null, opcion: null, preparado: false,
    barras: { radiacion: Math.round(lim(15 + n.dia * 3 + azar() * 8, 5, 95)), energia: Math.round(lim(60 - n.dia * 1.5 + azar() * 10, 8, 95)), comida: Math.round(lim(55 - n.dia + azar() * 10, 8, 95)), salud: Math.round(lim(70 - n.dia * 0.8 + azar() * 10, 8, 98)) } }));
  return { filas, pasos, final, estrellas, diaFinal: evac ? 9 : 14, barras, tareas: Math.min(3, Math.round(q * 3)), pregTotal: 8, pregPrimera: primera, cartasManual: TEMAS.filter(() => azar() < 0.2).slice(0, aciertos), q };
}

// --limpiar: borra primero las cuentas ficticias de alumnos (con sus partidas) para generarlas de nuevo
if (process.argv.includes("--limpiar")) {
  for (const al of ALUMNOS) { const s = await entrar(`${al.alias}@${DOMINIO}`, CLAVE); if (!s) continue; const r = await rpc("borrar_mi_cuenta", s.token); console.log(r.ok ? "  borrada:" : "  ✖ no se pudo borrar:", al.alias, r.ok ? "" : JSON.stringify(r.data).slice(0, 120)); }
}
const cuentas = [];
for (const al of ALUMNOS) {
  const correo = `${al.alias}@${DOMINIO}`;
  let s = await entrar(correo, CLAVE) || await registrar(correo, CLAVE, { rol: "alumno", alias: al.alias });
  if (!s) { console.log("✖", al.alias, "no se pudo crear"); continue; }
  cuentas.push({ al, s });
}
console.log(`Alumnos listos: ${cuentas.length}`);

// piden unirse; la maestra acepta a los que jugaron y deja a los otros pendientes
for (const { al, s } of cuentas) {
  const yaGrupo = (await http("GET", `/rest/v1/alumnos?select=grupo_id&id=eq.${s.id}`, { token: s.token })).data;
  if (yaGrupo && yaGrupo[0] && yaGrupo[0].grupo_id) continue;
  const r = await rpc("pedir_unirme", s.token, { p_codigo: grupo.codigo });
  if (!r.ok && !/ya est/.test(JSON.stringify(r.data))) console.log("   pedir_unirme", al.alias, JSON.stringify(r.data).slice(0, 120));
}
const pend = (await http("GET", `/rest/v1/solicitudes_clase?select=id,alumno_id,alumnos(alias)&grupo_id=eq.${grupo.id}&estado=eq.pendiente`, { token: maestra.token })).data || [];
for (const sol of pend) {
  const al = ALUMNOS.find((x) => x.alias === (sol.alumnos && sol.alumnos.alias));
  if (al && al.partidas > 0) { const r = await rpc("resolver_solicitud", maestra.token, { p_id: sol.id, p_acepta: true }); console.log(r.ok ? "  aceptado:" : "  ✖ no se pudo aceptar:", al.alias, r.ok ? "" : JSON.stringify(r.data).slice(0, 100)); }
}

// ---------- partidas, respuestas y pasos ----------
let totalPartidas = 0, totalResp = 0;
for (const { al, s } of cuentas.filter((c) => c.al.partidas > 0)) {
  const existentes = (await http("GET", `/rest/v1/partidas?select=id&alumno_id=eq.${s.id}`, { token: s.token })).data || [];
  if (existentes.length) { console.log("  ya tenía partidas:", al.alias); continue; }
  let nivel = 1, nivelLectura = 1;      // las cuentas nuevas empiezan en el nivel 1; el juego las sube si les va bien
  for (let k = 1; k <= al.partidas; k++) {
    const ids = {}; const j = jugarPartida(al, k, nivel, ids);
    const idp = (await rpc("registrar_partida", s.token, { p_version: "0.5", p_nivel_reto: nivel, p_nivel_lectura: nivelLectura, p_final: j.final, p_estrellas: j.estrellas, p_dia_final: j.diaFinal, p_barras: j.barras, p_tareas: j.tareas, p_preg_total: j.pregTotal, p_preg_primera: j.pregPrimera })).data;
    if (typeof idp !== "string") { console.log("   registrar_partida falló:", al.alias, JSON.stringify(idp).slice(0, 140)); break; }
    totalPartidas++;
    let filas = j.filas.map((f) => fila(s.id, idp, f));
    let r = await http("POST", "/rest/v1/respuestas", { token: s.token, cuerpo: filas });
    if (!r.ok && /respuestas_tipo_check|check constraint/i.test(JSON.stringify(r.data))) { filas = filas.filter((f) => f.tipo !== "pregunta"); r = await http("POST", "/rest/v1/respuestas", { token: s.token, cuerpo: filas }); if (k === 1) console.log("   (la base aún no acepta preguntas del banco: falta la migración 0006; se guardan las demás)"); }
    if (!r.ok) console.log("   respuestas falló:", al.alias, JSON.stringify(r.data).slice(0, 160)); else totalResp += filas.length;
    await http("POST", "/rest/v1/pasos", { token: s.token, cuerpo: j.pasos.map((p) => ({ ...p, partida_id: idp })) });
    await http("PATCH", `/rest/v1/partidas?id=eq.${idp}`, { token: s.token, cuerpo: { cartas_manual: j.cartasManual } });
    // el juego sube o baja el nivel según cómo le fue (una vez por partida, de uno en uno)
    const accion = j.q >= (nivel === 1 ? 0.55 : 0.78) && nivel < 3 ? "sube" : j.q <= 0.4 && nivel > 1 ? "baja" : null;
    if (accion) {
      const nr = lim(nivel + (accion === "sube" ? 1 : -1), 1, 3), nl = lim(nivelLectura + (accion === "sube" && nivelLectura < nr ? 1 : accion === "baja" ? -1 : 0), 1, 3);
      const a = await rpc("ajustar_mi_nivel", s.token, { p_partida: idp, p_dia: 14, p_accion: accion, p_reto: nr, p_lectura: nl });
      if (a.ok) { nivel = nr; nivelLectura = nl; }
    }
  }
  console.log(`  ${al.alias}: ${al.partidas} partidas`);
}
console.log(`\nListo: ${totalPartidas} partidas y ${totalResp} respuestas nuevas.`);
console.log(`Panel del maestro: entra con ${CORREO} y la contraseña que pasaste en DEMO_CLAVE.`);

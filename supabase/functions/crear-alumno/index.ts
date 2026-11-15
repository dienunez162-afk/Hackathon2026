// Edge Function: el maestro crea un alumno sin correo propio.
// POST { grupo_id, alias, nivel?, avatar? }  →  { alias, clave, codigo }
// nivel es el nivel inicial (1-3); si no se manda, sale del grado del grupo. El niño nunca lo ve.
// La clave se muestra una sola vez para imprimirla en la tarjeta del alumno.
//
// Variables de entorno: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// (las pone Supabase) y DOMINIO_ALUMNOS (un dominio que controlen, p. ej. "mision-lunar.mx").
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Sin letras ni números que se confundan (0/O, 1/I/L) para niños de 7 años.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generarClave(n = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Usa POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const dominio = Deno.env.get("DOMINIO_ALUMNOS");
  if (!dominio) return json({ error: "Falta configurar DOMINIO_ALUMNOS." }, 500);

  // 1. Quien llama debe ser un maestro con sesión.
  const comoMaestro = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await comoMaestro.auth.getUser();
  if (!user) return json({ error: "Inicia sesión como maestro." }, 401);

  const { grupo_id, alias, nivel, avatar } = await req.json().catch(() => ({}));
  if (!grupo_id || typeof alias !== "string" || alias.trim().length < 2 || alias.trim().length > 24 || !slug(alias) || (nivel != null && ![1, 2, 3].includes(nivel))) {
    return json({ error: "Envía grupo_id, un alias de 2 a 24 letras y, si quieres, un nivel inicial 1, 2 o 3." }, 400);
  }

  // 2. La RLS solo deja ver grupos propios: si no aparece, no es suyo.
  const { data: grupo } = await comoMaestro.from("grupos").select("id, codigo, grado").eq("id", grupo_id).maybeSingle();
  if (!grupo) return json({ error: "Ese grupo no existe o no es tuyo." }, 403);
  // mismo mapa que retos-mision-lunar.json → reglas.adaptacion.modos.educativo.nivelPorGrado
  const NIVEL_POR_GRADO: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3 };
  const nivelInicial = nivel ?? NIVEL_POR_GRADO[grupo.grado] ?? 2;

  // 3. Crear el usuario de Auth con un correo interno y la clave.
  const admin = createClient(url, service);
  const clave = generarClave();
  const email = `${slug(alias)}.${grupo.codigo.toLowerCase()}@alumnos.${dominio}`;
  const { data: creado, error: errAuth } = await admin.auth.admin.createUser({ email, password: clave, email_confirm: true });
  if (errAuth || !creado.user) {
    const repetido = errAuth?.message?.toLowerCase().includes("already");
    return json({ error: repetido ? "Ya hay un alumno con ese alias en el grupo." : "No se pudo crear el alumno." }, repetido ? 409 : 500);
  }

  // 4. Perfil y alumno. Si algo falla, se borra el usuario para no dejar huérfanos.
  const id = creado.user.id;
  const { error: e1 } = await admin.from("perfiles").insert({ id, rol: "alumno", nombre: alias.trim() });
  const { error: e2 } = e1 ? { error: e1 } : await admin.from("alumnos").insert({ id, grupo_id, alias: alias.trim(), nivel_inicial: nivelInicial, nivel_reto: nivelInicial, nivel_lectura: nivelInicial, avatar: avatar ?? null });
  if (e2) {
    await admin.auth.admin.deleteUser(id);
    return json({ error: "No se pudo guardar el alumno." }, 500);
  }

  return json({ alias: alias.trim(), clave, codigo: grupo.codigo });
});

// GET /api/config -> datos PÚBLICOS para que el juego se conecte a Supabase (modo Salón y panel del maestro).
// Solo manda la URL del proyecto y la publishable key (la "anon"): están hechas para el navegador
// y los datos los protege la RLS de supabase/migrations. Nunca manda la service role / secret key:
// si alguien la pone por error en SUPABASE_ANON_KEY, esta función se niega a publicarla.
// Variables en Vercel (opcionales): SUPABASE_URL, SUPABASE_ANON_KEY, DOMINIO_ALUMNOS.
// Respuesta: { supabase: { url, llave, dominioAlumnos } | null, falta: [...] }
const { responder } = require("./_util");

function esSecreta(llave) {
  if (/^sb_secret_/.test(llave)) return true;
  if (/^eyJ/.test(llave)) {                       // llaves viejas (JWT): revisar el rol que traen adentro
    try { return JSON.parse(Buffer.from(llave.split(".")[1], "base64url").toString()).role === "service_role"; } catch (e) { return true; }
  }
  return false;
}

// Valores del proyecto de G-NOSIS. La publishable key es PÚBLICA por diseño (va al navegador de todos modos),
// así que puede vivir en el repo. Si en Vercel se definen las variables, esas ganan.
const POR_DEFECTO = {
  SUPABASE_URL: "https://tsidieehhdwspeomdixs.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Fi-qV27KlO1n5Z_GFUwWJg__x-KvpHX",
  DOMINIO_ALUMNOS: "alumnos.g-nosis.local",
};
const leer = (k) => (process.env[k] || POR_DEFECTO[k] || "").trim();

module.exports = (req, res) => {
  const url = leer("SUPABASE_URL").replace(/\/+$/, "");
  const llave = leer("SUPABASE_ANON_KEY");
  const dominio = leer("DOMINIO_ALUMNOS");
  if (llave && esSecreta(llave)) {
    return responder(res, 500, { supabase: null, error: "SUPABASE_ANON_KEY tiene una llave SECRETA. Cámbiala por la publishable (sb_publishable_...)." });
  }
  const falta = [];
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) falta.push("SUPABASE_URL");
  if (!/^(sb_publishable_|eyJ)/.test(llave)) falta.push("SUPABASE_ANON_KEY");
  if (!dominio) falta.push("DOMINIO_ALUMNOS");
  responder(res, 200, { supabase: falta.length ? null : { url, llave, dominioAlumnos: dominio }, falta }, 300);
};

// GET /api/donki -> clima espacial de los últimos 30 días desde DONKI (NASA CCMC).
// Fuente principal: https://ccmc.gsfc.nasa.gov/DONKI-API/get/  (no pide llave)
// Respaldo:         https://api.nasa.gov/DONKI/                (usa NASA_API_KEY o DEMO_KEY)
// Respuesta: { fuente, desde, hasta, llamaradas: [{ fecha, clase }], cmes: [{ fecha, nota }],
//              tormentas: [{ fecha, kp }], disponible: { llamaradas, cmes, tormentas } }
const { conTiempo, fecha, responder } = require("./_util");

const CCMC = process.env.DONKI_URL || "https://ccmc.gsfc.nasa.gov/DONKI-API/get/";

async function leerDe(base, tipo, q) {
  const url = `${base}${tipo}?${q}`;
  const r = await conTiempo(url, {}, 12000);
  if (!r.ok) throw new Error(`${tipo} ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error(`${tipo} sin lista`);
  return j;
}
// primero CCMC; si falla ese tipo, api.nasa.gov
async function leer(tipo, desde, hasta) {
  const q = `startDate=${desde}&endDate=${hasta}`;
  try { return { datos: await leerDe(CCMC, tipo, q), fuente: "ccmc" }; }
  catch (e) {
    const key = process.env.NASA_API_KEY || "DEMO_KEY";
    return { datos: await leerDe("https://api.nasa.gov/DONKI/", tipo, `${q}&api_key=${encodeURIComponent(key)}`), fuente: "api.nasa.gov" };
  }
}

module.exports = async (req, res) => {
  const hasta = new Date(), desde = new Date(Date.now() - 30 * 864e5);
  const d0 = fecha(desde), d1 = fecha(hasta);
  try {
    const [pf, pc, pg] = await Promise.allSettled([leer("FLR", d0, d1), leer("CME", d0, d1), leer("GST", d0, d1)]);
    if ([pf, pc, pg].every((p) => p.status === "rejected")) throw new Error([pf, pc, pg].map((p) => p.reason.message).join(" / "));
    const ok = (p) => (p.status === "fulfilled" ? p.value.datos : []);
    const usadas = [...new Set([pf, pc, pg].filter((p) => p.status === "fulfilled").map((p) => p.value.fuente))];
    responder(res, 200, {
      fuente: "NASA DONKI (" + usadas.join(" + ") + ")",
      desde: d0, hasta: d1,
      llamaradas: ok(pf).map((f) => ({ fecha: f.peakTime || f.beginTime, clase: f.classType || "" })),
      cmes: ok(pc).map((c) => ({ fecha: c.startTime, nota: String(c.note || "").slice(0, 140) })),
      tormentas: ok(pg).map((g) => ({ fecha: g.startTime, kp: Math.max(0, ...(g.allKpIndex || []).map((k) => k.kpIndex || 0)) })),
      disponible: { llamaradas: pf.status === "fulfilled", cmes: pc.status === "fulfilled", tormentas: pg.status === "fulfilled" },
    });
  } catch (e) {
    responder(res, 502, { error: "No se pudo leer DONKI", detalle: String(e.message || e) });
  }
};

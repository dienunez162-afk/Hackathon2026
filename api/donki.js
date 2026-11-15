// GET /api/donki -> llamaradas solares (FLR) y eyecciones de masa coronal (CME) de los últimos 30 días.
// La llave vive en la variable de entorno NASA_API_KEY; el navegador nunca la ve.
// Respuesta: { fuente, desde, hasta, llamaradas: [{ fecha, clase }], cmes: [{ fecha, nota }], tormentas: [{ fecha, kp }] }
// Nota (nov 2026): /DONKI/FLR de api.nasa.gov responde 404; CME y GST sí funcionan. Si FLR vuelve, se usa solo.
const { conTiempo, fecha, responder } = require("./_util");

module.exports = async (req, res) => {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  const hasta = new Date(), desde = new Date(Date.now() - 30 * 864e5);
  const q = `startDate=${fecha(desde)}&endDate=${fecha(hasta)}&api_key=${encodeURIComponent(key)}`;
  try {
    // FLR a veces responde 404 (el servicio cambió de ruta en 2026); si falla, seguimos con lo que haya
    const leer = async (tipo) => { const r = await conTiempo(`https://api.nasa.gov/DONKI/${tipo}?${q}`); if (!r.ok) throw new Error(tipo + " " + r.status); return r.json(); };
    const [pf, pc, pg] = await Promise.allSettled([leer("FLR"), leer("CME"), leer("GST")]);
    if ([pf, pc, pg].every((p) => p.status === "rejected")) throw new Error([pf, pc, pg].map((p) => p.reason.message).join(" / "));
    const ok = (p) => (p.status === "fulfilled" && Array.isArray(p.value) ? p.value : []);
    const flr = ok(pf), cme = ok(pc), gst = ok(pg);
    responder(res, 200, {
      fuente: "NASA DONKI" + (key === "DEMO_KEY" ? " (DEMO_KEY)" : ""),
      desde: fecha(desde), hasta: fecha(hasta),
      llamaradas: flr.map((f) => ({ fecha: f.peakTime || f.beginTime, clase: f.classType || "" })),
      cmes: cme.map((c) => ({ fecha: c.startTime, nota: String(c.note || "").slice(0, 140) })),
      tormentas: gst.map((g) => ({ fecha: g.startTime, kp: Math.max(0, ...(g.allKpIndex || []).map((k) => k.kpIndex || 0)) })),
      disponible: { llamaradas: pf.status === "fulfilled", cmes: pc.status === "fulfilled", tormentas: pg.status === "fulfilled" },
    });
  } catch (e) {
    responder(res, 502, { error: "No se pudo leer DONKI", detalle: String(e.message || e) });
  }
};

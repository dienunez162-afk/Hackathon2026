// GET /api/osdr?tema=plantas -> estudios reales de NASA OSDR (Open Science Data Repository). No pide llave.
// Se usan en los informes del invernadero y de salud: "esto lo estudió la NASA de verdad".
// Respuesta: { fuente, tema, estudios: [{ id, titulo, organismo, mision, url }] }
const { conTiempo, responder } = require("./_util");

const TEMAS = { plantas: "plant growth", salud: "astronaut health", radiacion: "space radiation" };

module.exports = async (req, res) => {
  const q = new URL(req.url || "/", "http://x").searchParams;
  const tema = TEMAS[q.get("tema")] ? q.get("tema") : "plantas";
  const url = process.env.OSDR_URL || `https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(TEMAS[tema])}&type=cgene&size=8`;
  try {
    const r = await conTiempo(url, {}, 15000);
    if (!r.ok) throw new Error("OSDR respondió " + r.status);
    const j = await r.json();
    const estudios = ((j.hits && j.hits.hits) || []).map((h) => h._source || {}).filter((s) => s.Accession).map((s) => ({
      id: s.Accession, titulo: String(s["Study Title"] || "").slice(0, 160), organismo: s.organism || "",
      mision: (s.Mission && s.Mission.Name) || "", url: `https://osdr.nasa.gov/bio/repo/data/studies/${s.Accession}`,
    }));
    responder(res, 200, { fuente: "NASA OSDR", tema, estudios }, 24 * 3600);
  } catch (e) {
    responder(res, 502, { error: "No se pudo leer OSDR", detalle: String(e.message || e) });
  }
};

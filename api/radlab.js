// GET /api/radlab -> dosis de radiación de los últimos días (CRaTER / RadLab).
// Espacio reservado: pon en RADLAB_URL la URL del servicio (y RADLAB_API_KEY si la pide).
// El juego espera: { fuente, unidad, serie: [{ dia, dosis }] } con al menos 7 valores.
// Si el servicio devuelve otro formato, adáptalo en normalizar().
const { conTiempo, responder } = require("./_util");

function normalizar(j) {
  if (j && Array.isArray(j.serie)) return j;
  const arr = Array.isArray(j) ? j : j && (j.data || j.datos || j.values);
  if (!Array.isArray(arr)) return null;
  const serie = arr.map((x, k) => ({
    dia: x.dia || x.date || x.fecha || k + 1,
    dosis: Number(typeof x === "number" ? x : x.dosis ?? x.dose ?? x.value),
  })).filter((x) => Number.isFinite(x.dosis));
  return serie.length ? { fuente: "RadLab / CRaTER", unidad: "mGy/día", serie } : null;
}

module.exports = async (req, res) => {
  const url = process.env.RADLAB_URL;
  if (!url) return responder(res, 501, { pendiente: true, mensaje: "Falta RADLAB_URL: el juego usa datos de muestra." });
  try {
    const headers = process.env.RADLAB_API_KEY ? { Authorization: `Bearer ${process.env.RADLAB_API_KEY}` } : {};
    const r = await conTiempo(url, { headers });
    if (!r.ok) throw new Error("RadLab respondió " + r.status);
    const datos = normalizar(await r.json());
    if (!datos) throw new Error("Formato de RadLab no reconocido");
    responder(res, 200, datos, 6 * 3600);
  } catch (e) {
    responder(res, 502, { error: "No se pudo leer RadLab", detalle: String(e.message || e) });
  }
};

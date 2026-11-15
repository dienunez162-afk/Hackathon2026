// GET /api/osdr -> datos de NASA OSDR (Open Science Data Repository).
// Espacio reservado: pon en OSDR_URL la consulta que usaremos (por ejemplo, estudios de
// plantas en microgravedad para los informes del invernadero). Se devuelve tal cual,
// con caché de un día. El juego todavía no depende de esta respuesta.
const { conTiempo, responder } = require("./_util");

module.exports = async (req, res) => {
  const url = process.env.OSDR_URL;
  if (!url) return responder(res, 501, { pendiente: true, mensaje: "Falta OSDR_URL." });
  try {
    const r = await conTiempo(url);
    if (!r.ok) throw new Error("OSDR respondió " + r.status);
    responder(res, 200, { fuente: "NASA OSDR", datos: await r.json() }, 24 * 3600);
  } catch (e) {
    responder(res, 502, { error: "No se pudo leer OSDR", detalle: String(e.message || e) });
  }
};
